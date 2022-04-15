import Api, { TApi } from './api'; // eslint-disable-line
import MyEvent, { TEvent } from './event'; // eslint-disable-line

let onReadyCalled = false;

/**
 * Connect to the application and call `cb`. This function can only be called ONCE.
 * @param {(event: TEvent, api: TApi, destroy: (() => void)) => void} cb
 */
export default function onReady (cb) {
  if (onReadyCalled) { throw new Error('Helper utility can only be called ONCE.'); }
  onReadyCalled = true;

  const event = MyEvent(); let api = null;

  const parseData = (data) => {
    const json = typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]' ? data : {};

    const tmp = Object.prototype.hasOwnProperty.call(json, 'result')
      ? {
          result: json.result
        }
      : Object.prototype.hasOwnProperty.call(json, 'error') && json.error instanceof Error
        ? {
            error: json.error
          }
        : {
            args: typeof json.args === 'object' && Array.isArray(json.args) ? json.args : []
          };

    return json.request
      ? {
          request: '' + json.request,
          ...tmp
        }
      : null;
  };

  const calling = {};
  const methods = {
    call: (name, ...args) => {
      return event.call.apply(null, [name, null, ...args]);
    }
  };

  const handler = (e, ...args) => {
    const data = parseData(args[0]);
    if (data) {
      const parts = data.request.split(':');
      if (parts[0] === 'parent') {
        Promise.resolve(
          (methods[parts.slice(2).join(':')] || (() => { })).apply(null, data.args)
        ).then((value) => {
          window.ipcRenderer.sendToHost('component-api', {
            request: data.request,
            result: value
          });
        }, (error) => {
          window.ipcRenderer.sendToHost('component-api', {
            request: data.request,
            error
          });
        });
      } else if (calling[data.request]) {
        if (Object.prototype.hasOwnProperty.call(data, 'error')) {
          calling[data.request].reject(data.error);
          delete calling[data.request];
        } else if (Object.prototype.hasOwnProperty.call(data, 'result')) {
          calling[data.request].resolve(data.result);
          delete calling[data.request];
        }
      }
    }
  };
  window.ipcRenderer.on('component-api', handler);

  // Now we are ready to shake
  window.ipcRenderer.sendToHost('component-api', { request: 'shake' });

  let callCounter = 0;
  cb(event, api = Api({
    call: (...args) =>
      new Promise((resolve, reject) => {
        const request = `child:${callCounter++}:call`;
        calling[request] = { resolve, reject };
        window.ipcRenderer.sendToHost('component-api', { request, args });
      })
  }), function () {
    window.ipcRenderer.removeListener('component-api', handler);
    event.reset();
    api.destroy();
  });
}
