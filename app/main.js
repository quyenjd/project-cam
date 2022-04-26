if (process.argv[1] === '--squirrel-uninstall') {
  // Cleanup app data directory
  require('fs-extra').removeSync(require('./header/utils').getAppData());
}
if (require('electron-squirrel-startup')) return; // eslint-disable-line

const { app, BrowserWindow, Menu, shell } = require('electron');
const windowStateKeeper = require('electron-window-state');
const path = require('path');
const EC = require('./events/_collection');
const FetchRequest = require('./events/fetch');
const FileRequest = require('./events/file');
const LogRequest = require('./events/log');
const PackageRequest = require('./events/package');
const ProcessRequest = require('./events/process');
const StorageRequest = require('./events/storage');
const SystemInfoRequest = require('./events/systeminfo');
const WindowRequest = require('./events/window');
const Componentizer = require('./componentizer');
const Packager = require('./packager');
const Wrap = require('./events/_wrap');
const fse = require('fs-extra');

// Disable all menus
Menu.setApplicationMenu(null);

const MODE = ['prod', 'dev'][+(app.commandLine.getSwitchValue('mode').toLowerCase() === 'dev')];
const FIRST_RUN = app.commandLine.hasSwitch('squirrel-firstrun');

let splash, win;

if (!app.requestSingleInstanceLock()) { app.quit(); } else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) { win.restore(); }
      win.focus();
    }
  });
}

function createSplashWindow () {
  const message = FIRST_RUN ? 'Preparing' : 'Starting';

  const splashDir = path.join(__dirname, '../dist/splash.html');
  splash = new BrowserWindow({
    minWidth: 480,
    minHeight: 120,
    width: 480,
    height: 120,
    minimizable: false,
    maximizable: false,
    fullscreen: false,
    frame: false,
    acceptFirstMouse: true,
    closable: false,
    icon: path.join(__dirname, '../dist/icon.png'),
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  splash.center();
  splash.focus();

  splash.loadFile(splashDir, { query: { message } });

  splash.on('closed', () => {
    splash = null;
  });
}

function createWindow () {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 600
  });

  win = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    frame: false,
    acceptFirstMouse: true,
    closable: true,
    icon: path.join(__dirname, '../dist/icon.png'),
    show: false
  });

  prepareNewWindow();
  win.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: MODE } });

  win.on('closed', () => {
    win = null;
  }).once('ready-to-show', () => {
    splash.destroy();
    win.show();
    if (MODE === 'dev') {
      win.webContents.openDevTools();
    }
  });

  // Open external links in separate windows
  win.webContents.on('new-window', function (e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  // Open external links in webviews in separate windows
  win.webContents.on('did-attach-webview', function (e, webview) {
    webview.on('new-window', (e, url) => {
      e.preventDefault();
      shell.openExternal(url);
    });
  });

  mainWindowState.manage(win);

  // Always start the window maximized
  win.maximize();
}

app.on('before-quit', (e) => {
  if (win) {
    win.close();
    e.preventDefault();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); }
});

app.on('activate', (e, hasVisibleWindows) => {
  if (!hasVisibleWindows) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createSplashWindow();

  Componentizer.loadAll(() => {
    Packager.loadAll(() => {
      (FIRST_RUN
        ? new Promise((resolve) => {
          const packageJSONDir = path.join(__dirname, '../builtin/package.cam.json');
          fse.pathExists(packageJSONDir).then((exists) => {
            if (exists) {
              Packager.addPackageFromJSON(packageJSONDir, resolve, true);
            } else {
              resolve();
            }
          });
        })
        : Promise.resolve()
      ).then(() => {
        createWindow();
      });
    });
  });
});

function prepareNewWindow () {
  // Clear all bound events
  EC.clear();

  // Bind events
  FetchRequest.bindAll();
  FileRequest.bindAll(win);
  LogRequest.bindAll(win.webContents);
  PackageRequest.bindAll(win);
  ProcessRequest.bindAll();
  StorageRequest.bindAll();
  SystemInfoRequest.bindAll();
  WindowRequest.bindAll(win);

  // Reload is only available in development mode
  if (MODE === 'dev') {
    EC.on({
      id: 'Reload',
      name: 'request-reload',
      caller: Wrap(function (event) {
        event.sender.reloadIgnoringCache();
        event.sender.openDevTools();

        // reset the saved file directory
        EC.cache('file').saveDirectory = '';
      })
    });
  }
}
