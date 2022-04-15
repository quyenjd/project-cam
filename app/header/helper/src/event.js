/**
 * @callback EventNewInputListener
 * @param {Object.<string, { param: string, value: any }[]>} input New input
 * as an object where keys are the input parameters listed in the component JSON file
 * @returns {Object.<string, *>|Promise<Object.<string, *>>} New output to merge with the current output of the component
 */

/**
 * Called when the component receives new input
 * @callback EventNewInput
 * @param {'newinput'} name Event name
 * @param {EventNewInputListener} listener Event listener
 * @returns {void}
 */

/**
 * @callback EventBackupListener
 * @returns {Object.<string, *>|Promise<Object.<string, *>>} Backup data of the component to save with the session data
 */

/**
 * Called when the component is required to send backup data
 * @callback EventBackup
 * @param {'backup'} name Event name
 * @param {EventBackupListener} listener Event listener
 * @returns {void}
 */

/**
 * @callback EventRestoreListener
 * @param {Object.<string, *>} data Backup data of the component that was saved before
 * @returns {boolean|Promise<boolean>} true if the restoration succeeds, false otherwise
 */

/**
 * Called when the component is required to restore from backup data
 * @callback EventRestore
 * @param {'restore'} name Event name
 * @param {EventRestoreListener} listener Event listener
 * @returns {void}
 */

/**
 * @callback EventWillRemoveListener
 * @param {boolean} force true if the application forces removing the component, false otherwise
 * @returns {boolean|Promise<boolean>} Return `false` to prevent it from being removed
 */

/**
 * Called when the component is to be removed
 * @callback EventWillRemove
 * @param {'willremove'} name Event name
 * @param {EventWillRemoveListener} listener Event listener
 * @returns {void}
 */

/**
 * @callback EventErrorListener
 * @param {string} error Message from the application
 * @returns {void}
 */

/**
 * Called when the application detects an error with the component (RARE)
 * @callback EventError
 * @param {'error'} name Event name
 * @param {EventErrorListener} listener Event listener
 * @returns {void}
 */

/**
 * @callback EventPortListener
 * @param {string} data New data from the port
 * @returns {void}
 */

/**
 * Called when the data of the port that the component is bound to changes
 * @callback EventPort
 * @param {string} name Event name (starting with `port.`, following by the port)
 * @param {EventPortListener} listener Event listener
 * @returns {void}
 */

/**
 * @typedef {Object} TEvent
 * @property {EventNewInput & EventBackup & EventRestore & EventWillRemove & EventError & EventPort} bind
 * Bind a listener to an event. Note that there is only one listener per event and
 * calling `bind` twice on an event will override the old listener with the new one.
 * @property {(name: string, thisArg: any, ...args: any) => Promise<unknown|undefined>} call
 * Call the listener of an event asynchronously
 * @property {(name: string) => void} unbind Unbind the listener of an event
 * @property {() => void} reset Remove all listeners of all events
 */

/**
 * Create an event manager instance
 * @returns {TEvent} The event manager instance
 */
export default function Event () {
  /**
   * @type {TEvent}
   */
  const exports = {};
  let events = {};

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

  function _checkEventName (name) {
    return ['newinput', 'backup', 'restore', 'willremove', 'error'].indexOf(name) >= 0 || name.match(/^port\./);
  }

  return exports;
}
