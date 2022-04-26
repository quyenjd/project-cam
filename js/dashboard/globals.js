import Menubar, { TMenubar } from './elements/menubar'; // eslint-disable-line
import EventCollection from './events/_collection';
import SparkMD5 from 'spark-md5';

jQuery.fn.updateTitle = function (title) {
  $(this).attr('title', title);
  $(document).tooltip(DashboardGlobals.tooltipConfiguration);
};

jQuery.fn.hasAttr = function (attr) {
  const value = $(this).attr(attr);
  return typeof value !== typeof undefined && value !== false;
};

jQuery.fn.toggleAttr = function (attr) {
  return this.each(function () {
    const $this = $(this);
    $this.attr(attr) ? $this.removeAttr(attr) : $this.attr(attr, attr);
  });
};

const appendToType = (type, appendix) => {
  return `${type}`.split(' ').filter((type) => !!type).map((type) => `${type}${appendix}`).join(' ');
};

jQuery.fn.bindIframeFixEvents = function (type) {
  return this.on(appendToType(type, 'start'), () => {
    $(document.body).addClass('iframe-fix');
  }).on(appendToType(type, 'stop'), () => {
    $(document.body).removeClass('iframe-fix');
  });
};

jQuery.fn.unbindIframeFixEvents = function (type) {
  return this.off(`${appendToType(type, 'start')} ${appendToType(type, 'stop')}`);
};

if (!window.getDimensions) {
  window.getDimensions = function () {
    const doc = document; const w = window;
    const docEl = (doc.compatMode && doc.compatMode === 'CSS1Compat') ? doc.documentElement : doc.body;

    let width = docEl.clientWidth;
    let height = docEl.clientHeight;

    if (w.innerWidth && width > w.innerWidth) {
      width = w.innerWidth;
      height = w.innerHeight;
    }

    return { width: width, height: height };
  };
}

/**
 * @typedef {Object} DashboardCache
 * @property {(key: string, clone = false) => *|undefined} get Get value of the key in the cache
 * @property {(key: string, value: *, clone = false) => DashboardCache} set Set new value to the key in the cache
 * @property {(key: string) => *} pop Get value then pop the key from the cache
 * @property {(key: string) => DashboardCache} remove Remove the key from the cache
 * @property {(regex: string) => string[]} keys Get value of the key in the cache
 */

/**
 * Global temporary key-value storage
 * @type {DashboardCache}
 */
export const DashboardCache = (function () {
  const cacheObj = {};

  /**
   * @type {DashboardCache}
   */
  const exports = {};

  exports.get = function (key, clone = false) {
    if (!Object.prototype.hasOwnProperty.call(cacheObj, key)) { return undefined; }
    return clone ? $.extend(true, {}, cacheObj[key]) : cacheObj[key];
  };

  exports.set = function (key, value, clone = false) {
    cacheObj[key] = clone ? $.extend(true, {}, value) : value;
    return exports;
  };

  exports.pop = function (key) {
    const value = exports.get(key);
    exports.remove(key);
    return value;
  };

  exports.remove = function (key) {
    delete cacheObj[key];
    return exports;
  };

  exports.keys = function (regex) {
    const keys = []; const regexp = new RegExp(regex);
    for (const prop in cacheObj) {
      if (regexp.test(prop)) { keys.push(prop); }
    }
    return keys;
  };

  return exports;
})();

/**
 * @typedef {Object} Position
 * @property {number} top
 * @property {number} left
 * @property {number} zIndex
 */

/**
 * @typedef {Object} DashboardPositioning
 * @property {() => DashboardPositioning} clear Clear all cached positions
 * @property {(elm: unknown, group: string, position: { top: number, left: number, zIndex: number } = {}) => DashboardPositioning} watch
 * Watch all position changes of an element as if it were in a group
 * @property {(elm: unknown, group: string) => DashboardPositioning} impose
 * Set position of an element as if it were in a group
 * @property {({ top, left, zIndex }: Position, group: string) => DashboardPositioning} fixPosition
 * Fix position of a group to the provided one
 * @property {() => Object.<string, Position>} savedPositions Get all cached positions
 */

/**
 * Create a position manager
 * @returns {DashboardPositioning} The position manager instance
 */
