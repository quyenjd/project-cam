const Transact = require('./transact');

/**
 * A class that provides transact utilities to be extended by other classes
 * @module TransactEnabled
 */
module.exports = class TransactEnabled {
  /**
   * Unique holder's name. Should be overridden.
   */
  static _holder = 'anonymous';

  /**
   * This method MUST be overridden!
   * @returns {Object} The object to be managed by Transact
   */
  static _getManagedState () { }

  /**
   * This method MUST be overridden!
   * @param {Object} newState The state of the object saved by Transact
   * @param {boolean} declined Whether the changes have been committed or declined
   */
  static _setManagedState (newState, declined) { }

  /**
   * Begin a transact
   * @see {@link Transact.beginTransact}
   * @param {string=} [caller] The caller's name
   * @returns {boolean} Whether the transact has been begun
   */
  static beginTransact (caller = 'anonymous') {
    return Transact.beginTransact(caller, this._holder, this._getManagedState());
  }

  /**
   * Determine if the transact exists
   * @see {@link Transact.hasTransact}
   * @param {string=} caller The caller's name
   * @returns {boolean} true if the transact exists
   */
  static hasTransact (caller = 'anonymous') {
    return Transact.hasTransact(caller, this._holder);
  }

  /**
   * End the transact
   * @see {@link Transact.endTransact}
   * @param {string=} [caller] The caller's name
   * @param {boolean} [decline=false] Whether to commit or decline the changes
   * @returns {Promise<undefined|Object>} The saved state if declined, or `undefined` if committing or no transact is begun.
   * This function returns a `Promise` that resolves to the required state
   */
  static endTransact (caller = 'anonymous', decline = false) {
    return Transact.endTransact(caller, this._holder, decline).then((state) => {
      this._setManagedState(state, decline);
      return state;
    });
  }

  /**
   * Cache a callback that will be called after the transact is committed, or immediately if there is no transact
   * @see {@link Transact.afterTransactCommit}
   * @param {Function} callback A callback function
   */
  static afterTransactCommit (callback) {
    Transact.afterTransactCommit(this._holder, callback);
  }

  /**
   * Cache a callback that will be called after the transact is declined
   * @see {@link Transact.afterTransactDecline}
   * @param {Function} callback A callback function
   */
  static afterTransactDecline (callback) {
    Transact.afterTransactDecline(this._holder, callback);
  }
};
