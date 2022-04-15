import { DashboardEvents, DashboardGlobals } from '../globals';
import Menubar, { TMenubar } from './menubar'; // eslint-disable-line

/**
 * @typedef {Object} ContextMenuConfig
 * @property {'horizontal'|'vertical'} [align='vertical'] Menubar alignment
 * @property {(ContextMenuConfig|Object.<string, never>)[]} [menus=[]] Submenus (empty object for divider)
 * @property {string} id Menubar id
 * @property {'click'|'hover'} [type='hover'] Whether the menu should show when clicking or hovering on the menu item
 * @property {string} [name=''] Name of the menu item
 * @property {string} [key=''] Shortcut key for the operation
 * @property {boolean} [disabled=false] Whether to disable the menu item
 * @property {boolean} [hidden=false] Whether to hide the menu item
 * @property {boolean} [ticked=false] Whether to tick the menu item
 */

/**
 * @typedef {Object} ContextMenuConfigMain
 * @property {'horizontal'|'vertical'} [align='vertical'] Context menu alignment
 * @property {(ContextMenuConfig|Object.<string, never>)[]} [menus=[]] Submenus (empty object for divider)
 * @property {'main'} id Main menu id
 * @property {unknown} [ignore=''] Selector of elements in which the context menu is ignored
 */

/**
 * @typedef {Object} TContextMenu
 * @property {string} _contextMenuID Context menu id
 * @property {DashboardEvents} _events Event manager
 * @property {boolean} initialized true if the menu has been initialized, false otherwise
 * @property {() => TContextMenu} init Initialize the context menu
 * @property {TMenubar} menu The menu instance (if initialized)
 * @property {() => void} destroy Destroy the context menu instance
 */

/**
 * Create a context menu
 * @param {string} selector Selector string for the context menu to bind to
 * @param {ContextMenuConfigMain} options The configuration object
 * @returns {TContextMenu} The context menu instance
 */
export default function ContextMenu (selector, options) {
  let initialized = false;

  /**
   * @type {TContextMenu}
   */
  const exports = {
    _contextMenuID: DashboardGlobals.uniqueID('cm'),
    _events: DashboardEvents(),
    get initialized () { return initialized; }
  };

  const $overlay = $(`<div style="display: none; position: fixed; top: 0; left: 0; bottom: 0; right: 0; z-index: ${DashboardGlobals.menubarButtonsZIndex - 2};"></div>`);

  exports.init = function () {
    if (initialized) { return exports; }

    const dfs = function dfs (options) {
      let ret;
      switch ($.type(options)) {
        case 'array':
          ret = [];
          options.forEach((obj) => ret.push(dfs(obj)));
          break;
        case 'object':
          ret = $.extend(true, {}, options);
          if (!$.isEmptyObject(ret)) { ret.alt = false; }
          if (ret.menus) { ret.menus = dfs(ret.menus); }
          break;
        default:
          ret = options;
          break;
      }

      return ret;
    };

    exports.menu = Menubar($.extend(dfs(options), {
      altMode: false,
      keyboardMode: true,
      keyboardModeOnFirstMenu: true
    })).init(document.body);
    exports.menu.mainMenu.$.addClass('context-menu');

    // forward mouse events to the selector
    exports.menu.mainMenu.$.on('mouseenter mouseleave', () => {
      $(selector).trigger('mouseenter');
    }).on('mousemove', () => {
      $(selector).trigger('mousemove');
    });

    // when shown, the menu should trigger first as the above events are not triggered yet
    exports.menu._events.on('_show', () => {
      setTimeout(() => {
        $(selector).trigger('mouseenter');
      }, 0);
    });

    // when the menu closes, check if the pointer left the selector
    $overlay.on('mousedown', (e) => {
      if (!$(e.relatedTarget).closest(selector).length) {
        $(selector).trigger('mouseleave');
      }
    });
    exports.menu.mainMenu.$.on('click', (e) => {
      if (!$(e.relatedTarget).closest(selector).length) {
        $(selector).trigger('mouseleave');
      }
    });

    $(document.body).on(`contextmenu.${exports._contextMenuID}`, selector, function (e) {
      const $target = $(e.target);
      if ($target.closest(options.ignore).length) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      exports._events.call('beforeshow', exports, e);

      exports.menu.mainMenu.show({
        top: e.pageY,
        left: e.pageX
      }, false);
      exports.menu.mainMenu.$.parent().css('z-index', DashboardGlobals.menubarButtonsZIndex - 1);
    });

    // show an overlay to prevent clicking on other elements (except menu bar buttons)
    $overlay.appendTo(document.body);
    exports.menu._events.on('_show', () => $overlay.show()).on('_hide', () => $overlay.hide());

    initialized = true;
    return exports;
  };

  exports.destroy = function () {
    if (initialized) {
      exports.menu.destroy();
      $overlay.remove();
      $(document.body).off(`contextmenu.${exports._contextMenuID}`);
      DashboardGlobals.destroyObj(exports);
    }

    return exports;
  };

  return exports;
}
