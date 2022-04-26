const Componentizer = require('../componentizer');
const Packager = require('../packager');
const EC = require('./_collection');
const Wrap = require('./_wrap');
const fse = require('fs-extra');
const FileRequest = require('./file');
const { shell, BrowserWindow } = require('electron'); // eslint-disable-line
const { JSDOM } = require('jsdom');
const path = require('path');

/**
 * Package API
 * @module PackageRequest
 */
module.exports = class PackageRequest {
  /**
   * Bind all events to the event collection
   * @param {BrowserWindow} window The current window to bind the dialog to
   */
  static bindAll (window) {
    EC.on({
      id: 'RefreshPackages',
      name: 'request-refresh-packages'
    }).on({
      id: 'GetPackages',
      name: 'request-get-packages',
      caller: Wrap(function () {
        return Packager.packages();
      })
    }).on({
      id: 'GetPackage',
      name: 'request-get-package',
      caller: Wrap(async function (event, packageId) {
        return await Packager.getPackage(packageId, false);
      })
    }).on({
      id: 'GetComponent',
      name: 'request-get-component',
      caller: Wrap(async function (event, componentId, asIs = false) {
        const component = await Componentizer.getComponent(componentId, asIs);

        if (component) {
          if (!asIs) {
            // Prepend the Helper to the component body source
            const dom = new JSDOM(await fse.readFile(component.indexFile, { encoding: 'utf8', flag: 'r' }));
            const script = dom.window.document.createElement('script');
            try {
              script.text = await fse.readFile(path.join(__dirname, '../header/helper/dist/index.js'), { encoding: 'utf8', flag: 'r' });
            } catch (err) {
              script.text = '';
              throw new Error('Cannot load the Helper utility');
            }
            dom.window.document.documentElement.prepend(script);

            component.body = dom.serialize();
            delete component.indexFile;
          } else {
            delete component.files;
            delete component.indexFile;
          }
        }

        return component;
      })
    }).on({
      id: 'GetCompatibleComponent',
      name: 'request-get-compatible-component',
      caller: Wrap(async function (event, componentId) {
        return await Componentizer.getComponentCompatibleWith(componentId);
      })
    }).on({
      id: 'AddPackages',
      name: 'request-add-packages',
      caller: Wrap(async function (event, cleanUp, force) {
        const files = (await FileRequest.dialogOpen(window, {
          title: 'Add Packages...',
          fileExt: [
            { extensions: ['json'], name: 'Package Configuration File' },
            { extensions: ['zip'], name: 'Package Compilation File' }
          ],
          multiple: true,
          open: false
        }) || []).reverse();

        return new Promise((resolve) => {
          let added = 0;
          const f = () => {
            if (files && files.length) {
              const dir = files.pop().fullPath;
              Packager.addPackage(dir, (ret) => {
                if (ret instanceof Error) {
                  EC.events.RaiseError.send(event.sender, `Cannot add package provided at ${dir}\n${ret.message}`);
                } else {
                  ++added;
                  if (cleanUp) {
                    Packager.cleanCoExisting(ret, () => f());
                  }
                }
              }, force);
            } else {
              if (added) {
                EC.events.RefreshPackages.send(event.sender);
              }
              resolve(added);
            }
          };
          f();
        });
      })
    }).on({
      id: 'CompilePackage',
      name: 'request-compile-package',
      caller: Wrap(async function (event, packageId) {
        if (!Packager.hasPackage(packageId)) { return false; }

        const dir = await FileRequest.dialogOpen(window, {
          title: 'Compile Package To...',
          fileExt: [
            { extensions: ['zip'], name: 'Package Compilation File' }
          ],
          isFile: false,
          multiple: false
        });

        return new Promise((resolve) => {
          if (dir) {
            Packager.compilePackage(packageId, dir[0], false, (ret) => {
              if (ret instanceof Error) {
                EC.events.RaiseError.send(event.sender, `Cannot compile package \`${packageId}\` to \`${dir[0]}\`\n${ret.message}`);
                resolve(false);
              } else {
                shell.showItemInFolder(ret);
                resolve(true);
              }
            });
          } else {
            resolve(false);
          }
        });
      })
    }).on({
      id: 'RemovePackage',
      name: 'request-remove-package',
      caller: Wrap(async function (event, packageId) {
        if (!Packager.hasPackage(packageId)) { return false; }

        return new Promise((resolve) => {
          Packager.removePackage(packageId, (ret) => {
            if (ret instanceof Error) {
              EC.events.RaiseError.send(event.sender, `Cannot remove package \`${packageId}\`\n${ret.message}`);
              resolve(false);
            } else {
              EC.events.RefreshPackages.send(event.sender);
              resolve(true);
            }
          });
        });
      })
    });
  }
};
