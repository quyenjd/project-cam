import { DashboardEvents, DashboardGlobals, ensureDoubleQuotes, ensureHTML } from '../globals';
import ContextMenu from './contextmenu';

/**
 * @typedef {Object} StickyMenuOptions
 * @property {boolean} [show=true] true to show the menu, false to hide
 * @property {boolean} [left=true] true to stick the menu to the left, false to the right
 * @property {boolean} [autoShow=false] true to auto show the menu when mouse in, false otherwise
 * @property {boolean} [autoHide=true] true to auto hide the menu when mouse out, false otherwise
 */

/**
 * @typedef {Object} StickyTabs
 * @property {(id: string, name: string) => StickyTabs} add Add a tab to the list
 * @property {(id: string, toSelector: boolean) => unknown|null} instance Get the instance of the tab element.
 * Pass true to `toSelector` to get the JQuery element instead of normal HTML element.
 * @property {(id: string) => boolean} has Check if the list has a tab
 * @property {(id: string) => StickyTabs} remove Remove a tab from the list
 * @property {(id: string, newName: string) => StickyTabs} rename Rename a tab in the list
 * @property {(id: string) => StickyTabs} setActive Trigger a tab to be active
 */

/**
 * @typedef {Object} TStickyMenu
 * @property {() => TStickyMenu} hide Hide the menu
 * @property {() => TStickyMenu} show Show the menu
 * @property {() => StickyMenuOptions} options Get current menu options
 * @property {() => TStickyMenu} switchSide Switch the menu to the other side
 * @property {() => TStickyMenu} toggleAutoShow Toggle auto show on/off
 * @property {() => TStickyMenu} toggleAutoHide Toggle auto hide on/off
 * @property {() => void} destroy Destroy current menu
 * @property {StickyTabs} tabs Tab manager
 */

/**
 * Create a sticky menu instance
 * @param {unknown} e Selector to append the sticky menu to
 * @param {StickyMenuOptions} obj The configuration object
 * @returns {TStickyMenu} The sticky menu instance
 */
