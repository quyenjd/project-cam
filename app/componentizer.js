const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash');
const AdmZip = require('adm-zip');
const TL = require('./logger.templated');
const OperationError = require('./header/error');
const Utils = require('./header/utils');
const Graph = require('./header/graph');
const TransactEnabled = require('./header/transact.extn');
const glob = require('glob-promise');
const semver = require('semver');

// PRIVATE ATTRIBUTES
const _componentJSONFileName = 'component.cam.json';
const _componentsDir = path.join(Utils.getAppData(), 'components');
const _componentsJSONDir = path.join(_componentsDir, 'components.json');
let _components = {};
let _loaded = false;

/**
 * Information of a Component
 * @typedef {Object} Component
 * @property {string} id The component id
 * @property {string} name The component name
 * @property {string} description The component description
 * @property {number} defaultHeight The component default height, default to 200
 * @property {number} defaultWidth The component default width, default to 200
 * @property {{ limit?: number, name: string, required?: boolean, type?: string }[]} input Variables to be passed as the component input
 * @property {{ name: string, type?: string }[]} output Variables to be read as the component output
 * @property {string} category Category the component belongs to, default to `Uncategorized`
 * @property {boolean} minimized Whether to initialize the component minimized, default to false
 * @property {string} version Semantic version of the component
 * @property {string[]} files List of glob patterns that determine the required files
 * @property {string} indexFile Directory to the index file (which will be loaded to the component iframe)
 * @property {string} compatibleUntil Earliest semantic version of a component with the same id that is backward supported by this version
 */

/**
 * The component collection
 * @module Componentizer
 * @extends TransactEnabled
 */