export function DashboardPositioning () {
  const DEFAULT_POSITIONING_UNIT = '1em';

  let lastPos = {};

  /**
   * @type {DashboardPositioning}
   */
  const exports = {};

  exports.clear = function () {
    lastPos = {};
    return exports;
  };

  exports.watch = function (elm, group, position = {}) {
    // normalize position
    position = $.extend({}, position);
    const _position = {};
    _position.top = DashboardGlobals.parseFloatSafe(position.top, null);
    _position.left = DashboardGlobals.parseFloatSafe(position.left, null);
    _position.zIndex = DashboardGlobals.parseIntSafe(position.zIndex, null);

    _watch(elm, group, position);
    return exports;
  };

  exports.impose = function (elm, group) {
    const $elm = $(elm);
    group = ($.type(group) === 'string') ? (group || '') : '';
    _saveNewPosition($elm, group);
    return exports;
  };

  exports.fixPosition = function ({ top, left, zIndex }, group) {
    lastPos[group] = { top: parseFloat(top) || 0, left: parseFloat(left) || 0, zIndex: parseInt(zIndex) || 0 };
    return exports;
  };

  exports.savedPositions = function () {
    const obj = {};
    for (const group in lastPos) {
      obj[group] = {
        top: lastPos[group].top,
        left: lastPos[group].left,
        zIndex: lastPos[group].zIndex
      };
    }
    return obj;
  };

  function _watch (elm, group, position) {
    const $elm = $(elm);
    group = ($.type(group) === 'string') ? (group || '') : '';

    // ensure parent has relative position
    const $par = $elm.parent();
    $par.css('position', 'relative');

    // listen to position change to update last position
    $elm.attrchange({
      trackValues: true,
      callback: function (e) {
        if (DashboardGlobals.pausePositioning) { return; }
        if (e.attributeName === 'style') { _saveNewPosition($elm, group); }
      }
    });

    if (DashboardGlobals.pausePositioning) { return; }

    if (!Object.prototype.hasOwnProperty.call(lastPos, group)) {
      lastPos[group] = {
        top: 0,
        left: 0,
        zIndex: $elm.css('z-index') || ''
      };
    }

    // initial position
    $elm.css({
      position: 'absolute',
      top: position.top ?? lastPos[group].top,
      left: position.left ?? lastPos[group].left,
      zIndex: position.zIndex ?? lastPos[group].zIndex
    }).css({ // new position
      top: `+=${position.top == null ? DEFAULT_POSITIONING_UNIT : 0}`,
      left: `+=${position.left == null ? DEFAULT_POSITIONING_UNIT : 0}`
    });
    _saveNewPosition($elm, group);

    // make sure the element is not out of its parent's bound
    $(':animated').promise().done(function () {
      const $par = $elm.parent();
      const parSize = [$par.actual('height'), $par.actual('width')];

      if ($elm.position().top + $elm.actual('height') > parSize[0]) { $elm.css('top', 0); }
      if ($elm.position().left + $elm.actual('width') > parSize[1]) { $elm.css('left', 0); }

      _saveNewPosition($elm, group);
    });
  }

  function _saveNewPosition ($elm, group) {
    if (!Object.prototype.hasOwnProperty.call(lastPos, group)) { lastPos[group] = {}; }
    lastPos[group].top = $elm.css('top') || 0;
    lastPos[group].left = $elm.css('left') || 0;
    lastPos[group].zIndex = $elm.css('z-index') || '';
  }

  return exports;
}

/**
 * Global constants and utilities
 */
export class DashboardGlobals {
  /**
   * Opacity for drag/sort-able elements
   */
  static opacity = 0.8;

  /**
   * Animation duration constants
   */
  static duration = {
    immediate: 10,
    fastPace: 100,
    normalPace: 400,
    userInteractionWait: 600
  };

  /**
   * Tooltip default configuration
   */
  static tooltipConfiguration = {
    classes: {
      'ui-tooltip': 'ui-widget-shadow ui-widget ui-widget-content'
    },
    hide: {
      effect: 'fade',
      duration: this.duration.fastPace
    },
    show: {
      effect: 'fade',
      duration: this.duration.fastPace,
      delay: this.duration.userInteractionWait
    },
    position: {
      my: 'center bottom',
      at: 'center top',
      collision: 'flipfit'
    },
    close: function () {
      $('.ui-helper-hidden-accessible').remove();
    }
  };

  /**
   * Generate a unique id that has a given prefix
   *
   * Used prefixes:
   * * `cp` - Component
   * * `mc` - Component.minimized
   * * `hu` - Hub
   * * `ol` - Hub.overlapHelper
   * * `cn` - Hub.connections
   * * `pt` - Hub.layerHelper
   * * `ln` - Hub.svgHandler
   * * `hc` - Hub.component
   * * `cc` - Hub.component.connector
   * * `ss` - Session
   * * `sw` - SessionWrapper
   * * `mb` - Menubar
   * * `bc` - Menubar.container
   * * `cm` - ContextMenu
   * * `ta` - Tab
   * * `sm` - StickyMenu
   * * `qi` - DashboardGlobals.getQueryID
   *
   * @param {string} prefix The first characters in the generated id
   * @returns {string} The generated id
   */
  static uniqueID = function (prefix) {
    const start = DashboardCache.get(`DashboardGlobals.uniqueID:${prefix}`) || 0;
    DashboardCache.set(`DashboardGlobals.uniqueID:${prefix}`, start + 1);
    return `${prefix}${start + 1}`;
  };

  /**
   * Generate a query ID and add it as a class name to the given element(s)
   * @param {unknown} element Element to be assigned a new query ID
   * @returns {string|null} The new query ID or null if no element is found
   */
  static getQueryID = function (element) {
    const $element = $(element);
    if ($element.length) {
      const queryID = DashboardGlobals.uniqueID('qi');
      $element.addClass(queryID);
      return queryID;
    }
    return null;
  }

  /**
   * Whether positioning has been paused globally
   */
  static pausePositioning = false;

  /**
   * Alert box default configuration
   */
  static alertConfiguration = {
    animation: 'zoom',
    closeAnimation: 'zoom',
    animateFromElement: false,
    icon: 'fas fa-exclamation-triangle',
    closeIcon: true,
    type: 'red',
    useBootstrap: false,
    boxWidth: '75%'
  };

