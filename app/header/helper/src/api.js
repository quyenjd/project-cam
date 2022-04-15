/**
 * @typedef {Object} FileData
 * @property {string} data Data of the file
 * @property {string} fullPath Full directory to the file
 */

/**
 * Launch an alert box on the application
 * @callback ApiAlert
 * @param {'alert'} name Method name
 * @param {string} [message=''] Alert message
 * @returns {Promise<void>} A Promise that resolves when the alert box is closed
 */

/**
 * Launch a confirmation box on the application
 * @callback ApiConfirm
 * @param {'confirm'} name Method name
 * @param {string} [message=''] Confirmation prompt
 * @returns {Promise<boolean>} A Promise that resolves when the confirmation box is closed.
 * Return value `true` means user chooses OK, otherwise `false` if user chooses Cancel.
 */

/**
 * Get value of a configuration field
 * @callback ApiGetField
 * @param {'getfield'} name Method name
 * @param {string} key The field to get the value of
 * @returns {Promise<string|null>} A Promise that resolves to the value of the field or null
 * if the key has not been set
 */

/**
 * Set value of a configuration field
 * @callback ApiSetField
 * @param {'setfield'} name Method name
 * @param {string} key The field to set the value of
 * @param {string} value New value of the field
 * @returns {Promise<string|null>} A Promise that resolves to the old value of the field
 * or null if the key has only just been set
 */

/**
 * Send new output to the application
 * @callback ApiNewOutput
 * @param {'newoutput'} name Method name
 * @param {Object.<string, *>} output New output to merge with the current output of the component
 * @returns {Promise<void>} A Promise that resolves when the method finishes
 */

/**
 * Read the content of a file
 * @callback ApiReadFile
 * @param {'readfile'} name Method name
 * @param {string} dir Directory of the file (must be inside the component folder)
 * @param {string} [encoding='utf8'] Specify how to read the file properly
 * @returns {Promise<string|null>} A Promise that resolves to the content of the file,
 * or null if the file cannot be read
 */

/**
 * Read the content of a file using its absolute path (will require permission from application)
 * @callback ApiReadFileAbsolute
 * @param {'readfileabsolute'} name Method name
 * @param {string} dir Absolute directory of the file
 * @param {string} [encoding='utf8'] Specify how to read the file properly
 * @returns {Promise<string|null>} A Promise that resolves to the content of the file(s), or null
 * if the file does not exist or the operation is not allowed
 */

/**
 * Launch a dialog to ask user where the file is then read the content of it
 * @callback ApiReadFileFrom
 * @param {'readfilefrom'} name Method name
 * @param {boolean} [multiple=false] true to allow reading multiple files, false otherwise
 * @param {string} [encoding='utf8'] Specify how to read the file properly
 * @param {string} [title='Open File...'] Title of the dialog
 * @param {{ extensions: string[], name: string }[]} [fileExt=[]] Extensions shown in the dialog
 * @returns {Promise<FileData|FileData[]|null>} A Promise that resolves to the selected file(s),
 * or null if the user cancels or the file cannot be read
 */

/**
 * Save data to a file
 * @callback ApiSaveFile
 * @param {'savefile'} name Method name
 * @param {string} dir Directory of the file (must be inside the component folder)
 * @param {string} data Data of the file
 * @param {string} [encoding='utf8'] Specify how to save the file properly
 * @returns {Promise<boolean>} A Promise that resolves to true if the file has been saved, false otherwise
 */

/**
 * Save data to a file using its absolute path (will require permission from application)
 * @callback ApiSaveFileAbsolute
 * @param {'savefileabsolute'} name Method name
 * @param {string} dir Absolute directory of the file
 * @param {string} data Data of the file
 * @param {string} [encoding='utf8'] Specify how to save the file properly
 * @returns {Promise<boolean>} A Promise that resolves to true if the file has been saved, false if the
 * file cannot be saved or the operation is not allowed
 */

