const { app } = require('electron');
const Crypto = require('crypto');
const { toSafeInteger, toString } = require('lodash');
const semver = require('semver');

/**
 * Some useful boilerplates
 * @module Utils
 */
module.exports = class Utils {
  /**
   * Get app's user data directory
   * @returns {string} The directory
   */
  static getAppData () {
    return app ? app.getPath('userData') : process.cwd();
  }

  /**
   * Get app's log directory
   * @returns {string} The directory
   */
  static getLogs () {
    return app ? app.getPath('logs') : process.cwd();
  }

  /**
   * Generate a cryptographically randomized string
   * @param {number} [length=20] Length of the result string
   * @returns {string} The random string
   */
  static getRandomID (length = 20) {
    length = toSafeInteger(length);
    return Crypto.randomBytes(length).toString('hex').slice(0, length);
  }

  /**
   * Normalize a string to be a valid id
   * @param {string} id The id to be normalized
   * @returns {string} The normalized id
   */
  static normalizeID (id) {
    return toString(id).replace(/[^a-zA-Z0-9\-_.@]/, '');
  }

  /**
   * Combine a name and a version by putting @ in the middle
   * @param {string} name The name
   * @param {string} version The version
   * @param {boolean} [coerce=true] Whether to coerce the version part
   * @returns {string} The combined string
   */
  static combine (name, version, coerce = true) {
    name = toString(name).trim();
    if (coerce) version = _coerce(version);
    return version.length ? `${name}@${version}` : name;
  }

  /**
   * Decombine the string into name and version parameters
   * @param {string} combined The combined string
   * @param {boolean} [coerce=true] Whether to coerce the version part
   * @returns {[string, string]} The name and version of the given string
   */
  static decombine (combined, coerce = true) {
    const splits = toString(combined).trim().split('@');
    const version = splits.length > 1 ? splits.pop() : '*';
    const name = splits.join('@');
    return [name, coerce ? _coerce(version) : version];
  }

  /**
   * Compare two combined strings, useful when used with `Array.sort`
   * @param {string} combinedA A combined string
   * @param {string} combinedB A combined string
   * @returns {number} The comparison result
   */
  static compareCombined (combinedA, combinedB) {
    const [nameA, versionA] = this.decombine(combinedA);
    const [nameB, versionB] = this.decombine(combinedB);
    return nameA.localeCompare(nameB) || semver.compare(versionA, versionB);
  }

  /**
   * Check if the combined string satisfies the given requirements
   * * A satisfying combined string must have the same name and satisfying version (using `semver.satisfies`) with the requirements
   * @param {string} combined The combined string
   * @param {string} combinedRequirements The combined string containing the requirements
   * @param {boolean} [caseInsensitive=false] Whether to perform the comparsion case-insensitively
   * @returns {boolean} Whether the given string satisfies the requirements
   */
  static satisfyCombined (combined, combinedRequirements, caseInsensitive = false) {
    combined = toString(combined);
    combinedRequirements = toString(combinedRequirements);

    if (caseInsensitive) {
      combined = combined.toLowerCase();
      combinedRequirements = combinedRequirements.toLowerCase();
    }

    const [name, version] = this.decombine(combined);
    const [nameR, versionR] = this.decombine(combinedRequirements, false);
    return name === nameR && semver.satisfies(version, versionR);
  }
};

function _coerce (version) {
  return semver.valid(semver.coerce(toString(version))) || '';
}
