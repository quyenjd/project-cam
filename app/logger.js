const path = require('path');
const Utils = require('./header/utils');
const fse = require('fs-extra');
const { isFunction, toString, toSafeInteger, isString } = require('lodash');
const colors = require('colors/safe');
const { parse, valid, Node, NodeType } = require('node-html-parser');
const date = require('date-and-time');

// PRIVATE ATTRIBUTES
const _log = [];
const _logFile = path.join(Utils.getLogs(), 'execute.log');
const _logListeners = [];
const _logQueue = [];
const _logQueueFlushTime = 20; // in milliseconds
let _writeLogCallerIsOn = false;

/**
 * A powerful logger that supports async-safe logging, html parsing, and other useful features
 * @module Logger
 */
module.exports = class Logger {
  /**
   * Clear all log lines
   * @return {Promise<void>} A Promise that resolves when clearing is done
   */
  static async clear () {
    try {
      process.stderr.cursorTo(0, 0);
      process.stderr.clearScreenDown();
    } catch (e) { }

    try {
      await fse.truncate(_logFile, 0);
    } catch (err) { }

    _logListeners.forEach((listener) => {
      // Pass false to all listeners implying a clear-all
      listener(false);
    });
  }

  /**
   * Start a logger session, if not already started
   * * A logger session is used to synchronize logging requests by queuing the logs then printing them respectively
   */
  static start () {
    _writeLogCaller();
  }

  /**
   * Pause running logger session, if any
   */
  static pause () {
    _logQueue.unshift(null);
  }

  /**
   * Push one new log line
   * * This function will start a logger session if none is running. To stop, use `pause`
   * @param {string} log A string indicating a log line (in the format of HTML)
   * @param {number} [logLevel=0] Level of log to be indented (2 spaces each), 0 to 2
   */
  static writeLog (log, logLevel) {
    _logQueue.unshift({ log, logLevel });
    this.start();
  }

  /**
   * Bind a function that accepts a parameter [log], which is an object containing
   * three keys: html, cli, and text, to be called whenever a new log line is pushed
   * * If one function reference is bound multiple times, it will only be called once
   * @param {({ html, cli, text }: { html: string, cli: string, text: string }) => void} callback A listener
   */
  static onLogged (callback) {
    if (isFunction(callback)) {
      for (let i = _logListeners.length; i >= 0; --i) {
        if (_logListeners[i] === callback) {
          return;
        }
      }
      _logListeners.push(callback);
    }
  }

  /**
   * Get all lines of HTML log in one string
   * @returns {string} contains all lines of log
   */
  static readHTMLLog () {
    return _log.map((log) => this.parseLog(log).html).join('<br/>');
  }

  /**
   * Get all lines of CLI log in one string
   * @returns {string} contains all lines of log
   */
  static readCLILog () {
    return _log.map((log) => this.parseLog(log).cli).join('\n');
  }

  /**
   * Get all lines of text log in one string
   * @returns {string} contains all lines of log
   */
  static readTextLog () {
    return _log.map((log) => this.parseLog(log).text).join('\n');
  }

  /**
   * Parse HTML log string into various supported formats: HTML, CLI, text only
   * @param {string} log A log line
   * @returns {{ html: string, cli: string, text: string }} Rendered into multiple formats
   */
  static parseLog (log) {
    const dict = {
      log: {
        html: 'font-family: monospace, monospace; white-space: pre-wrap; display: block; color: #ccc; background: #000; padding: 0.125em 0.5em',
        cli: ''
      },
      b: {
        html: 'font-weight: bold;',
        cli: 'bold'
      },
      strong: 'b',
      warning: {
        html: 'color: #cc0;',
        inverse: 'color: #000; background: #cc0;',
        cli: 'yellow'
      },
      warn: 'warning',
      yellow: 'warning',
      error: {
        html: 'color: #c00;',
        inverse: 'color: #fff; background: #c00;',
        cli: 'red'
      },
      err: 'error',
      red: 'error',
      primary: {
        html: 'color: #00c;',
        inverse: 'color: #fff; background: #00c;',
        cli: 'blue'
      },
      blue: 'primary',
      info: {
        html: 'color: #0cc',
        inverse: 'color: #000; background: #0cc;',
        cli: 'cyan'
      },
      cyan: 'info',
      extra: {
        html: 'color: #c0c',
        inverse: 'color: #fff; background: #c0c;',
        cli: 'magenta'
      },
      magenta: 'extra',
      success: {
        html: 'color: #0c0;',
        inverse: 'color: #fff; background: #0c0;',
        cli: 'green'
      },
      green: 'success',
      default: {
        html: 'color: #ccc;',
        inverse: 'color: #000; background: #ccc;',
        cli: 'reset'
      },
      def: 'default',
      reset: 'default',
      inv: 'inverse',
      skip: {
        html: 'display: none;',
        cli: 'skip'
      },
      hidden: 'skip'
    };

    const ret = {
      html: '',
      cli: '',
      text: ''
    };
    log = '<log>' + toString(log) + '</log>';

    const parseOptions = {
      lowerCaseTagName: true,
      comment: false,
      blockTextElements: {
        script: false,
        noscript: false,
        style: false,
        pre: true
      }
    };

    const dfs = function dfs (html, inverse) {
      if (!html || !(html instanceof Node) || html.nodeType === NodeType.COMMENT_NODE) { return ''; }

      // For concatenation, we are interested in text nodes only
      if (html.nodeType === NodeType.TEXT_NODE) {
        ret.html += html.text;
        ret.text += html.text;
        return html.text;
      } else {
        // Alias support
        let localName = html.localName;
        while (Object.prototype.hasOwnProperty.call(dict, localName) && isString(dict[localName])) { localName = dict[localName]; }

        if (Object.prototype.hasOwnProperty.call(dict, localName) || localName === 'inverse') {
          // Open tag
          if (localName !== 'inverse') { ret.html += `<span style="${(inverse ? dict[localName].inverse : '') || dict[localName].html}">`; }

          let returnValues = '';
          html.childNodes.forEach((node) => {
            if (localName === 'inverse') { returnValues += dfs(node, !inverse); } else {
              // Traverse down
              if (Object.prototype.hasOwnProperty.call(dict[localName], 'cli')) { returnValues += dfs(node, inverse); }
            }
          });

          // Close tag
          if (localName !== 'inverse') { ret.html += '</span>'; }

          return localName === 'inverse' ? colors.inverse(returnValues) : dict[localName].cli === 'skip' ? '' : dict[localName].cli ? colors[dict[localName].cli](returnValues) : returnValues;
        } else { throw new Error(`[logger] Unknown tag \`${localName}\``); }
      }
    };

    try {
      if (!valid(log, parseOptions)) { throw new Error('[logger] Invalid log line'); }
      ret.cli = dfs(parse(log, parseOptions).firstChild, false);
    } catch (err) {
      ret.html = ret.cli = ret.text = '';
      ret.cli = dfs(parse(`<log>${err.message}</log>`, parseOptions).firstChild, false);
    }

    return Object.freeze(ret);
  }
};