  /**
   * Confirm box default configuration
   */
  static confirmConfiguration = {
    animation: 'zoom',
    closeAnimation: 'zoom',
    animateFromElement: false,
    icon: 'fas fa-exclamation-triangle',
    closeIcon: 'cancel',
    title: 'Confirmation',
    type: 'red',
    buttons: {
      cancel: () => { }
    },
    useBootstrap: false,
    boxWidth: '75%'
  }

  /**
   * Toast messge default configuration
   */
  static toastConfiguration = {
    stack: 1,
    position: 'bottom-right',
    hideAfter: 3000,
    allowToastClose: true,
    loader: false,
    showHideTransition: 'slide',
    bgColor: '#000080',
    textColor: '#eee'
  };

  /**
   * @typedef {Object} FixDuplicateNames
   * @property {() => void} freeze Freeze all actions of the utility.
   * This will stop all calls to `run` and simply return back the name.
   * @property {() => void} unfreeze Unfreeze all actions of the utility
   * @property {(name: string, prefix: string) => string} run
   * Fix the name so it does not appear in the `prefix` group
   */

  /**
   * A utility to fix duplicating names per prefix
   * @type {FixDuplicateNames}
   */
  static fixDuplicateNames = (function () {
    const exports = {};

    let freezed = false;

    exports.freeze = function () {
      freezed = true;
    };

    exports.unfreeze = function () {
      freezed = false;
    };

    exports.run = function (name, prefix) {
      name = name.trim();

      if (freezed) { return name; }

      const split = name.split('#'); let curIndex = 1;
      if (split.length > 1 && !isNaN(split[split.length - 1])) {
        curIndex = Math.max(1, split.pop());
        name = split.join('#').trim();
      }
      for (var i = curIndex, addin = i > 1 ? ` #${i}` : ''; DashboardCache.get(`${prefix}:${name}${addin}`); addin = ` #${++i}`); // eslint-disable-line
      name = name + addin;

      return name;
    };

    return exports;
  })();

  /**
   * Compress, encrypt, and stringify an object
   * @param {Object} obj Any object
   * @returns {string} The object stringified
   */
  static compressObj = (obj) => JSON.stringify(DashboardSign(obj).encrypt(true));

  /**
   * Parse, decrypt, and decompress an object
   * @param {string} compressedObj A string generated by `compressObj`
   * @returns {Object} The object
   */
  static decompressObj = (compressedObj) => {
    try {
      return DashboardSign(JSON.parse(compressedObj)).decrypt(true);
    } catch (err) {
      return {};
    }
  };

  /**
   * Destroy an object by clearing all of its keys
   * @param {Object.<string, *>} obj Any object
   */
  static destroyObj = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Object) { this.destroyObj(value); }
      delete obj[key];
    }
  };

  /**
   * Menubar buttons zIndex value
   */
  static menubarButtonsZIndex = 99999998;

  /**
   * Base URL for all internal requests
   */
  static baseURL = 'http://localhost';

  /**
   * Launch an input box modal
   * @param {string} title Title of the input box
   * @param {string} value Starting value of the input box
   * @param {string} label Label of the input box
   * @param {(newValue: string) => void} onSubmit A function to pass submitted value (if any)
   */
  static launchInputBox = (title, value, label, onSubmit) => {
    $.confirm({
      animation: 'zoom',
      closeAnimation: 'zoom',
      animateFromElement: false,
      title,
      content:
        `<div class="g-row">
          <form action="" class="inputbox">
            <input type="text" value="${ensureDoubleQuotes(value)}" required />
            <label>${ensureHTML(label)}</label>
            <div class="line line-center"></div>
          </form>
        </div>`,
      buttons: {
        formSubmit: {
          text: 'OK',
          action: function () {
            onSubmit(this.$content.find('input').val());
          }
        },
        cancel: {}
      },
      onContentReady: function () {
        const jc = this;
        jc.$content.find('form').on('submit', function (e) {
          e.preventDefault();
          jc.$$formSubmit.trigger('click');
        });
        jc.$content.find('input').focus();
      },
      boxWidth: '75%',
      useBootstrap: false,
      escapeKey: 'cancel'
    });
  }

  /**
   * Parse a value to a floating point number
   * @param {*} string The value to parse
   * @param {*} fallback Fallback value if the parsed number is NaN
   * @returns The parsed number
   */
  static parseFloatSafe (string, fallback) {
    const float = parseFloat(string);
    return isNaN(float) ? fallback : float;
  }

  /**
   * Parse a value to an integer
   * @param {*} string The value to parse
   * @param {*} fallback Fallback value if the parsed number is NaN
   * @returns The parsed number
   */
  static parseIntSafe (string, fallback) {
    const int = parseInt(string);
    return isNaN(int) ? fallback : int;
  }

  /**
   * Get which mode the application is running in
   * @returns {'dev'|'prod'} `dev` if development, or `prod` if production
   */
  static getMode () {
    return new URLSearchParams(document.location.search).get('mode') || 'prod';
  }

  /**
   * jQuery spectrum configuration
   */
  static spectrumConfiguration = {
    type: 'color',
    showPalette: false,
    togglePaletteOnly: true,
    showInput: true,
    showButtons: false,
    showAlpha: false,
    allowEmpty: false,
    preferredFormat: 'hex',
    showInitial: true
  };
}

