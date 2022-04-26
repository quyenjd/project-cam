/**
 * Object to store the data of a file
 * @category Output
 */
export interface FileData {
  /**
   * Data of the file
   */
  data: string;

  /**
   * Full directory to the file
   */
  fullPath: string;
}

/**
 * Object to store a group of extensions with a given name
 * @category Input
 */
export interface FileExtension {
  /**
   * Extensions of the extension group
   */
  extensions: string[];

  /**
   * Name of the extension group
   */
  name: string;
}

/**
 * Launch an alert box on the application
 * @category Methods
 */
export interface ApiAlert {
  /**
   * @param name Method name
   * @param message Alert message
   * @returns A Promise that resolves when the alert box is closed
   */
  (name: 'alert', message?: string): Promise<void>;
}

/**
 * Launch a confirmation box on the application
 * @category Methods
 */
export interface ApiConfirm {
  /**
   * @param name Method name
   * @param message Confirmation prompt
   * @returns A Promise that resolves when the confirmation box is closed.
   * Return value `true` means user chooses OK, otherwise `false` if user chooses Cancel.
   */
  (name: 'confirm', message?: string): Promise<boolean>;
}

/**
 * Get value of a configuration field
 * @category Methods
 */
export interface ApiGetField {
  /**
   * @param name Method name
   * @param key The field to get the value of
   * @returns A Promise that resolves to the value of the field or null if the key has not been set
   */
  (name: 'getfield', key: string): Promise<string | null>;
}

/**
 * Set value of a configuration field
 * @category Methods
 */
export interface ApiSetField {
  /**
   * @param name Method name
   * @param key The field to set the value of
   * @param value New value of the field
   * @returns A Promise that resolves to the old value of the field
   * or null if the key has only just been set
   */
  (name: 'setfield', key: string, value: string): Promise<string | null>;
}

/**
 * Send new output to the application
 * @category Methods
 */
export interface ApiNewOutput {
  /**
   * @param name Method name
   * @param output New output to merge with the current output of the component
   * @returns A Promise that resolves when the method finishes
   */
  (name: 'newoutput', output: Record<string, any>): Promise<void>;
}

/**
 * Read the content of a file
 * @category Methods
 */
export interface ApiReadFile {
  /**
   * @param name Method name
   * @param dir Directory of the file (must be inside the component folder)
   * @param encoding Specify how to read the file properly (default to `utf8`)
   * @returns A Promise that resolves to the content of the file, or null if the file cannot be read
   */
  (name: 'readfile', dir: string, encoding?: string): Promise<string | null>;
}

/**
 * Read the content of a file using its absolute path (will require permission from application)
 * @category Methods
 */
export interface ApiReadFileAbsolute {
  /**
   * @param name Method name
   * @param dir Absolute directory of the file
   * @param encoding Specify how to read the file properly (default to `utf8`)
   * @returns A Promise that resolves to the content of the file(s), or null
   * if the file does not exist or the operation is not allowed
   */
  (name: 'readfileabsolute', dir: string, encoding?: string): Promise<string | null>;
}

/**
 * Launch a dialog to ask user where the file is then read the content of it
 * @category Methods
 */
export interface ApiReadFileFrom {
  /**
   * @param name Method name
   * @param multiple true to allow reading multiple files, false (default) otherwise
   * @param encoding Specify how to read the file properly (default to `utf8`)
   * @param title Title of the dialog (default to `Open File...`)
   * @param fileExt Extensions shown in the dialog
   * @returns A Promise that resolves to the selected file(s),
   * or null if the user cancels or the file cannot be read
   */
  (name: 'readfilefrom', multiple?: boolean, encoding?: string, title?: string, fileExt?: FileExtension[]): Promise<FileData | FileData[] | null>;
}

/**
 * Save data to a file
 * @category Methods
 */
export interface ApiSaveFile {
  /**
   * @param name Method name
   * @param dir Directory of the file (must be inside the component folder)
   * @param data Data of the file
   * @param encoding Specify how to save the file properly (default to `utf8`)
   * @returns A Promise that resolves to true if the file has been saved, false otherwise
   */
  (name: 'savefile', dir: string, data: string, encoding?: string): Promise<boolean>;
}

/**
 * Save data to a file using its absolute path (will require permission from application)
 * @category Methods
 */
export interface ApiSaveFileAbsolute {
  /**
   * @param name Method name
   * @param dir Absolute directory of the file
   * @param data Data of the file
   * @param encoding Specify how to save the file properly (default to `utf8`)
   * @returns A Promise that resolves to true if the file has been saved,
   * false if the file cannot be saved or the operation is not allowed
   */
  (name: 'savefileabsolute', dir: string, data: string, encoding?: string): Promise<boolean>;
}