/**
 * Launch a dialog to ask user where to save a file then save it
 * @callback ApiSaveFileAs
 * @param {'savefileas'} name Method name
 * @param {string} data Data of the file
 * @param {string} [encoding='utf8'] Specify how to save the file properly
 * @param {string} [title='Save File As...'] Title of the dialog
 * @param {{ extensions: string[], name: string }[]} [fileExt=[]] Extensions shown in the dialog
 * @returns {Promise<string|null>} A Promise that resolves to the directory of the saved file,
 * or null if the user cancels or the file cannot be saved
 */

/**
 * @typedef {Object} ApiRunResponse
 * @property {number} exitCode Exit code of the process
 * @property {string} stdout Stdout data from the process
 * @property {string} stderr Stderr data from the process
 */

/**
 * @typedef {Object} ApiRunFileOptions
 * @property {string[]} [args=[]] Arguments to be passed to the file
 * @property {string} [cwd=''] Working directory of the file (default to the directory of the component)
 * @property {number} [timeout=undefined] Timeout of the running process in milliseconds
 * @property {string} [encoding='utf8'] Encoding of the stdout and stderr streams
 */

/**
 * Run a JavaScript file in a child_process
 * @callback ApiRunFile
 * @param {'runfile'} name Method name
 * @param {string} dir Directory of the file (must be inside the component folder)
 * @param {ApiRunFileOptions} [options={}] Running options
 * @returns {Promise<ApiRunResponse>} A Promise that resolves when the running process is done
 */

/**
 * @typedef {Object} ApiRunCommandOptions
 * @property {string[]} [args=[]] Arguments to be passed to the command
 * @property {string} [cwd=''] Working directory of the command (default to the directory of the component)
 * @property {number} [timeout=undefined] Timeout of the running process in milliseconds
 * @property {boolean} [windowsHide=false] Hide subprocess console window in Windows
 * @property {string} [encoding='utf8'] Encoding of the stdout and stderr streams
 */

/**
 * Run a command in a child_process
 * @callback ApiRunCommand
 * @param {'runcommand'} name Method name
 * @param {string} command The command to run
 * @param {ApiRunCommandOptions} [options={}] Running options
 * @returns {Promise<ApiRunResponse>} A Promise that resolves when the running process is done
 */

/**
 * @typedef {Object} ApiRunCommandInShellOptions
 * @property {string} [cwd=''] Working directory of the command (default to the directory of the component)
 * @property {number} [timeout=undefined] Timeout of the running process in milliseconds
 * @property {boolean} [windowsHide=false] Hide subprocess console window in Windows
 * @property {string} [encoding='utf8'] Encoding of the stdout and stderr streams
 * @property {number} [maxBuffer=1048576] Maximum amount of data (in bytes) allowed on stdout and stderr
 */

/**
 * Run a command in a shell
 * @callback ApiRunCommandInShell
 * @param {'runcommandinshell'} name Method name
 * @param {string} command The command to run, including space-seperated arguments
 * @param {ApiRunCommandInShellOptions} [options={}] Running options
 * @returns {Promise<ApiRunResponse>} A Promise that resolves when the running process is done
 */

/**
 * Get all kinds of system information using `systeminformation`
 * @callback ApiSystemInfo
 * @param {'systeminfo'} name Method name
 * @param {*} valueObject Parameter to `si.get()`.
 * Information on how to use this can be found here: https://systeminformation.io/general.html
 * @returns {Promise<*>} Return value from `si.get()`
 */

/**
 * @typedef {Object} ApiFetchOptions
 * @property {string} [method='GET'] Fetch request method
 * @property {Object.<string, string>} [headers={}] Request headers
 * @property {string|null|Blob} [body=null] Request body
 * @property {'blob'|'json'|'text'} [type='text'] Response type
 * @property {number} [timeout=0] Maximum waiting time in ms, 0 to disable
 * @property {number} [size=0] Maximum size of response body, 0 to disable
 * @property {string} [user=undefined] When running on Electron behind an authenticated HTTP proxy, provide username to authenticate
 * @property {string} [password=undefined] When running on Electron behind an authenticated HTTP proxy, provide password to authenticate
 */

