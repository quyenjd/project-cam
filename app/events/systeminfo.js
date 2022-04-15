const si = require('systeminformation');
const EC = require('./_collection');
const Wrap = require('./_wrap');

/**
 * System information API
 * @module SystemInfoRequest
 */
module.exports = class SystemInfoRequest {
  /**
   * A wrapper to redirect to `systeminformation`
   * @param {any} valueObject Parameter to `systeminformation.get()`
   * @returns {Promise<any>} A Promise that resolves when the operation is done
   */
  static get (valueObject) {
    return si.get(valueObject);
  }

  /**
   * Bind all events to the event collection
   */
  static bindAll () {
    const that = this;

    EC.on({
      id: 'ComponentSystemInfo',
      name: 'request-component-system-info',
      caller: Wrap(async function (event, valueObject) {
        return await that.get(valueObject);
      })
    });
  }
};
