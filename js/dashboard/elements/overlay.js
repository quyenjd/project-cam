import { DashboardGlobals, ensureDoubleQuotes } from '../globals';

/**
 * @typedef {Object} OverlayOptions
 * @property {boolean} [destroyOnHide=true] Whether to destroy the overlay after hiding (not applied to `hide` method)
 * @property {boolean} [fixed=false] Disable close icon and click on the backdrop to close the overlay
 * @property {string} [title='Notice'] Title of the overlay
 * @property {unknown} [body=''] An element to be appended to the overlay as its body
 */

/**
 * @typedef {Object} TOverlay
 * @property {() => Promise<TOverlay>} show Show the overlay
 * @property {() => Promise<TOverlay>} hide Hide the overlay
 * @property {() => Promise<void>} destroy Hide and destroy the overlay
 */

/**
 * Create an overlay on an element
 * @param {unknown} element Element to append the overlay
 * @param {?OverlayOptions} options Overlay options
 * @returns {TOverlay} The overlay instance
 */
export default function Overlay (element, options = {}) {
  /**
   * @type {TOverlay}
   */
  const exports = {};

  options = $.extend({
    destroyOnHide: true,
    fixed: false,
    title: 'Notice',
    body: ''
  }, options);

  const $overlay = $(`<div class="overlay-container${options.fixed ? ' fixed' : ''}" style="display: none;">
    <div class="overlay-backdrop"></div>
    <div class="overlay">
      <div class="overlay__title">
        <div class="overlay__title__text">${ensureDoubleQuotes(options.title)}</div>
        <div class="overlay__title__close" title="Close"></div>
      </div>
      <div class="overlay__body"></div>
    </div>
  </div>`);
  $overlay.appendTo($(element));
  $(options.body).appendTo($overlay.find('.overlay__body'));

  // Clicking on the backdrop hides the overlay
  $overlay.find('.overlay-backdrop').on('click', () => {
    options.destroyOnHide ? exports.destroy() : exports.hide();
  });

  // Clicking the close icon hides the overlay
  $overlay.find('.overlay__title__close').on('click', () => {
    options.destroyOnHide ? exports.destroy() : exports.hide();
  });

  exports.show = function () {
    return new Promise((resolve) => {
      $overlay.fadeIn(DashboardGlobals.duration.normalPace, () => {
        resolve(exports);
      });
    });
  };

  exports.hide = function () {
    return new Promise((resolve) => {
      $overlay.fadeOut(DashboardGlobals.duration.normalPace, () => {
        resolve(exports);
      });
    });
  };

  exports.destroy = function () {
    return exports.hide().then(() => {
      $overlay.remove();
      DashboardGlobals.destroyObj(exports);
    });
  };

  return exports;
}
