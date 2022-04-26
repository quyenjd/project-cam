const { BrowserWindow } = require('electron');
const EC = require('./_collection');
const Wrap = require('./_wrap');

/**
 * Window API
 * @module WindowRequest
 */
module.exports = class WindowRequest {
  /**
   * Bind all events to the event collection
   * @param {BrowserWindow} window Current browser window to be bound
   */
  static bindAll (window) {
    EC.on({
      id: 'Unload',
      name: 'request-unload',
      caller: Wrap(function (event, type) {
        if (type === 'exit') { window.close(); } else if (type === 'newproject') {
          window.reload();
          EC.cache('file').saveDirectory = '';
        }
      })
    }).on({
      id: 'Minimize',
      name: 'request-minimize',
      caller: Wrap(function (event) {
        BrowserWindow.fromWebContents(event.sender).minimize();
      })
    }).on({
      id: 'Maximize',
      name: 'request-maximize',
      caller: Wrap(function (event) {
        BrowserWindow.fromWebContents(event.sender).maximize();
      })
    }).on({
      id: 'Unmaximize',
      name: 'request-unmaximize',
      caller: Wrap(function (event) {
        BrowserWindow.fromWebContents(event.sender).unmaximize();
      })
    }).on({
      id: 'IsMaximized',
      name: 'request-is-maximized',
      caller: Wrap(function (event) {
        if (BrowserWindow.fromWebContents(event.sender).isMaximized()) { EC.events.Maximize.send(event.sender); } else { EC.events.Unmaximize.send(event.sender); }
      })
    }).on({
      id: 'Destroy',
      name: 'request-destroy',
      caller: Wrap(function (event) {
        BrowserWindow.fromWebContents(event.sender).destroy();
      })
    }).on({
      id: 'WillClose',
      name: 'request-will-close'
    });

    window.on('maximize', () => {
      EC.events.Maximize.send(window.webContents);
    }).on('unmaximize', () => {
      EC.events.Unmaximize.send(window.webContents);
    }).on('close', (e) => {
      e.preventDefault();
      window.focus();
      EC.events.WillClose.send(window.webContents);
    });
  }
};
