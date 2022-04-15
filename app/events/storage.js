const path = require('path');
const fse = require('fs-extra');
const EC = require('./_collection');
const Wrap = require('./_wrap');
const Utils = require('../header/utils');
const { toString } = require('lodash');

const _cachedDir = {};

/**
 * Storage File API
 * @module StorageRequest
 */
module.exports = class StorageRequest {
  /**
   * Get data from the storage by key
   * @param {string} namespace Namespace of the section
   * @param {string|RegExp} key Key(s) to fetch the values of
   * @returns {Promise<Object.<string, *>>} A Promise that resolves to the required key-value pairs
   */
  static async get (namespace, key) {
    const dir = _toDir(namespace);
    await _cacheDir(dir);
    const ret = {};
    for (const _key in _cachedDir[dir]) {
      if ((key instanceof RegExp && key.test(_key)) || key === _key) { ret[_key] = _cachedDir[dir][_key]; }
    }
    return ret;
  }

  /**
   * Get full data object as string from the storage
   * @param {string} namespace Namespace of the section
   * @returns {Promise<string>} A Promise that resolves to the full JSON content saved by the storage
   */
  static async getFull (namespace) {
    const dir = _toDir(namespace);
    await _cacheDir(dir);
    try {
      return JSON.stringify(_cachedDir[dir]);
    } catch (err) {
      return JSON.stringify({});
    }
  }

  /**
   * Set data from the storage to a new value by key
   * @param {string} namespace Namespace of the section
   * @param {string} key Key to set the value of
   * @param {*} value New value of the key (only replace the old one if it does not make the section an invalid JSON)
   * @returns {Promise<*|undefined>} A Promise that resolves to the old value of the key, or `undefined` if the key has just been created
   */
  static async set (namespace, key, value) {
    const dir = _toDir(namespace);
    await _cacheDir(dir);
    const old = Object.prototype.hasOwnProperty.call(_cachedDir[dir], key) ? _cachedDir[dir][key] : undefined;
    _cachedDir[dir][key] = value;
    try {
      const full = JSON.stringify(_cachedDir[dir]);
      await fse.ensureDir(path.dirname(dir));
      await fse.writeFile(dir, full, { encoding: 'utf8', flag: 'w' });
    } catch (err) {
      if (old === undefined) { delete _cachedDir[dir][key]; } else { _cachedDir[dir][key] = old; }
    }
    return old;
  }

  /**
   * Set full content of the data from the storage to a string
   * @param {string} namespace Namespace of the section
   * @param {string} content New content of the section (only replace the old one if it is a valid JSON string)
   * @returns {Promise<string|undefined>} A Promise that resolves to the old content of the section, or `undefined` if the new content is not a valid JSON string
   */
  static async setFull (namespace, content) {
    const dir = _toDir(namespace);
    await _cacheDir(dir);
    const old = _cachedDir[dir];

    // Make sure `content` is a valid JSON string
    try {
      _cachedDir[dir] = JSON.parse(content);
    } catch (err) {
      return undefined;
    }

    await fse.ensureDir(path.dirname(dir));
    await fse.writeFile(dir, content, { encoding: 'utf8', flag: 'w' });

    try {
      return JSON.stringify(old);
    } catch (err) {
      return JSON.stringify({});
    }
  }

  /**
   * Bind all events to the event collection
   */
  static bindAll () {
    const that = this;

    EC.on({
      id: 'GetStorage',
      name: 'request-get-storage',
      caller: Wrap(async function (event, namespace) {
        return await that.getFull(namespace);
      })
    }).on({
      id: 'SetStorage',
      name: 'request-set-storage',
      caller: Wrap(async function (event, namespace, data) {
        return await that.setFull(namespace, data);
      })
    }).on({
      id: 'GetField',
      name: 'request-get-field',
      caller: Wrap(async function (event, namespace, key) {
        const obj = await that.get(namespace, key);
        return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
      })
    }).on({
      id: 'SetField',
      name: 'request-set-field',
      caller: Wrap(async function (event, namespace, key, value) {
        return await that.set(namespace, key, value);
      })
    });
  }
};

async function _cacheDir (dir) {
  if (!Object.prototype.hasOwnProperty.call(_cachedDir, dir)) {
    _cachedDir[dir] = (await fse.pathExists(dir)) ? ((await fse.readJSON(dir, { throws: false })) || {}) : {};
  }
}

function _toDir (namespace) {
  return path.join(Utils.getAppData(), toString(namespace).replace(/[^a-zA-Z]/, '') || '_');
}
