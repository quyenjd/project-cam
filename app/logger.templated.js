const Logger = require('./logger');
const format = require('string-format');
const { toString, isFunction, toSafeInteger, assign, isPlainObject } = require('lodash');
const { types } = require('util');

// PRIVATE ATTRIBUTES
const _templates = {};
let _runStackCount = 0;
let _runTraceError = null;
let _templateDefaultSuppress = false;
let _templatePrimarySuppress = false;
let _templateInfoSuppress = false;
let _templateExtraSuppress = false;
let _templateSuccessSuppress = false;
let _templateWarningSuppress = false;
let _templateErrorSuppress = false;

/**
 * Extended template-oriented logger that stores and renders templated logs, packed with powerful script execution utilities
 * @module TemplatedLogger
 * @extends Logger
 */
module.exports = class TemplatedLogger extends Logger {
  /**
   * Default template parser: no color, no prefix, no name
   */
  static get templateDefault () {
    const parser = (name, template) => _templateDefaultSuppress ? '' : template;
    parser.__proto__.suppress = () => _templateDefaultSuppress = true; // eslint-disable-line
    parser.__proto__.unsuppress = () => _templateDefaultSuppress = false; // eslint-disable-line
    return parser;
  }

  /**
   * Primary template parser: blue, no prefix, no name
   */
  static get templatePrimary () {
    const parser = (name, template) => _templatePrimarySuppress ? '' : `<blue>${template}</blue>`;
    parser.__proto__.suppress = () => _templatePrimarySuppress = true; // eslint-disable-line
    parser.__proto__.unsuppress = () => _templatePrimarySuppress = false; // eslint-disable-line
    return parser;
  }

  /**
   * Info template parser: inversed cyan, INFO prefix, no name
   */
  static get templateInfo () {
    const parser = (name, template) => _templateInfoSuppress ? '' : `<inv><cyan> INFO </cyan></inv> ${template}`;
    parser.__proto__.suppress = () => _templateInfoSuppress = true; // eslint-disable-line
    parser.__proto__.unsuppress = () => _templateInfoSuppress = false; // eslint-disable-line
    return parser;
  }

  /**
   * Extra template parser: magenta, no prefix, no name
   */
  static get templateExtra () {
    const parser = (name, template) => _templateExtraSuppress ? '' : `<extra>${template}</extra>`;
    parser.__proto__.suppress = () => _templateExtraSuppress = true; // eslint-disable-line
    parser.__proto__.unsuppress = () => _templateExtraSuppress = false; // eslint-disable-line
    return parser;
  }

  /**
   * Success template parser: bold green, no prefix, no name
   */
  static get templateSuccess () {
    const parser = (name, template) => _templateSuccessSuppress ? '' : `<b><green>${template}</green></b>`;
    parser.__proto__.suppress = () => _templateSuccessSuppress = true; // eslint-disable-line
    parser.__proto__.unsuppress = () => _templateSuccessSuppress = false; // eslint-disable-line
    return parser;
  }

  /**
   * Warning template parser: inversed yellow, WARN prefix, has name
   */
  static get templateWarning () {
    const parser = (name, template) => _templateWarningSuppress ? '' : `<inv><warn> WARN </warn></inv> ${name ? (name + ': ') : ''}${template}`;
    parser.__proto__.suppress = () => _templateWarningSuppress = true; // eslint-disable-line
    parser.__proto__.unsuppress = () => _templateWarningSuppress = false; // eslint-disable-line
    return parser;
  }

  /**
   * Error template parser: inverse red, FAIL prefix, has name
   */
  static get templateError () {
    const parser = (name, template) => _templateErrorSuppress ? '' : `<inv><red> FAIL </red></inv> ${name ? (name + ': ') : ''}${template}`;
    parser.__proto__.suppress = () => _templateErrorSuppress = true; // eslint-disable-line
    parser.__proto__.unsuppress = () => _templateErrorSuppress = false; // eslint-disable-line
    return parser;
  }

  /**
   * Set a template name to a string to be used with string-format
   *
   * A good convention for naming the template is to start with indicating the role,
   * e.g. warning, error, etc., followed by a suitable clause starter, e.g. if, when,
   * etc., followed by meaningful content, all in camel case, e.g. WarnIfExceptionIsThrown,
   * ErrorWhenLoggingWithTemplate, InfoOnFeatureUpdates, etc.
   * @param {string} name Template name
   * @param {string} template Template base string
   * @param {boolean} [force=false] Force set if the name already exists
   * @param {Function} [parser=TemplatedLogger.templateDefault] Call every time the template is used
   * @returns {boolean} Whether the name is already taken
   */
  static setTemplate (name, template, force = false, parser = this.templateDefault) {
    if (force && Object.prototype.hasOwnProperty.call(_templates, name)) { return false; }

    _templates[name] = {
      template: toString(template),
      parser: isFunction(parser) ? parser : this.templateDefault
    };

    return true;
  }

  /**
   * Unset a template name
   * @param {string} name Template name
   */
  static unsetTemplate (name) {
    delete _templates[name];
  }

  /**
   * Use writeLog with assigned templates
   * @param {string} name Template name. If it does not exist, treat it as inline template
   * @param {Object.<string, *>} [config={}] Template base configuration
   * * When passing {name} as a property of config, inlining is forced and it will be used as inline template name
   * @param {number} [logLevel=0] Indentation level
   * @param {Function=} parser A one-time parser to render this method call only
   */
  static writeLogTemplated (name, config = {}, logLevel = 0, parser = null) {
    if (!isPlainObject(config)) { return; }
    if (Object.prototype.hasOwnProperty.call(_templates, name) && !Object.prototype.hasOwnProperty.call(config, '{name}')) { super.writeLog(format(isFunction(parser) ? parser(name, _templates[name].template) : _templates[name].parser(name, _templates[name].template), config), logLevel); } else { super.writeLog(format(isFunction(parser) ? parser(toString(config['{name}']), name) : name, config), logLevel); }
  }

  /**
   * Check whether a script is being executed, which can happen when scripts are asynchronous.
   * @returns {boolean} true if an async process is running
   */
  static isExecuting () {
    return !!_runStackCount;
  }

  /**
   * Asynchronously wait until the given predicate returns `false`
   * @param {number} [waitingTime=20] Waiting time (in ms) between two consecutive checks [min: 1]
   * @param {Function=} [pred] Overwrite current predicate, which is `TemplatedLogger.isExecuting`
   * @returns {Promise} A Promise that is resolved when the waiting is done
   */
  static wait (waitingTime = 20, pred = null) {
    waitingTime = Math.max(1, toSafeInteger(waitingTime));

    return new Promise((resolve) => {
      const f = () => {
        // Prevent endless loop
        setTimeout(() => {
          if ((isFunction(pred) ? pred() : this.isExecuting()) === false) { resolve(); } else { f(); }
        }, waitingTime);
      };
      f();
    });
  }

  /**
   * @typedef {Object} logObject
   * @property {number} level Log level, see `writeLogTemplated`
   * @property {Function} parser Log parser, see `writeLogTemplated`
   * @property {string} template Log template, see `writeLogTemplated`
   */
  /**
   * Execute a script within a logging environment, providing error catching and logging
   * @param {Function} execution A function to be executed
   * @param {Object} [config={}] Execution configuration
   * @param {string=} config.name Name of the script
   * @param {string|logObject=} config.logSuccess Log to be written after successful execution
   * * You can use placeholder of properties of config object. Use `{return}` placeholder for returned value.
   * @param {string|logObject=} config.logFail Log to be written after failed execution
   * * You can use placeholder of properties of config object. Use `{message}` placeholder for error message.
   * @param {string|logObject=} config.logDone Log to be written after finishing execution (after success/fail logs)
   * * You can use placeholder of properties of config object. Use `{message}` placeholder for error message and `{return}` for returned value.
   * * Please note that either `{message}` or `{return}` will be undefined at a time.
   * @param {((ret: *) => void)=} config.onSuccess Function to be called after successful execution
   * @param {((err: Error) => void)=} config.onFail Function to be called after failed execution
   * @param {((ret: *|Error) => void)=} config.onDone Function to be called after finishing execution (after onSuccess/onFail)
   * @param {boolean} [config.safe=true] If true, raised exceptions will be caught
   * @param {boolean} [config.envLog=true] Whether to write default environment logs
   * @param {boolean} [config.propagate=true] Whether to propagate the exception to the top level, if any
   * @param {boolean} [config.async=false] Whether to run the function in async mode
   * * If an AsyncFunction is passed, `async` will be considered as true, otherwise
   * * If a normal Function is passed and `async` is true, wrap the function in Promise constructor, otherwise
   * * If a normal Function is passed and `async` is false by default, run the function synchronously.
   * @param {boolean|number} [config.wait=false] Asynchronously wait for former executions to finish before executing the new one
   * * Setting this to a number, which will be passed to `TemplatedLogger.wait`, will set `config.async` to true as well.
   * * Setting this to false (default) to disable waiting.
   * @returns {*|Promise} Returned value from function or a Promise if async
   */
  static execute (execution, config = {}) {
    if (!isFunction(execution)) { throw new TypeError('`execution` must be a function'); }
    const asyncFunction = types.isAsyncFunction(execution);

    this.setTemplate('WarnIfUnsafeEnvMayThrow', 'Exceptions are not caught in unsafe environment and will be propagated to the main process', true, this.templateWarning);
    this.setTemplate('WarnIfUnsafeEnvThrows', 'An instance of {name} is thrown', true, this.templateWarning);
    this.setTemplate('TLExecuting', '<b><cyan>{name}</cyan></b> {async}xecuting...', true, this.templateExtra);
    this.setTemplate('TLExecuted', '<b><cyan>{name}</cyan></b> <b><green>Done</green></b>\n');
    this.setTemplate('TLHalted', '<b><cyan>{name}</cyan></b> <b><red>Halted</red></b>\n');

    config = assign({
      name: 'anonymous',
      logSuccess: '',
      logFail: {
        level: 0,
        parser: this.templateError,
        template: '{message}'
      },
      logDone: '',
      onSuccess: null,
      onFail: null,
      onDone: null,
      safe: true,
      envLog: true,
      propagate: true,
      async: false,
      wait: false
    }, config);

    if (config.wait !== false) { config.async = true; }

    ++_runStackCount;

    if (_runStackCount === 1) {
      _runTraceError = null;

      if (config.envLog) {
        this.writeLogTemplated('TLExecuting', {
          async: asyncFunction || config.async ? 'Asynchronously e' : 'E',
          name: config.name
        });
      }

      if (!config.safe && config.envLog) { this.writeLogTemplated('WarnIfUnsafeEnvMayThrow'); }
    }

    let returnValue;

    const _log = (conf, obj) => {
      if (isPlainObject(conf)) { this.writeLogTemplated(conf.template, obj, conf.level, conf.parser); } else { this.writeLog(format(conf, obj)); }
    };
    const _then = (ret) => {
      returnValue = ret;
      _log(config.logSuccess, { ...config, return: ret });
      _log(config.logDone, { ...config, return: ret });
      return ret;
    };
    const _catch = (err) => {
      if (!config.safe && config.envLog) { this.writeLogTemplated('WarnIfUnsafeEnvThrows', err); }
      _log(config.logFail, { ...config, message: `${err.name}[ ${err.message} ]` });
      _log(config.logDone, { ...config, message: `${err.name}[ ${err.message} ]` });
      _runTraceError = err;
    };
    const _finally = () => {
      if (_runStackCount === 1) {
        if (config.envLog) { this.writeLogTemplated(_runTraceError ? 'TLHalted' : 'TLExecuted', { name: config.name }); }
      }

      --_runStackCount;

      if (_runTraceError) {
        if (isFunction(config.onFail)) { config.onFail(_runTraceError); }
        if (isFunction(config.onDone)) { config.onDone(_runTraceError); }
        if (config.safe) {
          if (!config.propagate) { _runTraceError = null; }
        } else { throw _runTraceError; }
      } else {
        if (isFunction(config.onSuccess)) { config.onSuccess(returnValue); }
        if (isFunction(config.onDone)) { config.onDone(returnValue); }
      }
    };

    if (!_runTraceError) {
      if (asyncFunction) {
        return config.wait !== false
          ? this.wait(config.wait, () => _runStackCount > 1)
            .then(() => execution())
            .then((ret) => _then(ret))
            .catch((err) => _catch(err))
            .finally(() => _finally())
          : execution()
            .then((ret) => _then(ret))
            .catch((err) => _catch(err))
            .finally(() => _finally());
      } else if (config.async) {
        return config.wait !== false
          ? this.wait(config.wait, () => _runStackCount > 1)
            .then(() => new Promise(execution))
            .then((ret) => _then(ret))
            .catch((err) => _catch(err))
            .finally(() => _finally())
          : new Promise(execution)
            .then((ret) => _then(ret))
            .catch((err) => _catch(err))
            .finally(() => _finally());
      } else {
        try {
          _then(execution());
        } catch (err) {
          _catch(err);
        } finally {
          _finally();
        }

        return returnValue;
      }
    } else { _finally(); }
  }
};
