import { DashboardEvents, DashboardGlobals, ensureDoubleQuotes, ensureHTML } from '../globals';

/**
 * @typedef {Object} TreeListItem
 * @property {() => string} getTitle Get title of the item
 * @property {(title: string) => TreeListItem} setTitle Set title of the item
 * @property {() => boolean} getMore Return true if the item has subitems, false otherwise
 * @property {(more: boolean) => TreeListItem} setMore Mark the item as having subitems (true) or not (false)
 * @property {() => boolean} getOpen Return true if the item is expanded, false otherwise
 * @property {(open: boolean) => TreeListItem} setOpen Mark the item as expanded (true) or collapsed (false)
 * @property {(toSelector: boolean) => unknown} instance Get the item HTML element (false), or JQuery element (true)
 * @property {(toSelector: boolean) => unknown} headerInstance Get the item header HTML element (false), or JQuery element (true)
 * @property {(toSelector: boolean) => unknown} bodyInstance Get the item body HTML element (false), or JQuery element (true)
 * @property {() => void} remove Safely remove the item instance
 */

/**
 * @typedef {Object} TTreeList
 * @property {DashboardEvents} _events Event manager
 * @property {() => string} getPlaceholder Get current placeholder of the container
 * @property {(newPlaceholder: string) => TTreeList} setPlaceholder Set new placeholder for the container
 * @property {(id: string, append = true) => TreeListItem} add Add an item to the container.
 * If `append` is true (default), the item will be appended to the container.
 * @property {(id: string) => boolean} remove Remove an item from the container and return true if an item has been removed, or false otherwise
 * @property {(id: string) => TreeListItem|null} get Get an item using its id
 * @property {() => string[]} all Get all item ids
 * @property {() => number} clear Clear all items from the container and return the number of removed items
 * @property {() => void} destroy Remove the tree list container instance
 */

/**
 * Create a tree list instance
 * @param {unknown} e Element to append the tree list container to
 * @param {string} [placeholder='No items found.'] Placeholder to show when no items exist
 * @returns {TTreeList} The tree list instance
 */
export default function TreeList (e, placeholder = 'No items found.') {
  /**
   * @type {TTreeList}
   */
  const exports = {
    _events: DashboardEvents()
  };

  const dict = {};

  const $elm = $(`<div class="treelist-container noitem">
    <div class="treelist-container__placeholder">${ensureHTML(`${placeholder}`)}</div>
  </div>`);
  $elm.appendTo($(e));

  $elm.on('click', '.treelist__header', function () {
    // Delegate click event to all headers
    const $itemHeader = $(this);
    const itemID = $itemHeader.closest('.treelist').attr('data-treelist-id') || '';
    if (Object.prototype.hasOwnProperty.call(dict, itemID)) {
      const item = dict[itemID];
      if (item.getMore()) {
        if (item.getOpen()) {
          exports._events.call(`${itemID}.collapse`, item);
          item.setOpen(false);
        } else {
          exports._events.call(`${itemID}.expand`, item);
          item.setOpen(true);
        }
      }
    }
  });

  exports.getPlaceholder = function () {
    return placeholder;
  };

  exports.setPlaceholder = function (newPlaceholder) {
    $elm.find('.treelist-container__placeholder').text(placeholder = `${newPlaceholder}`);
    return exports;
  };

  exports.add = function (id, append = true) {
    if (Object.prototype.hasOwnProperty.call(dict, id)) { return dict[id]; }

    dict[id] = new _treeItem(id);
    if (append) {
      dict[id].instance(true).appendTo($elm);
      $elm.removeClass('noitem');
    }
    return dict[id];
  };

  exports.get = function (id) {
    return Object.prototype.hasOwnProperty.call(dict, id) ? dict[id] : null;
  };

  exports.remove = function (id) {
    let removed = false;
    if (Object.prototype.hasOwnProperty.call(dict, id)) {
      dict[id].remove();
      delete dict[id];
      removed = true;
    }
    if (!$elm.children().length) { $elm.addClass('noitem'); }
    return removed;
  };

  exports.all = function () {
    const ids = [];
    for (const id in dict) { ids.push(id); }
    return ids;
  };

  exports.clear = function () {
    return exports.all().reduce((prev, curr) => (prev + exports.remove(curr)), 0);
  };

  exports.destroy = function () {
    $elm.remove();
    DashboardGlobals.destroyObj(exports);
  };

  function _treeItem (id) {
    let $item = $(`<div class="treelist" data-treelist-id="${ensureDoubleQuotes(id)}">
      <div class="treelist__header">
        <div class="treelist__header__text"></div>
      </div>
      <div class="treelist__body"></div>
    </div>`);
    let $itemHeader = $item.children('.treelist__header');
    let $itemTitle = $itemHeader.children('.treelist__header__text');
    let $itemBody = $item.children('.treelist__body');

    this.getTitle = () => $itemTitle.text();

    this.setTitle = (title) => {
      $itemTitle.text(title);
      return this;
    };

    this.getMore = () => $itemHeader.hasClass('more');

    this.setMore = (more) => {
      if (more) { $itemHeader.addClass('more'); } else { $itemHeader.removeClass('more'); }
      return this;
    };

    this.getOpen = () => $item.hasClass('open');

    this.setOpen = (open) => {
      if (open) { $item.addClass('open'); } else { $item.removeClass('open'); }
      return this;
    };

    this.instance = (toSelector) => {
      return toSelector ? $item : $item[0];
    };

    this.headerInstance = (toSelector) => {
      return toSelector ? $itemHeader : $itemHeader[0];
    };

    this.bodyInstance = (toSelector) => {
      return toSelector ? $itemBody : $itemBody[0];
    };

    this.remove = () => {
      $item.remove();
      $item = $itemHeader = $itemTitle = $itemBody = $();
    };
  }

  return exports;
}
