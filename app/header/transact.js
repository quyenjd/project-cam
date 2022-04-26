const { toString, forEachRight, cloneDeep, isFunction } = require('lodash');

// PRIVATE ATTRIBUTES
const _waitInterval = 20;
const _transacts = {};
let _blockBegin = false;

/**
 * A utility to handle begin/end transacts that solves collapsing problems between callers,
 * e.g., the latter caller wants to end the current transact, so changes belonging to former callers should not be committed.
 *
 * This module stores states as `checkpoints` that will be reverted to if required.
 * @module Transact
 */
module.exports = class Transact {
  /**
   * Transact's callback function
   * @callback TransactCallback
   * @param {string} caller The caller's name that captures the state
   * @param {string} holder The holder's name that holds the state
   * @param {undefined|Object} state The saved state if declined, or `undefined` if committing or no transact is begun
   */

  static _waitInterval = 20;
  static _transacts = {};
  static _blockBegin = false;

  /**
   * Begin a transact between a caller and a holder
   * @param {string} caller The caller's name that captures the state.
   * A caller can only begin ONE transact. Beginning another one will throw an `Error`.
   * @param {string} holder The holder's name that holds the state
   * @param {Object} state The state to be captured.
   * If a function is provided, the returned value from the function will be directly used as saved state.
   * @returns {boolean} Whether the required transact has been begun
   */
  static beginTransact (caller, holder, state) {
    if (_blockBegin) { return false; }

    if (this.hasTransact(caller, holder)) { throw new Error('Cannot start two transacts of the same caller-holder'); }

    _normalizeArgs(arguments);

    if (!Object.prototype.hasOwnProperty.call(_transacts, holder)) { _transacts[holder] = []; }
    _transacts[holder].push({
      name: caller,
      state: isFunction(state) ? state() : cloneDeep(state),
      commit: [],
      decline: []
    });

    return true;
  }

  /**
   * Determine if a caller-holder transact exists
   * @param {string} caller The caller's name that captures the state
   * @param {string} holder The holder's name that holds the state
   * @returns {boolean} true if a caller-holder transact exists
   */
  static hasTransact (caller, holder) {
    _normalizeArgs(arguments);
    let has = false;

    if (Object.prototype.hasOwnProperty.call(_transacts, holder)) {
      _transacts[holder].forEach((_caller) => {
        if (_caller.name === caller) { has = true; }
      });
    }

    return has;
  }

  /**
   * End the latest transact between a caller and a holder.
   * If the latest transact of a holder's state is not begun by the caller, block all further `beginTransact` calls and asynchronously wait until the transact is latest, then end it.
   * @param {string} caller The caller's name that captures the state
   * @param {string} holder The holder's name that holds the state
   * @param {boolean} [decline=false] Whether to commit or decline the changes
   * @returns {Promise<undefined|Object>} The saved state if declined, or `undefined` if committing or no transact is begun.
   * This function returns a `Promise` that resolves to the required state
   */
  static endTransact (caller, holder, decline) {
    if (!this.hasTransact(caller, holder)) { return Promise.resolve(undefined); }

    _normalizeArgs(arguments);

    let transactPos = -1;
    forEachRight(_transacts[holder], (_caller, i) => {
      if (_caller.name === caller) { transactPos = i; }
    });

    _blockBegin = true;
    return new Promise((resolve) => {
      const f = () => {
        if (Object.prototype.hasOwnProperty.call(_transacts, holder) && _transacts[holder].length !== transactPos + 1) {
          setTimeout(f, _waitInterval);
          return;
        }

        const pop = _transacts[holder].pop();
        Promise.all((decline ? pop.decline : pop.commit).map((func) => func(caller, holder, pop.state))).then(() => {
          _blockBegin = false;
          resolve(decline ? pop.state : undefined);
        });
      };
      f();
    });
  }

  /**
   * Cache a callback that will be called after the latest transact is committed, or immediately if there is no transact
   * @param {string} holder The holder's name that holds the state
   * @param {TransactCallback} callback A callback function
   */
  static afterTransactCommit (holder, callback) {
    _afterTransact(holder, 'commit', callback);
  }

  /**
   * Cache a callback that will be called after the latest transact is declined
   * @param {string} holder The holder's name that holds the state
   * @param {TransactCallback} callback A callback function
   */
  static afterTransactDecline (holder, callback) {
    _afterTransact(holder, 'decline', callback);
  }
};

// PRIVATE METHODS
function _afterTransact (holder, mode, callback) {
  let immediate = true;
  if (Object.prototype.hasOwnProperty.call(_transacts, holder) && _transacts[holder].length) {
    _transacts[holder][_transacts[holder].length - 1][mode].push(callback);
    immediate = false;
  }
  if (immediate && mode === 'commit') { callback(); }
}

function _normalizeArgs (args) {
  args[0] = toString(args[0]);
  args[1] = toString(args[1]);
}
