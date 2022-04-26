import { DashboardEvents, DashboardGlobals, ensureDoubleQuotes } from '../globals';

const defaultDelay = DashboardGlobals.duration.fastPace;

/**
 * @typedef {Object} TabConfig
 * @property {boolean} [noCloseIcon=false] Set to true to disable close icons next to labels, default to false
 * @property {boolean} [noCollapse=false] Set to true to disable hiding the tab when no items exist, default to false
 */

/**
 * @typedef {Object} TTab
 * @property {string} _tabID Tab id
 * @property {DashboardEvents} _events Event manager
 * @property {(toSelector: boolean) => unknown} instance Get the tab HTML element (false), or JQuery element (true)
 * @property {(id: string, title: string) => TTab} add Add an item to the tab
 * @property {(id: string, forceRemove: boolean) => TTab} remove Remove an item from the tab.
 * Pass true to `forceRemove` to skip calling `beforeremove` event.
 * @property {(id: string) => boolean} hasItem Check if an item exists in the tab
 * @property {(id: string) => TTab} setActive Trigger an item to be active
 * @property {() => string|null} currentActive Get the current active item
 * @property {(id: string, newTitle: string) => boolean} updateTitle Update title of an item (if any)
 * @property {(selector: unknown) => string|null} findItem Get id of an item by a selector
 * @property {() => { id: string, active: boolean }[]} getState Get active state and order of all items
 * @property {() => void} destroy Remove the tab instance
 */

/**
 * Create a tab
 * @param {unknown} e Selector to append the tab to
 * @param {TabConfig} options The configuration object
 * @returns {TTab} The tab instance
 */
export default function Tab (e, options) {
  /**
   * @type {TTab}
   */
  const exports = {
    _tabID: DashboardGlobals.uniqueID('ta'),
    _events: DashboardEvents()
  };

  options = $.extend({
    noCloseIcon: false,
    noCollapse: false
  }, options);

  const $e = $(`<div class="tab ${exports._tabID}${options.noCloseIcon ? ' no-close' : ''}"${!options.noCollapse ? ' style="display: none;"' : ''}>
    <div class="tab__scroller left"></div>
    <div class="tab__scroller right"></div>
    <div class="tab__list"></div>
  </div>`);

  // Order of IDs that are triggered
  let history = [];

  // Initialize tab list by appending its skeleton to the given element
  $e.appendTo($(e));

  // Shortcut for tab list
  const $tabList = $e.find('.tab__list');

  // Bind scroller show/hide listener to scroll
  $tabList.on('scroll', _checkScroll);

  // Bind click events to scrollers
  $e.find('.tab__scroller.left').on('click', () => {
    $tabList.animate({
      scrollLeft: Math.max(0, $tabList.scrollLeft() - $tabList.width()) - 1
    }, defaultDelay, 'swing', _checkScroll);
  });
  $e.find('.tab__scroller.right').on('click', () => {
    $tabList.animate({
      scrollLeft: Math.min($tabList[0].scrollWidth - $tabList.width(), $tabList.scrollLeft() + $tabList.width()) + 1
    }, defaultDelay, 'swing', _checkScroll);
  });

  // Check scroll at initialization
  _checkScroll();

  // Allow sorting items in the list
  $tabList.sortable({
    cursor: 'grabbing',
    distance: 5,
    helper: 'clone',
    items: '.tab__list__item',
    opacity: 0.8,
    start: function (evt, ui) {
      ui.placeholder.width(ui.item.width());
    }
  });

  exports.instance = function (toSelector) {
    return toSelector ? $e : $e[0];
  };

  exports.add = function (id, title) {
    if (exports.hasItem(id)) { return exports; }

    const $newItem = $(`<div class="tab__list__item" data-tab-item-id="${ensureDoubleQuotes(id)}">
      <span>${title}</span>
      <div class="tab__list__item__close" title="Close (Ctrl+F4)">&times;</div>
    </div>`);

    $newItem.appendTo($tabList);
    $e.show();

    $newItem.on('click', () => {
      if ($newItem.hasClass('active')) { return; }

      history = history.filter((item) => item !== id);
      history.push(id);

      $newItem.addClass('active').siblings().removeClass('active');

      const itemLeft = $newItem.position().left;
      const tabLeft = $tabList.scrollLeft();
      const itemWidth = $newItem.outerWidth(true);
      const tabWidth = $tabList.outerWidth(true);

      if (itemLeft < 0) {
        // Item has parts to the left of the observable window
        $tabList.scrollLeft(tabLeft + itemLeft);
      } else if (itemLeft + itemWidth > tabWidth) {
        // Item has parts to the right of the observable window
        $tabList.scrollLeft(tabLeft + itemLeft + itemWidth - tabWidth);
      }

      exports._events.call(id, exports, $newItem);
    }).find('.tab__list__item__close').on('click', () => exports.remove(id));

    $newItem.trigger('click');

    exports._events.call('add', exports, id, title);

    _checkScroll();

    return exports;
  };

  exports.remove = function (id, forceRemove) {
    if (exports.hasItem(id)) {
      let shouldRemove = true;

      // if removing is forced, beforeremove shall not be called
      if (!forceRemove) {
        exports._events.call('beforeremove', exports, id, function dontRemove () {
          shouldRemove = false;
        });
      }

      if (shouldRemove) {
        _getTabItem(id).remove();

        if (exports.currentActive() === id) {
          history.pop();

          if (history.length) { exports.setActive(history[history.length - 1]); }
        } else { history = history.filter((item) => item !== id); }

        if (!history.length && !options.noCollapse) { $e.hide(); }

        exports._events.call('remove', exports, id);

        _checkScroll();
      }
    }

    return exports;
  };

  exports.hasItem = function (id) {
    return _getTabItem(id).length;
  };

  exports.setActive = function (id) {
    _getTabItem(id).trigger('click');
    return exports;
  };

  exports.currentActive = function () {
    return history.length ? history[history.length - 1] : null;
  };

  exports.updateTitle = function (id, newTitle) {
    if (exports.hasItem(id)) {
      _getTabItem(id).find('span').text(newTitle);
      return true;
    }

    return false;
  };

  exports.findItem = function (selector) {
    const id = $(selector).closest('.tab__list__item[data-tab-item-id]').attr('data-tab-item-id') || '';
    return exports.hasItem(id) ? id : null;
  };

  exports.getState = function () {
    const ret = [];
    $tabList.find('.tab__list__item').each(function () {
      const $elm = $(this);
      ret.push({
        id: $elm.attr('data-tab-item-id'),
        active: $elm.hasClass('active')
      });
    });
    return ret;
  };

  exports.destroy = function () {
    exports.instance(true).remove();
    DashboardGlobals.destroyObj(exports);
  };

  function _checkScroll () {
    const $left = $e.find('.tab__scroller.left');
    const $right = $e.find('.tab__scroller.right');
    const scrollPos = $tabList.scrollLeft();
    const offset = 8; // if the current position is no more than {offset}px away from two ends, hide the scroller(s)

    if (scrollPos > offset) { $left.fadeIn(defaultDelay); } else { $left.fadeOut(defaultDelay); }

    if (scrollPos < $tabList[0].scrollWidth - $tabList.width() - offset) { $right.fadeIn(defaultDelay); } else { $right.fadeOut(defaultDelay); }
  }

  function _getTabItem (id) {
    return $tabList.find(`.tab__list__item[data-tab-item-id="${ensureDoubleQuotes(id)}"]`);
  }

  return exports;
}
