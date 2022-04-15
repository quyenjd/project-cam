import { DashboardEvents, DashboardGlobals, ensureHTML } from '../globals';

/**
 * @typedef {Object} TDragDrop
 * @property {DashboardEvents} _events Event manager
 * @property {() => void} destroy Destroy drag and drop
 */

/**
 * Create a drag and drop instance
 * @param {unknown} element The drag element
 * @param {unknown} target The target to drop the element into (dynamically updated for each drag)
 * @param {unknown} except Something inside the target we don't want to drop into (dynamically updated for each drag)
 * @returns {TDragDrop} The drag and drop instance
 */
export default function DragDrop (element, target, except) {
  /**
   * @type {TDragDrop}
   */
  const exports = {
    _events: DashboardEvents()
  };

  const $element = $(element);
  let $target, $except;

  // Init drag on the element
  $element.draggable({
    appendTo: 'body',
    cursor: 'grabbing',
    distance: 5,
    helper: () => {
      return `<div class="dragdrop__helper"><i class="fas fa-bars"></i> ${ensureHTML(exports._events.call('helper', exports))}</div>`;
    },
    opacity: DashboardGlobals.opacity,
    revert: () => {
      return !$target.hasClass('dragdrop__hover');
    },
    revertDuration: DashboardGlobals.duration.fastPace,
    scope: 'dragdrop',
    scroll: false,
    zIndex: DashboardGlobals.menubarButtonsZIndex + 10
  }).on('dragstart', function () {
    // Hide overflow part from body
    $('body').css('overflow', 'hidden');

    // The element that starts drag should not accept pointer events when dragging is on
    $element.css('pointer-events', 'none');

    // Refresh target and except
    $target = $(target).addClass('dragdrop__active');
    $except = $(except);
  }).on('drag', function (event, ui) {
    // Bring the helper along with the pointer
    ui.position.left = event.pageX;
    ui.position.top = event.pageY;

    const $draggedOn = $(document.elementFromPoint(event.pageX, event.pageY));
    if ($draggedOn.closest($target).length && !$draggedOn.closest($except).length) { $target.addClass('dragdrop__hover'); } else { $target.removeClass('dragdrop__hover'); }
    exports._events.call('drag', exports, event);
  }).on('dragstop', function (event) {
    // Reset body's overflow
    $('body').css('overflow', '');

    // Reset the element's pointer-events
    $element.css('pointer-events', '');

    if ($target.hasClass('dragdrop__hover')) { exports._events.call('drop', exports, event); }
    $target.removeClass('dragdrop__active dragdrop__hover');
  }).bindIframeFixEvents('drag');

  exports.destroy = function () {
    $element.draggable('destroy');
    $(target).removeClass('dragdrop__active dragdrop__hover');
    DashboardGlobals.destroyObj(exports);
  };

  return exports;
}
