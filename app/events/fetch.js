const fetch = require('electron-fetch');
const EC = require('./_collection');
const Wrap = require('./_wrap');
const _ = require('lodash');

/**
 * Fetch API
 * @module FetchRequest
 */
module.exports = class FetchRequest {
  /**
   * Mimic `window.fetch` in browsers
   * @param {string} url ABSOLUTE url to fetch
   * @param {import('@project-cam/helper').ApiFetchOptions} options Fetch options
   * @returns {Promise<import('@project-cam/helper').ApiFetchResponse>} A Promise that resolves when fetching is done
   */
  static fetch (url, options = {}) {
    return fetch.default(url, {
      method: _.toString(options.method) || 'GET',
      headers: new fetch.Headers(_.toPlainObject(options.headers)),
      body: options.body || null,
      timeout: _.toSafeInteger(options.timeout) || 0,
      size: _.toSafeInteger(options.size) || 0,
      user: options.user,
      password: options.password
    }).then((value) => {
      let body;
      switch (options.type) {
        case 'blob':
          body = value.blob();
          break;
        case 'json':
          body = value.json();
          break;
        default:
          body = value.text();
      }
      return body.then((body) => ({
        url,
        status: value.status,
        statusText: value.statusText,
        headers: Object.fromEntries(value.headers.entries()),
        body
      }));
    }).catch((err) => {
      throw err.message;
    });
  }

  /**
     * Bind all events to the event collection
     */
  static bindAll () {
    const that = this;

    EC.on({
      id: 'ComponentFetch',
      name: 'request-component-fetch',
      caller: Wrap(async function (event, url, options = {}) {
        return await that.fetch(url, options);
      })
    });
  }
};
