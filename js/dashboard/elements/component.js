import { DashboardEvents, DashboardGlobals, DashboardCache, ensureHTML } from '../globals';
import ComponentApi, { TComponentApi } from './component.api'; // eslint-disable-line
import ContextMenu from './contextmenu';

/**
 * @typedef {Object} ComponentConfig
 * @property {string} namespace Component field namespace
 * @property {string} [name='Untitled'] Component name
 * @property {boolean} [init=false] true to initialize the component, false otherwise
 * @property {boolean} [primary=true] true to make the component primary (unable to be deleted), false otherwise
 * @property {boolean} [silent=false] true to omit component UI rendering, false otherwise
 * @property {string} [body=''] Component content
 * @property {string} [background='#97d2fb'] Component background color
 * @property {unknown} compElm Component element
 * @property {unknown} minCompElm Minimized component element
 * @property {?string} color Component title text color
 * @property {number} [height=400] Component height
 * @property {number} [width=400] Component width
 */

/**
 * @typedef {Object} ComponentState
 * @property {() => Promise<string>} backup Get the snapshot object of the component
 * @property {(backupData: string) => Promise<void>} restore Restore the component from backup data
 */

/**
 * @typedef {Object} TComponent
 * @property {string} _compID Component id
 * @property {string} _mcompID Minimized component id
 * @property {DashboardEvents} _events Event manager
 * @property {Object.<string, *>} cache Component cache object
 * @property {TComponentApi} api Component API instance
 * @property {(noconfirm: boolean) => Promise<void>} destroy Destroy the component instance
 * @property {() => Partial<ComponentConfig>} options Get the component attributes
 * @property {(toSelector: boolean) => unknown} compInstance Get the component HTML element (false), or JQuery element (true)
 * @property {(toSelector: boolean) => unknown} minCompInstance Get the minimized component HTML element (false), or JQuery element (true)
 * @property {(hexcolor: string) => TComponent} background Set new component background color
 * @property {(newName: string) => TComponent} rename Set new component name
 * @property {() => TComponent} duplicate Duplicate current component and return the reference to the new one
 * @property {() => Promise<TComponent>} maximize Maximize the component
 * @property {() => Promise<TComponent>} minimize Minimize the component
 * @property {() => boolean} isMaximized Check if the component is maximized
 * @property {() => TComponent} enable Enable the component
 * @property {() => TComponent} disable Disable the component
 * @property {() => TComponent} toggle Call enable/disable accordingly
 * @property {() => TComponent} reset Reset the component to its initial state
 * @property {() => TComponent} init Initialize the component
 * @property {(event: string, ...args) => TComponent} trigger Trigger a component event
 * @property {ComponentState} state Component state manager
 */

/**
 * Create a component
 * @param {ComponentConfig} obj The configuration object
 * @returns {TComponent} The component instance
 */
