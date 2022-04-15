import { DashboardEvents, DashboardGlobals, DashboardMenubar, ensureHTML } from '../globals';
import { Observable } from 'object-observer';

const absoluteApiCheckFlag = DashboardMenubar.getMenuItemsById('absoluteapicheck');
const portApiWarningFlag = DashboardMenubar.getMenuItemsById('portapiwarning');
const allowed = {};

const ports = Observable.from({}, { async: true });
const listening = {};

/**
 * @typedef {Object} TComponentApi
 * @property {DashboardEvents} _events Event manager
 * @property {(...args) => Promise<*>} call Call exposed API of the component and wait for it to finish
 * @property {(...args) => Promise<void>} invoke Invoke exposed API and wait only until the request is sent
 * @property {() => void} disable Disable all communications
 * @property {(cb: (() => any)) => Promise<any>} whenEstablished Call a function after the connection is established
 */

/**
 * Enable API on the component
 * @param {string} entity The component entity
 * @param {unknown} iframe Selector to the `iframe` element
 * @param {import('./component').TComponent} component The component instance
 * @returns {TComponentApi} The component API instance
 */
export default function ComponentApi (entity, iframe, component) {
  /**
   * @type {TComponentApi}
   */
  const exports = {
    _events: DashboardEvents()
  };

  // An object to store listeners to ports
  const portListeners = {};

  const $iframe = $(iframe);

  const parseData = (data) => {
    const json = $.type(data) === 'object' ? data : {};

    const tmp = Object.prototype.hasOwnProperty.call(json, 'result')
      ? {
          result: json.result
        }
      : Object.prototype.hasOwnProperty.call(json, 'error') && json.error instanceof Error
        ? {
            error: json.error
          }
        : {
            args: $.type(json.args) === 'array' ? json.args : []
          };

    return json.request
      ? {
          request: '' + json.request,
          ...tmp
        }
      : null;
  };

  const connection = {
    promise: new Promise((resolve) => {
      const shake = (event) => {
        if (event.channel === 'component-api') {
          const data = parseData(event.args[0]);
          if (data && data.request === 'shake') {
            $iframe[0].removeEventListener('ipc-message', shake);
            resolve();
          }
        }
      };

      $iframe[0].addEventListener('ipc-message', shake);
    })
  };

  const calling = {};
  const methods = {
    call: (event, ...args) => {
      const checkAbsolutePermission = (info, yes, no) => {
        if (absoluteApiCheckFlag.isTicked() && !Object.prototype.hasOwnProperty.call(allowed, entity)) {
          $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
            title: `${ensureHTML(component.options().name)}: Absolute Permission Required!`,
            content: `<div style="line-height: 1.25rem;">
              A component of id <strong>${ensureHTML(entity)}</strong> requires the permission to use absolute paths for reading/writing files. Request: <code style="vertical-align: unset;">${info}</code>.<br />This may expose your private data to the component provider. Are you sure to allow this action?
            </div><p style="font-size: 0.9em; margin-top: 0.5rem;">
              <input type="checkbox" />
              <label style="margin-left: 0.5rem;">Remember my choice for such components until the end of this session.</label>
            </p>`,
            buttons: {
              cancel: {
                btnClass: 'btn-red',
                action: function () {
                  if (this.$content.find('input[type="checkbox"]').is(':checked')) { allowed[entity] = false; }
                  no();
                }
              },
              confirm: {
                text: 'Allow',
                btnClass: 'btn-blue',
                action: function () {
                  if (this.$content.find('input[type="checkbox"]').is(':checked')) { allowed[entity] = true; }
                  yes();
                }
              }
            }
          }));
        } else if (allowed[entity]) { yes(); } else { no(); }
      };

      const warnPort = (port, yes, no) => {
        if (portApiWarningFlag.isTicked()) {
          $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
            title: `${ensureHTML(component.options().name)}: Port Connection Required!`,
            content: `This component wants to listen to the port <strong>${port}</strong>. Are you sure to make this connection?<br />Be careful that it might lead to cyclic updates that freeze the application.`,
            buttons: {
              confirm: () => {
                yes();
              },
              cancel: () => {
                no();
              }
            }
          }));
        } else yes();
      };

      const ensurePort = (port, reject) => {
        port = parseInt(port);
        if (isNaN(port)) {
          reject(new Error('Invalid port number'));
          return;
        }
        return `${port}`;
      };

      switch (event) {
        case 'alert':
          return new Promise((resolve) => {
            $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
              title: `${ensureHTML(component.options().name)}: Alert!`,
              content: ensureHTML(args[0] || ''),
              onClose: () => resolve()
            }));
          });
        case 'confirm':
          return new Promise((resolve) => {
            $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
              title: `${ensureHTML(component.options().name)}: Confirmation`,
              content: ensureHTML(args[0] || ''),
              buttons: {
                confirm: () => {
                  resolve(true);
                },
                cancel: () => {
                  resolve(false);
                }
              }
            }));
          });
        case 'newoutput':
          return new Promise((resolve) => {
            component.trigger('outputchange', ...args);
            resolve();
          });
        case 'readfileabsoluteconfirm':
          return new Promise((resolve) => {
            checkAbsolutePermission(`READ FROM <strong>${args[0] || 'N/A'}</strong>`, () => {
              resolve(true);
            }, () => {
              resolve(false);
            });
          });
        case 'savefileabsoluteconfirm':
          return new Promise((resolve) => {
            checkAbsolutePermission(`WRITE TO <strong>${args[0] || 'N/A'}</strong>`, () => {
              resolve(true);
            }, () => {
              resolve(false);
            });
          });
        case 'bindtoport':
          return new Promise((resolve, reject) => {
            const port = ensurePort(args[0], reject);
            if (!port) {
              return;
            }

            warnPort(port, () => {
              ports.observe(portListeners[port] = (changes) => {
                exports.call(`port.${port}`, changes[changes.length - 1].value);
              }, {
                path: port
              });
              if (Object.prototype.hasOwnProperty.call(ports, port)) {
                exports.call(`port.${port}`, ports[port]);
              }
              if (!Object.prototype.hasOwnProperty.call(listening, port)) {
                listening[port] = [];
              }
              listening[port].push(component._compID);
              resolve(true);
            }, () => {
              resolve(false);
            });
          });
        case 'unbindfromport':
          return new Promise((resolve, reject) => {
            const port = ensurePort(args[0], reject);
            if (!port) {
              return;
            }

            if (Object.prototype.hasOwnProperty.call(portListeners, port)) {
              ports.unobserve(portListeners[port]);
              delete portListeners[port];
            }
            if (Object.prototype.hasOwnProperty.call(listening, port)) {
              listening[port] = listening[port].filter((value) => value !== component._compID);
              if (!listening[port].length) {
                delete listening[port];
                delete ports[port];
              }
            }
            resolve();
          });
        case 'sendtoport':
          return new Promise((resolve, reject) => {
            const port = ensurePort(args[0], reject);
            if (!port) {
              return;
            }

            if (Object.prototype.hasOwnProperty.call(listening, port) && listening[port].length) {
              ports[port] = args[1];
              resolve(listening[port].length);
            } else {
              resolve(0);
            }
          });
        case 'componentgetentity':
          return entity;
        case 'componentgetname':
          return component.options().name;
        case 'componentsetname':
          component.rename(args[0]);
          return component.options().name;
        case 'componentgetbackground':
          return component.options().background;
        case 'componentsetbackground':
          component.background(args[0]);
          return component.options().background;
        case 'componentaddinputparam':
          return component._events.call('hub.parameter.input.add', null, ...args)[0];
        case 'componenthasinputparam':
          return component._events.call('hub.parameter.input.has', null, ...args)[0];
        case 'componentremoveinputparam':
          return component._events.call('hub.parameter.input.remove', null, ...args)[0];
        case 'componentaddoutputparam':
          return component._events.call('hub.parameter.output.add', null, ...args)[0];
        case 'componenthasoutputparam':
          return component._events.call('hub.parameter.output.has', null, ...args)[0];
        case 'componentremoveoutputparam':
          return component._events.call('hub.parameter.output.remove', null, ...args)[0];
        case 'componentgetallparams':
          return component._events.call('hub.parameter.all', null, ...args)[0];
        default:
          $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
            title: `${ensureHTML(component.options().name)}: Method Call Declined!`,
            content: 'The component calls an unreferenced API method, thus has been declined. Please contact the component developer.'
          }));
      }
    }
  };

  const handler = (event) => {
    if (event.channel !== 'component-api') { return; }

    connection.promise.then(() => {
      const data = parseData(event.args[0]);
      if (data) {
        const parts = data.request.split(':');
        if (parts[0] === 'child') {
          Promise.resolve(
            (methods[parts.slice(2).join(':')] || (() => { })).apply(null, data.args)
          ).then((value) => {
            $iframe[0].send('component-api', {
              request: data.request,
              result: value
            });
          }, (error) => {
            $iframe[0].send('component-api', {
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
    });
  };
  $iframe[0].addEventListener('ipc-message', handler);

  // Forward console message to host
  const logHandler = (event) => {
    const message = `[${component.options().name}] ${event.message}`;
    if (event.level === 0) {
      console.log(message);
    } else if (event.level === 1) {
      console.info(message);
    } else if (event.level === 2) {
      console.warn(message);
    } else {
      console.error(message);
    }
  };
  $iframe[0].addEventListener('console-message', logHandler);

  // Crash alert
  const crashHandler = () => {
    $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
      title: `${ensureHTML(component.options().name)}: Crashed!`,
      content: 'This component appeared to have crashed. Try resetting it or contacting the component developer.'
    }));
  };
  $iframe[0].addEventListener('crashed', crashHandler);

  connection.destroy = () => {
    $iframe[0].removeEventListener('ipc-message', handler);
    $iframe[0].removeEventListener('console-message', logHandler);
    $iframe[0].removeEventListener('crashed', crashHandler);
  };

  let callCounter = 0;
  exports.call = function (...args) {
    return connection.promise.then(() =>
      new Promise((resolve, reject) => {
        const request = `parent:${callCounter++}:call`;
        calling[request] = { resolve, reject };
        $iframe[0].send('component-api', { request, args });
      })
    );
  };

  exports.invoke = function (...args) {
    return connection.promise.then(() =>
      new Promise((resolve) => {
        const request = `parent:${callCounter++}:call`;
        try {
          $iframe[0].send('component-api', { request, args });
        } catch (err) { }
        resolve();
      })
    );
  };

  exports.disable = function () {
    connection.destroy();
    DashboardGlobals.destroyObj(exports);
  };

  exports.whenEstablished = function (cb) {
    return connection.promise.then(() => cb());
  };

  // Finally, set the component source
  setTimeout(() => {
    $iframe.attr('src', `data:text/html,${encodeURIComponent(component.options().body)}`);
  }, 0);

  return exports;
}
