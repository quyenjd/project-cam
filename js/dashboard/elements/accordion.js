/**
 * @typedef {Object} AccordionItem
 * @property {unknown} $ The accordion item JQuery element
 * @property {unknown} $body The accordion item body JQuery element
 * @property {() => string} getTitle Get title of the item
 * @property {(title: string) => AccordionItem} setTitle Set title of the item
 * @property {() => boolean} isActive Check if the item is currently expanded
 * @property {(active: boolean) => AccordionItem} setActive Set the item to be expanded (true) or collapsed (false)
 */

/**
 * @typedef {Object} TAccordion
 * @property {(id: string) => TAccordion} addItem Add an accordion item
 * @property {(id: string) => AccordionItem|null} getItem Get the accordion item or null if not existing
 * @property {(id: string) => TAccordion} removeItem Remove an accordion item
 * @property {() => TAccordion} clearAll Clear all accordion items
 */

/**
 * Create an accordion instance
 * @param {unknown} element Element to append the accordion to
 * @returns {TAccordion} The accordion instance
 */
export default function Accordion (element) {
  /**
   * @type {TAccordion}
   */
  const exports = {};
  const dict = {};

  const $accordion = $('<div class="accordion"></div>');
  $accordion.appendTo($(element));

  exports.addItem = function (id) {
    if (Object.prototype.hasOwnProperty.call(dict, id)) { return exports; }

    const $item = $(`<div class="accordion__item">
      <div class="accordion__item__header"></div>
      <div class="accordion__item__body"></div>
    </div>`);
    $item.appendTo($accordion);

    dict[id] = new _accordionItem($item);

    // Clicking on the handler toggles active
    $item.find('.accordion__item__header').on('click', () => {
      dict[id].setActive(!dict[id].isActive());
    });

    return exports;
  };

  exports.getItem = function (id) {
    return Object.prototype.hasOwnProperty.call(dict, id) ? dict[id] : null;
  };

  exports.removeItem = function (id) {
    if (Object.prototype.hasOwnProperty.call(dict, id)) {
      dict[id].$.remove();
      delete dict[id];
    }
    return exports;
  };

  exports.clearAll = function () {
    for (const id in dict) { exports.removeItem(id); }
    return exports;
  };

  function _accordionItem ($item) {
    // Elements
    this.$ = $item;
    this.$body = $item.find('.accordion__item__body');

    // Title operations
    const $title = $item.find('.accordion__item__header');
    this.getTitle = function () {
      return $title.text();
    };
    this.setTitle = function (title) {
      $title.text(title);
      return this;
    };

    // Active operations
    this.isActive = function () {
      return $item.hasClass('active');
    };
    this.setActive = function (active) {
      if (active !== this.isActive()) {
        if (active) {
          $item.addClass('active');
          this.$body.slideDown(300);
        } else {
          $item.removeClass('active');
          this.$body.slideUp(300);
        }
      }
      return this;
    };

    return this;
  }

  return exports;
}