/**
 * @typedef {Object} DashboardEvents
 * @property {Object.<string, { fn: (this: any, ...args) => void, one: boolean }[]>} eventObj
 * Current event and handler pairs for merging with others
 * @property {(event: string, handler: (this: any, ...args) => void) => DashboardEvents} on
 * Bind a handler to an event
 * @property {(event: string, handler: (this: any, ...args) => void) => DashboardEvents} one
 * Bind a handler that will be triggered at most once to an event
 * @property {(event: string, _this: any, ...args) => any[]} call
 * Call all handlers of an event and get their return values
 * @property {(event: string, _this: any, ...args) => Promise<any[]>} invoke
 * Call all handlers of an event and get their return values asynchronously
 * @property {(event: string, handler: Function) => DashboardEvents} off
 * Remove a handler from an event.
 * If no handler is provided, clear all current handlers bound to the event.
 * @property {() => DashboardEvents} clear Clear all current events and handlers
 * @property {(_dashboardEvents: Object.<string, { fn: (this: any, ...args) => void, one: boolean }>) => DashboardEvents} merge
 * Merge an event collection into the current one
 */

/**
 * Create an event manager
 * @returns {DashboardEvents} The event manager instance
 */
export function DashboardEvents () {
  /**
   * @type {DashboardEvents}
   */
  const exports = { eventObj: {} };

  exports.on = function (event, handler) {
    _add(event, handler, false);
    return exports;
  };

  exports.one = function (event, handler) {
    _add(event, handler, true);
    return exports;
  };

  exports.call = function (event, _this, ...args) {
    const results = [];

    if ((typeof event) === 'string' && Object.prototype.hasOwnProperty.call(exports.eventObj, event)) {
      exports.eventObj[event].forEach(function (handler) {
        results.push(handler.fn.apply(_this, args));
      });

      exports.eventObj[event].filter((handler) => !handler.one);
    }

    return results;
  };

  exports.invoke = function (event, _this, ...args) {
    const results = [];

    if ((typeof event) === 'string' && Object.prototype.hasOwnProperty.call(exports.eventObj, event)) {
      exports.eventObj[event].forEach(function (handler) {
        results.push(Promise.resolve(new Promise(function (resolve) {
          resolve(handler.fn.apply(_this, args));
        })));
      });

      exports.eventObj[event].filter((handler) => !handler.one);
    }

    return Promise.all(results);
  };

  exports.merge = function (_dashboardEvents) {
    for (const [event, handlers] of Object.entries(_dashboardEvents.eventObj)) {
      handlers.forEach(function (handler) {
        if (handler.one) { exports.one(event, handler.fn); } else { exports.on(event, handler.fn); }
      });
    }
    return exports;
  };

  exports.off = function (event, handler) {
    if (Object.prototype.hasOwnProperty.call(exports.eventObj, event)) {
      if (handler && {}.toString.call(handler).match(/\[object [a-zA-Z]*Function\]/)) {
        exports.eventObj[event] = exports.eventObj[event].filter((value) => value.fn !== handler);
        if (!exports.eventObj[event].length) {
          delete exports.eventObj[event];
        }
      }
      if (handler == null) {
        delete exports.eventObj[event];
      }
    }
    return exports;
  };

  exports.clear = function () {
    for (const event in exports.eventObj) {
      exports.off(event);
    }
    return exports;
  };

  function _add (event, handler, one) {
    if ((typeof event) === 'string' && handler && {}.toString.call(handler).match(/\[object [a-zA-Z]*Function\]/)) {
      if (!Object.prototype.hasOwnProperty.call(exports.eventObj, event)) { exports.eventObj[event] = []; }
      exports.eventObj[event].push({
        fn: handler,
        one
      });
    }
  }

  return exports;
}

/**
 * @typedef {Object} DashboardSignUtils
 * @property {(_obj?: Object) => Object} compress Get the compressed object.
 * To use for other objects apart from the initiated one, pass it to `_obj`.
 * @property {(_obj?: Object) => Object} decompress Get the decompressed object.
 * To use for other objects apart from the initiated one, pass it to `_obj`.
 */

/**
 * @typedef {Object} DashboardSign
 * @property {(compressed: boolean) => Object} encrypt Get the encrypted object
 * @property {(fromCompressed: boolean) => Object} decrypt Get the decrypted object
 * @property {DashboardSignUtils} utils Compression utilities
 */

/**
 * Create an encryptor/decryptor for an object
 * @param {Object} obj Any object
 * @returns {DashboardSign} An encryptor/decryptor of the given object
 */