/**
 * @typedef {Object} ApiFetchResponse
 * @property {string} url URL that was used to fetch the response to
 * @property {number} status Response status
 * @property {string} statusText Response status text
 * @property {Object.<string, string>} headers Response headers
 * @property {string|Blob|Object} body Response body, might be a string, a Blob, or a parsed JSON object
 */

/**
 * Fetch data from URLs
 * @callback ApiFetch
 * @param {'fetch'} name Method name
 * @param {string} url ABSOLUTE url to fetch the request
 * @param {ApiFetchOptions} [options={}] Fetch options
 * @returns {Promise<ApiFetchResponse>} A Promise that resolves when fetching is done
 */

/**
 * Bind the component to a port. To have a function called upon data changes to the port,
 * use `event.bind('port.[YOUR PORT]', callback)`.
 * @callback ApiBindToPort
 * @param {'bindtoport'} name Method name
 * @param {number} port Port to bind the component to
 * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the component has successfully bound to the port
 */

/**
 * Unbind the component from a port
 * @callback ApiUnbindFromPort
 * @param {'unbindfromport'} name Method name
 * @param {number} port Port to unbind the component from
 * @returns {Promise<void>} A Promise that resolves when the method finishes
 */

/**
 * Send new data to a port. If no component is listening, the data will NOT be stored in the application.
 * @callback ApiSendToPort
 * @param {'sendtoport'} name Method name
 * @param {number} port Port to send the data to
 * @param {*} data Data to be sent to the port
 * @returns {Promise<number>} A Promise that resolves to the number of components listening to the port
 */

/**
 * Get the name of the component
 * @callback ApiComponentGetName
 * @param {'componentgetname'} name Method name
 * @returns {Promise<string>} A Promise that resolves to the name of the component
 */

/**
 * Set the name of the component
 * @callback ApiComponentSetName
 * @param {'componentsetname'} name Method name
 * @param {string} newName New name of the component
 * @returns {Promise<string>} A Promise that resolves to the name of the component after updating
 */

/**
 * Get the background color (hex) of the component
 * @callback ApiComponentGetBackground
 * @param {'componentgetbackground'} name Method name
 * @returns {Promise<string>} A Promise that resolves to the background color of the component
 */

/**
 * Set the background color (hex) of the component
 * @callback ApiComponentSetBackground
 * @param {'componentsetbackground'} name Method name
 * @returns {Promise<string>} A Promise that resolves to the background color of the component after updating
 */

/**
 * Add an input parameter to the component
 * @callback ApiComponentAddInputParam
 * @param {'componentaddinputparam'} name Method name
 * @param {string} param Name of the parameter
 * @param {{ limit?: number, required?: boolean, type?: string }} [options={}] Options of the parameter
 * @returns {Promise<boolean>} A Promise that resolves to true if the parameter has been added, or false otherwise
 */

/**
 * Check if the component has an input parameter
 * @callback ApiComponentHasInputParam
 * @param {'componenthasinputparam'} name Method name
 * @param {string} param Name of the parameter
 * @returns {Promise<boolean>} A Promise that resolves to true if the parameter exists, or false otherwise
 */

/**
 * Remove an input parameter from the component
 * @callback ApiComponentRemoveInputParam
 * @param {'componentremoveinputparam'} name Method name
 * @param {string} param Name of the parameter
 * @returns {Promise<boolean>} A Promise that resolves to true if the parameter has been removed, or false otherwise
 */

/**
 * Add an output parameter to the component
 * @callback ApiComponentAddOutputParam
 * @param {'componentaddoutputparam'} name Method name
 * @param {string} param Name of the parameter
 * @param {{ type?: string }} [options={}] Options of the parameter
 * @returns {Promise<boolean>} A Promise that resolves to true if the parameter has been added, or false otherwise
 */

/**
 * Check if the component has an output parameter
 * @callback ApiComponentHasOutputParam
 * @param {'componenthasoutputparam'} name Method name
 * @param {string} param Name of the parameter
 * @returns {Promise<boolean>} A Promise that resolves to true if the parameter exists, or false otherwise
 */