/**
 * Launch a dialog to ask user where to save a file then save it
 * @category Methods
 */
export interface ApiSaveFileAs {
  /**
   * @param name Method name
   * @param data Data of the file
   * @param encoding Specify how to save the file properly (default to `utf8`)
   * @param title Title of the dialog (default to `Save File As...`)
   * @param fileExt Extensions shown in the dialog
   * @returns A Promise that resolves to the directory of the saved file,
   * or null if the user cancels or the file cannot be saved
   */
  (name: 'savefileas', data: string, encoding?: string, title?: string, fileExt?: FileExtension[]): Promise<string | null>;
}

/**
 * Object to store the response from run commands
 * @category Output
 */
export interface ApiRunResponse {
  /**
   * Exit code of the process
   */
  exitCode: number;

  /**
   * Terminating signal of the process
   */
  signal: string;

  /**
   * Stdout data from the process
   */
  stdout: string;

  /**
   * Stderr data from the process
   */
  stderr: string;
}

/**
 * Configurations of `runfile` commands
 * @category Input
 */
export interface ApiRunFileOptions {
  /**
   * Arguments to be passed to the file (default to `[]`)
   */
  args?: string[];

  /**
   * Working directory of the file (default to the directory of the component)
   */
  cwd?: string;

  /**
   * Timeout of the running process in milliseconds
   */
  timeout?: number;

  /**
   * Encoding of the stdout and stderr streams (default to `utf8`)
   */
  encoding?: string;
}

/**
 * Run a JavaScript file in a child_process
 * @category Methods
 */
export interface ApiRunFile {
  /**
   * @param name Method name
   * @param dir Directory of the file (must be inside the component folder)
   * @param options Running options
   * @returns A Promise that resolves when the running process is done
   */
  (name: 'runfile', dir: string, options?: ApiRunFileOptions): Promise<ApiRunResponse>;
}

/**
 * Configurations of `runcommand` commands
 * @category Input
 */
export interface ApiRunCommandOptions {
  /**
   * Arguments to be passed to the command (default to `[]`)
   */
  args?: string[];

  /**
   * Working directory of the command (default to the directory of the component)
   */
  cwd?: string;

  /**
   * Timeout of the running process in milliseconds
   */
  timeout?: number;

  /**
   * Hide subprocess console window in Windows (default to `false`)
   */
  windowsHide?: boolean;

  /**
   * Encoding of the stdout and stderr streams (default to `utf8`)
   */
  encoding?: string;
}

/**
 * Run a command in a child_process
 * @category Methods
 */
export interface ApiRunCommand {
  /**
   * @param name Method name
   * @param command The command to run
   * @param options Running options
   * @returns A Promise that resolves when the running process is done
   */
  (name: 'runcommand', command: string, options?: ApiRunCommandOptions): Promise<ApiRunResponse>;
}

/**
 * Configurations of `runcommandinshell` commands
 * @category Input
 */
export interface ApiRunCommandInShellOptions {
  /**
   * Working directory of the command (default to the directory of the component)
   */
  cwd?: string;

  /**
   * Timeout of the running process in milliseconds
   */
  timeout?: number;

  /**
   * Hide subprocess console window in Windows (default to `false`)
   */
  windowsHide?: boolean;

  /**
   * Encoding of the stdout and stderr streams (default to `utf8`)
   */
  encoding?: string;

  /**
   * Maximum amount of data (in bytes) allowed on stdout and stderr (default to `1048576`)
   */
  maxBuffer?: number;
}

/**
 * Run a command in a shell
 * @category Methods
 */
export interface ApiRunCommandInShell {
  /**
   * @param name Method name
   * @param command The command to run, including space-seperated arguments
   * @param options Running options
   * @returns A Promise that resolves when the running process is done
   */
  (name: 'runcommandinshell', command: string, options?: ApiRunCommandInShellOptions): Promise<ApiRunResponse>;
}

/**
 * Get all kinds of system information using `systeminformation`
 * @category Methods
 */
export interface ApiSystemInfo {
  /**
   * @param name Method name
   * @param valueObject Parameter to `si.get()`.
   * Information on how to use this can be found here: https://systeminformation.io/general.html
   * @returns Return value from `si.get()`
   */
  (name: 'systeminfo', valueObject: any): Promise<any>;
}

/**
 * Configurations of `fetch` commands
 * @category Input
 */
export interface ApiFetchOptions {
  /**
   * Fetch request method (default to `GET`)
   */
  method?: string;

  /**
   * Request headers
   */
  headers?: Record<string, string>;