export function DashboardSign (obj) {
  const
    SECRET_KEY = '320897b91638aedd31e0f1963228ef9b938359e9'; // HMAC generated by freeformatter.com
  const PUBLIC_MSG = 'SIGNED. Please do not edit this file!';

  /**
   * @type {DashboardSign}
   */
  const exports = {};

  if ($.type(obj) !== 'object') { throw new Error('Signature error: Invalid object.'); }

  exports.encrypt = function (compressed) {
    const clone = $.extend(true, {}, compressed === true ? exports.utils.compress() : obj);
    clone.__SECRET_KEY__ = SECRET_KEY;

    let md5 = '';
    try {
      md5 = SparkMD5.hash(JSON.stringify(clone));
    } catch (err) { }
    delete clone.__SECRET_KEY__;

    clone[PUBLIC_MSG] = md5;
    return clone;
  };

  exports.decrypt = function (fromCompressed) {
    const clone = $.extend(true, {}, obj);

    if (!Object.prototype.hasOwnProperty.call(clone, PUBLIC_MSG)) { throw new Error('Signature error: Unknown signature.'); }

    const md5 = clone[PUBLIC_MSG];
    delete clone[PUBLIC_MSG];
    clone.__SECRET_KEY__ = SECRET_KEY;

    let hash = '';
    try {
      hash = SparkMD5.hash(JSON.stringify(clone));
    } catch (err) { }
    if (hash !== md5) { throw new Error('Signature error: Invalid signature.'); }

    delete clone.__SECRET_KEY__;

    return fromCompressed === true ? exports.utils.decompress(clone) : clone;
  };

  // === UTILITIES

  exports.utils = {};

  exports.utils.compress = function (_obj) {
    const working = _obj || obj;

    const paramEnum = {}; let paramCount = 0;

    const enumDFS = function (obj) {
      switch ($.type(obj)) {
        case 'object':
          for (const param in obj) {
            if (!Object.prototype.hasOwnProperty.call(paramEnum, param)) { paramEnum[param] = paramCount++; }
            enumDFS(obj[param]);
          }
          break;
        case 'array':
          obj.forEach((item) => enumDFS(item));
          break;
      }
    };
    enumDFS(working);

    const convertDFS = function (obj) {
      let newObj;
      switch ($.type(obj)) {
        case 'object':
          newObj = {};
          for (const param in obj) { newObj['' + paramEnum[param]] = convertDFS(obj[param]); }
          return newObj;
        case 'array':
          newObj = [];
          obj.forEach((item) => newObj.push(convertDFS(item)));
          return newObj;
      }

      return obj;
    };

    // Compressed object
    return {
      _: (function enumToArray () {
        const arr = [];
        for (const param in paramEnum) { arr.push(param); }
        return arr.sort((a, b) => paramEnum[a] < paramEnum[b] ? -1 : 1).join(',');
      })(),
      o: convertDFS(working)
    };
  };

  exports.utils.decompress = function (_obj) {
    const working = _obj || obj;

    if (
      !Object.prototype.hasOwnProperty.call(working, '_') ||
      !Object.prototype.hasOwnProperty.call(working, 'o') ||
      $.type(working._) !== 'string'
    ) {
      return working;
    }

    const paramEnum = {};

    working._.split(',').forEach((param, idx) => (paramEnum['' + idx] = param));

    const convertDFS = function (obj) {
      let newObj;
      switch ($.type(obj)) {
        case 'object':
          newObj = {};
          for (const param in obj) { newObj[paramEnum[param]] = convertDFS(obj[param]); }
          return newObj;
        case 'array':
          newObj = [];
          obj.forEach((item) => newObj.push(convertDFS(item)));
          return newObj;
      }

      return obj;
    };

    // Decompressed object
    return convertDFS(working.o);
  };

  return exports;
}

/**
 * @typedef {Object} HistoryEntry
 * @property {string} [type=''] Name/Type of the entry
 * @property {string[]} [reservedIDs=[]] Prefixes of which ids are stored (`uniqueID` checkpoints)
 * @property {unknown} [caller=''] Selector to the initiator of the entry.
 * This is for later checking if the element still exists and undo/redo operations are meaningful.
 * * If a function is passed, it will be called before undo/redo operation is executed. Returning `false` will skip the operation.
 * @property {() => void} undo Undo function
 * @property {() => void} redo Redo function
 */

/**
 * @typedef {Object} DashboardHistory
 * @property {DashboardEvents} _events Event manager
 * @property {(obj: HistoryEntry) => DashboardHistory} do Push an entry to the history
 * @property {() => DashboardHistory} undo Undo the latest entry
 * @property {() => DashboardHistory} redo Redo the latest entry
 * @property {() => DashboardHistory} clear Clear the history
 * @property {() => DashboardHistory} pause Pause the history (calling `do` has no effects)
 * @property {() => DashboardHistory} resume Resume the history
 * @property {() => boolean} isPaused Check whether the history has been paused
 * @property {(fn: () => any | Promise<any>) => any | Promise<any>} runWhenPaused
 * Run a function with the history paused and return its result.
 * If the function returns a Promise, it will try to resolve the Promise before resuming the history.
 */

/**
 * Create a history instance
 * @returns {DashboardHistory} The history instance
 */
