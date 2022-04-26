interface Listener {
  /**
   * @deprecated This function is only for making the interface *callable*
   * @ignore
   */
  (): never;
}

/**
 * @category Callback
 */
export interface EventNewInputListener extends Listener {
  /**
   * @param input New input as an object where keys are the input parameters listed in the component JSON file
   * @returns New output to merge with the current output of the component
   */
  (input: Record<string, { param: string, value: any }[]>): Record<string, any> | Promise<Record<string, any>>;
}

/**
 * Triggered when the component receives new input
 * @category Event
 */
export interface EventNewInput {
  /**
   * @param name Event name
   * @param listener Event listener
   */
  (name: 'newinput', listener: EventNewInputListener): void;
}

/**
 * @category Callback
 */
export interface EventBackupListener extends Listener {
  /**
   * @returns Backup data of the component to save with the session data
   */
  (): Record<string, any> | Promise<Record<string, any>>;
}

/**
 * Triggered when the component is required to send backup data
 * @category Event
 */
export interface EventBackup {
  /**
   * @param name Event name
   * @param listener Event listener
   */
  (name: 'backup', listener: EventBackupListener): void;
}

/**
 * @category Callback
 */
export interface EventRestoreListener extends Listener {
  /**
   * @param data Backup data of the component that was saved before
   * @returns true if the restoration succeeds, false otherwise
   */
  (data: Record<string, any>): boolean | Promise<boolean>;
}

/**
 * Triggered when the component is required to restore from backup data
 * @category Event
 */
export interface EventRestore {
  /**
   * @param name Event name
   * @param listener Event listener
   */
  (name: 'restore', listener: EventRestoreListener): void;
}

/**
 * @category Callback
 */
export interface EventWillRemoveListener extends Listener {
  /**
   * @param force true if the application forces removing the component, false otherwise
   * @returns Return `false` to prevent it from being removed
   */
  (force: boolean): boolean | Promise<boolean>
}

/**
 * Triggered when the component is to be removed
 * @category Event
 */
export interface EventWillRemove {
  /**
   * @param name Event name
   * @param listener Event listener
  */
 (name: 'willremove', listener: EventWillRemoveListener): void;
}

/**
 * @category Callback
 */
export interface EventErrorListener extends Listener {
  /**
   * @param error Message from the application
   */
  (error: string): void;
}

/**
 * Triggered when the application detects an error with the component
 * @category Event
 */
export interface EventError {
  /**
   * @param name Event name
   * @param listener Event listener
   */
  (name: 'error', listener: EventErrorListener): void;
}

/**
 * @category Callback
 */
export interface EventPortListener extends Listener {
  /**
   * @param data New data from the port
   */
  (data: string): void;
}

/**
 * Triggered when the data of the port that the component is bound to changes
 * @category Event
 */
export interface EventPort {
  /**
   * @param name Event name (starting with `port.`, following by the port)
   * @param listener Event listener
   */
  (name: string, listener: EventPortListener): void;
}

export interface TEvent {
  /**
   * Bind a listener to an event. Note that there is only one listener per event and
   * calling `bind` twice on an event will override the old listener with the new one.
   */
  bind: EventNewInput
    & EventBackup
    & EventRestore
    & EventWillRemove
    & EventError
    & EventPort;

  /**
   * Call the listener of an event asynchronously
   */
  call: (name: string, thisArg: any, ...args: any) => Promise<unknown | undefined>;

  /**
   * Unbind the listener from an event
   */
  unbind: (name: string) => void;

  /**
   * Remove all listeners of all events
   */
  reset: () => void;
}

/**
 * Create an event manager instance
 * @returns The event manager instance
 */
export default function Event (): TEvent {
  const exports: TEvent = {} as never;
  let events: Record<string, Listener> = {};

  exports.bind = function (name, listener) {
    if (!_checkEventName(name)) { throw new Error(`Unsupported event \`${name}\``); }
    if (typeof listener === 'function') { events[name] = listener; }
  };

  exports.call = function (name, thisArg, ...args) {
    return Promise.resolve().then(() => Object.prototype.hasOwnProperty.call(events, name) ? events[name].apply(thisArg, args) : undefined);
  };

  exports.unbind = function (name) {
    delete events[name];
  };

  exports.reset = function () {
    events = {};
  };

  function _checkEventName (name: string) {
    return ['newinput', 'backup', 'restore', 'willremove', 'error'].indexOf(name) >= 0 || name.match(/^port\./);
  }

  return exports;
}