export default function Component (obj) {
  /**
   * @type {TComponent}
   */
  const exports = {
    _compID: DashboardGlobals.uniqueID('cp'),
    _mcompID: DashboardGlobals.uniqueID('mc'),
    _events: DashboardEvents(),
    api: null,
    cache: {}
  };
  let firstRun = true; let onReset;
  let comp; let $comp; let mincomp; let $mincomp;
  let canEnable = false;

  let namespace = '!unknown';
  let name = 'Untitled';
  let body = '';
  let init = false;
  let background = '#97d2fb';
  let color = 'black';
  let primary = true;
  let silent = false;
  let enabled = false;
  let width = 200;
  let height = 200;
  let maximized = true;

  if (obj) {
    if (obj.namespace !== undefined) { namespace = obj.namespace; }
    if (obj.name !== undefined) { name = obj.name; }
    if (obj.init === true) { init = obj.init; }
    if (obj.primary === false) { primary = false; }
    if (obj.silent === true) { silent = true; } else {
      $comp = $(obj.compElm); comp = $comp[0];
      $mincomp = $(obj.minCompElm); mincomp = $mincomp[0];
      if (obj.body !== undefined) { body = obj.body; }
      if (obj.background !== undefined && /^#[0-9A-F]{6}$/i.test(obj.background)) { background = obj.background; }
    }
    if (obj.width) { width = Math.max(0, parseInt(obj.width)); }
    if (obj.height) { height = Math.max(0, parseInt(obj.height)); }
  }

  exports.destroy = function (noconfirm) {
    return new Promise((resolve) => {
      if (!noconfirm && primary) { return resolve(); }

      const _destroy = () =>
        exports.api.invoke('willremove', true).then(() => {
          exports._events.call('beforedestroy', exports);

          if (!silent) {
            var parentCompInstance = $comp.parent(); // eslint-disable-line
            var parentMinCompInstance = $mincomp.parent(); // eslint-disable-line
            $comp.remove();
            $mincomp.remove();
          }

          DashboardCache.remove(`Component:${name}`);

          exports._events.call('afterdestroy', exports, silent
            ? undefined
            : {
                parentCompInstance: parentCompInstance,
                parentMinCompInstance: parentMinCompInstance
              });
          exports.api.disable();
          DashboardGlobals.destroyObj(exports);
        });

      if (silent || noconfirm) { return _destroy().then(resolve); }

      $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
        content: 'This will delete the component permanently. Are you sure?',
        buttons: {
          confirm: () => {
            exports.api.call('willremove', false).then((remove) => {
              if (remove !== false) { _destroy().then(resolve); } else {
                $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
                  content: 'The component prevented you from removing it. Do you want to force the removal?',
                  buttons: {
                    confirm: () => {
                      _destroy().then(resolve);
                    },
                    cancel: resolve
                  }
                }));
              }
            });
          },
          cancel: resolve
        }
      }));
    });
  };

  exports.options = function () {
    return silent
      ? {
          namespace: namespace,
          name: name,
          init: init,
          primary: primary,
          silent: silent
        }
      : {
          compElm: comp,
          minCompElm: mincomp,
          namespace: namespace,
          name: name,
          body: body,
          init: init,
          primary: primary,
          silent: silent,
          background: background,
          color: color,
          width: width,
          height: height
        };
  };

  exports.compInstance = function (toSelector) {
    return silent ? null : (toSelector ? $comp : comp);
  };

  exports.minCompInstance = function (toSelector) {
    return silent ? null : (toSelector ? $mincomp : mincomp);
  };

  exports.background = function (hexcolor) {
    if (!silent) { _setBackground(hexcolor); }
    return exports;
  };

  exports.rename = function (newName) {
    newName = `${newName ?? ''}`.trim();
    if (newName.length && newName !== name) {
      const oldName = name;
      exports._events.call('beforerename', exports, newName, oldName);

      DashboardCache.remove(`Component:${name}`);
      name = DashboardGlobals.fixDuplicateNames.run(newName, 'Component');
      DashboardCache.set(`Component:${name}`, true);

      if (!silent) {
        $comp.find('.component__header__title').text(name);
        $mincomp.find('.component-minimized__title').text(name);
      }

      exports._events.call('afterrename', exports, newName, oldName);
    }
    return exports;
  };

  exports.duplicate = function () {
    exports._events.call('beforeduplicate', exports);

    if (!silent) {
      var compDiv = document.createElement('div'); // eslint-disable-line
      var mincompDiv = document.createElement('div'); // eslint-disable-line
      $comp.after(compDiv);
      $mincomp.after(mincompDiv);
    }

    const options = exports.options();
    options.primary = false;

    if (!silent) {
      options.compElm = compDiv;
      options.minCompElm = mincompDiv;
    }

    const newComp = Component(options);
    exports._events.call('afterduplicate', exports, newComp);

    return newComp;
  };

  exports.maximize = function () {
    return new Promise((resolve) => {
      if (!silent) {
        exports._events.call('beforemaximize', exports);

        $comp.fadeIn(DashboardGlobals.duration.fastPace);
        $mincomp.fadeOut(DashboardGlobals.duration.fastPace);

        $comp.add($mincomp).promise().done(function () {
          try {
            maximized = true;
            exports._events.call('aftermaximize', exports);
            resolve(exports);
          } catch (err) { }
        });
      } else { resolve(exports); }
    });
  };

  exports.minimize = function () {
    return new Promise((resolve) => {
      if (!silent) {
        exports._events.call('beforeminimize', exports);

        $comp.fadeOut(DashboardGlobals.duration.fastPace);
        $mincomp.fadeIn(DashboardGlobals.duration.fastPace);

        $comp.add($mincomp).promise().done(function () {
          try {
            maximized = false;
            exports._events.call('afterminimize', exports);
            resolve(exports);
          } catch (err) { }
        });
      } else { resolve(exports); }
    });
  };

  exports.isMaximized = function () {
    return maximized;
  };

  exports.enable = function () {
    if (!silent && canEnable) {
      if (!onReset) { exports._events.call('beforeenable', exports); }

      $comp.removeClass('disabled');
      $comp.find('.component__header__modes__toggler.onoff').attr('title', 'Lock');
      $(document).tooltip('disable');
      $(document).tooltip('enable');
      enabled = true;

      if (!onReset) { exports._events.call('afterenable', exports); }
    }

    return exports;
  };

  exports.disable = function () {
    if (!silent) {
      exports._events.call('beforedisable', exports);

      $comp.addClass('disabled');
      $comp.find('.component__header__modes__toggler.onoff').attr('title', 'Unlock');
      $(document).tooltip('disable');
      $(document).tooltip('enable');
      enabled = false;

      exports._events.call('afterdisable', exports);
    }

    return exports;
  };

  exports.toggle = function () {
    return (enabled === true) ? exports.disable() : exports.enable();
  };

  exports.reset = function () {
    exports._events.call('beforereset', exports);

    canEnable = false;

    onReset = true;
    if (!firstRun) { DashboardCache.remove(`Component:${name}`); }
    firstRun = false;

    // fix duplicate name
    name = DashboardGlobals.fixDuplicateNames.run(name, 'Component');
    DashboardCache.set(`Component:${name}`, true);

    if (!silent) {
      // replace main component
      comp.outerHTML = `<div class="component disabled ${exports._compID}${primary ? ' primary' : ''}">
        <div class="component__header">
          <div class="component__header__modes">
            <div class="component__header__modes__toggler minimize" title="Minimize">&mdash;</div>
            <div class="component__header__modes__toggler onoff" title="Unlock"></div>
          </div>
          <div class="component__header__title">${name}</div>
          <div class="component__header__modes right">
            <div class="component__header__modes__toggler menu" title="Menu"></div>
          </div>
          <div class="component__header__menu">
            <div class="component__header__menu__item color">Color</div>
            <div class="component__header__menu__item rename">Rename</div>
            <div class="component__header__menu__item duplicate">Duplicate</div>
            <div class="component__header__menu__item reset">Reset</div>
            ${!primary ? '<div class="component__header__menu__item delete">Delete</div>' : ''}
          </div>
          <div class="component__header__overlay">
            <div class="inputgroup" style="display: none;">
              <div class="inputgroup__info">Rename:</div>
              <div class="inputgroup__input">
                <input class="component__header__overlay__namebox" placeholder="Enter a new name" />
                <small>ENTER to proceed, ESC to cancel.</small>
              </div>
            </div>
            <div class="component__header__overlay__text">Initializing...</div>
          </div>
        </div>
        <div class="component__body" style="height: ${height}px; width: ${width}px; box-sizing: content-box;"></div>
      </div>`;
      comp = ($comp = $(`.${exports._compID}`))[0];

      // set component width
      const $body = $comp.find('.component__body');
      $comp.css('width', width + $body.innerWidth() - $body.width());

      // replace minimized component
      mincomp.outerHTML = `<div class="component-minimized ${exports._mcompID}" style="display: none;" data-belong-to-component="${exports._compID}">
        <div class="component-minimized__modes">
          <div class="component-minimized__modes__toggler maximize" title="Maximize">&#65291;</div>
        </div>
        <div class="component-minimized__title">${name}</div>
      </div>`;
      mincomp = ($mincomp = $(`.${exports._mcompID}`))[0];

      // context menu on the minimized component item
      const mincompMenu = ContextMenu(`.${exports._mcompID}`, {
        id: 'main',
        align: 'vertical',
        menus: [
          {
            name: 'Color',
            id: 'color',
            type: 'click'
          },
          {
            name: 'Rename',
            id: 'rename',
            type: 'click'
          },
          {
            name: 'Duplicate',
            id: 'duplicate',
            type: 'click'
          }
        ].concat(primary
          ? []
          : [
              {},
              {
                name: 'Delete',
                id: 'remove',
                type: 'click'
              }
            ])
      }).init();

      mincompMenu.menu._events
        .on('rename', () => {
          DashboardGlobals.launchInputBox('Rename Component', name, 'Type new name here', (newValue) => {
            exports.rename(newValue);
          });
        })
        .on('duplicate', () => {
          exports.duplicate();
        })
        .on('remove', () => {
          exports.destroy();
        })
        .on('color', ({ dontCloseAllMenus }) => dontCloseAllMenus());

      mincompMenu.menu.getMenuItemsById('color').$.spectrum({
        ...DashboardGlobals.spectrumConfiguration,
        type: 'color',
        color: background,
        show: function () {
          mincompMenu.menu.mainMenu.hide();
        },
        move: function (color) {
          exports.background(color.toHexString());
        },
        change: function (color) {
          exports.background(color.toHexString());
        }
      });

      // set background and text color for component's header
      _setBackground(background, false);

      // add keyup handler for name box
      $comp.find('.component__header__overlay__namebox').on('keyup', function (e) {
        if (e.which === 13) { // enter
          exports.rename($(this).val());
          $(this).parents('.inputgroup').css('display', 'none');
        }
        if (e.which === 27) { // esc
          $(this).parents('.inputgroup').css('display', 'none');
        }
      }).on('blur', function () {
        $(this).parents('.inputgroup').css('display', 'none');
      });

      // close menu utility
      const closeMenu = function () {
        $comp.find('.component__header__modes__toggler.menu').removeClass('active');
        $comp.find('.component__header__menu').removeClass('active');
        $body.removeAttr('disabled');
      };

      // add click outside handler for closing menu
      $(document).on('mouseup', function (e) {
        const container = $comp.find('.component__header__menu').add($comp.find('.component__header__modes__toggler.menu'));
        if (!container.is(e.target) && container.has(e.target).length === 0) { closeMenu(); }
      });

      // initialize color picker
      $comp.find('.component__header__menu__item.color').spectrum({
        ...DashboardGlobals.spectrumConfiguration,
        color: background,
        hide: closeMenu,
        move: function (color) {
          exports.background(color.toHexString());
        },
        change: function (color) {
          exports.background(color.toHexString());
        }
      });

      // ONCLICK MENU EVENTS
      $comp.find('.component__header__modes__toggler.menu').on('click', function () {
        $(this).toggleClass('active');
        $comp.find('.component__header__menu').toggleClass('active');
        $body.toggleAttr('disabled');
      });
      $comp.find('.component__header__menu__item.color').on('click', function () {
        $(this).spectrum('show');
      });
      $comp.find('.component__header__menu__item.rename').on('click', function () {
        $comp.find('.component__header__overlay__namebox').val(name);
        $comp.find('.component__header__overlay .inputgroup').css('display', '');
        $comp.find('.component__header__overlay__namebox').trigger('focus');
        closeMenu();
      });
      $comp.find('.component__header__menu__item.duplicate').on('click', function () {
        exports.duplicate();
        closeMenu();
      });
      $comp.find('.component__header__menu__item.reset').on('click', function () {
        $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
          content: 'This will reset the component to its initial state. Are you sure?',
          buttons: {
            confirm: () => {
              exports.reset();
            },
            cancel: () => { }
          }
        }));
        closeMenu();
      });
      if (!primary) {
        $comp.find('.component__header__menu__item.delete').on('click', function () {
          exports.destroy();
          closeMenu();
        });
      }

      // OTHER TOGGLER CLICK EVENTS
      $comp.find('.component__header__modes__toggler.onoff').on('click', exports.toggle);
      $comp.find('.component__header__modes__toggler.minimize').on('click', exports.minimize);
      $mincomp.find('.component-minimized__modes__toggler.maximize').on('click', exports.maximize);

      // refresh tooltip
      $.fn.updateTitle('');

      // establish connection with webview
      const $webview = $('<webview style="height: 100%; width: 100%;" preload="../app/preload.js" />');
      exports.api = ComponentApi(namespace, $webview, exports);
      $webview.appendTo($body);
    }

    exports.cache = {};

    // call after initialization
    exports._events.call('afterinit', exports);

    if (!silent) {
      const $overlayText = $comp.find('.component__header__overlay__text');
      $overlayText.text('Establishing a connection...');
      exports.api.whenEstablished(() => {
        $overlayText.css('display', 'none');
        canEnable = true;
        exports.enable();
      });
    } else {
      canEnable = true;
      exports.enable();
    }

    return exports;
  };

  exports.trigger = function (event, ...args) {
    if (!event || !Object.prototype.hasOwnProperty.call(event, 'length') || !event.length) { event = 'triggered'; }
    exports._events.call.apply(null, Array.prototype.concat([event, exports], args));
    return exports;
  };

  exports.state = {
    backup: function () {
      return exports.api.call('backup').then((backupData) => {
        let backupStr = '{}';
        try {
          backupStr = JSON.stringify(backupData);
        } catch (err) {
          $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
            title: `${ensureHTML(name)}: Backup Failed`,
            content: 'Invalid backup data. Error: ' + (err ? (err.message || '') : '')
          }));
        }
        return backupStr;
      }).catch(() => {
        return '{}';
      });
    },
    restore: function (backupStr) {
      let backupData = {};
      try {
        backupData = JSON.parse(backupStr);
      } catch (err) {
        $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
          title: `${ensureHTML(name)}: Restore Failed`,
          content: 'Backup data corrupted. Error: ' + (err ? (err.message || '') : '')
        }));
      }

      return exports.api.call('restore', backupData).catch((err) => {
        $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
          title: `${ensureHTML(name)}: Restore Failed`,
          content: err ? (err.message || '') : ''
        }));
      });
    }
  };

  exports.init = function () {
    if (firstRun) { exports.reset(); }
    return exports;
  };
  if (init) { exports.init(); }

  // UTILITIES
  function _setBackground (hexcolor, fireChangeEvent = true) {
    if (!(/^#[0-9A-F]{6}$/i.test(hexcolor))) { return; }

    const oldBackground = background;
    background = hexcolor;

    if (hexcolor.slice(0, 1) === '#') { hexcolor = hexcolor.slice(1); }

    if (hexcolor.length === 3) {
      hexcolor = hexcolor.split('').map(function (hex) {
        return hex + hex;
      }).join('');
    }

    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    color = (yiq >= 128) ? '#000' : '#fff';

    $comp.find('.component__header').add($mincomp).css({
      background: background,
      color: color
    });

    if (fireChangeEvent) exports._events.call('backgroundchange', exports, background, color, oldBackground);
  }

  return exports;
}