export function DashboardHistory () {
  /**
   * @type {DashboardHistory}
   */
  const exports = { _events: DashboardEvents() };

  const undoStack = [];
  const redoStack = [];
  let paused = false;

  exports.do = function (obj) {
    if (paused) return exports;

    redoStack.length = 0;

    // normalize action object
    obj = $.extend(true, {
      type: '',
      reservedIDs: [],
      caller: '',
      undo: function () { },
      redo: function () { }
    }, obj);

    // capture current reserved IDs
    const newReservedIDs = [];
    obj.reservedIDs.forEach(function (prefix) {
      newReservedIDs.push({
        prefix: prefix,
        value: DashboardCache.get(`DashboardGlobals.uniqueID:${prefix}`) || 1
      });
    });
    obj.reservedIDs = newReservedIDs;

    undoStack.push(obj);

    return exports;
  };

  exports.undo = function () {
    _UndoRedo();
    return exports;
  };

  exports.redo = function () {
    _UndoRedo(true);
    return exports;
  };

  // WRAPPER FOR UNDO/REDO
  function _UndoRedo (redo) {
    if (redo ? redoStack.length : undoStack.length) {
      const obj = redo ? redoStack.pop() : undoStack.pop();

      // verify that caller is not empty
      let failed;
      if ($.type(obj.caller) === 'function') {
        failed = !obj.caller();
      } else {
        failed = true;
        $(obj.caller).each(function (idx, elm) {
          failed &= !$.contains(document.documentElement, elm);
        });
      }

      // save current reserved ids' state and load captured state
      const savedReservedIDs = [];
      obj.reservedIDs.forEach(function (obj) {
        savedReservedIDs.push({
          prefix: obj.prefix,
          value: DashboardCache.get(`DashboardGlobals.uniqueID:${obj.prefix}`) || 0
        });
        DashboardCache.set(`DashboardGlobals.uniqueID:${obj.prefix}`, obj.value - 1);
      });

      if (!failed) {
        try {
          redo ? obj.redo() : obj.undo();
        } catch (err) {
          failed = true;
        }
      }

      // return saved reserved ids' state
      savedReservedIDs.forEach((obj) => DashboardCache.set(`DashboardGlobals.uniqueID:${obj.prefix}`, obj.value));

      if (!failed) {
        redo ? undoStack.push(obj) : redoStack.push(obj);

        // show undo/redo toast only in development mode
        if (DashboardGlobals.getMode() === 'dev') {
          $.toast($.extend({}, DashboardGlobals.toastConfiguration, {
            heading: redo ? 'Redone' : 'Undone',
            text: obj.type
          }));
        }

        exports._events.call(redo ? 'redo' : 'undo', exports, obj);
      } else {
        // if error occurred, try the next undo/redo
        redo ? exports.redo() : exports.undo();
      }
    }
  }

  exports.clear = function () {
    undoStack.length = 0;
    redoStack.length = 0;

    return exports;
  };

  exports.pause = function () {
    paused = true;
  };

  exports.resume = function () {
    paused = false;
  };

  exports.isPaused = function () {
    return paused;
  };

  exports.runWhenPaused = function (fn) {
    exports.pause();
    const value = fn.call(exports);
    if (value instanceof Promise) {
      return value.then((value) => {
        exports.resume();
        return value;
      });
    } else {
      exports.resume();
      return value;
    }
  };

  return exports;
}

/**
 * @typedef {Object} DashboardStorage
 * @property {() => Promise<DashboardStorage>} clear Clear the storage
 * @property {(key: string) => Promise<any>} getItem Get value of a key
 * @property {(key: string, value: any) => Promise<DashboardStorage>} setItem Set value of a key
 * @property {(key: string) => Promise<DashboardStorage>} removeItem Remove a key
 * @property {() => Promise<Object.<string, *>>} getFull Get the whole storage object
 * @property {(obj: Object.<string, *>) => Promise<void>} setFull Set the whole storage object
 * @property {(field: string) => DashboardStorage} getStorageOfField Get the storage instance of another field rather than the default one
 */

/**
 * Global storage to save configuration variables
 * @type {DashboardStorage}
 */
export const DashboardStorage = (function StorageGenerator (field = 'temp') {
  /**
   * @type {DashboardStorage}
   */
  const exports = {};

  exports.clear = async function () {
    await EventCollection.events.SetStorage.invoke(field, JSON.stringify({}));
    return exports;
  };

  exports.getItem = async function (key) {
    return await EventCollection.events.GetField.invoke(field, key);
  };

  exports.setItem = async function (key, value) {
    await EventCollection.events.SetField.invoke(field, key, value);
    return exports;
  };

  exports.removeItem = async function (key) {
    await EventCollection.events.SetField.invoke(field, key);
    return exports;
  };

  exports.getFull = async function () {
    return await EventCollection.events.GetStorage.invoke(field);
  };

  exports.setFull = async function (obj) {
    await EventCollection.events.SetStorage.invoke(field, obj);
    return exports;
  };

  exports.getStorageOfField = function (field) {
    return StorageGenerator(field);
  };

  return exports;
})();

/**
 * @typedef {Object} DashboardVersion
 * @property {() => number} maximumDepth Get current maximum depth
 * @property {() => boolean} initialized Check if the version manager has been initialized
 * @property {() => Promise<void>} destroy Destroy the version manager (if initialized)
 * @property {(startFromCurrentCallback: ((savedData: string) => boolean)) => Promise<DashboardVersion>} init
 * Initialize the version manager. If saved data is found, a callback (if passed) will be called. The function
 * should return `false` if you wish to clear the version history.
 * @property {(newString: string) => Promise<boolean>} commit Commit new string and return `true` only if
 * there is a difference between the new and old one
 * @property {(depthFromCurrent = 1) => Promise<DashboardVersion>} rollback Rollback a maximum number of `depthFromCurrent`
 * versions from the current version
 * @property {(depthFromCurrent = 1, getFromCurrentUntilDepth = false) => Promise<{ time: number, content: string }|{ time: number, content: string }[]|null>} viewCommit
 * * If `getFromCurrentUntilDepth` is true, get all latest versions upto the `depthFromCurrent`-th version
 * * If `getFromCurrentUntilDepth` is false (by default), get only the `depthFromCurrent`-th latest version or null if not exists
 * * If the version manager is not initialized, the function returns null
 */

