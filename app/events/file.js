const { dialog, FileFilter, BrowserWindow } = require('electron'); // eslint-disable-line
const { assign, toString } = require('lodash');
const path = require('path');
const fse = require('fs-extra');
const EC = require('./_collection');
const Wrap = require('./_wrap');
const Utils = require('./_utils');

/**
 * @typedef {Object} OpenedFile
 * @property {string|null} data Data of the file (in text), or null if it is a directory
 * @property {string} ellipted Ellipted directory to the file
 * @property {string} fullPath Full directory to the file
 */

/**
 * File requests API
 * @module FileRequest
 */
module.exports = class FileRequest {
  /**
   * Open the file dialog
   * @param {BrowserWindow} window The current window to bind the dialog to
   * @param {Object} config The config object
   * @param {string} [config.title='Open File...'] Title of the open dialog
   * @param {FileFilter[]} [config.fileExt=[{ name: 'All Files', extensions: ['*'] }]] Allowed file extensions to be opened
   * @param {boolean} [config.isFile=true]
   * * If set to true, only files are allowed to be selected;
   * * Otherwise, only directories can be selected.
   * @param {boolean} [config.multiple=false] Allow select multiple files/directories
   * @param {boolean} [config.open=true] Read file content into the `data` property.
   * This option only works if `isFile` is true.
   * @param {string} [config.encoding='utf8'] Specify how to read the file properly
   * @returns {Promise<OpenedFile[]|null>} Opened files/directories or null if the dialog is cancelled
   */
  static async dialogOpen (window, config) {
    config = assign({
      title: 'Open File...',
      fileExt: [{ name: 'All Files', extensions: ['*'] }],
      isFile: true,
      multiple: false,
      open: true,
      encoding: 'utf8'
    }, config);

    const properties = [config.isFile ? 'openFile' : 'openDirectory', 'createDirectory', 'promptToCreate'];
    if (config.multiple) { properties.push('multiSelections'); }

    const directory = dialog.showOpenDialogSync(window, {
      title: toString(config.title),
      filters: config.fileExt,
      properties
    });

    if (directory) {
      const results = [];
      for (const value of directory) {
        results.push({
          data: config.isFile && config.open
            ? await fse.readFile(value, { encoding: config.encoding || 'utf8' })
            : null,
          ellipted: ellipt(path.basename(value)),
          fullPath: path.resolve(value)
        });
      }
      return results;
    } else {
      return null;
    }
  }

  /**
   * Save the file dialog
   * @param {BrowserWindow} window The current window to bind the dialog to
   * @param {string} data Data to be written to the file
   * @param {Object} [config={}] The config object
   * @param {string} [config.title='Save File...'] Title of the save dialog
   * @param {FileFilter[]} [config.fileExt=[{ name: 'All Files', extensions: ['*'] }]] Allowed file extensions to be saved
   * @param {string} [config.defaultName=''] Default name of the file
   * @param {boolean} [config.message=''] Message to display above text fields (macOS)
   * @param {string} [config.encoding='utf8'] Specify how to save the file properly
   * @returns {Promise<OpenedFile|null>} The selected file or null if the dialog is cancelled
   */
  static async dialogSave (window, data, config) {
    config = assign({
      title: 'Save File...',
      fileExt: [{ name: 'All Files', extensions: ['*'] }],
      defaultName: '',
      message: '',
      encoding: 'utf8'
    }, config);

    const directory = dialog.showSaveDialogSync(window, {
      title: toString(config.title),
      filters: config.fileExt,
      defaultPath: path.basename(toString(config.defaultName)),
      message: toString(config.message),
      properties: ['createDirectory', 'showOverwriteConfirmation']
    });

    if (directory) {
      await fse.writeFile(directory, data, { encoding: config.encoding || 'utf8' });
      return {
        data,
        ellipted: ellipt(path.basename(directory)),
        fullPath: path.resolve(directory)
      };
    }
    return null;
  }

  /**
   * Bind all events to the event collection
   * @param {BrowserWindow} window Current browser window to be bound
   */
  static bindAll (window) {
    const that = this;

    EC
      .on({
        id: 'EnableSaveAs',
        name: 'request-enable-save-as'
      })
      .on({
        id: 'OpenProject',
        name: 'request-open-project',
        namespace: 'file',
        caller: Wrap(async function (event) {
          const files = await that.dialogOpen(window, {
            title: 'Open Project...',
            fileExt: [
              { extensions: ['cam-project'], name: 'CAM Project File' }
            ]
          });

          if (files) {
            this.cache.saveDirectory = files[0].fullPath;
            this.send(event.sender, files[0]);
            EC.events.EnableSaveAs.send(event.sender);
          }
        })
      })
      .on({
        id: 'SaveProjectAs',
        name: 'request-save-project-as',
        namespace: 'file',
        caller: Wrap(async function (event, data) {
          const directory = await that.dialogSave(window, data, {
            title: 'Save Project As...',
            fileExt: [
              { extensions: ['cam-project'], name: 'CAM Project File' }
            ]
          });

          if (directory) {
            this.cache.saveDirectory = directory.fullPath;
            EC.events.SaveProject.send(event.sender, directory);
            EC.events.EnableSaveAs.send(event.sender);
          }
        })
      })
      .on({
        id: 'SaveProject',
        name: 'request-save-project',
        namespace: 'file',
        caller: Wrap(async function (event, data) {
          if (this.cache.saveDirectory) {
            await fse.writeFile(this.cache.saveDirectory, data);
          } else {
            EC.events.SaveProjectAs.trigger(event, data);
          }
        })
      })
      .on({
        id: 'OpenSession',
        name: 'request-open-session',
        caller: Wrap(async function (event) {
          const files = await that.dialogOpen(window, {
            title: 'Open Session...',
            fileExt: [
              { extensions: ['cam-session'], name: 'CAM Session File' }
            ]
          });

          if (files) {
            this.send(event.sender, files[0]);
          }
        })
      })
      .on({
        id: 'ImportSession',
        name: 'request-import-session',
        caller: Wrap(async function (event) {
          const files = await that.dialogOpen(window, {
            title: 'Import Session...',
            fileExt: [
              { extensions: ['cam-session'], name: 'CAM Session File' }
            ]
          });

          if (files) {
            this.send(event.sender, files[0]);
          }
        })
      })
      .on({
        id: 'SaveSessionAs',
        name: 'request-save-session-as',
        caller: Wrap(async function (event, data) {
          await that.dialogSave(window, data, {
            title: 'Save Session As...',
            fileExt: [
              { extensions: ['cam-session'], name: 'CAM Session File' }
            ]
          });
        })
      })
      .on({
        id: 'ComponentReadFile',
        name: 'request-component-read-file',
        caller: Wrap(async function (event, componentId, dir, encoding = 'utf8') {
          return await fse.readFile(Utils.normalizeDir(componentId, dir), { encoding, flag: 'r' });
        })
      })
      .on({
        id: 'ComponentReadFileFrom',
        name: 'request-component-read-file-from',
        caller: Wrap(async function (event, multiple = false, encoding = 'utf8', title = 'Open File...', fileExt = []) {
          const files = (await that.dialogOpen(window, { multiple, encoding, title, fileExt }))?.map((file) => ({ data: file.data, fullPath: file.fullPath }));
          return files ? (multiple ? files : files[0]) : null;
        })
      })
      .on({
        id: 'ComponentSaveFile',
        name: 'request-component-save-file',
        caller: Wrap(async function (event, componentId, dir, data, encoding = 'utf8') {
          const fullPath = Utils.normalizeDir(componentId, dir);
          await fse.ensureDir(path.dirname(fullPath));
          await fse.writeFile(fullPath, data, { encoding, flag: 'w' });
          return true;
        })
      })
      .on({
        id: 'ComponentSaveFileAs',
        name: 'request-component-save-file-as',
        caller: Wrap(async function (event, data, encoding = 'utf8', title = 'Save File As...', fileExt = []) {
          const file = await that.dialogSave(window, data, { encoding, title, fileExt });
          return file ? file.fullPath : null;
        })
      })
      .on({
        id: 'ReadFile',
        name: 'request-read-file',
        caller: Wrap(async function (event, dir, encoding = 'utf8') {
          return await fse.readFile(dir, { encoding: encoding || 'utf8' });
        })
      })
      .on({
        id: 'SaveFile',
        name: 'request-save-file',
        caller: async function (event, dir, data, encoding = 'utf8') {
          try {
            await fse.writeFile(dir, data, { encoding: encoding || 'utf8' });
            return true;
          } catch (err) {
            return false;
          }
        }
      });
  }
};

function ellipt (str) {
  const maxLength = 30; const ellipse = '...';
  return str.length > maxLength ? (str.substr(0, maxLength - ellipse.length) + ellipse) : str;
}