  /**
   * Request body (default to `null`)
   */
  body?: string | null | Blob;

  /**
   * Response type (default to `text`)
   */
  type?: 'blob' | 'json' | 'text';

  /**
   * Maximum waiting time in ms, 0 (default) to disable
   */
  timeout?: number;

  /**
   * Maximum size of response body, 0 (default) to disable
   */
  size?: number;

  /**
   * When running on Electron behind an authenticated HTTP proxy, provide username to authenticate
   */
  user?: string;

  /**
   * When running on Electron behind an authenticated HTTP proxy, provide password to authenticate
   */
  password?: string;
}

/**
 * Object to store the response from `fetch` commands
 * @category Output
 */
export interface ApiFetchResponse<ResponseType> {
  /**
   * URL that was used to fetch the response to
   */
  url: string;

  /**
   * Response status
   */
  status: number;
  
  /**
   * Response status text
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Response body, might be a string, a Blob, or a parsed JSON object
   */
  body: ResponseType;
}

/**
 * Fetch data from URLs
 * @category Methods
 */
export interface ApiFetch {
  /**
   * @param name Method name
   * @param url **Absolute** url to fetch the request
   * @param options Fetch options
   * @returns A Promise that resolves when fetching is done
   */
  (name: 'fetch', url: string, options?: ApiFetchOptions & { type: 'blob' }): Promise<ApiFetchResponse<Blob>>;

  /**
   * @param name Method name
   * @param url **Absolute** url to fetch the request
   * @param options Fetch options
   * @returns A Promise that resolves when fetching is done
   */
  (name: 'fetch', url: string, options?: ApiFetchOptions & { type: 'json' }): Promise<ApiFetchResponse<Object>>;

  /**
   * @param name Method name
   * @param url **Absolute** url to fetch the request
   * @param options Fetch options
   * @returns A Promise that resolves when fetching is done
   */
  (name: 'fetch', url: string, options?: ApiFetchOptions & { type: 'text' }): Promise<ApiFetchResponse<string>>;
}

/**
 * Bind the component to a port. To have a function called upon data changes to the port,
 * use `event.bind('port.[YOUR PORT]', callback)`.
 * @category Methods
 */
export interface ApiBindToPort {
  /**
   * @param name Method name
   * @param port Port to bind the component to
   * @returns A Promise that resolves to a boolean indicating whether the component has successfully bound to the port
   */
  (name: 'bindtoport', port: number): Promise<boolean>;
}

/**
 * Unbind the component from a port
 * @category Methods
 */
export interface ApiUnbindFromPort {
  /**
   * @param name Method name
   * @param port Port to unbind the component from
   * @returns A Promise that resolves when the method finishes
   */
  (name: 'unbindfromport', port: number): Promise<void>;
}

/**
 * Send new data to a port. If no component is listening, the data will NOT be stored in the application.
 * @category Methods
 */
export interface ApiSendToPort {
  /**
   * @param name Method name
   * @param port Port to send the data to
   * @param data Data to be sent to the port
   * @returns A Promise that resolves to the number of components listening to the port
   */
  (name: 'sendtoport', port: number, data: any): Promise<number>;
}

/**
 * Get the entity of the component
 * @category Methods
 */
export interface ApiComponentGetEntity {
  /**
   * @param name Method name
   * @returns A Promise that resolves to the entity of the component
   */
  (name: 'componentgetentity'): Promise<string>;
}

/**
 * Get the name of the component
 * @category Methods
 */
export interface ApiComponentGetName {
  /**
   * @param name Method name
   * @returns A Promise that resolves to the name of the component
   */
  (name: 'componentgetname'): Promise<string>;
}

/**
 * Set the name of the component
 * @category Methods
 */
export interface ApiComponentSetName {
  /**
   * @param name Method name
   * @param newName New name of the component
   * @returns A Promise that resolves to the name of the component after updating
   */
  (name: 'componentsetname', newName: string): Promise<string>;
}

/**
 * Get the background color (hex) of the component
 * @category Methods
 */
export interface ApiComponentGetBackground {
  /**
   * @param name Method name
   * @returns A Promise that resolves to the background color of the component
   */
  (name: 'componentgetbackground'): Promise<string>;
}

/**
 * Set the background color (hex) of the component
 * @category Methods
 */
export interface ApiComponentSetBackground {
  /**
   * @param name Method name
   * @returns A Promise that resolves to the background color of the component after updating
   */
  (name: 'componentsetbackground'): Promise<string>;
}

/**
 * Add an input parameter to the component
 * @category Methods
 */