/**
 * Create a version manager
 * @param {string} tag Tag to store the versions with
 * @returns {DashboardVersion|null} The version manager instance, or null if `tag` is not a string
 */
export function DashboardVersion (tag) {
  if ($.type(tag) !== 'string') { return null; }

  const MAX_DEPTH = 1;
  const NAMESPACE = `DashboardVersion::${tag}`;

  /**
   * @type {DashboardVersion}
   */
  const exports = {};
  let initialized = false;

  exports.maximumDepth = function () {
    return MAX_DEPTH;
  };

  exports.initialized = function () {
    return initialized;
  };

  exports.destroy = async function () {
    if (!initialized) { return; }
    await DashboardStorage.setItem(NAMESPACE, []);
    DashboardGlobals.destroyObj(exports);
  };

  exports.init = async function (startFromCurrentCallback) {
    const versions = (await DashboardStorage.getItem(NAMESPACE)) || [];
    if (versions.length && $.type(startFromCurrentCallback) === 'function' && startFromCurrentCallback(versions[versions.length - 1].content) === false) { DashboardStorage.setItem(NAMESPACE, []); }
    initialized = true;
    return exports;
  };

  exports.commit = async function (newString) {
    if (!initialized || $.type(newString) !== 'string') { return false; }

    const versions = (await DashboardStorage.getItem(NAMESPACE)) || [];
    if (versions.length && versions[versions.length - 1].content === newString) { return false; }

    versions.push({ time: (new Date().getTime() / 1000).toFixed(0), content: newString });
    while (versions.length > MAX_DEPTH) { versions.shift(); }
    await DashboardStorage.setItem(NAMESPACE, versions);
    return true;
  };

  exports.rollback = async function (depthFromCurrent = 1) {
    if (!initialized) { return exports; }

    const versions = (await DashboardStorage.getItem(NAMESPACE)) || [];
    while (depthFromCurrent > 0 && versions.length) {
      versions.pop();
      --depthFromCurrent;
    }
    await DashboardStorage.setItem(NAMESPACE, versions);

    return exports;
  };

  exports.viewCommit = async function (depthFromCurrent = 1, getFromCurrentUntilDepth = false) {
    if (!initialized) { return null; }

    const versions = (await DashboardStorage.getItem(NAMESPACE)) || [];
    if (getFromCurrentUntilDepth) {
      const arr = [];
      for (let idx = versions.length - 1; idx >= 0 && depthFromCurrent > 0; --idx, --depthFromCurrent) { arr.push(versions[idx]); }
      return arr;
    } else { return depthFromCurrent > versions.length ? null : versions[versions.length - Math.max(1, depthFromCurrent)]; }
  };

  return exports;
}

/**
 * Menubar default configuration
 * @type {TMenubar}
 */
export const DashboardMenubar = Menubar({
  align: 'horizontal',
  id: 'main',
  menus: [
    ...(window.platform.get() === 'darwin'
      ? [{
          name: `<div class="trafficlight maximize">
            <div class="trafficlight-close">
              <svg x="0px" y="0px" viewBox="0 0 6.4 6.4">
                <polygon fill="#4d0000" points="6.4,0.8 5.6,0 3.2,2.4 0.8,0 0,0.8 2.4,3.2 0,5.6 0.8,6.4 3.2,4 5.6,6.4 6.4,5.6 4,3.2"></polygon>
              </svg>
            </div>
            <div class="trafficlight-minimize">
              <svg x="0px" y="0px" viewBox="0 0 8 1.1">
                <rect fill="#995700" width="8" height="1.1"></rect>
              </svg>
            </div>
            <div class="trafficlight-fullscreen">
              <svg class="fullscreen-svg" x="0px" y="0px" viewBox="0 0 6 5.9">
                <path fill="#006400" d="M5.4,0h-4L6,4.5V0.6C5.7,0.6,5.3,0.3,5.4,0z"></path>
                <path fill="#006400" d="M0.6,5.9h4L0,1.4l0,3.9C0.3,5.3,0.6,5.6,0.6,5.9z"></path>
              </svg>
              <svg class="maximize-svg" x="0px" y="0px" viewBox="0 0 7.9 7.9">
                <polygon fill="#006400" points="7.9,4.5 7.9,3.4 4.5,3.4 4.5,0 3.4,0 3.4,3.4 0,3.4 0,4.5 3.4,4.5 3.4,7.9 4.5,7.9 4.5,4.5"></polygon>
              </svg>
            </div>
          </div>`,
          id: 'trafficlights',
          disabled: true,
          alt: false
        }]
      : [{
          name: '<img class="menubar-logo" src="icon.png" />',
          id: 'logo',
          disabled: true,
          alt: false
        }]
    ),
    {
      name: 'Untitled',
      type: 'click',
      id: 'file',
      alt: false,
      menus: [
        {
          name: 'New Project',
          key: 'Ctrl+N',
          id: 'newproject',
          alt: 4
        },
        {
          name: 'Open Project...',
          key: 'Ctrl+O',
          id: 'openproject',
          alt: 8
        },
        {},
        {
          name: 'Save Project',
          key: 'Ctrl+S',
          id: 'saveproject'
        },
        {
          name: 'Save Project As...',
          key: 'Ctrl+Shift+S',
          id: 'saveprojectas',
          disabled: true,
          alt: 11
        },
        {},
        {
          name: 'Exit',
          key: 'Alt+F4',
          id: 'exit',
          alt: 1
        }
      ]
    },
    {},
    {
      name: 'Edit',
      type: 'click',
      id: 'edit',
      menus: [
        {
          name: 'Undo',
          key: 'Ctrl+Z',
          id: 'undo'
        },
        {
          name: 'Redo',
          key: 'Ctrl+Y, Ctrl+Shift+Z',
          id: 'redo'
        }
      ]
    },
    {
      name: 'Session',
      type: 'click',
      id: 'session',
      menus: [
        {
          name: 'Auto Save Every 5 Minutes',
          id: 'autosave',
          alt: 1
        },
        {},
        {
          name: 'New Session',
          key: 'Ctrl+M',
          id: 'newsession'
        },
        {
          name: 'Open Session...',
          key: 'Ctrl+Shift+O',
          id: 'opensession'
        },
        {
          name: 'Import Session...',
          key: 'Ctrl+Shift+I',
          id: 'importsession'
        },
        {},
        {
          name: 'Save Session As...',
          key: 'Ctrl+Shift+Alt+S',
          id: 'savesessionas',
          alt: 13
        },
        {},
        {
          name: 'Absolute API Permission Check',
          id: 'absoluteapicheck',
          ticked: true,
          alt: 13
        },
        {
          name: 'Port API Warning',
          id: 'portapiwarning',
          ticked: true,
          alt: 9
        },
        {
          name: 'Strict Mode',
          id: 'strict',
          ticked: true
        }
      ]
    },
    {
      name: 'View',
      type: 'click',
      id: 'view',
      menus: [
        {
          name: 'Layout',
          id: 'layout',
          type: 'hover',
          menus: [
            {
              name: 'Browser',
              id: 'browser'
            },
            {
              name: 'Components',
              id: 'components',
              ticked: true
            }
          ]
        }
      ]
    }
  ]
}).init(document.body);

