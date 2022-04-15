import { DashboardGlobals, DashboardEvents, ensureDoubleQuotes, ensureHTML } from '../globals';

/**
 * @typedef {Object} MenubarConfig
 * @property {'horizontal'|'vertical'} [align='vertical'] Menubar alignment
 * @property {(MenubarConfig|Object.<string, never>)[]} [menus=[]] Submenus (empty object for divider)
 * @property {string} id Menubar id
 * @property {'click'|'hover'} [type='hover'] Whether the menu should show when clicking or hovering on the menu item
 * @property {string} [name=''] Name of the menu item
 * @property {string} [key=''] Shortcut key for the operation
 * @property {number|false} [alt=0] Position of the character to be used as key in alt mode to trigger the operation (starting from 0)
 * @property {boolean} [disabled=false] Whether to disable the menu item
 * @property {boolean} [hidden=false] Whether to hide the menu item
 * @property {boolean} [ticked=false] Whether to tick the menu item
 */

/**
 * @typedef {Object} MenubarConfigMain
 * @property {'horizontal'|'vertical'} [align='vertical'] Menubar alignment
 * @property {(MenubarConfig|Object.<string, never>)[]} [menus=[]] Submenus (empty object for divider)
 * @property {'main'} id Main menu id
 * @property {boolean} [altMode=true] Allow `Alt` navigation feature on the menus
 * @property {boolean} [keyboardMode=true] Allow navigation using arrows on the menus
 * @property {boolean} [keyboardModeOnFirstMenu=false] Allow navigation using arrows on the main menu
 */

/**
 * @typedef {Object} MenubarItem
 * @property {unknown} $ Menu item JQuery element
 * @property {string} name Item name
 * @property {() => MenubarItem} enable Enable the item to be clickable
 * @property {() => MenubarItem} disable Disable the item
 * @property {() => boolean} isDisabled Check if the item is disabled
 * @property {() => MenubarItem} show Show the item
 * @property {() => MenubarItem} hide Hide the item
 * @property {() => boolean} isHidden Check if the item is hidden
 * @property {() => MenubarItem} tick Tick the item
 * @property {() => MenubarItem} untick Untick the item
 * @property {() => boolean} isTicked Check if the item is ticked
 */

/**
 * @typedef {Object} MenubarMainMenu
 * @property {unknown} $ Main menu JQuery element
 * @property {(position: ('bl'|'br'|'tl'|'tr'|{ top: number, left: number }), markAsExplicit: boolean) => boolean} show Show the main menu
 * @property {() => boolean} hide Hide the main menu
 */

/**
 * @typedef {Object} TMenubar
 * @property {string} _menuID Menu id
 * @property {DashboardEvents} _events Event manager
 * @property {(container: unknown) => TMenubar} init Initialize the menu bar
 * @property {(id: string) => MenubarItem} getMenuItemsById Get a menu item
 * @property {MenubarMainMenu} mainMenu Main menu item
 * @property {() => void} destroy Destroy the menu
 */

/**
 * Create a menubar
 * @param {MenubarConfigMain} options The configuration object
 * @returns {TMenubar} The menubar instance
 */