export default function StickyMenu (e, obj) {
  /**
   * @type {TStickyMenu}
   */
  const exports = {
    _stickyID: DashboardGlobals.uniqueID('sm'),
    _events: DashboardEvents()
  };

  const SHOW_DELAY = DashboardGlobals.duration.normalPace;
  const HIDE_DELAY = DashboardGlobals.duration.userInteractionWait;

  obj = $.extend(true, {
    show: true,
    left: true,
    autoShow: false,
    autoHide: true
  }, obj);

  const $sticky = $(`<div class="sticky${!obj.left ? ' right' : ''}${obj.autoShow ? ' autoshow' : ''}"${obj.show ? '' : ' style="display: none;"'}>
    <div class="sticky__wrapper">
      <div class="sticky__edge"></div>
      <div class="sticky__placeholder">
        <div class="sticky__placeholder__logo"></div>
        <div class="sticky__placeholder__title">Browser</div>
      </div>
      <div class="sticky__menu">
        <div class="sticky__menu__wrapper">
          <div class="sticky__menu__tab"></div>
          <div class="sticky__menu__container"></div>
        </div>
      </div>
    </div>
  </div>`);
  $sticky.appendTo($(e));

  const $stickyWrapper = $sticky.find('.sticky__wrapper');

  let savedShowTimeout; let savedHideTimeout; let mouseFocused = true;
  const clearTimeouts = () => {
    if (savedShowTimeout) { clearTimeout(savedShowTimeout); }
    if (savedHideTimeout) { clearTimeout(savedHideTimeout); }
  };

  let menuOpen = false;
  const menu = ContextMenu('.sticky__placeholder', {
    id: 'main',
    align: 'vertical',
    menus: [
      {
        name: `Move Library ${obj.left ? 'Right' : 'Left'}`,
        id: 'switchside',
        type: 'click'
      },
      {
        name: 'Auto Show Library',
        id: 'autoshow',
        type: 'click',
        ticked: obj.autoShow
      },
      {
        name: 'Auto Hide Library',
        id: 'autohide',
        type: 'click',
        ticked: obj.autoHide
      },
      {
        name: 'Hide Library',
        id: 'hide',
        type: 'click'
      }
    ]
  }).init().menu;

  menu._events
    .on('switchside', () => exports.switchSide())
    .on('autoshow', () => exports.toggleAutoShow())
    .on('autohide', () => exports.toggleAutoHide())
    .on('hide', () => exports.hide())
    .on('_show', () => { menuOpen = true; })
    .on('_hide', () => { menuOpen = false; });

  $sticky.find('.sticky__placeholder').on('click', () => {
    clearTimeouts();
    $stickyWrapper.toggleClass('active');
  });

  $sticky
    .on('mouseenter', (e) => {
      if (!mouseFocused) {
        mouseFocused = true;
        clearTimeouts();
      }

      // don't fire mouseenter when hovering on the placeholder
      // as it is likely that we want to do something with it
      if ($(e.target).is($sticky.find('.sticky__placeholder'))) { return; }

      if (!obj.autoShow || $stickyWrapper.hasClass('active')) { return; }

      savedShowTimeout = setTimeout(() => {
        $stickyWrapper.addClass('active');
        savedShowTimeout = null;
      }, SHOW_DELAY);
    })
    .on('mouseleave', () => {
      const mouseLeave = () => {
        if (mouseFocused) {
          mouseFocused = false;
          clearTimeouts();
        }

        // prevent hovering on menu bars hides the menu
        if (menuOpen) {
          menu._events.one('_hide', (menuID) => {
            if (menuID === 'main' && !mouseFocused) { mouseLeave(); }
          });
          return;
        }

        if (!obj.autoHide || !$stickyWrapper.hasClass('active')) { return; }

        savedHideTimeout = setTimeout(() => {
          $stickyWrapper.removeClass('active');
          savedHideTimeout = null;
        }, HIDE_DELAY);
      };

      mouseLeave();
    });

  exports.hide = function () {
    obj.show = false;
    $sticky.hide();

    exports._events.call('change', exports, $.extend(true, {}, obj));

    return exports;
  };

  exports.show = function () {
    obj.show = true;
    $sticky.show();

    exports._events.call('change', exports, $.extend(true, {}, obj));

    return exports;
  };

  exports.options = function () {
    return $.extend(true, {}, obj);
  };

  exports.switchSide = function () {
    $sticky.toggleClass('right');

    obj.left = !$sticky.hasClass('right');
    menu.getMenuItemsById('switchside').name = ['Move Library Left', 'Move Library Right'][+obj.left];

    exports._events.call('change', exports, $.extend(true, {}, obj));

    return exports;
  };

  exports.toggleAutoShow = function () {
    const autoShowItem = menu.getMenuItemsById('autoshow');
    autoShowItem.isTicked() ? autoShowItem.untick() : autoShowItem.tick();

    obj.autoShow = !obj.autoShow;
    if (obj.autoShow) { $sticky.addClass('autoshow'); } else { $sticky.removeClass('autoshow'); }

    if (obj.autoShow && mouseFocused) { $sticky.trigger('mouseenter'); }

    exports._events.call('change', exports, $.extend(true, {}, obj));

    return exports;
  };

  exports.toggleAutoHide = function () {
    const autoHideItem = menu.getMenuItemsById('autohide');
    autoHideItem.isTicked() ? autoHideItem.untick() : autoHideItem.tick();

    obj.autoHide = !obj.autoHide;

    if (obj.autoHide && !mouseFocused) { $sticky.trigger('mouseleave'); }

    exports._events.call('change', exports, $.extend(true, {}, obj));

    return exports;
  };

  exports.destroy = function () {
    clearTimeouts();
    $sticky.remove();
    menu.destroy();
    DashboardGlobals.destroyObj(exports);
  };

  exports.tabs = new function () {
    const _this = this;
    const tabs = $sticky.find('.sticky__menu__tab');
    const containers = $sticky.find('.sticky__menu__container');

    tabs.on('click', '.sticky__menu__tab__item[data-sticky-id]', (e) => {
      _this.setActive($(e.currentTarget).attr('data-sticky-id'));
    });

    this.add = function (id, name) {
      id = ensureDoubleQuotes(id);
      if (!_this.has(id)) {
        tabs.append($(`<div class="sticky__menu__tab__item" data-sticky-id="${id}">
          <div class="sticky__menu__tab__item__title">${ensureHTML(name)}</div>
        </div>`));
        containers.append($(`<div class="sticky__menu__container__item" data-sticky-id="${id}" style="display: none;"><div>`));

        if (tabs.children().length <= 1) { _this.setActive(id); }
      }
      return _this;
    };

    this.instance = function (id, toSelector) {
      id = ensureDoubleQuotes(id);
      if (!_this.has(id)) { return null; }

      const $selector = containers.find(`.sticky__menu__container__item[data-sticky-id="${id}"]`);
      return toSelector ? $selector : $selector[0];
    };

    this.has = function (id) {
      id = ensureDoubleQuotes(id);
      const $tab = tabs.find(`.sticky__menu__tab__item[data-sticky-id="${id}"]`);
      const $container = containers.find(`.sticky__menu__container__item[data-sticky-id="${id}"]`);

      if ($tab.length && $container.length) {
        return true;
      } else if ($tab.length || $container.length) {
        if ($tab.length) { $tab.remove(); } else { $container.remove(); }
      }
      return false;
    };

    this.remove = function (id) {
      id = ensureDoubleQuotes(id);
      tabs.find(`.sticky__menu__tab__item[data-sticky-id="${id}"]`).remove();
      containers.find(`.sticky__menu__container__item[data-sticky-id="${id}"]`).remove();
      return _this;
    };

    this.rename = function (id, newName) {
      id = ensureDoubleQuotes(id);

      if (!_this.has(id)) {
        tabs
          .find(`.sticky__menu__tab__item[data-sticky-id="${id}"]`)
          .find('.sticky__menu__tab__item__title').text(newName);
      }

      return _this;
    };

    this.setActive = function (id) {
      id = ensureDoubleQuotes(id);
      if (_this.has(id)) {
        tabs.find(`.sticky__menu__tab__item[data-sticky-id="${id}"]`).addClass('active').siblings().removeClass('active');
        _this.instance(id, true).show().siblings().hide();
      }
      return _this;
    };
  }();

  return exports;
}
