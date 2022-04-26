const Componentizer = require('../componentizer');
const { join, normalize } = require('path');

/**
 * Some useful boilerplates for event handling
 * @module Utils
 */
module.exports = class Utils {
  /**
   * Normalize relative path of a file to a component and throw error on backward paths
   * @param {string} componentId ID of the component
   * @param {string} dir Relative path to the real path of the component
   * @returns {string} Valid absolute path to the file
   */
  static normalizeDir (componentId, dir) {
    const baseDir = Componentizer.realPathToComponent(componentId);
    if (!baseDir) { throw new Error(`Cannot find absolute path of the component \`${componentId}\``); }

    dir = normalize(dir);
    if (dir.slice(0, 2) === '..') { throw new Error('Backward relative paths are not allowed'); }

    return join(baseDir, dir);
  }
};