export default function Menubar (options) {
  /**
   * @type {TMenubar}
   */
  const exports = {
    mainMenu: {},
    _menuID: DashboardGlobals.uniqueID('bc'),
    _events: DashboardEvents()
  };
  let initialized = false;

  const MAIN_MENU_ID = 'main';

  const // in milliseconds
    SHOW_HIDE_DURATION = DashboardGlobals.duration.normalPace;
  const SHOW_TIMEOUT_AFTER_MOUSEENTER = DashboardGlobals.duration.fastPace;
  const HIDE_TIMEOUT_AFTER_MOUSELEAVE = DashboardGlobals.duration.fastPace;

  options = $.extend(true, {}, options);
  options.id = MAIN_MENU_ID;

  let $container;

  const collections = {
    userDict: {},
    focusCounter: {},
    idle: {},
    opening: {},
    explicit: {}
  };

  let altMode = false;
  let keyboardMode = false;
  let forceAltModeFalse = false;
  let forceKeyboardModeFalse = false;
  let keyboardModeOnFirstMenu = false;

  let cachedZIndex = 1000000;
  let cachedMouseEnterTurn = 0;

  let menuStack = [];

  const keyboardNavigation = (function () {
    const EXPORTS = {};

    EXPORTS.start = function (menuId, initializeIndex) {
      const $currentMenu = $container.find(`.menubar[data-menu-id="${menuId}"]`);
      if (!$currentMenu.length) { return false; }

      let isMenuHorizontal = $currentMenu.hasClass('horizontal');
      const menuItems = $currentMenu.children();

      if (!menuItems.length) { return false; }

      const triggered = () => $currentMenu.hasAttr('data-triggered');
      const isValidItem = (idx) =>
        menuItems.eq(idx).hasClass('menubar__item') && !menuItems.eq(idx).hasClass('disabled');
      const findNextValidPosition = function (from) {
        for (let i = (from + 1) % menuItems.length; i !== from; i = (i + 1) % menuItems.length) {
          if (isValidItem(i)) {
            menuItems.eq(i).addClass('keyboard').siblings().removeClass('keyboard');
            return i;
          }
        }
        return from;
      };
      const findPrevValidPosition = function (from) {
        for (let i = (from - 1 + menuItems.length * 2) % menuItems.length; i !== from; i = (i - 1 + menuItems.length * 2) % menuItems.length) {
          if (isValidItem(i)) {
            menuItems.eq(i).addClass('keyboard').siblings().removeClass('keyboard');
            return i;
          }
        }
        return from;
      };

      let currentPosition = initializeIndex ? findNextValidPosition(-1) : -1;
      let currentItem = currentPosition === -1 ? $() : menuItems.eq(currentPosition);

      const ret = {
        menuId: menuId,
        isHorizontal: isMenuHorizontal,
        moveToPosition: (newPosition) => {
          if (newPosition < 0 || newPosition >= menuItems.length) { return false; }

          if (newPosition === currentPosition) { return false; }

          currentItem.trigger('mouseleave').removeClass('keyboard');
          currentItem = menuItems.eq(newPosition).addClass('keyboard');

          if (triggered()) { currentItem.trigger('mouseenter', [true]); }

          currentPosition = newPosition;

          return true;
        },
        up: () => {
          if (isMenuHorizontal) {
            if (currentItem.hasClass('more') && triggered()) {
              if (currentItem.attr('data-submenu-type') === 'hover') { currentItem.trigger('mouseleave'); } else { currentItem.trigger('click'); }

              _hide(0, currentItem.attr('data-trigger'), true);
              $currentMenu.removeAttr('data-triggered');

              return false;
            }

            return true;
          }

          ret.moveToPosition(findPrevValidPosition(currentPosition));

          return false;
        },
        down: () => {
          if (isMenuHorizontal) {
            if (currentItem.hasClass('more') && !triggered()) {
              currentItem.trigger(currentItem.attr('data-submenu-type') === 'hover' ? 'mouseenter' : 'click', [true]);
              $currentMenu.attr('data-triggered', true);

              return false;
            }

            return true;
          }

          ret.moveToPosition(findNextValidPosition(currentPosition));

          return false;
        },
        left: () => {
          isMenuHorizontal = !isMenuHorizontal;
          const res = ret.up();
          isMenuHorizontal = !isMenuHorizontal;

          return res;
        },
        right: () => {
          isMenuHorizontal = !isMenuHorizontal;
          const res = ret.down();
          isMenuHorizontal = !isMenuHorizontal;

          return res;
        },
        enter: () => {
          currentItem.trigger(currentItem.attr('data-submenu-type') === 'hover' ? 'mouseenter' : 'click', [true]);
          return false;
        },
        esc: () => {
          if (currentItem.hasClass('more') && triggered()) { return isMenuHorizontal ? ret.up() : ret.left(); }
          return true;
        }
      };
      return ret;
    };

    return EXPORTS;
  })();

  // === FOCUS COUNTER LISTENER
  const tickrate = 50;
  let focusListener = true;
  (function focusCleaner () {
    const menuIds = [];

    for (const menuId in collections.focusCounter) {
      menuIds.push({
        menuId: menuId,
        level: parseInt($container.find(`.menubar[data-menu-id="${menuId}"]`).attr('data-menu-level'))
      });
    }

    menuIds.sort((a, b) => a.level >= b.level ? -1 : 1);

    for (let i = 0; i < menuIds.length; ++i) {
      const menuId = menuIds[i].menuId;
      const $menu = $container.find(`.menubar[data-menu-id="${menuId}"]`);

      if (!collections.focusCounter[menuId] && !$menu.hasAttr('data-clicked')) {
        const savedIdle = collections.idle[menuId];

        setTimeout(() => {
          if (collections.idle[menuId] === savedIdle) { _hide(SHOW_HIDE_DURATION, menuId); }
        }, HIDE_TIMEOUT_AFTER_MOUSELEAVE);

        delete collections.focusCounter[menuId];
      } else { break; }
    }

    if (focusListener) { setTimeout(focusCleaner, tickrate); }
  })();

  exports.init = function (container) {
    if (initialized) { return exports; }

    const $appendTo = $(`<div class="${exports._menuID}"></div>`).appendTo(container);
    const usedID = {};

    $container = $();

    const dfs = function dfs (obj, level) {
      if ($.type(obj) !== 'object') { return; }

      level = parseInt(level) || 0;

      obj = $.extend(true, {
        align: 'vertical',
        menus: []
      }, obj);

      const ensureID = (id, newIDIfNeeded) => {
        if (!id || $.type(id) !== 'string' || !(id = id.replace(/\W/g, '')).length) { id = newIDIfNeeded ? DashboardGlobals.uniqueID('mb') : ''; }
        return id;
      };

      obj.id = ensureID(obj.id, true);

      // It is only supported for first-level `main` menu bar
      if (level === 0) {
        if (obj.id !== 'main') { throw new Error('Menubar: first-level menu bar should always have id of `main`'); } else { // main-specialized options
          forceAltModeFalse = obj.altMode === false;
          forceKeyboardModeFalse = obj.keyboardMode === false;
          keyboardModeOnFirstMenu = obj.keyboardModeOnFirstMenu === true;
        }
      }

      let menu = `<div class="menubar-wrapper${!level ? ' level0' : ''}" style="display: none;"><div class="menubar ${obj.align === 'horizontal' ? obj.align : 'vertical'}" data-menu-id="${obj.id}" data-menu-level="${level}">`;
      const usedAlt = {};

      obj.menus.forEach(function (item) {
        if ($.type(item) !== 'object') { return; }

        // is horizontal line?
        if ($.isEmptyObject(item)) { menu += `<div class="menubar__divider">${'<div>null</div>'.repeat(4)}</div><div class="menubar__divider spacing">${'<div>null</div>'.repeat(4)}</div>`; } else {
          const ensuredID = ensureID(item.id, false);

          if (usedID[ensuredID]) { throw new Error('Menubar: Duplicate id'); } else { usedID[ensuredID] = true; }

          item = $.extend(true, {
            type: 'hover',
            name: '',
            key: '',
            alt: 0,
            disabled: false,
            hidden: false,
            ticked: false
          }, item);

          let altedName = item.name; let altChar = '';

          if (item.alt !== false) {
            const ensuredName = ensureHTML(item.name);
            item.alt = parseInt(item.alt);

            if (item.alt < 0 || item.alt >= ensuredName.length) { throw new Error('Menubar: Invalid alt shortcut key'); }

            altChar = ensuredName.charAt(item.alt).toUpperCase();
            if (altChar < 'A' || altChar > 'Z') { throw new Error('Menubar: Alt shortcut key must be a letter'); }

            if (usedAlt[altChar]) { throw new Error('Menubar: Duplicate alt shortcut key (case-insensitive) within one menu'); } else { usedAlt[altChar] = true; }

            altedName = '';
            for (let i = 0; i < ensuredName.length; ++i) { altedName += i !== item.alt ? ensuredName[i] : `<span class="key">${ensuredName[i]}</span>`; }
          }

          menu += `<div class="menubar__item${item.disabled ? ' disabled' : ''}${item.ticked ? ' checked' : ''}${item.menus && $.type(item.menus) === 'array' && item.menus.length
            ? ` more" data-trigger="${ensureDoubleQuotes(dfs(item, level + 1))}" data-submenu-type="${ensureHTML(item.type)}"`
            : `" data-trigger="${ensuredID}"`}${altChar ? ` data-altkey="${altChar}"` : ''}${item.hidden ? ' style="display: none;"' : ''}>
              <div class="menubar__item__icon"></div>
              <div class="menubar__item__name">${altedName}</div>
              <div class="menubar__item__key">${ensureHTML(item.key)}</div>
              <div class="menubar__item__more"></div>
            </div>`;

          if (ensuredID) {
            hotkeys(item.key, {
              element: $container[0],
              keyup: false
            }, function (e) {
              const menuItem = _menuItem(ensuredID);

              if (menuItem.isDisabled()) { return; }

              e.preventDefault();
              _disableAltMode();

              let willCloseAllMenus = true;

              exports._events.call(ensuredID, exports, {
                dontCloseAllMenus: () => {
                  willCloseAllMenus = false;
                },
                menuItem
              });

              if (willCloseAllMenus) { _disableAltMode(); }
            });
          }
        }
      });

      menu += '</div></div>';

      const $menu = $(menu);
      $container = $container.add($menu.appendTo($appendTo));

      if (obj.id) {
        if (!Object.prototype.hasOwnProperty.call(collections.userDict, obj.id)) { collections.userDict[obj.id] = []; }
        collections.userDict[obj.id].push($menu);
      }

      return obj.id;
    };

    dfs(options);

    $container.find('.menubar__item').on('mouseenter', function (e, callFromKeyboard) {
      e.stopPropagation();
      if (!callFromKeyboard) { $container.find('.menubar').removeClass('keyboard'); }

      // This function displays and positions the sub menu opened by
      // hovering on menubar__item

      const $this = $(this);
      const menuId = $this.attr('data-trigger');
      const submenuType = $this.attr('data-submenu-type');
      const $parentMenubar = $this.parent();
      const parentMenuId = $parentMenubar.attr('data-menu-id');

      if ($this.hasClass('disabled') || $this.hasAttr('data-mouse-entered')) { return; }
      $this.attr('data-mouse-entered', true).addClass('hover');

      if (!callFromKeyboard) {
        for (let i = menuStack.length - 1; i >= 0; --i) {
          if (menuStack[i].menuId === parentMenuId) {
            menuStack[i].moveToPosition($this.parent().children().index($this));
            break;
          }
        }
      }

      // Update mouse enter turn
      ++cachedMouseEnterTurn;

      // Update focus counter of the parent menu
      if (!Object.prototype.hasOwnProperty.call(collections.focusCounter, parentMenuId)) { collections.focusCounter[parentMenuId] = 0; }
      ++collections.focusCounter[parentMenuId];

      // Update idle counter of the parent menu
      if (!Object.prototype.hasOwnProperty.call(collections.idle, parentMenuId)) { collections.idle[parentMenuId] = 0; }
      ++collections.idle[parentMenuId];

      // Focus clean all menus having higher level
      _focusCleanByLevel(parseInt($parentMenubar.attr('data-menu-level')) + 1);

      if (submenuType === 'hover' || (submenuType === 'click' && $this.hasAttr('data-clicked'))) {
        const doTheJob = function () {
          // Fix accidental mixed use of keyboard and mouse navigation
          $parentMenubar.attr('data-triggered', true);

          // Update focus counter of the menu
          if (!Object.prototype.hasOwnProperty.call(collections.focusCounter, menuId)) { collections.focusCounter[menuId] = 0; }
          ++collections.focusCounter[menuId];

          // Update idle counter of the menu
          if (!Object.prototype.hasOwnProperty.call(collections.idle, menuId)) { collections.idle[menuId] = 0; }
          ++collections.idle[menuId];

          _display(SHOW_HIDE_DURATION, menuId,
            [null, 'bl', 'tr', null][$parentMenubar.hasClass('horizontal') + $parentMenubar.hasClass('vertical') * 2]);
        };

        if (submenuType !== 'hover') { doTheJob(); } else {
          // If trigger type is hover, user has a short amount of delay
          // before the menu is opened to prevent sliding mouseovers

          const savedTurn = cachedMouseEnterTurn;

          setTimeout(() => {
            if (cachedMouseEnterTurn !== savedTurn) { return; }
            doTheJob();
          }, SHOW_TIMEOUT_AFTER_MOUSEENTER);
        }
      }
    }).on('mouseleave', function (e) {
      e.stopPropagation();

      // This function hides the menu after an amount of time
      // Should work on data-submenu-type="hover" elements only

      const $this = $(this);
      const menuId = $this.attr('data-trigger');
      const submenuType = $this.attr('data-submenu-type');
      const $parentMenubar = $this.parent();
      const parentMenuId = $parentMenubar.attr('data-menu-id');

      if ($this.hasClass('disabled') || !$this.hasAttr('data-mouse-entered')) { return; }
      $this.removeAttr('data-mouse-entered').removeClass('hover');

      if (submenuType === 'hover') {
        // Fix accidental mixed use of keyboard and mouse navigation
        $parentMenubar.removeAttr('data-triggered');

        // Update focus counter of the parent menu
        if (collections.focusCounter[parentMenuId]) { --collections.focusCounter[parentMenuId]; }

        // Update focus counter of the menu
        if (collections.focusCounter[menuId]) { --collections.focusCounter[menuId]; }
      }
    }).on('click', function () {
      // This function displays the menu and sets data-clicked attribute
      // on its siblings
      // Should work on data-submenu-type="click" elements only

      const $this = $(this);
      const menuId = $this.attr('data-trigger');
      const submenuType = $this.attr('data-submenu-type');
      const $parentMenubar = $this.parent();

      if ($this.hasClass('disabled')) { return; }

      // By default, the menus will not close if clicked on a menu item with .more
      let willCloseAllMenus = !$this.hasClass('more');

      exports._events.call(menuId, exports, {
        dontCloseAllMenus: () => {
          willCloseAllMenus = false;
        },
        menuItem: _menuItem(menuId, $this)
      });

      if (willCloseAllMenus) { _disableAltMode(); }

      if (submenuType === 'click') {
        if ($this.hasAttr('data-clicked')) {
          // Fix accidental mixed use of keyboard and mouse navigation
          $parentMenubar.removeAttr('data-triggered');

          $this.parent().children().removeAttr('data-clicked');

          const menuLevel = parseInt($container.find(`.menubar[data-menu-id="${menuId}"]`).attr('data-menu-level'));
          _forceCleanByLevel(menuLevel + 1);
          _forceCleanByLevel(menuLevel, false);
        } else {
          // Fix accidental mixed use of keyboard and mouse navigation
          $parentMenubar.attr('data-triggered', true);

          $this.parent().children().attr('data-clicked', true);
          _display(SHOW_HIDE_DURATION, menuId,
            [null, 'bl', 'tr', null][$parentMenubar.hasClass('horizontal') + $parentMenubar.hasClass('vertical') * 2]);
        }
      }
    });

    if (!forceAltModeFalse) {
      $(window).on(`keydown.${exports._menuID}`, function (e) {
        if (e.originalEvent.repeat) { return; }

        // Handle alt key
        if (e.which === 18) {
          if (_forceCleanByLevel(0) || altMode) {
            _disableAltMode();
            return;
          }

          e.preventDefault();

          altMode = keyboardMode = true;
          menuStack = [keyboardNavigation.start('main', keyboardMode)];
          $container.find('.menubar').addClass('alt keyboard alt-keydown');
          return;
        }

        // Handle A to Z in alt mode
        if (altMode && e.which >= 65 && e.which <= 90) {
          const propName = $(e.target).prop('tagName');
          if (propName === 'input' || propName === 'textarea' || propName === 'select') { return; }

          if (menuStack.length > 0) {
            const $menu = $container.find(`.menubar[data-menu-id="${menuStack[menuStack.length - 1].menuId}"]`);
            const $altItem = $menu.find(`.menubar__item[data-altkey="${String.fromCharCode(e.which)}"]`);
            if ($altItem.length) {
              menuStack[menuStack.length - 1].moveToPosition($altItem.parent().children().index($altItem));
              menuStack[menuStack.length - 1].enter();

              e.preventDefault();
              e.cancelBubble = true;
              if (e.stopPropagation) { e.stopPropagation(); }
            }
          }
        }
      }).on(`keyup.${exports._menuID}`, function () {
        $container.find('.menubar').removeClass('alt-keydown');
      });
    }

    // Keyboard navigation
    if (!forceKeyboardModeFalse) {
      hotkeys('up,down,left,right,enter,esc', {
        element: $container[0],
        keyup: false
      }, function (evt, handler) {
        // Triggering keyboard mode without alt key requires at least an opening menu except `main`
        if (!keyboardModeOnFirstMenu && !keyboardMode) {
          if (menuStack.length > 1) { keyboardMode = true; } else { return; }
        }

        $container.find('.menubar').addClass('keyboard');

        evt.preventDefault();
        evt.cancelBubble = true;
        if (evt.stopPropagation) { evt.stopPropagation(); }

        const cleanup = function (cb) {
          for (let i = menuStack.length - 1; i >= 0 && cb(i); --i);
        };

        switch (handler.key) {
          case 'up':
            cleanup((i) => menuStack[i].up());
            break;
          case 'down':
            cleanup((i) => menuStack[i].down());
            break;
          case 'left':
            cleanup((i) => menuStack[i].left());
            break;
          case 'right':
            cleanup((i) => menuStack[i].right());
            break;
          case 'enter':
            cleanup((i) => menuStack[i].enter());
            break;
          case 'esc':
            if (menuStack.length > 1) { cleanup((i) => menuStack[i].esc()); } else { _disableAltMode(); }
            break;
        }
      });
    }

    // Close menus and disable alt mode when clicking outside or out of focus
    $(window).on(`mousedown.${exports._menuID} blur.${exports._menuID} resize.${exports._menuID}`, function (e) {
      if (!$(e.target).closest($container).length) { _disableAltMode(); }
    });

    initialized = true;

    return exports;
  };

  exports.getMenuItemsById = function (id) {
    return !initialized ? _menuItem(null) : _menuItem(id);
  };

  // Define mainMenu.$ as read-only
  Object.defineProperty(exports.mainMenu, '$', {
    get: () => $container.find(`.menubar[data-menu-id="${MAIN_MENU_ID}"]`)
  });

  exports.mainMenu.show = function (position, markAsExplicit) {
    if (!initialized) { return false; }

    const newExplicit = Math.min(1, (collections.explicit[MAIN_MENU_ID] || 0) + 1);
    delete collections.explicit[MAIN_MENU_ID];

    const hasShown = _display(0, MAIN_MENU_ID, position);

    if (markAsExplicit) { collections.explicit[MAIN_MENU_ID] = newExplicit; }

    return hasShown;
  };

  exports.mainMenu.hide = function () {
    if (!initialized) { return false; }

    const newExplicit = Math.max(-1, (collections.explicit[MAIN_MENU_ID] || 0) - 1);
    delete collections.explicit[MAIN_MENU_ID];

    const hasHidden = _hide(0, MAIN_MENU_ID, true);
    collections.explicit[MAIN_MENU_ID] = newExplicit;

    return hasHidden;
  };

  exports.destroy = function () {
    if (!initialized) { return; }

    focusListener = false;
    $container.remove();
    $(window).off(`.${exports._menuID}`);

    DashboardGlobals.destroyObj(exports);
  };

  // === UTILITIES

  function _disableAltMode () {
    altMode = keyboardMode = false;

    $container.find('[data-triggered]').removeAttr('data-triggered');
    $container.find('.alt-keydown').removeClass('alt-keydown');
    $container.find('.alt').removeClass('alt');
    $container.find('.keyboard').removeClass('keyboard');
    $container.find('.hover').removeClass('hover');

    _forceCleanByLevel(0);
  }

  function _display (duration, menuId, mode) {
    if (collections.opening[menuId] || collections.explicit[menuId]) { return false; }

    const $menuElement = $container.find(`.menubar[data-menu-id="${menuId}"]`);
    const $menuItemReference = $container.find(`.menubar__item[data-trigger="${menuId}"]`);

    if (!$menuElement.length) { return false; }
    if ($.type(mode) !== 'string' || !mode.match(/^(b|t){1}(l|r){1}$/)) {
      mode = $.extend({
        top: 0,
        left: 0
      }, mode);
    } else if (!$menuItemReference.is(':visible')) { mode = { top: 0, left: 0 }; }

    $menuElement.parent().finish().show().css({
      height: 'auto',
      width: 'auto'
    });

    const smallestTopIncrement = 4; // pixels
    const verticalUpwardIndentation = 2; // pixels

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const menuHeight = $menuElement[0].getBoundingClientRect().height + parseFloat($menuElement.css('marginTop')) + parseFloat($menuElement.css('marginBottom'));
    const menuWidth = $menuElement[0].getBoundingClientRect().width + parseFloat($menuElement.css('marginLeft')) + parseFloat($menuElement.css('marginRight'));

    const reference = $.type(mode) === 'string' && mode.match(/^(b|t){1}(l|r){1}$/) ? $menuItemReference[0].getBoundingClientRect() : null;

    const desiredTop = reference ? (mode[0] === 'b' ? reference.bottom : (reference.top - verticalUpwardIndentation)) : mode.top;
    const desiredLeft = reference ? (mode[1] === 'l' ? reference.left : reference.right) : mode.left;

    const maximumTop = Math.max(
      reference ? ($menuItemReference.parent()[0].getBoundingClientRect().top + smallestTopIncrement) : 0,
      viewportHeight - menuHeight
    );
    const maximumLeft = Math.max(0, viewportWidth - menuWidth);

    const finalTop = Math.min(desiredTop, maximumTop);
    const finalLeft = Math.min(desiredLeft, maximumLeft);

    $menuElement.parent().css({
      top: finalTop,
      left: finalLeft,
      height: Math.min(menuHeight, viewportHeight - finalTop),
      width: Math.min(menuWidth, viewportWidth - finalLeft),
      zIndex: cachedZIndex++
    }).hide();

    // Hide all menubars having higher or equal level
    const menuLevel = parseInt($menuElement.attr('data-menu-level'));
    _forceCleanByLevel(menuLevel + 1);
    _forceCleanByLevel(menuLevel, false);

    $menuElement.parent().fadeIn(duration);
    $menuItemReference.addClass('active');
    collections.focusCounter[menuId] = 1;
    collections.opening[menuId] = true;

    menuStack.push(keyboardNavigation.start(menuId, keyboardMode));

    exports._events.call('_show', exports, menuId);

    return true;
  }

  function _hide (duration, menuId, cleanDataClickedAttributes) {
    if (!collections.opening[menuId] || collections.explicit[menuId]) { return false; }

    const $menuElement = $container.find(`.menubar[data-menu-id="${menuId}"]`);
    const $menuItemReference = $container.find(`.menubar__item[data-trigger="${menuId}"]`);

    $menuElement
      .removeAttr('data-triggered')
      .parent().finish().fadeOut(duration);
    $menuElement.children().removeClass('hover active keyboard').removeAttr('data-mouse-entered');
    $menuItemReference.removeClass('active');

    if (cleanDataClickedAttributes) { $menuItemReference.parent().children().removeAttr('data-clicked'); }

    delete collections.focusCounter[menuId];
    delete collections.opening[menuId];

    menuStack = menuStack.filter((item) => item.menuId !== menuId);

    exports._events.call('_hide', exports, menuId);

    return true;
  }

  function _forceCleanByLevel (level, cleanDataClickedAttributes) {
    if (cleanDataClickedAttributes !== false) { cleanDataClickedAttributes = true; }

    let atLeastOneCleaned = false;

    for (const menuId in collections.opening) {
      if (parseInt($container.find(`.menubar[data-menu-id="${menuId}"]`).attr('data-menu-level')) >= level) { atLeastOneCleaned |= _hide(0, menuId, cleanDataClickedAttributes); }
    }

    return atLeastOneCleaned;
  }

  function _focusCleanByLevel (level) {
    for (const menuId in collections.opening) {
      if (parseInt($container.find(`.menubar[data-menu-id="${menuId}"]`).attr('data-menu-level')) >= level) { collections.focusCounter[menuId] = 0; }
    }
  }

  function _menuItem (id, $predefinedSelector) {
    const EXPORTS = {};
    let $ret;

    // Ensure that even selector is predefined, it has to contain only menu items with given id
    if ($predefinedSelector && $predefinedSelector instanceof jQuery) { $ret = $predefinedSelector.filter(`.menubar__item[data-trigger="${ensureDoubleQuotes(id)}"]`); } else { $ret = $(); }

    if (!$ret.length) { $ret = $container.find(`.menubar__item[data-trigger="${ensureDoubleQuotes(id)}"]`); }

    Object.defineProperty(EXPORTS, '$', {
      get: () => $ret
    });

    Object.defineProperty(EXPORTS, 'name', {
      get: () => $ret.find('.menubar__item__name').html(),
      set: (newName) => {
        if (!$ret.hasAttr('data-altkey')) { $ret.find('.menubar__item__name').html(newName); }
      }
    });

    EXPORTS.enable = () => {
      $ret.removeClass('disabled');
      return EXPORTS;
    };

    EXPORTS.disable = () => {
      $ret.trigger('mouseleave').addClass('disabled');
      return EXPORTS;
    };

    EXPORTS.isDisabled = () => $ret.hasClass('disabled');

    EXPORTS.show = () => {
      $ret.show();
      return EXPORTS;
    };

    EXPORTS.hide = () => {
      $ret.trigger('mouseleave').hide();
      return EXPORTS;
    };

    EXPORTS.isHidden = () => $ret.is(':visible');

    EXPORTS.tick = () => {
      $ret.addClass('checked');
      return EXPORTS;
    };

    EXPORTS.untick = () => {
      $ret.removeClass('checked');
      return EXPORTS;
    };

    EXPORTS.isTicked = () => $ret.hasClass('checked');

    return EXPORTS;
  }

  return exports;
}
