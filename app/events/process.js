const EC = require('./_collection');
const Wrap = require('./_wrap');
const { exec, fork, spawn } = require('child_process');
const _ = require('lodash');
const Utils = require('./_utils');

/**
 * Process API that allows out-of-process processing
 * @module ProcessRequest
 */
module.exports = class ProcessRequest {
  /**
   * Run a JavaScript file in a child_process
   * @param {string} dir Directory of the file
   * @param {import('@project-cam/helper').ApiRunFileOptions} [options={}] Running options
   * @returns {Promise<import('@project-cam/helper').ApiRunResponse>} A Promise that resolves when the running process is done
   */
  static runFile (dir, options = {}) {
    return new Promise((resolve) => {
      // Run the process
      const cp = fork(dir, options.args || [], {
        cwd: _.toString(options.cwd),
        detached: true,
        env: {},
        execArgv: []
      });

      setTimeout(() => {
        cp.kill();
      }, _.toSafeInteger(options.timeout));

      _handle(cp, resolve, options.encoding);
    });
  }

  /**
   * Run a command in a child_process
   * @param {string} command The command to be executed
   * @param {import('@project-cam/helper').ApiRunCommandOptions} [options={}] Running options
   * @returns {Promise<import('@project-cam/helper').ApiRunResponse>} A Promise that resolves when the running process is done
   */
  static runCommand (command, options = {}) {
    return new Promise((resolve) => {
      // Run the command
      const cp = spawn(command, options.args || [], {
        cwd: _.toString(options.cwd),
        detached: true,
        env: {},
        execArgv: [],
        timeout: _.toSafeInteger(options.timeout),
        windowsHide: !!options.windowsHide
      });

      _handle(cp, resolve, options.encoding);
    });
  }

  /**
   * Run a command in a shell
   * @param {string} command The command to be executed
   * @param {import('@project-cam/helper').ApiRunCommandInShellOptions} [options={}] Running options
   * @returns {Promise<import('@project-cam/helper').ApiRunResponse>} A Promise that resolves when the running process is done
   */
  static runCommandInShell (command, options = {}) {
    return new Promise((resolve) => {
      // Execute the command
      exec(command, {
        cwd: _.toString(options.cwd),
        encoding: _.toString(options.encoding) || 'utf8',
        env: {},
        maxBuffer: _.toSafeInteger(options.maxBuffer),
        timeout: _.toSafeInteger(options.timeout),
        windowsHide: !!options.windowsHide
      }, (error, stdout, stderr) => {
        resolve({
          exitCode: error && error instanceof Error ? error.code : 0,
          stderr,
          stdout
        });
      });
    });
  }

  /**
   * Bind all events to the event collection
   */
  static bindAll () {
    const that = this;

    EC.on({
      id: 'ComponentRunFile',
      name: 'request-component-run-file',
      caller: Wrap(async function (event, componentId, dir, options = {}) {
        return await that.runFile(Utils.normalizeDir(componentId, dir), options);
      })
    }).on({
      id: 'ComponentRunCommand',
      name: 'request-component-run-command',
      caller: Wrap(async function (event, command, options = {}) {
        return await that.runCommand(command, options);
      })
    }).on({
      id: 'ComponentRunCommandInShell',
      name: 'request-component-run-command-in-shell',
      caller: Wrap(async function (event, command, options = {}) {
        return await that.runCommandInShell(command, options);
      })
    });
  }
};

function _handle (cp, resolve, encoding) {
  // Encode stdout and stderr
  cp.stderr.setEncoding(_.toString(encoding) || 'utf8');
  cp.stdout.setEncoding(_.toString(encoding) || 'utf8');

  let stderr = ''; let stdout = '';
  cp.stderr.on('data', (chunk) => {
    if (_.isString(chunk)) { stderr += chunk; }
  });
  cp.stdout.on('data', (chunk) => {
    if (_.isString(chunk)) { stdout += chunk; }
  });

  cp.on('close', (code, signal) => {
    resolve({
      exitCode: code,
      signal,
      stderr,
      stdout
    });
  });
}
