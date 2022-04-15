const { ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } = require('electron'); // eslint-disable-line
const { isFunction, assign, isString, pickBy, includes, isArray } = require('lodash');
const { types } = require('util');

// PRIVATE ATTRIBUTES
const _collection = {};
const _cache = {};
const _callers = {};
let _callerID = 0;

/**
 * Dispatch the event to the emitters
 * @callback EventEntrySend
 * @param {WebContents|WebContents[]} emitter The `webContents` that will be sent the event. Usually `event.sender`.
 * @param {...any} args Arguments that will be serialized with the Structured Clone Algorithm
 */

/**
 * Trigger an event under the hood of another event, useful for forwarding events
 * @callback EventEntryTrigger
 * @param {IpcMainEvent|IpcMainInvokeEvent} event The event to be attached to the trigger
 * @param {...any} args Arguments to be passed to the event
 * @returns {*|null} Returned value from the caller or null if the caller does not exist
 */

/**
 * @typedef {Object} EventEntry
 * @property {EventEntrySend} send Dispatch the event to the emitters
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
 * An event caller of an EventCollection event, which will be bound to `ipcMain.on` and `ipcMain.handle`
 * @callback EventListener
 * @param {EventEntry} this The event entry from the collection
 * @param {IpcMainEvent&IpcMainInvokeEvent} event The event object that contains only properties in both types of events
 * @param {...any} args Arguments of the event
 * @returns {*|Promise<*>} Returned value from the event (do not use `event.returnValue`)
 */

/**
 * A collection of all events so that we never have to look for their names
 * @module EventCollection
 */
module.exports = class EventCollection {
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
            send: (emitter, ...args) => {
              (isArray(emitter) ? emitter : [emitter]).forEach((_sendTo) => _sendTo.send.apply(_sendTo, [target[name].name].concat(args)));
            },
            trigger: (event, ...args) => {
              return isFunction(target[name].caller) ? target[name].caller.apply(obj, [_normalizeEvent(event)].concat(args)) : null;
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
   * If an async function is provided, the event becomes `invoke`able only.
   * @param {boolean} [safe=false] If true, duplicating events are allowed and later added ones will replace the former.
   * This is simply done by calling `EventCollection.off` if the event already exists.
   * @returns {EventCollection} The class itself for chaining purposes
   */
  static on (event, safe = false) {
    event = assign({
      id: null,
      name: null,
      namespace: null,
      caller: null
    }, event);

    if (!isString(event.id) || !event.id.length) { throw new Error('Event id must be a non-empty string'); }
    if (!isString(event.name) || !event.name.length) { throw new Error('Event name must be a non-empty string'); }
    if (safe && Object.prototype.hasOwnProperty.call(_collection, event.id)) { this.off(event.id); }
    if (Object.prototype.hasOwnProperty.call(_collection, event.id)) { throw new Error(`Duplicating declaration of event.${event.id}`); }
    if (!isString(event.namespace) || !event.namespace.length) { event.namespace = event.id; }

    _collection[event.id] = {
      name: event.name,
      namespace: event.namespace,
      caller: event.caller
    };

    const triggerCallers = (args) => {
      Object.values(_callers, (caller) => {
        (async () => {
          caller.apply(this.events[event.id], [event.id].concat(args));
        })();
      });
    };

    if (isFunction(event.caller)) {
      if (!types.isAsyncFunction(event.caller)) {
        ipcMain.on(event.name, (_event, ...args) => {
          triggerCallers(args);
          _event.returnValue = event.caller.apply(this.events[event.id], [_normalizeEvent(_event)].concat(args));
        });
      } else {
        ipcMain.on(event.name, (_event) => {
          _event.returnValue = undefined;
        });
      }
      ipcMain.handle(event.name, async (_event, ...args) => {
        triggerCallers(args);
        return await event.caller.apply(this.events[event.id], [_normalizeEvent(_event)].concat(args));
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
    if (!safe && !Object.prototype.hasOwnProperty.call(_collection, eventId)) { throw new Error(`Removing non-existing event \`${eventId}\` is not allowed`); }

    ipcMain.removeAllListeners(_collection[eventId].name);
    ipcMain.removeHandler(_collection[eventId].name);

    delete _cache[_collection[eventId].namespace];
    delete _collection[eventId];

    return this;
  }

  /**
   * Clear all declared events
   * @returns {number} The number of existing events removed
   */
  static clear () {
    let count = 0;
    for (const eventId in _collection) {
      this.off(eventId);
      ++count;
    }
    return count;
  }

  /**
   * Get the cached object of a namespace
   * @param {string} namespace Namespace of the cached object
   * @returns {Object.<string, unknown>} The cached object
   */
  static cache (namespace) {
    if (!isString(namespace)) { throw new Error('Cache namespace must be a string'); }
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
};

// PRIVATE METHODS
function _getCache (namespace) {
  return module.exports.cache(namespace);
}

function _normalizeEvent (event) {
  return pickBy(event, (value, key) => includes(['processId', 'frameId', 'sender', 'senderFrame'], key));
}
