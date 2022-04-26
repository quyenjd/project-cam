const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', (() => {
  const ret = {
    invoke: (event, ...args) => {
      return ipcRenderer.invoke.apply(null, [event].concat(args));
    },
    on: (event, listener) => {
      ipcRenderer.on(event, listener);
      return ret;
    },
    removeAllListeners: (event) => {
      ipcRenderer.removeAllListeners(event);
      return ret;
    },
    removeListener: (event, listener) => {
      ipcRenderer.removeListener(event, listener);
      return ret;
    },
    send: (event, ...args) => {
      ipcRenderer.send.apply(null, [event ?? ''].concat(args));
      return ret;
    },
    sendSync: (event, ...args) => {
      return ipcRenderer.sendSync.apply(null, [event ?? ''].concat(args));
    },
    sendToHost: (event, ...args) => {
      ipcRenderer.sendToHost.apply(null, [event ?? ''].concat(args));
    }
  };
  return ret;
})());

contextBridge.exposeInMainWorld('platform', {
  get: () => process.platform
});

if (process.type !== 'browser') {
  contextBridge.exposeInMainWorld('directComponentApi', {
    call: (event, ...args) => {
      const forward = (channel) => {
        return ipcRenderer.invoke(channel, ...args);
      };

      switch (event) {
        case 'getfield':
          return forward('request-get-field');
        case 'setfield':
          return forward('request-set-field');
        case 'readfile':
          return forward('request-component-read-file');
        case 'readfileabsolute':
          return forward('request-read-file');
        case 'readfilefrom':
          return forward('request-component-read-file-from');
        case 'savefile':
          return forward('request-component-save-file').then((value) => value === true);
        case 'savefileabsolute':
          return forward('request-save-file');
        case 'savefileas':
          return forward('request-component-save-file-as');
        case 'runfile':
          return forward('request-component-run-file');
        case 'runcommand':
          return forward('request-component-run-command');
        case 'runcommandinshell':
          return forward('request-component-run-command-in-shell');
        case 'systeminfo':
          return forward('request-component-system-info');
        case 'fetch':
          return forward('request-component-fetch');
      }
    }
  });
}