// PRIVATE METHODS
async function _writeLog (log, logLevel) {
  log = toString(log)
    .replace(/<\s*\/?br\s*\/?>/gim, '\n') // Replace br tag with \n
    .replace(/\r\n/, '\n') // Normalize \r\n to \n
    .replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''); // Trim white spaces and tabs
  if (!log.length) { return; }
  logLevel = Math.min(2, Math.max(0, toSafeInteger(logLevel || 0)));

  for (let i = 0; i < logLevel * 2; ++i) { log = ' ' + log; }

  _log.push(log);
  const parsedLog = module.exports.parseLog(log);

  if (parsedLog.html) {
    _logListeners.forEach(async (listener) => {
      listener(parsedLog);
    });
  }

  if (parsedLog.cli) {
    try {
      process.stderr.write(parsedLog.cli + '\n');
    } catch (e) { }
  }

  if (parsedLog.text) {
    try {
      await fse.appendFile(_logFile, `[${date.format(new Date(), 'YYYY/MM/DD HH:mm:ss.SSS')}]\n${parsedLog.text.split('\n').map((line) => `  | ${line}`).join('\n')}\n`);
    } catch (err) { }
  }
}

function _writeLogCaller () {
  if (_writeLogCallerIsOn) { return; }

  _writeLogCallerIsOn = true;

  const f = async () => {
    while (_logQueue.length) {
      const top = _logQueue.pop();

      if (top === null) { _writeLogCallerIsOn = false; } else { await _writeLog(top.log, top.logLevel); }
    }
    if (_writeLogCallerIsOn) { setTimeout(f, _logQueueFlushTime); }
  };
  f();
}