/**
 * Remove an output parameter from the component
 * @callback ApiComponentRemoveOutputParam
 * @param {'componentremoveoutputparam'} name Method name
 * @param {string} param Name of the parameter
 * @returns {Promise<boolean>} A Promise that resolves to true if the parameter has been removed, or false otherwise
 */

/**
 * Get all input and output parameters of the component
 * @callback ApiComponentGetAllParams
 * @param {'componentgetallparams'} name Method name
 * @returns {Promise<(({ limit: number, required: boolean, paramType: 'input' } | { paramType: 'output' }) & { name: string, type: string })[]>}
 * A Promise that resolves to an array of input and output parameters
 */

/**
 * @typedef {Object} TApi
 * @property {ApiAlert & ApiConfirm & ApiGetField & ApiSetField & ApiNewOutput & ApiReadFile & ApiReadFileAbsolute & ApiReadFileFrom & ApiSaveFile & ApiSaveFileAbsolute & ApiSaveFileAs & ApiRunFile & ApiRunCommand & ApiRunCommandInShell & ApiSystemInfo & ApiFetch & ApiBindToPort & ApiUnbindFromPort & ApiSendToPort & ApiComponentAddInputParam & ApiComponentHasInputParam & ApiComponentRemoveInputParam & ApiComponentAddOutputParam & ApiComponentHasOutputParam & ApiComponentRemoveOutputParam & ApiComponentGetAllParams} call
 * Call an API method. Watch out for `undefined` after resolving in case the API cannot process the request!
 * @property {() => void} destroy Destroy the sender of the Api
 */

/**
 * Create an api instance
 * @param {{ call: (...args) => Promise<any> }} sender The caller object
 * @returns {TApi} The api instance
 */
export default function Api (sender) {
  /**
   * @type {TApi}
   */
  const exports = {};

  exports.call = function (name, ...args) {
    if (!sender) { return Promise.resolve(undefined); }

    const directPass = (event = name, _args = args) => Promise.resolve(window.directComponentApi.call(event, ..._args));
    const parentPass = (event = name, _args = args) => Promise.resolve(sender.call.apply(null, [event, ..._args]));

    switch (name) {
      case 'getfield':
      case 'setfield':
      case 'readfile':
      case 'savefile':
      case 'runfile':
        // Direct pass with received entity
        return parentPass('componentgetentity', []).then(
          (entity) => directPass(name, [entity, ...args])
        );
      case 'readfilefrom':
      case 'savefileas':
      case 'runcommand':
      case 'runcommandinshell':
      case 'systeminfo':
      case 'fetch':
        // Direct pass without entity
        return directPass();
      case 'readfileabsolute':
        // Confirm first before direct passing
        return parentPass('readfileabsoluteconfirm').then(
          (confirm) => confirm ? directPass() : null
        );
      case 'savefileabsolute':
        // Confirm first before direct passing
        return parentPass('savefileabsoluteconfirm').then(
          (confirm) => confirm ? directPass() : null
        );
      case 'alert':
      case 'confirm':
      case 'newoutput':
      case 'bindtoport':
      case 'unbindfromport':
      case 'sendtoport':
      case 'componentgetentity':
      case 'componentgetname':
      case 'componentsetname':
      case 'componentgetbackground':
      case 'componentsetbackground':
      case 'componentaddinputparam':
      case 'componenthasinputparam':
      case 'componentremoveinputparam':
      case 'componentaddoutputparam':
      case 'componenthasoutputparam':
      case 'componentremoveoutputparam':
      case 'componentgetallparams':
        return parentPass();
      default:
        throw new Error(`Unrecognized Api method call \`${name}\``);
    }
  };

  // Handle error raised from the APIs
  const errorHandler = (event, err) => {
    exports.call('alert', err);
  };
  window.ipcRenderer.on('request-raise-error', errorHandler);

  exports.destroy = function () {
    window.ipcRenderer.removeListener('request-raise-error', errorHandler);
    sender = undefined;
  };

  return exports;
}
