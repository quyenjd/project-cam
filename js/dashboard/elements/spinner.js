import { ensureHTML } from '../globals';

/**
 * @typedef {Object} TSpinner
 * @property {(toSelector = false) => unknown} instance Get new spinner HTML element (false), or JQuery element (true)
 * @property {() => string} html Get spinner HTML string
 */

/**
 * Create a spinner
 * @param {string} label Text to be shown next to the spinner
 * @param {boolean} [useEllipsis=false] true to append animated ellipsis to label, false otherwise
 * @returns {TSpinner} The spinner instance
 */
export default function Spinner (label, useEllipsis) {
  /**
   * @type {TSpinner}
   */
  const exports = {};

  const $spinner = $(`<div class="spinner${useEllipsis ? ' ellipsis' : ''}">
    <span class="spinner__spinner">
      <div></div><div></div><div></div>
    </span>${label.length ? `<span class="spinner__label">${ensureHTML(label)}</span>` : ''}
  </div>`);

  exports.instance = function (toSelector) {
    const $selector = $($spinner[0].outerHTML);
    return toSelector ? $selector : $selector[0];
  };

  exports.html = function () {
    return $spinner[0].outerHTML;
  };

  return exports;
}