module.exports = class Componentizer extends TransactEnabled {
  static _holder = 'ComponentCollection';

  static _getManagedState () {
    Graph.beginTransact('Componentizer');
    return _components;
  }

  static _setManagedState (newState, declined) {
    if (newState !== undefined) { _components = newState; }
    Graph.endTransact('Componentizer', declined).then(() => this.cleanup());
  }

  /**
   * Cleanup dependency graph and component directory by removing unused nodes, files, and subfolders
   */
  static cleanup () {
    const allowedFiles = ['components.json'];
    const allowedDirs = [];
    for (const [, value] of Object.entries(_components)) { allowedDirs.push(value.id); }

    Graph.filterBy((node) =>
      node.match(/^com\//) && !Object.prototype.hasOwnProperty.call(_components, node.substring(4))
    );

    fse.readdir(_componentsDir, { withFileTypes: true }).then(async (dirent) => {
      for (const value of dirent) {
        if ((value.isFile() && !_.includes(allowedFiles, value.name)) ||
          (value.isDirectory() && !_.includes(allowedDirs, value.name))) {
          await fse.remove(path.join(_componentsDir, value.name));
        }
      }
    });
  }

  /**
   * Check if all components are loaded
   * @returns {boolean} true if all components are loaded
   */
  static loaded () {
    return _loaded;
  }

  /**
   * Load all components from JSON config file
   * @param {(ret: undefined|Error) => void} callback A function to be called when finishing execution
   * * Either undefined if all components are loaded, or an Error will be passed to the callback.
   */
  static loadAll (callback) {
    TL.execute(async () => {
      _reset();

      // Ensure the directory exists
      await fse.ensureDir(_componentsDir);

      // Read the config file
      _components = (await fse.readJSON(_componentsJSONDir, { throws: false })) || {};

      // Normalize the component object
      _components = _.extend({}, _components);
      for (const componentId in _components) { _components[componentId] = _normalize(_components[componentId]); }

      // Check if all components have their indexFile ready
      for (const componentId in _components) {
        if (!(await fse.pathExists(_realPathToCompIndex(componentId)))) {
          throw new OperationError(`Unknown source: Index file \`${_components[componentId].indexFile}\` not resolvable for com/${componentId}`);
        }
      }

      // Push all components to the graph
      for (const componentId in _components) { Graph.get().addNode(`com/${componentId}`); }

      this.cleanup();

      _loaded = true;
    }, {
      name: 'com:loadAll',
      onFail: () => {
        TL.writeLog('<red>The component collection is corrupted so we performed a temporary cleanup.</red>', 1);
        _reset();
      },
      onDone: callback,
      wait: 20
    });
  }

  /**
   * Add a component from JSON to the collection
   * @param {string} componentJSONDir The directory to the JSON file
   * @param {(ret: string|null|Error) => void} callback A function to be called when finishing execution
   * * Either a string storing the combined component id, null if the component is not added, or an Error will be passed to the callback.
   * @param {boolean} [force=false] Whether to force adding the component or skip it if the version is already installed
   */
  static addComponentFromJSON (componentJSONDir, callback, force = false) {
    TL.execute((resolve, reject) => {
      const extname = path.extname(componentJSONDir).toLowerCase();
      if (extname !== '.json') {
        reject(new OperationError(`Wrong extension name, expected \`.json\`, found \`${extname}\``));
        return;
      }

      componentJSONDir = path.normalize(_.toString(componentJSONDir));

      const dir = path.parse(componentJSONDir);

      fse.readJSON(componentJSONDir).then((json) => {
        json = _normalize(json);

        // Proceed only if it is a component install json
        if (_.toString(json.type) !== 'component') {
          reject(new OperationError('Cannot load non-component installation files while installing components'));
          return;
        }

        // Empty ids and names are not allowed
        if (!json.id || !json.name) {
          reject(new OperationError('Component ids and names cannot be empty'));
          return;
        }
        if (!(json.version = semver.valid(json.version))) {
          reject(new OperationError('Component version is not a valid semantic version'));
          return;
        }
        if (!(json.compatibleUntil = semver.valid(json.compatibleUntil || json.version))) {
          reject(new OperationError('Component backward-compatible version is not a valid semantic version'));
          return;
        }

        json.id = Utils.combine(json.id, json.version);
        delete json.version;

        // Warn if replacing
        if (this.hasComponent(json.id)) {
          if (force) { TL.writeLogTemplated(`Replacing existing com/<b><red>${json.id}</red></b>`, {}, 0, TL.templateWarning); } else {
            TL.writeLogTemplated(`Skipped installation of com/<b><cyan>${json.id}</cyan></b>`, {}, 0, TL.templateWarning);
            resolve(null);
            return;
          }
        }

        TL.writeLogTemplated(`Installing com/${json.id}`, {}, 0, TL.templateInfo);

        // Create directory to transfer component data to our application folder
        const componentDir = path.join(_componentsDir, json.id);
        fse.ensureDir(componentDir).then(() => {
          // Get the required files of the component
          _fromGlobList(json.files, dir.dir).then((files) => {
            // Throw an error if no available file for copying
            if (!files.length) {
              reject(new OperationError('A component must contain at least one file'));
              return;
            }

            // Check backward relative paths
            for (let i = 0; i < files.length; ++i) {
              if (files[i].slice(0, 2) === '..') {
                reject(new OperationError('Backward relative paths are not allowed for component files'));
                return;
              }
            }

            // Copy all component files
            TL.writeLogTemplated(`Will import ${files.length} file${files.length > 1 ? 's' : ''} of com/${json.id}`, {}, 1);
            Promise.all(files.map(async (file) => {
              const dest = path.resolve(componentDir, file);
              await fse.ensureDir(path.dirname(dest));
              await fse.copy(path.resolve(dir.dir, file), dest, {
                preserveTimestamps: true
              });
            })).then(() => {
              // Check index file
              let indexDir = path.resolve(componentDir, path.normalize(json.indexFile));
              fse.lstat(indexDir).then((indexDirStats) => {
                if (indexDirStats.isDirectory()) {
                  indexDirStats = fse.lstat(indexDir = path.join(indexDir, 'index.html'));
                }
                return indexDirStats;
              }).then((indexDirStats) => {
                if (!indexDirStats.isFile()) {
                  reject(new OperationError('Component index file does not exist'));
                  return;
                }
                json.indexFile = path.relative(componentDir, indexDir);

                // Clear old component data
                if (Object.prototype.hasOwnProperty.call(_components, json.id)) {
                  const oldId = _components[json.id].id;
                  this.afterTransactCommit(async () => {
                    await fse.remove(path.join(_componentsDir, oldId));
                  });
                }

                // Add to _components object
                _components[json.id] = {
                  id: json.id,
                  name: json.name,
                  description: json.description,
                  defaultHeight: json.defaultHeight,
                  defaultWidth: json.defaultWidth,
                  input: json.input,
                  output: json.output,
                  category: json.category,
                  minimized: json.minimized,
                  files: json.files,
                  indexFile: json.indexFile,
                  compatibleUntil: json.compatibleUntil
                };

                // Add to dependency graph
                Graph.get().addNode(`com/${json.id}`);

                _ensureComponents(json.id).then(() => {
                  resolve(json.id);
                });
              });
            });
          });
        });
      });
    }, {
      name: 'com:install',
      onDone: callback,
      async: true
    });
  }

  /**
   * Add a component from compiled ZIP to the collection
   * @param {string} componentZIPDir The directory to the ZIP file
   * @param {(ret: string|null|Error) => void} callback A function to be called when finishing execution
   * * Either a string storing the combined component id, null if the component is not added, or an Error will be passed to the callback.
   * @param {boolean} [force=false] Whether to force adding the component or skip it if the version is already installed
   */
  static addComponentFromZIP (componentZIPDir, callback, force = false) {
    TL.execute((resolve, reject) => {
      if (path.extname(componentZIPDir).toLowerCase() !== '.zip') {
        resolve(null);
        return;
      }

      const tempID = Utils.getRandomID();
      const tempDir = path.join(Utils.getAppData(), '.zipInstall', tempID);

      // Ensure the directory exists
      fse.ensureDir(tempDir).then(() => {
        // Extract zip data
        new AdmZip(componentZIPDir).extractAllTo(tempDir, true);

        const jsonDir = path.join(tempDir, _componentJSONFileName);
        fse.pathExists(jsonDir).then((exists) => {
          if (exists) {
            this.addComponentFromJSON(jsonDir, (ret) => {
              fse.remove(tempDir).then(() => {
                if (_.isString(ret) || _.isNull(ret)) { resolve(ret); } else { reject(ret); }
              });
            }, force);
          } else {
            reject(new OperationError(`Invalid zip file, ${_componentJSONFileName} is missing`));
          }
        });
      });
    }, {
      name: 'com:zipInstall',
      onDone: callback,
      async: true
    });
  }

  /**
   * Add a component to the collection
   * @param {string} componentInputDir The directory to the component input file, accepting JSON and ZIP
   * @param {(ret: string|null|Error) => void} callback A function to be called when finishing execution
   * * Either a string storing the combined component id, null if the component is not added, or an Error will be passed to the callback.
   * @param {boolean} [force=false] Whether to force adding the component or skip it if the version is already installed
   */
  static addComponent (componentInputDir, callback, force = false) {
    const ext = path.extname(componentInputDir).toLowerCase();
    switch (ext) {
      case '.json':
        this.addComponentFromJSON(componentInputDir, callback, force);
        break;
      case '.zip':
        this.addComponentFromZIP(componentInputDir, callback, force);
        break;
      default:
        callback(new OperationError(`Unsupported extension \`${ext}\` in \`${componentInputDir}\``));
    }
  }

  /**
   * Remove independent components that satisfy the query from the collection
   * @param {string} componentId ID of the component to be removed
   * * You can use @ followed by a semver range to query versions of a component. If not provided, * will be used.
   * * If there are multiple versions that satisfy, all of them will be removed.
   * @param {(ret: string[]|Error) => void} callback A function to be called when finishing execution
   * * Either an array of removed components or an Error will be passed to the callback.
   */
  static removeComponent (componentId, callback) {
    TL.execute((resolve) => {
      const versions = (this.hasComponent(componentId) || []).filter((id) => !Graph.get().dependantsOf(`com/${id}`).length);

      TL.writeLogTemplated(`Removing ${versions.length ? versions.map((id) => `com/${id}`).join(', ') : 'none'}`, {}, 0, TL.templateInfo);

      versions.forEach((componentId) => {
        // Delete directory containing the component source
        const oldId = _components[componentId].id;
        this.afterTransactCommit(async () => {
          await fse.remove(path.join(_componentsDir, oldId));
        });

        // Delete entry from component object
        delete _components[componentId];

        // Delete from the graph
        Graph.get().removeNode(`com/${componentId}`);
      });

      _save();

      resolve(versions);
    }, {
      name: 'com:remove',
      onDone: callback,
      async: true
    });
  }

  /**
   * Check whether a component belongs to the collection
   * @param {string} componentId ID of the component
   * * You can use @ followed by a semver range to query versions of a component. If not provided, * will be used.
   * @returns {false|string[]} List of installed versions of the component, or false if it does not exist
   */
  static hasComponent (componentId) {
    const versions = this.components().filter((value) => Utils.satisfyCombined(value, componentId));
    return versions.length ? versions : false;
  }

  /**
   * Get added component data from the collection
   * @param {string} componentId ID of the component
   * * You can use @ followed by a semver range to query versions of a component. If not provided, * will be used.
   * * If there are multiple versions that satisfy, the latest one will be chosen.
   * @param {boolean} [asIs=false] true to return the exact same component object as the one in the collection, false otherwise
   * @returns {Promise<Omit<Component, 'files'>|Component|null>} A Promise that resolves to the component data or null if not available
   */
  static async getComponent (componentId, asIs = false) {
    const versions = this.hasComponent(componentId);

    if (versions) {
      componentId = versions[versions.length - 1];
      const [id, version] = Utils.decombine(componentId);
      let indexFile = _components[componentId].indexFile;
      let extend = {};

      // If requested as-is
      if (asIs) { extend = { files: _components[componentId].files }; } else {
        await _ensureComponents(componentId);
        indexFile = _realPathToCompIndex(componentId);
      }

      if (asIs || (await fse.pathExists(indexFile))) {
        return {
          id,
          name: _components[componentId].name,
          description: _components[componentId].description,
          defaultHeight: _components[componentId].defaultHeight,
          defaultWidth: _components[componentId].defaultWidth,
          input: _components[componentId].input,
          output: _components[componentId].output,
          category: _components[componentId].category,
          minimized: _components[componentId].minimized,
          version,
          indexFile,
          compatibleUntil: _components[componentId].compatibleUntil,
          ...extend
        };
      }

      throw new Error(`Index file \`${_components[componentId].indexFile}\` not found for com/${componentId}`);
    }

    return null;
  }

  /**
   * Get the latest installed component that supports/is-compatible-with the provided component
   * @param {string} componentId ID of the component
   * * Must include both the component name and semantic version, separated by an \@. If not provided, match any version of the same component id.
   * * If there exists an exact version of the component, it will be chosen.
   * @returns {Promise<string|null>} A Promise that resolves to the installed version that supports the component or null if not available
   */
  static async getComponentCompatibleWith (componentId) {
    const [name, version] = Utils.decombine(componentId);
    const components = this.hasComponent(name);

    if (components) {
      if (!version) { return components[components.length - 1]; }

      let result = '';
      for (const componentId of components) {
        const component = await this.getComponent(componentId, true);
        if (version === component.version) {
          result = componentId;
          break;
        }
        if (semver.gte(version, component.compatibleUntil)) { result = componentId; }
      }

      return result.length ? result : null;
    }

    return null;
  }

  /**
   * Compile a component into one ZIP file
   * @param {string} componentId ID of the component to be compiled
   * * You can use @ followed by a semver range to query versions of a component. If not provided, * will be used.
   * * If there are multiple versions that satisfy, the latest one will be chosen.
   * @param {string} componentSavePath Directory to save the compiled ZIP file
   * @param {boolean} toBuffer If true, it will not write the ZIP, but return a Buffer instead
   * @param {(ret: string|Buffer|Error) => void} callback A function to be called when finishing execution
   * * Either a string indicating the file name, a Buffer storing the ZIP content, or an Error will be passed to the callback.
   */
  static compileComponent (componentId, componentSavePath, toBuffer, callback) {
    TL.execute((resolve, reject) => {
      const versions = this.hasComponent(componentId);

      if (versions) {
        componentId = versions[versions.length - 1];

        const zip = new AdmZip();
        this.getComponent(componentId, true).then((json) => {
          // Add component files
          const compDir = _realPathToComp(componentId);
          _fromGlobList(json.files, compDir).then((files) => {
            files.forEach((file) => {
              zip.addLocalFile(path.join(compDir, file), path.dirname(file));
            });

            // Add configuration file
            zip.addFile(_componentJSONFileName, Buffer.from(JSON.stringify(json), 'utf8'), 'Configuration file');

            // Extra
            zip.addZipComment(`com/${json.id} v${json.version} compiled under Componentizer`);

            if (toBuffer) { zip.toBuffer((buffer) => resolve(buffer), (err) => reject(err)); } else {
              const zipFileName = path.resolve(process.cwd(), _.toString(componentSavePath), `${json.id}.v${json.version}.zip`);
              zip.writeZip(zipFileName, (err) => {
                err ? reject(err) : resolve(zipFileName);
              });
            }
          });
        });
      } else { reject(new OperationError(`Cannot locate com/${componentId}`)); }
    }, {
      name: 'com:compile',
      logSuccess: {
        template: 'Generated file: {return}',
        parser: TL.templateInfo
      },
      onDone: callback,
      async: true
    });
  }

  /**
   * Get all component IDs in the collection, sorted ascendingly
   * @returns {string[]} IDs of the components
   */
  static components () {
    const components = [];

    for (const componentId in _components) {
      if (Graph.get().hasNode(`com/${componentId}`)) { components.push(componentId); } else { throw new Error(`com/${componentId} exists in the collection but is missing in the dependency graph`); }
    }

    return components.sort((a, b) => Utils.compareCombined(a, b));
  }

  /**
   * Get current path of a component
   * @param {string} componentId ID of the component
   * * You can use @ followed by a semver range to query versions of a component. If not provided, * will be used.
   * * If there are multiple versions that satisfy, the latest one will be chosen.
   * @returns {string|null} Full path to the component or null if not available
   */
  static realPathToComponent (componentId) {
    const versions = this.hasComponent(componentId);
    return versions ? path.join(_componentsDir, _components[versions[0]].id) : null;
  }
};

Graph.init();

// PRIVATE METHODS
function _reset () {
  if (_.isPlainObject(_components)) {
    for (const componentId in _components) { Graph.get().removeNode(`com/${componentId}`); }
  }

  _loaded = false;
  _components = {};
}

function _save () {
  module.exports.afterTransactCommit(async () => {
    await fse.outputJSON(_componentsJSONDir, _components);
  });
}

/**
 * @returns {Component}
 */
function _normalize (componentData) {
  const obj = _.extend({}, componentData);

  obj.id = Utils.normalizeID(_.toString(obj.id));
  obj.name = _.toString(obj.name);
  obj.description = _.toString(obj.description);
  obj.defaultHeight = Math.max(0, _.toSafeInteger(obj.defaultHeight)) || 200;
  obj.defaultWidth = Math.max(0, _.toSafeInteger(obj.defaultWidth)) || 200;
  obj.input = _.reduce(_.isArray(obj.input) ? obj.input : _.isPlainObject(obj.input) ? [obj.input] : [], (prev, value) => {
    value = _.toPlainObject(value);
    const name = _.toString(value.name);
    if (name.length) {
      prev.push({
        limit: Math.max(0, _.toSafeInteger(value.limit)),
        name,
        required: Boolean(value.required),
        type: _.toString(value.type) || name
      });
    }
    return prev;
  }, []);
  obj.output = _.reduce(_.isArray(obj.output) ? obj.output : _.isPlainObject(obj.output) ? [obj.output] : [], (prev, value) => {
    value = _.toPlainObject(value);
    const name = _.toString(value.name);
    if (name.length) {
      prev.push({
        name,
        type: _.toString(value.type) || name
      });
    }
    return prev;
  }, []);
  obj.category = _.toString(obj.category) || 'Uncategorized';
  obj.minimized = Object.prototype.hasOwnProperty.call(obj, 'minimized') ? !!obj.minimized : false;
  obj.files = _.map(_.isArray(obj.files) ? obj.files : _.isString(obj.files) ? [obj.files] : [], _.toString);
  obj.indexFile = _.toString(obj.indexFile);
  obj.compatibleUntil = semver.valid(obj.compatibleUntil) || '0.0.0';

  return obj;
}

async function _ensureComponents (componentId) {
  const that = module.exports;

  const versions = that.hasComponent(componentId) || [];
  for (const componentId of versions) {
    // Current directory containing component source
    const curDirectory = path.join(_componentsDir, _components[componentId].id);

    // Next directory generated cryptographically
    const newId = Utils.getRandomID();
    const nextDirectory = path.join(_componentsDir, newId);

    await fse.copy(curDirectory, nextDirectory, { preserveTimestamps: true });
    that.afterTransactCommit(async () => {
      await fse.remove(curDirectory);
    });

    _components[componentId].id = newId;
  }
  _save();
}

function _realPathToComp (componentId) {
  return path.join(_componentsDir, _components[componentId].id);
}

function _realPathToCompIndex (componentId) {
  return path.join(_realPathToComp(componentId), _components[componentId].indexFile);
}

async function _fromGlobList (list, cwd) {
  let files = [];
  for (const file of list) {
    files = files.concat(await glob(file, {
      cwd,
      mark: true,
      nodir: true,
      silent: true
    }));
  }
  return [...new Set(files)].map((file) => path.normalize(file));
}
