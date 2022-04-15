import { IpcRendererEvent, WebContents } from 'electron'; // eslint-disable-line

/**
 * @typedef {Object} ElectronExposed
 * @property {(event: string, ...args: any[]) => Promise<any>} invoke Invoke an event and expect a result asynchronously
 * @property {(event: string, listener: (...args: any[]) => void) => ElectronExposed} on Bind a listener to an event
 * @property {(event: string) => ElectronExposed} removeAllListeners Remove all listeners of an event
 * @property {(event: string, listener: (...args: any[]) => void) => ElectronExposed} removeListener Remove a specific listener from an event
 * @property {(event: string, ...args: any[]) => ElectronExposed} send Trigger an event
 * @property {(event: string, ...args: any[]) => any} sendSync Trigger an event that returns a value
 */

/**
 * @type {ElectronExposed}
 */
const ipcRenderer = window.ipcRenderer;

// PRIVATE ATTRIBUTES
const _collection = {};
const _cache = {};
const _callers = {};
let _callerID = 0;

/**
 * Invoke the event to the current ipcRenderer and expect a result asynchronously
 * @callback EventEntryInvoke
 * @param {...any} args Arguments that will be serialized with the Structured Clone Algorithm
 * @returns {Promise<any>} Returned value from the event handler
 */

/**
 * Dispatch the event to the current ipcRenderer
 * @callback EventEntrySend
 * @param {...any} args Arguments that will be serialized with the Structured Clone Algorithm
 */

/**
 * Dispatch the event to the current ipcRenderer and get their returned values
 * @callback EventEntrySendSync
 * @param {...any} args Arguments that will be serialized with the Structured Clone Algorithm
 * @returns {*} Returned value from the event handler
 */

/**
 * Trigger an event under the hood of another event, useful for forwarding events
 * @callback EventEntryTrigger
 * @param {IpcRendererEvent} event The event to be attached to the trigger
 * @param  {...any} args Arguments to be passed to the event
 * @returns {*|null} Returned value from the caller or null if the caller does not exist
 */

/**
 * @typedef {Object} EventEntry
 * @property {EventEntryInvoke} invoke Invoke the event and expect a result asynchronously
 * @property {EventEntrySend} send Dispatch the event
 * @property {EventEntrySendSync} sendSync Dispatch the event and get the return value
 * @property {EventEntryTrigger} trigger Trigger the event caller
 * @property {Object.<string, unknown>} cache Globally cached data of the event
 */

/**
 * Check whether an event exists in the collection
 * @callback EventHaving
 * @param {string} eventId Event id to be searched for
 * @returns {boolean} true if the event exists, false otherwise
 */

/**
 * An event caller of an EventCollection event, which will be bound to `ipcRenderer.on`
 * @callback EventListener
 * @param {EventEntry} this The event entry from the collection
 * @param {IpcRendererEvent} event The event object
 * @param {...any} args Arguments of the event
 */

/**
 * A collection of all events so that we never have to look for their names.
 *
 * The implementation mirrors the EventCollection of the back-end.
 *
 * @class EventCollection
 */
export default class EventCollection {
  /**
   * The event collection
   * @type {Object.<string, EventEntry> & { __having: EventHaving }}
   */
  static events = new Proxy(_collection, {
    get (target, name) {
      // Secure a property for checking availability of an event
      if (name === '__having__') { return (eventId) => Object.prototype.hasOwnProperty.call(target, eventId); }

      const obj = (Object.prototype.hasOwnProperty.call(target, name)
        ? {
            invoke: (...args) => {
              return ipcRenderer.invoke.apply(null, [target[name].name].concat(args));
            },
            send: (...args) => {
              if (target[name].onlyInvoke) { throw new Error(`Event \`${name}\` is only invoke-able`); }
              ipcRenderer.send.apply(null, [target[name].name].concat(args));
            },
            sendSync: (...args) => {
              if (target[name].onlyInvoke) { throw new Error(`Event \`${name}\` is only invoke-able`); }
              return ipcRenderer.sendSync.apply(null, [target[name].name].concat(args));
            },
            trigger: (event, ...args) => {
              return $.type(target[name].caller) === 'function' ? target[name].caller.apply(obj, [event].concat(args)) : null;
            },
            get cache () {
              return _getCache(target[name].namespace);
            }
          }
        : null);
      return obj;
    }
  })