export interface ApiComponentAddInputParam {
  /**
   * @param name Method name
   * @param param Name of the parameter
   * @param options Options of the parameter
   * @returns A Promise that resolves to true if the parameter has been added, or false otherwise
   */
  (name: 'componentaddinputparam', param: string, options?: { limit?: number, required?: boolean, type?: string }): Promise<boolean>;
}

/**
 * Check if the component has an input parameter
 * @category Methods
 */
export interface ApiComponentHasInputParam {
  /**
   * @param name Method name
   * @param param Name of the parameter
   * @returns A Promise that resolves to true if the parameter exists, or false otherwise
   */
  (name: 'componenthasinputparam', param: string): Promise<boolean>;
}

/**
 * Remove an input parameter from the component
 * @category Methods
 */
export interface ApiComponentRemoveInputParam {
  /**
   * @param name Method name
   * @param param Name of the parameter
   * @returns A Promise that resolves to true if the parameter has been removed, or false otherwise
   */
  (name: 'componentremoveinputparam', param: string): Promise<boolean>;
}

/**
 * Add an output parameter to the component
 * @category Methods
 */
export interface ApiComponentAddOutputParam {
  /**
   * @param name Method name
   * @param param Name of the parameter
   * @param options Options of the parameter
   * @returns A Promise that resolves to true if the parameter has been added, or false otherwise
   */
  (name: 'componentaddoutputparam', param: string, options?: { type?: string }): Promise<boolean>;
}

/**
 * Check if the component has an output parameter
 * @category Methods
 */
export interface ApiComponentHasOutputParam {
  /**
   * @param name Method name
   * @param param Name of the parameter
   * @returns A Promise that resolves to true if the parameter exists, or false otherwise
   */
  (name: 'componenthasoutputparam', param: string): Promise<boolean>;
}

/**
 * Remove an output parameter from the component
 * @category Methods
 */
export interface ApiComponentRemoveOutputParam {
  /**
   * @param name Method name
   * @param param Name of the parameter
   * @returns A Promise that resolves to true if the parameter has been removed, or false otherwise
   */
  (name: 'componentremoveoutputparam', param: string): Promise<boolean>;
}

/**
 * Get all input and output parameters of the component
 * @category Methods
 */
export interface ApiComponentGetAllParams {
  /**
   * @param name Method name
   * @returns A Promise that resolves to an array of input and output parameters
   */
  (name: 'componentgetallparams'): Promise<(({ limit: number, required: boolean, paramType: 'input' } | { paramType: 'output' }) & { name: string, type: string })[]>
}

export interface TApi {
  /**
   * Call an API method. Watch out for `undefined` after resolving in case the API cannot process the request!
   */
  call: ApiAlert 
    & ApiConfirm
    & ApiGetField
    & ApiSetField
    & ApiNewOutput
    & ApiReadFile
    & ApiReadFileAbsolute
    & ApiReadFileFrom
    & ApiSaveFile
    & ApiSaveFileAbsolute
    & ApiSaveFileAs
    & ApiRunFile
    & ApiRunCommand
    & ApiRunCommandInShell
    & ApiSystemInfo
    & ApiFetch
    & ApiBindToPort
    & ApiUnbindFromPort
    & ApiSendToPort
    & ApiComponentGetEntity
    & ApiComponentGetName
    & ApiComponentSetName
    & ApiComponentGetBackground
    & ApiComponentSetBackground
    & ApiComponentAddInputParam
    & ApiComponentHasInputParam
    & ApiComponentRemoveInputParam
    & ApiComponentAddOutputParam
    & ApiComponentHasOutputParam
    & ApiComponentRemoveOutputParam
    & ApiComponentGetAllParams;

  /**
   * Destroy the sender of the API
   */
  destroy: () => void;
}

/**
 * Create an API instance
 * @param sender The caller object
 * @returns The API instance
 */
export default function Api (sender?: { call: (...args: any[]) => Promise<any> }): TApi {
  const exports: TApi = {} as never;

  exports.call = function (name, ...args: any[]) {
    if (!sender) { return Promise.resolve(undefined); }

    const directPass = (event = name, _args = args) =>
      Promise.resolve((window as any).directComponentApi.call(event, ..._args));
    const parentPass = (event: (typeof name | 'componentgetentity' | 'readfileabsoluteconfirm' | 'savefileabsoluteconfirm') = name, _args = args) =>
      Promise.resolve(sender?.call.apply(null, [event, ..._args]));

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
  const errorHandler = (event: string, err: any) => {
    exports.call('alert', err);
  };
  (window as any).ipcRenderer.on('request-raise-error', errorHandler);

  exports.destroy = function () {
    (window as any).ipcRenderer.removeListener('request-raise-error', errorHandler);
    sender = undefined;
  };

  return exports;
}
