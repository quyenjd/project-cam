const { isFunction } = require('lodash');
const EC = require('./_collection');
const { types } = require('util');

/**
 * Wrap an event listener inside a try/catch that dispatches RaiseError to `event.sender` where necessary
 * @module Wrap
 * @param {EC.EventListener} func The function to be wrapped
 * @param {*} [thisArg=undefined] The object to be used as the this object.
 * * If anything except `undefined` is provided, it will be used as the this object;
 * * Otherwise, it will use this of the wrapping function.
 * @returns {EC.EventListener|null} The wrapped function or null if the function cannot be wrapped
 */
module.exports = function Wrap (func, thisArg = undefined) {
  if (!isFunction(func)) { return null; }

  // ipcRenderer processes MUST listen to this event
  EC.on({
    id: 'RaiseError',
    name: 'request-raise-error'
  }, true);

  return types.isAsyncFunction(func)
    ? async function (event, ...args) {
      try {
        return await func.apply(thisArg === undefined ? this : thisArg, [event].concat(args));
      } catch (err) {
        // If the sender is falsy, proceed to throw the error
        if (event?.sender != null) {
          EC.events.RaiseError.send(event.sender, err);
        } else {
          throw err;
        }
      }
    }
    : function (event, ...args) {
      try {
        return func.apply(thisArg === undefined ? this : thisArg, [event].concat(args));
      } catch (err) {
        // If the sender is falsy, proceed to throw the error
        if (event?.sender != null) {
          EC.events.RaiseError.send(event.sender, err);
        } else {
          throw err;
        }
      }
    };
};