  /**
   * Declare an event
   * @param {Object} event The event config object
   * @param {string} event.id Event id that will be used when accessing the collection
   * @param {string} event.name Event name that will be used when listen/call the event
   * @param {string=} event.namespace The namespace that will be used when getting the event data.
   * Each event will have a dedicated object to store data between triggers.
   * If not provided, it will use `event.id` as the namespace.
   * @param {EventListener=} event.caller The function that will be called when the event is triggered.
   * If not provided, the event becomes one-way, i.e., dispatchable but not receivable.
   * @param {boolean} [event.onlyInvoke=false] true to only allow invoking the event (the event is asynchronous only),
   * false otherwise
   * @param {boolean} [safe=false] If true, duplicating events are allowed and later added ones will replace the former.
   * This is simply done by calling `EventCollection.off` if the event already exists.
   * @returns {EventCollection} The class itself for chaining purposes
   */
  static on (event, safe = false) {
    event = Object.assign({
      id: null,
      name: null,
      namespace: null,
      caller: null,
      onlyInvoke: false
    }, event);

    if ($.type(event.id) !== 'string' || !event.id.length) { throw new Error('Event id must be a non-empty string'); }
    if ($.type(event.name) !== 'string' || !event.name.length) { throw new Error('Event name must be a non-empty string'); }
    if (safe && Object.prototype.hasOwnProperty.call(_collection, event.id)) { this.off(event.id); }
    if (Object.prototype.hasOwnProperty.call(_collection, event.id)) { throw new Error(`Duplicating declaration of event.${event.id}`); }
    if ($.type(event.namespace) !== 'string' || !event.namespace.length) { event.namespace = event.id; }

    _collection[event.id] = {
      name: event.name,
      namespace: event.namespace,
      caller: event.caller,
      onlyInvoke: event.onlyInvoke
    };

    if ($.type(event.caller) === 'function') {
      ipcRenderer.on(event.name, (_event, ...args) => {
        Object.values(_callers, (caller) => {
          (async () => {
            caller.apply(this.events[event.id], [event.id].concat(args));
          })();
        });
        _event.returnValue = event.caller.apply(this.events[event.id], [_event].concat(args));
      });
    }

    return this;
  }

  /**
   * Remove a declared event
   * @param {string} eventId The event id
   * @param {boolean} [safe=false] If true, removing non-existing events will not throw an `Error`
   * @returns {EventCollection} The class itself for chaining purposes
   */
  static off (eventId, safe = false) {
    if (!safe && !Object.prototype.hasOwnProperty.call(_collection, eventId)) { throw new Error(`Removing non-existing event.${eventId} is not allowed`); }

    ipcRenderer.removeAllListeners(_collection[eventId].name);

    delete _cache[_collection[eventId].namespace];
    delete _collection[eventId];

    return this;
  }

  /**
   * Get the cached object of a namespace
   * @param {string} namespace Namespace of the cached object
   * @returns {Object.<string, unknown>} The cached object
   */
  static cache (namespace) {
    if ($.type(namespace) === 'string') { throw new Error('Cache namespace must be a string'); }
    if (!Object.prototype.hasOwnProperty.call(_cache, namespace)) { _cache[namespace] = {}; }
    return _cache[namespace];
  }

  /**
   * Bind a caller that listens to all events
   * @param {(eventId: string, ...args: any[]) => void} caller A function to be called asynchronously
   * @returns {number} The id used for unsubscribing
   */
  static subscribe (caller) {
    _callers[++_callerID] = caller;
    return _callerID;
  }

  /**
   * Unsubscribe a caller from the event collection
   * @param {number} subscriptionID The id returned when subscribing
   */
  static unsubscribe (subscriptionID) {
    delete _callers[subscriptionID];
  }
}

// PRIVATE METHODS
function _getCache (namespace) {
  return module.exports.cache(namespace);
}