/**
 * Windows menubar buttons default configuration
 * @type {TMenubar}
 */
export const DashboardMenubarButtons = Menubar({
  align: 'horizontal',
  id: 'main',
  menus: [
    {
      name: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 4.399V5.5H0V4.399h11z" fill="#000"/></svg>',
      id: 'minimize',
      alt: false
    },
    {
      name: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 0v11H0V0h11zM9.899 1.101H1.1V9.9h8.8V1.1z" fill="#000"/></svg>',
      id: 'maximize',
      alt: false
    },
    {
      name: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 8.798H8.798V11H0V2.202h2.202V0H11v8.798zm-3.298-5.5h-6.6v6.6h6.6v-6.6zM9.9 1.1H3.298v1.101h5.5v5.5h1.1v-6.6z" fill="#000"/></svg>',
      id: 'unmaximize',
      alt: false,
      hidden: true
    },
    {
      name: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.279 5.5L11 10.221l-.779.779L5.5 6.279.779 11 0 10.221 4.721 5.5 0 .779.779 0 5.5 4.721 10.221 0 11 .779 6.279 5.5z" fill="#000"/></svg>',
      id: 'close',
      alt: false
    }
  ],
  altMode: false,
  keyboardMode: false
}).init(document.body);

/**
 * Launch a confirmation box when user attempts to exit/unload the application
 * @param {() => void} cb A function to be called when user confirms the unload
 */
export function DashboardUnloadConfirm (cb) {
  $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
    content: 'This will delete all unsaved changes. Are you sure?',
    buttons: {
      confirm: cb,
      cancel: () => { }
    }
  }));
}

/**
 * Escape double quotes in a string
 * @param {string} string The string to be escaped
 * @returns {string} The escaped string
 */
export function ensureDoubleQuotes (string) {
  return string.replace('"', '\\"');
}

/**
 * Escape HTML special characters in a string
 * @param {string} string The string to be escaped
 * @returns {string} The escaped string
 */
export function ensureHTML (string) {
  return $('<div>').text(string).html();
}

/**
 * Check if two floats are equal using epsilon
 * @param {number} x
 * @param {number} y
 * @returns {boolean} true if two numbers are equal, false otherwise
 */
export function isFloatEqual (x, y) {
  return Math.abs(parseFloat(x) - parseFloat(y)) <= 1e-3;
}

/**
 * This function is same as PHP's nl2br() with default parameters
 * @param {string} string Input text
 * @param {boolean} [replaceMode=false] Use replace instead of insert
 * @param {boolean} [isXhtml=false] Use XHTML
 * @returns {string} Filtered text
 */
export function nl2br (string, replaceMode, isXhtml) {
  const breakTag = (isXhtml) ? '<br />' : '<br>';
  const replaceStr = (replaceMode) ? ('$1' + breakTag) : ('$1' + breakTag + '$2');
  return (string + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, replaceStr);
}

/**
 * This function inverses text from PHP's nl2br() with default parameters
 * @param {string} string Input text
 * @param {boolean} [replaceMode=false] Use replace instead of insert
 * @returns {string} Filtered text
 */
export function br2nl (string, replaceMode) {
  const replaceStr = (replaceMode) ? '\n' : '';
  // <br>, <BR>, <br />, </br>
  return string.replace(/<\s*\/?br\s*[/]?>/gi, replaceStr);
}
