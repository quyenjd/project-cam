const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash');
const AdmZip = require('adm-zip');
const Componentizer = require('./componentizer');
const TL = require('./logger.templated');
const OperationError = require('./header/error');
const Utils = require('./header/utils');
const Graph = require('./header/graph');

// PRIVATE ATTRIBUTES
const _packageJSONFileName = 'package.cam.json';
const _packageDir = path.join(Utils.getAppData(), 'packages');
const _packageJSONDir = path.join(_packageDir, 'packages.json');
let _packages = {};
let _loaded = false;

/**
 * Information of a Package
 * @typedef {Object} Package
 * @property {string} id The package id
 * @property {string} name The package name
 * @property {string} description The package description
 * @property {string} version Semantic version of the package
 * @property {string[]|Componentizer.Component[]} components List of components included (transitively) in the package
 */

/**
 * The package collection
 * @module Packager
 */
module.exports = class Packager {
  /**
   * Check if all packages are loaded
   * @returns {boolean} true if all packages are loaded
   */
  static loaded () {
    return _loaded;
  }

  /**
   * Load all packages from JSON config file.
   * Please note that you have to call `Componentizer.loadAll` yourself before calling this method.
   * @param {(ret: undefined|Error) => void} callback A function to be called when finishing execution
   * * Either undefined if all packages are loaded, or an Error will be passed to the callback.
   */
  static loadAll (callback) {
    TL.execute(async () => {
      _reset();

      // Ensure the directory exists
      await fse.ensureDir(_packageDir);

      // Read the config file
      _packages = (await fse.readJSON(_packageJSONDir, { throws: false })) || {};

      // Normalize the package object
      _packages = _.extend({}, _packages);
      for (const packageId in _packages) {
        _packages[packageId] = _normalize(_packages[packageId]);
      }

      // Add package dependencies and verify include conditions
      for (const [packageId, packageData] of Object.entries(_packages)) {
        Graph.get().addNode(`pkg/${packageId}`);
        packageData.includes.forEach((include) => {
          if (!Graph.get().hasNode(include)) { throw new OperationError(`${include} is required but not available`); }
          Graph.get().addDependency(`pkg/${packageId}`, include);
        });
      }
    }, {
      name: 'pkg:loadAll',
      onFail: () => {
        TL.writeLog('<red>The package collection is corrupted so we performed a temporary cleanup.</red>\n');
        _reset();
      },
      onDone: callback,
      wait: 20
    });
  }

  /**
   * Add a package from JSON to the collection
   * @param {string} packageJSONDir The directory to the JSON file
   * @param {(ret: string|null|Error) => void} callback A function to be called when finishing execution
   * * Either a string storing the package id, null if the package is not added, or an Error will be passed to the callback.
   * @param {boolean} [force=false] Whether to force adding the package or skip it if a version is already installed.
   * Setting this to `true` also tells the Packager to install the provided scripts regardless of whether a satisfying version already exists or not.
   */
  static addPackageFromJSON (packageJSONDir, callback, force) {
    TL.execute((resolve, reject) => {
      const extname = path.extname(packageJSONDir).toLowerCase();
      if (extname !== '.json') {
        reject(new OperationError(`Wrong extension name, expected \`.json\`, found \`${extname}\``));
        return;
      }

      packageJSONDir = path.normalize(packageJSONDir);

      const dir = path.parse(packageJSONDir);
      fse.readJSON(packageJSONDir).then((json) => {
        json = _normalize(json);

        // Proceed only if it is a package install json
        if (_.toString(json.type) !== 'package') {
          reject(new OperationError('Cannot load non-package installation files while installing packages'));
          return;
        }

        // Stop if the package includes nothing
        if (!json.includes.length) {
          reject(new OperationError('A package must include at least one element'));
          return;
        }

        json.id = Utils.combine(json.id, json.version);
        delete json.version;

        // Warn if replacing
        if (this.hasPackage(json.id)) {
          if (force) { TL.writeLogTemplated(`Replacing existing pkg/<b><red>${json.id}</red></b>`, {}, 0, TL.templateWarning); } else {
            TL.writeLogTemplated(`Skipped installation of pkg/<b><cyan>${json.id}</cyan></b>`, {}, 0, TL.templateWarning);
            resolve(null);
            return;
          }
        }

        TL.writeLogTemplated(`Installing pkg/${json.id}`, {}, 0, TL.templateInfo);

        // Normalize includes
        {
          const arr = [];
          json.includes.forEach((include) => {
            const mode = _.isPlainObject(include) ? 'object' : 'string';
            let [name, version] = mode === 'object' ? Utils.decombine(include.cond) : Utils.decombine(include);

            if (name.match(/^com\//)) {
              name = name.substring(0, 4) + Utils.normalizeID(name.substring(4));
              arr.push(mode === 'object'
                ? {
                    cond: Utils.combine(name, version),
                    ref: path.resolve(dir.dir, _.toString(include.ref))
                  }
                : Utils.combine(name, version));
            } else if (name.match(/^pkg\//)) {
              name = name.substring(0, 4) + Utils.normalizeID(name.substring(4));
              if (mode === 'object') { TL.writeLogTemplated(`References for including ${name} will be ignored`, {}, 0, TL.templateWarning); }
              arr.push(Utils.combine(name, version));
            } else { TL.writeLogTemplated(`Ignore include \`${name}\` not starting with \`com/\` or \`pkg/\``, {}, 0, TL.templateWarning); }
          });
          json.includes = arr;
        }

        // Check the includes, if not fulfilled, try to use the references and check again
        let validIncludes = 0;
        Componentizer.beginTransact('Packager');
        Graph.get().addNode(`pkg/${json.id}`);
        Graph.get().directDependenciesOf(`pkg/${json.id}`).forEach((node) => Graph.get().removeDependency(`pkg/${json.id}`, node));

        const afterDone = () => {
          // Check if the graph contains circular dependencies
          if (!Graph.get(false, true)) {
            Componentizer.endTransact('Packager', true).then(() => reject(new OperationError('Circular dependencies are not allowed')));
            return;
          }

          Componentizer.endTransact('Packager').then(() => {
            _packages[json.id] = {
              name: json.name,
              description: json.description,
              version: json.version,
              includes: Graph.get().dependenciesOf(`pkg/${json.id}`)
            };

            TL.writeLog('Now cleaning up', 1);
            this.cleanIsolated((ret) => {
              if (_.isArray(ret)) { resolve(json.id); } else { reject(ret); }
            });
          });
        };

        if (json.includes.length) {
          json.includes.forEach((include) => {
            const fulfilled = (ret) => {
              ret = `com/${ret}`;
              const cond = _.isPlainObject(include) ? include.cond : include;
              const order = Graph.get().overallOrder().filter((value) => Utils.satisfyCombined(value, cond));
              order.sort((a, b) => Utils.compareCombined(a, b));

              if (order.length) {
                let chosen = order[0];
                if (ret && chosen !== ret) {
                  if (_.includes(order, ret)) { chosen = ret; } else if (force) {
                    TL.writeLog(`You asked to install <b><red>${ret}</red></b>, which does NOT meet ${cond}`, 1);
                    TL.writeLog(`Falling back to <b><info>${chosen}</info></b>`, 1);
                  }
                }
                Graph.get().addDependency(`pkg/${json.id}`, chosen);
                return chosen;
              }

              return null;
            };
            const afterFulfilled = () => {
              ++validIncludes;
              if (validIncludes === json.includes.length) { afterDone(); }
            };
            const callback = (ret) => {
              if (!_.isString(ret) && !_.isNull(ret)) {
                Componentizer.endTransact('Packager', true).then(() => reject(ret));
                return;
              }

              if (!ret || !fulfilled(ret)) {
                Componentizer.endTransact('Packager', true).then(() => reject(new OperationError(`Failed to satisfy ${include.cond}, bad reference`)));
                return;
              }

              afterFulfilled();
            };

            if (force) {
              if (_.isPlainObject(include)) {
                // Use the reference
                Componentizer.addComponent(include.ref, callback, force);
              } else if (fulfilled()) {
                afterFulfilled();
              } else {
                Componentizer.endTransact('Packager', true).then(() => reject(new OperationError(`Failed to satisfy ${include}, no reference`)));
              }
            } else {
              if (fulfilled()) {
                afterFulfilled();
              } else if (_.isPlainObject(include)) {
                // Use the reference
                Componentizer.addComponent(include.ref, callback);
              } else {
                Componentizer.endTransact('Packager', true).then(() => reject(new OperationError(`Failed to satisfy ${include}, no reference`)));
              }
            }
          });
        } else {
          afterDone();
        }
      });
    }, {
      name: 'pkg:install',
      onDone: callback,
      async: true
    });
  }

  /**
   * Add a package from compiled ZIP to the collection
   * @param {string} packageZIPDir The directory to the ZIP file
   * @param {(ret: string|null|Error) => void} callback A function to be called when finishing execution
   * * Either a string storing the package id, null if the package is not added, or an Error will be passed to the callback.
   * @param {boolean} [force=false] Whether to force adding the package or skip it if a version is already installed.
   * Setting this to `true` also tells the Packager to install the provided scripts regardless of whether a satisfying version already exists or not.
   */
  static addPackageFromZIP (packageZIPDir, callback, force = false) {
    TL.execute((resolve, reject) => {
      if (path.extname(packageZIPDir).toLowerCase() !== '.zip') {
        resolve(null);
        return;
      }

      const tempID = Utils.getRandomID();
      const tempDir = path.join(Utils.getAppData(), '.zipInstall', tempID);

      // Ensure the directory exists
      fse.ensureDir(tempDir).then(() => {
        // Extract zip data
        new AdmZip(packageZIPDir).extractAllTo(tempDir, true);

        const jsonDir = path.join(tempDir, _packageJSONFileName);
        fse.pathExists(jsonDir).then((exists) => {
          if (!exists) {
            reject(new OperationError(`Invalid zip file, ${_packageJSONFileName} is missing`));
            return;
          }

          this.addPackageFromJSON(jsonDir, (ret) => {
            fse.remove(tempDir).then(() => {
              if (_.isString(ret) || _.isNull(ret)) { resolve(ret); } else { reject(ret); }
            });
          }, force);
        });
      });
    }, {
      name: 'pkg:zipInstall',
      onDone: callback,
      async: true
    });
  }

  /**
   * Add a package to the collection
   * @param {string} packageInputDir The directory to the package input file, accepting JSON and ZIP
   * @param {(ret: string|null|Error) => void} callback A function to be called when finishing execution
   * * Either a string storing the package id, null if the package is not added, or an Error will be passed to the callback.
   * @param {boolean} [force=false] Whether to force adding the package or skip it if a version is already installed.
   * Setting this to `true` also tells the Packager to install the provided scripts regardless of whether a satisfying version already exists or not.
   */
  static addPackage (packageInputDir, callback, force = false) {
    const ext = path.extname(packageInputDir).toLowerCase();
    switch (ext) {
      case '.json':
        this.addPackageFromJSON(packageInputDir, callback, force);
        break;
      case '.zip':
        this.addPackageFromZIP(packageInputDir, callback, force);
        break;
      default:
        callback(new OperationError(`Unsupported extension \`${ext}\` in \`${packageInputDir}\``));
    }
  }

  /**
   * Compile a package into one ZIP file
   * @param {string} packageId ID of the package to be compiled
   * * You can use @ followed by a semver range to query versions of a package. If not provided, * will be used.
   * * If there are multiple versions that satisfy, the latest one will be chosen.
   * @param {string} packageSavePath Directory to save the compiled ZIP file
   * @param {boolean} toBuffer If true, it will not write the ZIP, but return a Buffer instead
   * @param {(ret: string|Buffer|Error) => void} callback A function to be called when finishing execution
   * * Either a string indicating the file name, a Buffer storing the ZIP content, or an Error will be passed to the callback.
   */
  static compilePackage (packageId, packageSavePath, toBuffer, callback) {
    TL.execute((resolve, reject) => {
      const versions = this.hasPackage(packageId);

      if (versions) {
        packageId = versions[versions.length - 1];

        const zip = new AdmZip();
        this.getPackage(packageId).then((json) => {
          const f = (counter) => {
            if (counter >= json.components.length) {
              // Normalize the JSON object
              json.includes = json.components.map((component) => {
                return {
                  cond: Utils.combine(component.id, component.version),
                  ref: `${component.id}.v${component.version}.zip`
                };
              });
              delete json.components;
              json.type = 'package';

              zip.addFile(_packageJSONFileName, Buffer.from(JSON.stringify(json), 'utf8'), 'Configuration file');

              // Extra
              zip.addZipComment(`pkg/${packageId} v${json.version} compiled under Packager`);

              if (toBuffer) { zip.toBuffer((buffer) => resolve(buffer), (err) => reject(err)); } else {
                const zipFileName = path.resolve(process.cwd(), _.toString(packageSavePath), `${packageId}.v${json.version}.zip`);
                zip.writeZip(zipFileName, (err) => {
                  err ? reject(err) : resolve(zipFileName);
                });
              }
              return;
            }

            Componentizer.compileComponent(
              Utils.combine(json.components[counter].id, json.components[counter].version),
              null,
              true,
              (ret) => {
                if (_.isBuffer(ret)) {
                  zip.addFile(`${json.components[counter].id}.v${json.components[counter].version}.zip`, ret, 'Compiled under Packager');
                  f(++counter);
                } else { reject(ret); }
              }
            );
          };
          f(0);
        });
      } else { reject(new OperationError(`Cannot locate pkg/${packageId}`)); }
    }, {
      name: 'pkg:compile',
      onDone: callback,
      async: true
    });
  }

  /**
   * Check if the package exists in the collection
   * @param {string} packageId ID of the package
   * * You can use @ followed by a semver range to query versions of a package. If not provided, * will be used.
   * @returns {false|string[]} List of installed versions of the package, or false if it does not exist
   */
  static hasPackage (packageId) {
    const versions = this.packages().filter((value) => Utils.satisfyCombined(value, packageId));
    return versions.length ? versions : false;
  }

  /**
   * Get package data from the collection
   * @param {string} packageId ID of the package
   * * You can use @ followed by a semver range to query versions of a package. If not provided, * will be used.
   * * If there are multiple versions that satisfy, the latest one will be chosen.
   * @param {boolean} [fetchComponents=true]
   * * If false, an array of component ids will be returned
   * * Otherwise, it will return an array of fetched components by calling `Componentizer.getComponent` on the component ids
   * @returns {Promise<Package|null>} A Promise that resolves to the package data or null if not available
   */
  static async getPackage (packageId, fetchComponents = true) {
    const versions = this.hasPackage(packageId);

    if (versions) {
      packageId = versions[versions.length - 1];

      const components = [];
      for (let componentId of this.getIncludes(packageId, true)[packageId]) {
        componentId = componentId.substring(4);

        if (fetchComponents) {
          try {
            components.push(await Componentizer.getComponent(componentId));
          } catch (err) { }
        } else { components.push(componentId); }
      }

      return {
        id: packageId,
        name: _packages[packageId].name,
        description: _packages[packageId].description,
        version: _packages[packageId].version,
        components
      };
    }

    return null;
  }

  /**
   * Remove independent packages that satisfy the query from the collection
   * @param {string} packageId ID of the package to be removed
   * * You can use @ followed by a semver range to query versions of a package. If not provided, * will be used.
   * * If there are multiple versions that satisfy, all of them will be removed.
   * @param {(ret: string[]|Error) => void} callback A function to be called when finishing execution
   * * Either an array of removed packages or an Error will be passed to the callback.
   */
  static removePackage (packageId, callback) {
    TL.execute((resolve, reject) => {
      const versions = (this.hasPackage(packageId) || []).filter((id) => !Graph.get().dependantsOf(`pkg/${id}`).length);

      TL.writeLogTemplated(`Removing ${versions.length ? versions.map((id) => `pkg/${id}`).join(', ') : 'none'}`, {}, 0, TL.templateInfo);

      Componentizer.beginTransact('Packager');

      const f = (counter) => {
        if (counter >= versions.length) {
          Componentizer.endTransact('Packager').then(() => resolve(versions));
          return;
        }

        const packageId = versions[counter];
        Graph.get().removeNode(`pkg/${packageId}`);

        this.cleanIsolated((ret) => {
          if (_.isArray(ret)) {
            Componentizer.afterTransactCommit(() => {
              delete _packages[packageId];
            });
            f(counter + 1);
          } else { Componentizer.endTransact('Packager', true).then(() => reject(ret)); }
        });
      };
      f(0);
    }, {
      name: 'pkg:remove',
      onSuccess: async () => { await _save(); },
      onDone: callback,
      async: true
    });
  }

  /**
   * Get all package IDs in the collection, sorted ascendingly
   * @returns {string[]} IDs of the packages
   */
  static packages () {
    const packages = [];

    for (const packageId in _packages) {
      if (Graph.get().hasNode(`pkg/${packageId}`)) { packages.push(packageId); } else { throw new Error(`pkg/${packageId} exists in the collection but is missing in the dependency graph`); }
    }

    return packages.sort((a, b) => Utils.compareCombined(a, b));
  }

  /**
   * Get list of com/ and pkg/ that the package includes.
   * This function is safe as it guarantees consistency between the collection and the dependency graph.
   * @param {string} packageId ID of the package
   * * You can use @ followed by a semver range to query versions of a package. If not provided, * will be used.
   * @param {boolean} [deep=false] Whether to fetch the includes deeply
   * * If set to true, the behavior will be the same as `Packager.getPackage` but with `fetchComponents` set to false. This also means there will be no pkg/ in the output.
   * * The output will always contain prefixes regardless of the value of `deep`, which is different from the returned value from `Packager.getPackage`. In fact, `Packager.getPackage` uses this method under the hood.
   * @returns {Object.<string, string[]>|null} An object containing keys as package ids that satisfy the range, and values as array of included items.
   * This function returns null if no package is found
   */
  static getIncludes (packageId, deep = false) {
    const versions = this.hasPackage(packageId);

    if (versions) {
      const ret = {};
      versions.forEach((packageId) => {
        const includes = Graph.get().directDependenciesOf(`pkg/${packageId}`);
        const intersect = _.intersection(_packages[packageId].includes, includes).filter((node) => node.match(/^(com|pkg)\//));
        _packages[packageId].includes = intersect;
        _.difference(includes, intersect).forEach((node) => {
          Graph.get().removeDependency(`pkg/${packageId}`, node);
        });
        ret[packageId] = deep ? Graph.get().dependenciesOf(`pkg/${packageId}`, true) : _.cloneDeep(intersect);
      });
      return ret;
    }

    return null;
  }

  /**
   * Remove all components and packages that belong-to/contain nothing
   * @param {(ret: string[]|Error) => void} callback A function to be called when finishing execution
   * * Either an array of removed component/package ids or an Error will be passed to the callback.
   */
  static cleanIsolated (callback) {
    TL.execute((resolve) => {
      Promise.allSettled(Graph.get().overallOrder()
        .filter((value) => !Graph.get().dependantsOf(value).length && !Graph.get().dependenciesOf(value).length)
        .map((node) =>
          new Promise((resolve, reject) => {
            const type = node.substring(0, 3);
            const id = node.substring(4);

            const cb = (ret, prefix) => {
              if (_.isArray(ret)) { resolve(ret.map((id) => `${prefix}/${id}`)); } else { reject(ret); }
            };

            if (type === 'pkg') { this.removePackage(id, (ret) => cb(ret, 'pkg')); } else { Componentizer.removeComponent(id, (ret) => cb(ret, 'com')); }
          })
        )).then((promises) => {
        const unused = [];
        promises.forEach((value) => {
          if (value.status === 'fulfilled') {
            value.value.forEach((id) => {
              unused.push(id);
            });
          }
        });
        resolve([...new Set(unused)]);
      });
    }, {
      name: 'pkg:cleanIsolated',
      onSuccess: async () => { await _save(); },
      onDone: callback,
      async: true
    });
  }

  /**
   * Remove all co-existing versions of a package
   * @param {string} packageId ID of the package
   * * You can use @ followed by a semver range to query versions of a package. If not provided, * will be used.
   * * If there are multiple versions that satisfy, the latest one will be chosen.
   * @param {(ret: number|null|Error) => void} callback A function to be called after finishing execution
   * * Either a number of removed packages, null if the package is not available, or an Error will be passed to the callback
   */
  static cleanCoExisting (packageId, callback) {
    TL.execute((resolve) => {
      const versions = this.hasPackage(packageId);

      if (versions) {
        packageId = versions[versions.length - 1];

        const [id, version] = Utils.decombine(packageId);
        const packages = this.hasPackage(`${id}@<${version}||>${version}`);
        if (packages && packages.length) {
          TL.writeLog(`Cleaning up co-existing versions of pkg/<cyan>${packageId}</cyan>...`, 1);

          let success = 0;
          new Promise((resolve) => {
            const f = (idx) => {
              if (idx >= packages.length) {
                resolve();
                return;
              }
              this.removePackage(packages[idx], (ret) => {
                if (!(ret instanceof Error)) { ++success; }
                f(idx + 1);
              });
            };
            f(0);
          }).then(() => {
            TL.writeLog(`${success} co-existing version${success > 1 ? 's have' : ' has'} been removed`, 1);
            resolve(success);
          });
        } else { resolve(0); }
      } else { resolve(null); }
    }, {
      name: 'pkg:cleanCoExisting',
      onSuccess: async () => { await _save(); },
      onDone: callback,
      async: true
    });
  }
};

Graph.init();

// PRIVATE METHODS
function _reset () {
  if (_.isPlainObject(_packages)) {
    for (const packageId in _packages) { Graph.get().removeNode(`pkg/${packageId}`); }
  }

  _loaded = false;
  _packages = {};
}

async function _save () {
  await fse.outputJSON(_packageJSONDir, _packages);
}

function _normalize (packageData) {
  const obj = _.extend({}, packageData);

  obj.id = Utils.normalizeID(_.toString(obj.id));
  obj.name = _.toString(obj.name);
  obj.description = _.toString(obj.description);
  obj.includes = _.toArray(obj.includes).map((include) => {
    return _.isPlainObject(include)
      ? {
          cond: _.toString(include.cond),
          ref: _.toString(include.ref)
        }
      : _.toString(include);
  });

  return obj;
}
