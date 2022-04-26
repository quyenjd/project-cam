import Api, { TApi } from './api';
import MyEvent, { TEvent } from './event';

/**
 * The function that will be called after the Helper is initialized
 * @category Callback
 */
export interface OnReadyCallback {
  /**
   * @param event The event instance used to catch events triggered by the application
   * @param api The API instance used to fetch events/requests to the application
   * @param destroy Destroy the connection with the application
   */
  (event: TEvent, api: TApi, destroy: (() => void)): void;
}

let onReadyCalled = false;

/**
 * Connect to the application and call `cb`. This function can only be called **once**.
 */
export default function onReady (cb: OnReadyCallback) {
  if (onReadyCalled) {
    throw new Error('Helper utility can only be called ONCE.');
  }
  onReadyCalled = true;

  const event = MyEvent();
  let api: TApi;

  const parseData = (data: any) => {
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

  const calling = {} as Record<string, {
    resolve: (value: any) => void,
    reject: (reason?: any) => void
  }>;
  const methods = {
    call: (name: string, ...args: any[]) => {
      return event.call.apply(null, [name, null, ...args]);
    }
  } as Record<string, Function>;

  const handler = (e: never, ...args: any[]) => {
    const data = parseData(args[0]);
    if (data) {
      const parts = data.request.split(':');
      if (parts[0] === 'parent') {
        Promise.resolve(
          (methods[parts.slice(2).join(':')] || (() => { })).apply(null, data.args)
        ).then((value) => {
          (window as any).ipcRenderer.sendToHost('component-api', {
            request: data.request,
            result: value
          });
        }, (error) => {
          (window as any).ipcRenderer.sendToHost('component-api', {
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
  (window as any).ipcRenderer.on('component-api', handler);

  // Now we are ready to shake
  (window as any).ipcRenderer.sendToHost('component-api', { request: 'shake' });

  let callCounter = 0;
  cb(event, api = Api({
    call: (...args) =>
      new Promise((resolve, reject) => {
        const request = `child:${callCounter++}:call`;
        calling[request] = { resolve, reject };
        (window as any).ipcRenderer.sendToHost('component-api', { request, args });
      })
  }), function () {
    (window as any).ipcRenderer.removeListener('component-api', handler);
    event.reset();
    api.destroy();
  });
}

export * from './api';
export * from './event';
