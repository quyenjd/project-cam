/* eslint-disable camelcase */
import { DashboardCache, DashboardEvents, DashboardGlobals, DashboardPositioning, DashboardHistory, ensureDoubleQuotes, ensureHTML, isFloatEqual } from '../globals';
import { TComponent } from './component'; // eslint-disable-line
import ContextMenu from './contextmenu';
import { Selection } from './Selection/selection';

/**
 * @typedef {Object} HubConnection
 * @property {string} inputCompID Id of the component providing the param
 * @property {string} inputParam Input parameter
 * @property {string} outputCompID Id of the component receiving the param
 * @property {string} outputParam Output parameter
 */

/**
 * @typedef {Object} InputConfig
 * @property {number} limit Maximum number of connections to the parameter (`0` means no limit)
 * @property {'input'} paramType Parameter type (input or output)
 * @property {boolean} required Whether the parameter requires at least one connection
 * @property {string} type Type of the parameter (for type matching in strict mode) (`_` means any type)
 */

/**
 * @typedef {Object} OutputConfig
 * @property {'output'} paramType Parameter type (input or output)
 * @property {string} type Type of the parameter (for type matching in strict mode) (`_` means any type)
 */

/**
 * @typedef {Object} HubComponentConfig
 * @property {TComponent} component The component instance
 * @property {({ name: string } & Omit<InputConfig, 'paramType'>)[]} input Component input
 * @property {({ name: string } & Omit<OutputConfig, 'paramType'>)[]} output Component output
 * @property {boolean} [autoUpdatable=true] true if the component should trigger the listener when input changes, false otherwise
 * @property {((input: Object.<string, *>) => Promise<Object.<string, *>>)=} listener A function to be called when triggered
 * @property {boolean} [minimized=false] true to minimize the component after adding, false otherwise
 */

/**
 * @typedef {Object} HubState
 * @property {() => Object.<string, *>} backup Return a snapshot object of the hub
 * @property {(stateObj: Object.<string, *>) => void} restore Restore the hub from backup data
 * @property {(stateObj) => Object.<string, *>} normalize Normalize the backup data
 */

/**
 * @typedef {Object} MapTransform
 * @property {number} scaleX
 * @property {number} skewY
 * @property {number} skewX
 * @property {number} scaleY
 * @property {number} translateX
 * @property {number} translateY
 */

/**
 * @typedef {Object} THub
 * @property {string} _hubID Hub id
 * @property {DashboardEvents} _events Event manager
 * @property {DashboardHistory} _commands Command manager
 * @property {(toSelector: boolean) => unknown} instance Get the hub element
 * @property {() => THub} init Initialize the hub
 * @property {() => void} destroy Destroy the hub instance
 * @property {(compID: string) => boolean} hasComp Check if the hub is managing a component
 * @property {() => string[]} compList Get the list of components the hub is managing
 * @property {(compID: string) => HubComponentConfig & { hID: string }} compOptions Get the options of a component
 * @property {() => HubConnection[]} connections Get all connections
 * @property {(inputCompID: string, inputParam: string, outputCompID: string, outputParam: string) => THub} removeConnection Remove a connection
 * @property {(compID: string, param: string) => THub} removeInputProviders Remove all input providers of a param
 * @property {(compID: string) => THub} removeAllInputProviders Remove all input providers of all params
 * @property {(inputCompID: string, inputParam: string, outputCompID: string, outputParam: string) => THub} addConnection Add a connection
 * @property {(obj: HubComponentConfig, startingPosition: { top?: number, left?: number }) => THub} add Add a component into the hub
 * @property {(compID: string, param: string, options?: InputConfig | OutputConfig) => THub} addParam Add a parameter to a component
 * @property {(compID: string, param: string, paramType: 'input' | 'output' = 'input') => boolean} hasParam Check if the component has a parameter
 * @property {(compID: string, param: string, paramType: 'input' | 'output' = 'input') => THub} removeParam Remove a parameter from a component
 * @property {(compID: string) => ((InputConfig & { paramType: 'input' }) | (OutputConfig & { paramType: 'output' }))[]} getAllParams Get all parameters of a component
 * @property {(compID: string) => THub} refreshHubUtilities Refresh hub utilities of component element with current input and output parameters (will add if not existing)
 * @property {(compID: string) => THub} ensureHubUtilities Add hub utilities to component element
 * @property {(compID: string, trigger: boolean = false) => THub} isolate Remove all input and output providers of all params
 * @property {(compID: string) => boolean} isIsolated Check if the component has been isolated
 * @property {(compID: string) => THub} minimize Minimize a component's hub window
 * @property {(compID: string) => THub} maximize Maximize a component's hub window
 * @property {(compID: string) => THub} toggle Call minimize/maximize accordingly
 * @property {(compID: string) => THub} remove Remove a component from the hub
 * @property {() => boolean} isStrict Check if the hub is in strict mode
 * @property {() => THub} unstrict Unstrict the hub
 * @property {() => THub|false} restrict Restrict the hub
 * @property {HubState} state Hub state manager
 * @property {() => MapTransform} getMapTransform Get current map transform
 */

/**
 * Create a hub
 * @param {unknown} e The element
 * @param {boolean} strictMode true to initialize the hub in strict mode, false otherwise
 * @returns {THub} The hub instance
 */
export default function Hub (e, strictMode) {
  /**
   * @type {THub}
   */
  const exports = {
    _hubID: DashboardGlobals.uniqueID('hu'),
    _events: DashboardEvents(),
    _commands: DashboardHistory()
  };

  const $hub = $(e); const hub = $hub[0]; let $map;
  let ins; let selectionHandler;
  let strict = strictMode === true;
  let _pageX = null; let _pageY = null;

  /**
   * @type {Record<string, {
   * component: TComponent,
   * limit: Record<string, number>,
   * inputType: Record<string, string>,
   * outputType: Record<string, string>,
   * input: Record<string, { id: string, param: string }[]>,
   * required: Record<string, boolean>,
   * output: Record<string, { id: string, param: string }[]>,
   * autoUpdatable: boolean,
   * level: number,
   * flag: string,
   * message: string,
   * minimized: boolean,
   * listener: Function,
   * hID: string
   * }>}
   */
  let graph = {};

  const FLAG = {
    CONNECTED: 'connected',
    IDLE: 'idle',
    ERROR: 'error',
    PROCESSING: 'processing',
    UNKNOWN: ''
  };

  const intersects = {
    RectLine: function (rect /* { minX, minY, maxX, maxY } */, line /* { fromX, fromY, toX, toY } */) {
      const CODE = {
        INSIDE: 0,
        LEFT: 1,
        RIGHT: 2,
        BOTTOM: 4,
        TOP: 8
      };
      const computeOutCode = function (pX, pY) {
        let code = CODE.INSIDE;

        if (pX < rect.minX) { code |= CODE.LEFT; } else if (pX > rect.maxX) { code |= CODE.RIGHT; }
        if (pY < rect.minY) { code |= CODE.BOTTOM; } else if (pY > rect.maxY) { code |= CODE.TOP; }

        return code;
      };

      return (function CohenSutherland () {
        let [x0, y0, x1, y1] = [line.fromX, line.fromY, line.toX, line.toY];
        let outcode0 = computeOutCode(x0, y0);
        let outcode1 = computeOutCode(x1, y1);

        while (true) {
          if (!outcode0 & !outcode1) { return true; }
          if (outcode0 & outcode1) { break; }

          let x; let y;
          const outcodeOut = outcode1 > outcode0 ? outcode1 : outcode0;

          if (outcodeOut & CODE.TOP) {
            // point is above the clip window
            x = x0 + (x1 - x0) * (rect.maxY - y0) / (y1 - y0);
            y = rect.maxY;
          } else if (outcodeOut & CODE.BOTTOM) {
            // point is below the clip window
            x = x0 + (x1 - x0) * (rect.minY - y0) / (y1 - y0);
            y = rect.minY;
          } else if (outcodeOut & CODE.RIGHT) {
            // point is to the right of clip window
            y = y0 + (y1 - y0) * (rect.maxX - x0) / (x1 - x0);
            x = rect.maxX;
          } else if (outcodeOut & CODE.LEFT) {
            // point is to the left of clip window
            y = y0 + (y1 - y0) * (rect.minX - x0) / (x1 - x0);
            x = rect.minX;
          }

          if (outcodeOut === outcode0) { outcode0 = computeOutCode(x0 = x, y0 = y); } else { outcode1 = computeOutCode(x1 = x, y1 = y); }
        }

        return false;
      })();
    },
    RectRect: function (rect1 /* { minX, maxY, maxX, minY } */, rect2 /* { minX, maxY, maxX, minY } */) {
      if (rect1.minX >= rect2.maxX || rect2.minX >= rect1.maxX) { return false; }
      if (rect1.maxY <= rect2.minY || rect2.maxY <= rect1.minY) { return false; }
      return true;
    },
    LineLine: function (line1 /* { fromX, fromY, toX, toY } */, line2 /* { fromX, fromY, toX, toY } */) {
      // check the direction these three points rotate
      const RotationDirection = function (p1x, p1y, p2x, p2y, p3x, p3y) {
        if (((p3y - p1y) * (p2x - p1x)) > ((p2y - p1y) * (p3x - p1x))) { return 1; }
        if (((p3y - p1y) * (p2x - p1x)) === ((p2y - p1y) * (p3x - p1x))) { return 0; }
        return -1;
      };

      const containsSegment = function (x1, y1, x2, y2, sx, sy) {
        if (x1 < x2 && x1 < sx && sx < x2) return true;
        else if (x2 < x1 && x2 < sx && sx < x1) return true;
        else if (y1 < y2 && y1 < sy && sy < y2) return true;
        else if (y2 < y1 && y2 < sy && sy < y1) return true;
        else if ((x1 === sx && y1 === sy) || (x2 === sx && y2 === sy)) return true;
        return false;
      };

      return (function hasIntersection (x1, y1, x2, y2, x3, y3, x4, y4) {
        const f1 = RotationDirection(x1, y1, x2, y2, x4, y4);
        const f2 = RotationDirection(x1, y1, x2, y2, x3, y3);
        const f3 = RotationDirection(x1, y1, x3, y3, x4, y4);
        const f4 = RotationDirection(x2, y2, x3, y3, x4, y4);

        // if the faces rotate opposite directions, they intersect
        let intersect = f1 !== f2 && f3 !== f4;

        // if the segments are on the same line, we have to check for overlap
        if (f1 === 0 && f2 === 0 && f3 === 0 && f4 === 0) {
          intersect = containsSegment(x1, y1, x2, y2, x3, y3) || containsSegment(x1, y1, x2, y2, x4, y4) ||
            containsSegment(x3, y3, x4, y4, x1, y1) || containsSegment(x3, y3, x4, y4, x2, y2);
        }

        return intersect;
      })(line1.fromX, line1.fromY, line1.toX, line1.toY, line2.fromX, line2.fromY, line2.toX, line2.toY);
    }
  };

  const overlapHelper = (function () {
    const EXPORTS = {};

    let $refs = [];
    let refIDs = {}; // contains the elements that are on top of an element

    let userInteracting = false; let forcedUserInteracting; let forced = false;
    const queue = new Set();
    const updateInteraction = function () {
      for (const overlapID of queue) { EXPORTS.update($map.find(`[data-overlap-id="${ensureDoubleQuotes(overlapID)}"]`)); }
      queue.clear();
    };
    $(window)
      .on(`mousedown.${exports._hubID}overlapHelper keydown.${exports._hubID}overlapHelper`, () => { userInteracting = true; })
      .on(`mouseup.${exports._hubID}overlapHelper keyup.${exports._hubID}overlapHelper`, function () {
        userInteracting = false;
        if (forced ? !forcedUserInteracting : !userInteracting) { updateInteraction(); }
      });

    function _has (elm) {
      const $elm = $(elm);
      const overlapID = $elm.attr('data-overlap-id') || '';

      return Object.prototype.hasOwnProperty.call(refIDs, overlapID) ? overlapID : false;
    }

    function _cleanup () {
      for (let i = $refs.length - 1; i >= 0; --i) {
        if (!$.contains(document.documentElement, $refs[i].get(0))) {
          const overlapID = _has($refs[i]);
          if (overlapID) {
            for (const refOverlapID of refIDs[overlapID].front) { refIDs[refOverlapID].behind.delete(overlapID); }
            for (const refOverlapID of refIDs[overlapID].behind) { refIDs[refOverlapID].front.delete(overlapID); }
            delete refIDs[overlapID];
          }
          $refs.splice(i, 1);
        }
      }
    }

    EXPORTS.add = function (elm) {
      _cleanup();

      if (!_has(elm)) {
        const $elm = $(elm);
        const overlapID = DashboardGlobals.uniqueID('ol');

        $refs.push($elm.attr('data-overlap-id', overlapID));
        refIDs[overlapID] = {
          front: new Set(),
          behind: new Set()
        };

        EXPORTS.update($elm);

        $elm.attrchange({
          trackValues: true,
          callback: function (e) {
            if (e.attributeName === 'style') { EXPORTS.update(elm); }
          }
        });
      }

      return EXPORTS;
    };

    EXPORTS.update = function (elm) {
      const $elm = $(elm); const $siblings = $elm.siblings();
      const overlapID = _has(elm);

      if (overlapID) {
        if (forced ? forcedUserInteracting : userInteracting) { queue.add(overlapID); } else {
          _cleanup();
          if (!Object.prototype.hasOwnProperty.call(refIDs, overlapID)) { return; }

          const elmIsSvg = $elm.is('svg');
          const elmData = elmIsSvg
            ? _getLineFromSvg($elm)
            : {
                minX: parseFloat($elm.css('left'), 10),
                minY: -parseFloat($elm.css('top'), 10) - $elm.height(),
                maxX: parseFloat($elm.css('left'), 10) + $elm.width(),
                maxY: -parseFloat($elm.css('top'), 10)
              };

          $refs.forEach(function ($ref) {
            const refOverlapID = _has($ref);

            // only consider elements added to overlapHelper and sharing the same parent
            if (!refOverlapID || $elm.is($ref) || !$siblings.is($ref)) { return; }

            const refIsSvg = $ref.is('svg');
            const refData = refIsSvg
              ? _getLineFromSvg($ref)
              : {
                  minX: parseFloat($ref.css('left'), 10),
                  minY: -parseFloat($ref.css('top'), 10) - $ref.height(),
                  maxX: parseFloat($ref.css('left'), 10) + $ref.width(),
                  maxY: -parseFloat($ref.css('top'), 10)
                };

            let intersect = false;
            let onTop = false;

            // check for intersection
            if (elmIsSvg && refIsSvg) { intersect = intersects.LineLine(elmData, refData); } else if (!elmIsSvg && !refIsSvg) { intersect = intersects.RectRect(elmData, refData); } else if (refIsSvg) { intersect = intersects.RectLine(elmData, refData); } else { intersect = intersects.RectLine(refData, elmData); }

            // check if ref is on top of elm
            if ($elm.css('z-index') !== $ref.css('z-index')) { onTop = (parseInt($ref.css('z-index')) || 0) > (parseInt($elm.css('z-index')) || 0); } else { onTop = $elm.nextAll().is($ref); }

            refIDs[overlapID].front.delete(refOverlapID);
            refIDs[overlapID].behind.delete(refOverlapID);
            refIDs[refOverlapID].front.delete(overlapID);
            refIDs[refOverlapID].behind.delete(overlapID);

            if (intersect) {
              if (onTop) {
                refIDs[overlapID].front.add(refOverlapID);
                refIDs[refOverlapID].behind.add(overlapID);
              } else {
                refIDs[overlapID].behind.add(refOverlapID);
                refIDs[refOverlapID].front.add(overlapID);
              }
            }
          });
        }
      }

      return EXPORTS;
    };

    EXPORTS.destroy = function (offEvents) {
      $refs = [];
      refIDs = {};

      if (offEvents === true) {
        $(window)
          .off(`mousedown.${exports._hubID}overlapHelper keydown.${exports._hubID}overlapHelper`)
          .off(`mouseup.${exports._hubID}overlapHelper keyup.${exports._hubID}overlapHelper`);
      }
    };

    EXPORTS.countOverlaps = function (elm) {
      _cleanup();

      const overlapID = _has(elm);
      return overlapID ? refIDs[overlapID].front.size : 0;
    };

    EXPORTS.interaction = {
      force: function (forceValue) {
        const newForcedUserInteracting = forceValue === true;

        if ((forced ? forcedUserInteracting : userInteracting) !== newForcedUserInteracting &&
          !newForcedUserInteracting) {
          forcedUserInteracting = newForcedUserInteracting;
          updateInteraction();
        }
        forcedUserInteracting = newForcedUserInteracting;
        forced = true;
      },
      release: function () {
        forced = false;
        if (forcedUserInteracting !== userInteracting && !userInteracting) { updateInteraction(); }
      }
    };

    return EXPORTS;
  })();

  const connections = {
    relas: [],
    get: function (inputCompID, inputParam, outputCompID, outputParam) {
      for (let i = 0; i < connections.relas.length; ++i) {
        if (connections.relas[i].inputCompID === inputCompID &&
          connections.relas[i].inputParam === inputParam &&
          connections.relas[i].outputCompID === outputCompID &&
          connections.relas[i].outputParam === outputParam) { return { pos: i, id: connections.relas[i].id }; }
      }
      return { pos: -1, id: '' };
    },
    query: function (id) {
      let pos = -1;
      for (let i = 0; i < connections.relas.length; ++i) {
        if (connections.relas[i].id === id) {
          pos = i;
          break;
        }
      }

      return pos === -1
        ? {
            id: '',
            inputCompID: '',
            inputParam: '_',
            outputCompID: '',
            outputParam: '_'
          }
        : Object.assign({}, connections.relas[pos]);
    },
    add: function (inputCompID, inputParam, outputCompID, outputParam) {
      let id = connections.get(inputCompID, inputParam, outputCompID, outputParam).id;
      if (id.length === 0) {
        id = DashboardGlobals.uniqueID('cn');
        connections.relas.push({
          id: id,
          inputCompID: inputCompID,
          inputParam: inputParam,
          outputCompID: outputCompID,
          outputParam: outputParam
        });
      }
      return id;
    },
    remove: function (inputCompID, inputParam, outputCompID, outputParam) {
      const cur = connections.get(inputCompID, inputParam, outputCompID, outputParam);
      if (cur.pos !== -1) { connections.relas.splice(cur.pos, 1); }
      return cur.id;
    }
  };

  const connectorHelper = {
    count: {},
    inc: function (type, selector) {
      if (!Object.prototype.hasOwnProperty.call(connectorHelper.count, type)) { connectorHelper.count[type] = {}; }
      if (!Object.prototype.hasOwnProperty.call(connectorHelper.count[type], selector)) { connectorHelper.count[type][selector] = 0; }
      $map.find(selector).addClass(type);
      ++connectorHelper.count[type][selector];

      return connectorHelper;
    },
    dec: function (type, selector) {
      if (!Object.prototype.hasOwnProperty.call(connectorHelper.count, type) ||
        !Object.prototype.hasOwnProperty.call(connectorHelper.count[type], selector)) { return connectorHelper; }
      if (!(connectorHelper.count[type][selector] = Math.max(0, connectorHelper.count[type][selector] - 1))) { $map.find(selector).removeClass(type); }

      return connectorHelper;
    }
  };

  const layerHelper = {
    minZIndex: 0,
    maxZIndex: 0,
    lastFront: '',
    checkpoints: {},

    // add chaining support for layering
    _chainEdges: {},
    _addToChain: function (bridge, ...elms) {
      if (!bridge) { return layerHelper; }

      const ensureChain = function (elm) {
        if (!Object.prototype.hasOwnProperty.call(layerHelper._chainEdges, elm)) { layerHelper._chainEdges[elm] = {}; }
      };
      ensureChain(bridge);

      elms.forEach(function (elm) {
        ensureChain(elm);
        layerHelper._chainEdges[bridge][elm] = layerHelper._chainEdges[elm][bridge] = true;
      });

      return layerHelper;
    },
    _removeFromChain: function (...elms) {
      elms.forEach(function (elm) {
        if (!Object.prototype.hasOwnProperty.call(layerHelper._chainEdges, elm)) { return; }
        for (const _elm in layerHelper._chainEdges[elm]) { delete layerHelper._chainEdges[_elm][elm]; }
        delete layerHelper._chainEdges[elm];
      });

      return layerHelper;
    },
    _getChain: function (...elms) {
      const items = []; const mark = {};

      elms.forEach(function (elm) {
        if (Object.prototype.hasOwnProperty.call(mark, elm)) { return; }

        const queue = [elm];
        mark[elm] = true;

        // BFS for traversing through chains
        while (queue.length) {
          const top = queue.shift();
          items.push(top);

          for (const _elm in layerHelper._chainEdges[top]) {
            if (!Object.prototype.hasOwnProperty.call(mark, _elm)) {
              queue.push(_elm);
              mark[_elm] = true;
            }
          }
        }
      });

      return [...new Set(items)];
    },

    // methods
    bringToFront: function (...elms) {
      if (!elms.length) { return layerHelper; }

      let minZIndex = Infinity;
      elms.forEach(elm => { minZIndex = Math.min(minZIndex, parseInt($map.find(`.${elm}`).css('z-index')) || 0); });

      const gap = layerHelper.maxZIndex++ - minZIndex + 1;

      elms.forEach(elm => $map.find(`.${elm}`).css('z-index', (parseInt($map.find(`.${elm}`).css('z-index')) || 0) + gap));

      layerHelper.lastFront = elms[0];

      return layerHelper;
    },
    sendToBack: function (...elms) {
      if (!elms.length) { return layerHelper; }

      let maxZIndex = -Infinity;
      elms.forEach(elm => { maxZIndex = Math.max(maxZIndex, parseInt($map.find(`.${elm}`).css('z-index')) || 0); });

      const gap = maxZIndex - layerHelper.minZIndex-- + 1;

      elms.forEach(elm => $map.find(`.${elm}`).css('z-index', (parseInt($map.find(`.${elm}`).css('z-index')) || 0) - gap));

      return layerHelper;
    },
    /*
    - watch a list of elements, mousedown on any will bring the others equally forward,
      while ensure that all svgs are made frontmost
    - this considers the first parameter as the bridge of the others
    - this has a domino effect on every element in the chain
    */
    watch: function (...elms) {
      elms.forEach(function (elm) {
        const $elm = $map.find(`.${elm}`);
        const $elmBinder = $elm.is('svg') ? $elm.find('line') : $elm;

        $elmBinder.off('mousedown.layerhelper').on('mousedown.layerhelper', function () {
          const targets = [];
          layerHelper._getChain(elm).forEach(_elm => targets.push(_elm));

          if (targets.includes(layerHelper.lastFront) || !overlapHelper.countOverlaps($elm)) { return; }

          const savedLastFront = layerHelper.lastFront;
          const savedMinZIndex = layerHelper.minZIndex;
          const savedMaxZIndex = layerHelper.maxZIndex;
          const notLines = []; const lines = [];
          const _previous = []; const _after = [];
          let $caller = $();

          targets.forEach(function (_elm) {
            const $_elm = $map.find(`.${_elm}`);

            _previous.push($_elm.css('z-index') || '');

            if ($_elm.is('svg')) { lines.push(_elm); } else { notLines.push(_elm); }

            $caller = $caller.add($_elm);
          });

          layerHelper.lastCheckpoint.apply(layerHelper, targets);
          layerHelper.bringToFront.apply(layerHelper, notLines);
          if (!$elm.is('svg')) { layerHelper.bringToFront(elm); }
          layerHelper.bringToFront.apply(layerHelper, lines);
          if ($elm.is('svg')) { layerHelper.bringToFront(elm); }

          targets.forEach((_elm) => _after.push($map.find(`.${_elm}`).css('z-index') || ''));

          const curLastFront = layerHelper.lastFront;
          const curMinZIndex = layerHelper.minZIndex;
          const curMaxZIndex = layerHelper.maxZIndex;

          exports._commands.do({
            type: 'graph.layering.bringtofront',
            caller: $caller,
            undo: function () {
              layerHelper.lastFront = savedLastFront;
              layerHelper.minZIndex = savedMinZIndex;
              layerHelper.maxZIndex = savedMaxZIndex;

              targets.forEach((_elm, idx) => $map.find(`.${_elm}`).css('z-index', _previous[idx]));
            },
            redo: function () {
              targets.forEach((_elm, idx) => $map.find(`.${_elm}`).css('z-index', _after[idx]));

              layerHelper.lastFront = curLastFront;
              layerHelper.minZIndex = curMinZIndex;
              layerHelper.maxZIndex = curMaxZIndex;
            }
          });
        });
      });

      layerHelper._addToChain.apply(layerHelper, elms);

      return layerHelper;
    },
    startCheckpoint: function (...elms) {
      elms.forEach(function (elm) {
        const $elm = $map.find(`.${elm}`);
        const checkpointID = DashboardGlobals.uniqueID('pt');
        layerHelper.checkpoints[checkpointID] = $elm.css('z-index') || '';
        $elm.attr('data-checkpoint', checkpointID);
      });

      return layerHelper;
    },
    lastCheckpoint: function (...elms) {
      elms.forEach(function (elm) {
        const $elm = $map.find(`.${elm}`);
        const checkpointID = $elm.attr('data-checkpoint') || '';
        if (checkpointID && Object.prototype.hasOwnProperty.call(layerHelper.checkpoints, checkpointID)) {
          $elm.removeAttr('data-checkpoint').css('z-index', layerHelper.checkpoints[checkpointID]);
          delete layerHelper.checkpoints[checkpointID];
        }
      });

      return layerHelper;
    }
  };

  const visibilityQueue = []; let visible = $hub.is(':visible');
  const svgHandler = {
    relas: {},
    pairs: {},

    search: function (svgID) {
      for (const [pair, _svgID] of Object.entries(svgHandler.pairs)) {
        if (_svgID === svgID) {
          const split = pair.split('+');
          return {
            inputConnector: split[0],
            outputConnector: split[1]
          };
        }
      }
      return {
        inputConnector: '',
        outputConnector: ''
      };
    },
    draw: function (offsetFrom, offsetTo) {
      const svgID = DashboardGlobals.uniqueID('ln');

      let tar_h = offsetFrom.left - _getOffset($map[0]).left;
      let tar_v = offsetFrom.top - _getOffset($map[0]).top;
      let from_h = offsetTo.left - _getOffset($map[0]).left;
      let from_v = offsetTo.top - _getOffset($map[0]).top;

      const width = Math.abs(tar_h - from_h);
      const height = Math.abs(tar_v - from_v);

      if ((from_h <= tar_h && from_v <= tar_v) ||
        (from_h > tar_h && from_v <= tar_v)) { [tar_h, tar_v, from_h, from_v] = [from_h, from_v, tar_h, tar_v]; }

      if (tar_h <= from_h && tar_v <= from_v) {
        // tar: top-left, from: bottom-right
        const tempDiv = $(`<svg class="${svgID}" style="width: ${width}px; height: ${height}px; position: absolute; top: ${tar_v}px; left: ${tar_h}px" data-line-type="diagonal">
          <line x1="0" y1="0" x2="100%" y2="100%" />
        </svg>`);
        $map.append(tempDiv);
      } else {
        // tar: bottom-left, from: top-right
        const tempDiv = $(`<svg class="${svgID}" style="width: ${width}px; height: ${height}px; position: absolute; top: ${tar_v}px; left: ${from_h}px" data-line-type="subdiagonal">
          <line x1="0" y1="100%" x2="100%" y2="0" />
        </svg>`);
        $map.append(tempDiv);
      }

      return svgID;
    },
    add: function (connectionID, cached = null) {
      const conn = cached || connections.query(connectionID);

      if (visible) {
        const $tar = $map.find(`.map__component__body__input__item__connector:not([data-param])[data-target="${ensureDoubleQuotes(conn.inputCompID)}"]`)
          .add($map.find(`.map__component__body__input__item__connector[data-target="${ensureDoubleQuotes(conn.inputCompID)}"][data-param="${ensureDoubleQuotes(conn.inputParam)}"]`));
        const $from = $map.find(`.map__component__body__output__item__connector:not([data-param])[data-target="${ensureDoubleQuotes(conn.outputCompID)}"]`)
          .add($map.find(`.map__component__body__output__item__connector[data-target="${ensureDoubleQuotes(conn.outputCompID)}"][data-param="${ensureDoubleQuotes(conn.outputParam)}"]`));
        $tar.add($from).removeClass('active');

        const tar = $tar.filter(':visible');
        const from = $from.filter(':visible');
        const tarID = tar.attr('class').match(/\bcc\w+/g)[0];
        const fromID = from.attr('class').match(/\bcc\w+/g)[0];
        connectorHelper.inc('chosen', `.map__component__body__input__item__connector.${tarID}`);
        connectorHelper.inc('chosen', `.map__component__body__output__item__connector.${fromID}`);

        const pair = [tarID, fromID].join('+'); let svgID = '';
        if (Object.prototype.hasOwnProperty.call(svgHandler.pairs, pair)) {
          const cur = $map.find(`.${svgID = svgHandler.pairs[pair]}`);
          cur.attr('data-connection', (cur.attr('data-connection') || '').split(',').concat([connectionID]).join(','));
        } else {
          const cur = $map.find(`.${svgID = svgHandler.draw({
            left: _getOffset(tar[0]).left + tar.width() / 2.0,
            top: _getOffset(tar[0]).top + tar.height() / 2.0
          }, {
            left: _getOffset(from[0]).left + from.width() / 2.0,
            top: _getOffset(from[0]).top + from.height() / 2.0
          })}`);

          // bring the line forward
          layerHelper.bringToFront(svgID);

          // mousedown on any line brings its two ends' component forward
          layerHelper.watch(svgID,
            tar.closest('.map__component').attr('class').match(/\bhc\w+/g)[0],
            from.closest('.map__component').attr('class').match(/\bhc\w+/g)[0]);

          cur.find('line').on({
            mouseenter: function () {
              $(this).parent().add(tar).add(from).addClass('hover');
            },
            mouseleave: function () {
              $(this).parent().add(tar).add(from).removeClass('hover');
            }
          });

          cur.attr('data-connection', connectionID);
          svgHandler.pairs[pair] = svgID;

          // add svg to overlapHelper
          overlapHelper.add(cur);
        }

        DashboardCache.set(`Hub[${exports._hubID}]:ActiveInput'${connectionID}'`, true);

        [conn.inputCompID, conn.outputCompID].forEach(function (item) {
          if (!Object.prototype.hasOwnProperty.call(svgHandler.relas, item) || !Array.isArray(svgHandler.relas[item])) { svgHandler.relas[item] = []; }

          let updated = false;
          for (let i = 0; i < svgHandler.relas[item].length; ++i) {
            if (svgHandler.relas[item][i].connectionID === connectionID) {
              updated = true;
              svgHandler.relas[item][i].svgID = svgID;
            }
          }

          if (!updated) {
            svgHandler.relas[item].push({
              connectionID: connectionID,
              svgID: svgID
            });
          }
        });

        return svgID;
      } else {
        let skip = false;
        for (let idx = visibilityQueue.length - 1; idx >= 0; --idx) {
          if (connectionID === visibilityQueue[idx].args[0]) {
            skip = true;
            if (visibilityQueue[idx].calling === 'remove') { visibilityQueue.splice(idx, 1); }
            break;
          }
        }

        if (!skip) {
          visibilityQueue.push({
            calling: 'add',
            args: [connectionID, conn]
          });
        }

        return '';
      }
    },
    remove: function (connectionID, cached = null) {
      const conn = cached || connections.query(connectionID);

      if (visible) {
        if (DashboardCache.pop(`Hub[${exports._hubID}]:ActiveInput'${connectionID}'`)) {
          // remove the svg
          [conn.inputCompID, conn.outputCompID].forEach(function (item) {
            svgHandler.relas[item].forEach(function (obj) {
              if (obj.connectionID === connectionID) {
                $map.find(`.${obj.svgID}`).remove();
                layerHelper._removeFromChain(obj.svgID);
                for (const [pair, svgID] of Object.entries(svgHandler.pairs)) {
                  if (svgID === obj.svgID) {
                    delete svgHandler.pairs[pair];
                    break;
                  }
                }
              }
            });
          });

          svgHandler.relas[conn.inputCompID] = svgHandler.relas[conn.inputCompID].filter(obj => obj.connectionID !== connectionID);
          svgHandler.relas[conn.outputCompID] = svgHandler.relas[conn.outputCompID].filter(obj => obj.connectionID !== connectionID);

          const $tar = $map.find(`.map__component__body__input__item__connector:not([data-param])[data-target="${ensureDoubleQuotes(conn.inputCompID)}"]`)
            .add($map.find(`.map__component__body__input__item__connector[data-target="${ensureDoubleQuotes(conn.inputCompID)}"][data-param="${ensureDoubleQuotes(conn.inputParam)}"]`));
          const $from = $map.find(`.map__component__body__output__item__connector:not([data-param])[data-target="${ensureDoubleQuotes(conn.outputCompID)}"]`)
            .add($map.find(`.map__component__body__output__item__connector[data-target="${ensureDoubleQuotes(conn.outputCompID)}"][data-param="${ensureDoubleQuotes(conn.outputParam)}"]`));
          const tar = $tar.filter(':visible');
          const from = $from.filter(':visible');
          try {
            connectorHelper.dec('chosen', `.map__component__body__input__item__connector.${tar.attr('class').match(/\bcc\w+/g)[0]}`);
          } catch (e) { }
          try {
            connectorHelper.dec('chosen', `.map__component__body__output__item__connector.${from.attr('class').match(/\bcc\w+/g)[0]}`);
          } catch (e) { }
        }
      } else {
        let skip = false;
        for (let idx = visibilityQueue.length - 1; idx >= 0; --idx) {
          if (connectionID === visibilityQueue[idx].args[0]) {
            skip = true;
            if (visibilityQueue[idx].calling === 'add') { visibilityQueue.splice(idx, 1); }
            break;
          }
        }

        if (!skip) {
          visibilityQueue.push({
            calling: 'remove',
            args: [connectionID, conn]
          });
        }
      }

      return svgHandler;
    },
    has: function (connectionID) {
      return DashboardCache.get(`Hub[${exports._hubID}]:ActiveInput'${connectionID}'`);
    },
    update: function (compID, performClear, performAdd) {
      performClear = performClear !== false;
      performAdd = performAdd !== false;

      if (!Object.prototype.hasOwnProperty.call(svgHandler.relas, compID) || !Array.isArray(svgHandler.relas[compID])) { return svgHandler; }

      const newSVGs = [];
      [...svgHandler.relas[compID]].forEach(function (item) {
        if (performClear) { svgHandler.remove(item.connectionID); }
        if (performAdd) { newSVGs.push(svgHandler.add(item.connectionID)); }
      });
      layerHelper.bringToFront.apply(layerHelper, newSVGs);

      return svgHandler;
    },
    updateAll: function () {
      for (const compID in svgHandler.relas) { svgHandler.update(compID); }

      return svgHandler;
    },
    hide: function (compID) {
      if (!Object.prototype.hasOwnProperty.call(svgHandler.relas, compID) || !Array.isArray(svgHandler.relas[compID])) { return svgHandler; }

      svgHandler.relas[compID].forEach(function (item) {
        $map.find(`.${item.svgID}`).hide();
      });

      return svgHandler;
    },
    moving: function (connector) {
      let svgID = ''; const $connector = $(connector);
      const fromX = _getOffset($connector[0]).left + $connector.width() / 2.0;
      const fromY = _getOffset($connector[0]).top + $connector.height() / 2.0;

      const mouseMove = function (e) {
        if (svgID.length) { $map.find(`.${svgID}`).remove(); }

        const curOffset = _getOffset($map[0]);
        const curTransform = _getCurrentTransform($map[0]);
        $map.find(`.${svgID = svgHandler.draw({
          left: fromX,
          top: fromY
        }, {
          left: (e.pageX - curTransform.translateX - curOffset.left) / curTransform.scaleX + curOffset.left,
          top: (e.pageY - curTransform.translateY - curOffset.top) / curTransform.scaleY + curOffset.top
        })}`).addClass('moving');
      };

      $hub.on('mousemove', mouseMove)
        .on('mousedown', function () {
          if (svgID.length) { $map.find(`.${svgID}`).remove(); }
          $hub.off('mousemove', mouseMove);
        });

      return svgHandler;
    }
  };

  // Listen to visibility change
  setTimeout(function visibilityCheck () {
    const isVisible = $hub.is(':visible');
    if (visible !== isVisible) {
      visible = isVisible;
      if (visible) {
        while (visibilityQueue.length) {
          const top = visibilityQueue[0];
          visibilityQueue.splice(0, 1);
          svgHandler[top.calling].apply(svgHandler, top.args);
        }
      }
    }
    setTimeout(visibilityCheck, DashboardGlobals.duration.immediate);
  }, DashboardGlobals.duration.immediate);

  const positionHelper = DashboardPositioning();

  // selection utilities
  let savedSelection = [];
  const addSelected = function (svg) {
    const $svg = $(svg);

    if (!$svg.hasClass('selected')) {
      $svg.addClass('selected');

      if ($svg.is('svg')) {
        const svgID = $svg.attr('class').match(/\bln\w+/g)[0];
        const connectors = svgHandler.search(svgID);
        connectorHelper.inc('selected', `.map__component__body__input__item__connector.${connectors.inputConnector}`);
        connectorHelper.inc('selected', `.map__component__body__output__item__connector.${connectors.outputConnector}`);
        layerHelper.startCheckpoint(svgID);
        layerHelper.bringToFront(svgID);
      }
    }
  }; const removeSelected = function (svg) {
    const $svg = $(svg);

    if ($svg.hasClass('selected')) {
      $svg.removeClass('selected');

      if ($svg.is('svg')) {
        const svgID = $svg.attr('class').match(/\bln\w+/g)[0];
        const connectors = svgHandler.search(svgID);
        connectorHelper.dec('selected', `.map__component__body__input__item__connector.${connectors.inputConnector}`);
        connectorHelper.dec('selected', `.map__component__body__output__item__connector.${connectors.outputConnector}`);
        layerHelper.lastCheckpoint(svgID);
      }
    }
  }; const saveSelection = () => {
    savedSelection = [];
    [...selectionHandler.getSelection()].forEach((elm) => {
      if (elm.tagName !== 'svg') { savedSelection.push(elm); }
    });
  }; const preserveSelection = () => {
    // Cancel the current selection and restore the last selection
    selectionHandler.cancel();
    selectionHandler.clearSelection();
    for (const elm of savedSelection) {
      selectionHandler.select(elm);
      addSelected(elm);
    }
    selectionHandler.keepSelection();
  };

  exports.instance = function (toSelector) {
    return toSelector ? $hub : hub;
  };

  exports.init = function () {
    $hub.addClass(exports._hubID).html(`<div class="map">
      <div class="map__panzoom"></div>
      <div class="map__coordinates">
        <div class="map__coordinates__item">x: <span class="x">N/A</span></div>
        <div class="map__coordinates__item">y: <span class="y">N/A</span></div>
        <div class="map__coordinates__item">s: <span class="s">N/A</span></div>
      </div>
    </div>`);

    // declare global $map variable
    $map = $hub.find('.map__panzoom');

    // initialize selection utility
    selectionHandler = Selection.create({
      class: 'map__selection',
      selectables: [`.${exports._hubID} .map__panzoom svg`, `.${exports._hubID} .map__panzoom .map__component`],
      boundaries: [`.${exports._hubID} .map`],
      startareas: [`.${exports._hubID} .map`],
      selectionAreaContainer: `.${exports._hubID} .map`,
      mode: function (domRect, svg) {
        const curTransform = _getCurrentTransform($map[0]);
        const curOffset = _getOffset($map[0]);
        const rect = {
          maxY: -1.0 * (domRect.top - curOffset.top - curTransform.translateY) / curTransform.scaleY,
          minX: 1.0 * (domRect.left - curOffset.left - curTransform.translateX) / curTransform.scaleX,
          minY: -1.0 * (domRect.bottom - curOffset.top - curTransform.translateY) / curTransform.scaleY,
          maxX: 1.0 * (domRect.right - curOffset.left - curTransform.translateX) / curTransform.scaleX
        };

        const $svg = $(svg); const svgPosition = $svg.position();
        if ($svg.is('svg')) {
          return intersects.RectLine(rect, _getLineFromSvg(svg));
        } else {
          return intersects.RectRect(rect, {
            minX: 1.0 * svgPosition.left / curTransform.scaleX,
            maxY: -1.0 * svgPosition.top / curTransform.scaleY,
            maxX: 1.0 * svgPosition.left / curTransform.scaleX + $svg.outerWidth(true),
            minY: -1.0 * svgPosition.top / curTransform.scaleY - $svg.outerHeight(true)
          });
        }
      }
    }).on('beforestart', ({ oe, inst, selected }) => {
      const _oe = $.event.fix(oe);

      if (_oe.which === 3) {
        // if context menu
        return false;
      }

      const $target = $(_oe.target);
      const isSelectable = inst.option('selectables').reduce((prev, curr) => prev || $target.closest(curr).length, false);
      if (!_oe.ctrlKey) {
        for (const elm of selected) {
          removeSelected(elm);
          inst.removeFromSelection(elm);
        }
        inst.clearSelection();
      }
      return !$target.closest('.map__component__body__input__item, .map__component__body__output__item').length &&
        (isSelectable || $target.hasClass('map') || $target.hasClass('map__panzoom'));
    }).on('move', ({ oe, inst, changed: { removed, added } }) => {
      if ($(oe.target).closest('.move').length) { inst.cancel(); }
      for (const elm of added) { addSelected(elm); }
      for (const elm of removed) { removeSelected(elm); }
    }).on('stop', ({ inst }) => {
      inst.keepSelection();
    });

    // cancel current selection when window is out of focus
    $(window).on(`blur.${exports._hubID}`, () => selectionHandler.cancel());

    // select all/remove relationship context menu
    const contextMenu = ContextMenu(`.${exports._hubID} .map`, {
      id: 'main',
      align: 'vertical',
      menus: [
        {
          name: 'Select all',
          id: 'all',
          type: 'click',
          key: 'Ctrl+A'
        },
        {
          name: 'Detach',
          id: 'detach',
          type: 'click',
          key: 'Ctrl+Shift+D'
        },
        {},
        {
          name: 'Reset pan/zoom',
          id: 'reset',
          type: 'click',
          disabled: true
        }
      ]
    }).init();

    const contextMenuDetach = contextMenu.menu.getMenuItemsById('detach');
    contextMenu.menu._events
      .on('all', () => {
        const selectables = Selection.utils.selectAll(selectionHandler.option('selectables'));
        selectionHandler.select(selectionHandler.option('selectables'));
        selectionHandler.keepSelection();
        selectables.forEach(item => addSelected(item));
      }).on('detach', () => {
        const selected = selectionHandler.getSelection();

        if (selected.length) {
          $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
            content: 'This will detach all selected connections permanently. Are you sure?',
            buttons: {
              confirm: function () {
                selected.forEach(function (item) {
                  removeSelected(item);

                  // remove connection
                  const conn = connections.query($(item).attr('data-connection'));
                  exports.removeConnection(conn.inputCompID, conn.inputParam, conn.outputCompID, conn.outputParam);
                });
                selectionHandler.clearSelection();
              },
              cancel: () => { }
            }
          }));
        }
      }).on('reset', (e) => {
        DashboardCache.set(`Hub[${exports._hubID}]:ResetZoomInterrupted`, false);

        const resetZoom = function resetZoom () {
          if (!e.menuItem.isDisabled() && !DashboardCache.get(`Hub[${exports._hubID}]:ResetZoomInterrupted`)) {
            const current = _getCurrentTransform($map[0]);
            if (!isFloatEqual(current.scaleX, 1.0)) {
              ins.smoothZoomAbs(
                -current.translateX / (current.scaleX - 1.0),
                -current.translateY / (current.scaleX - 1.0),
                1.0
              );
            } else { ins.smoothMoveTo(0, 0); }

            _setCoordinates(_pageX, _pageY);

            // 400 is the default duration of @anvaka/amator
            // no idea why there is no API for this
            setTimeout(resetZoom, 400);
          }
        };

        resetZoom();
      }).on('_show', () => {
        if (selectionHandler.getSelection().length) { contextMenuDetach.enable(); } else { contextMenuDetach.disable(); }
      });

    // initialize panzoom
    ins = panzoom($map[0], {
      beforeMouseDown: function (e) {
        return !e.shiftKey;
      },
      filterKey: function () {
        return true;
      },
      smoothScroll: false,
      bounds: true,
      boundsPadding: 0,
      zoomDoubleClickSpeed: 1,
      disableTouch: true
    }).on('panstart', function () {
      $map.closest('.map').addClass('move');
      $map.find('.map__component, .map__component *').addClass('persist');
      // _save(ins);
    }).on('panend', function () {
      $map.closest('.map').removeClass('move');
      $map.find('.map__component, .map__component *').removeClass('persist');
      // _do(ins);
    }).on('transform', function () {
      const current = _getCurrentTransform($map[0]);
      if (!isFloatEqual(current.scaleX, 1.0) ||
        !isFloatEqual(current.scaleY, 1.0) ||
        !isFloatEqual(current.translateX, 0.0) ||
        !isFloatEqual(current.translateY, 0.0)
      ) {
        contextMenu.menu.getMenuItemsById('reset').enable();
        DashboardCache.set(`Hub[${exports._hubID}]:ResetZoomInterrupted`, true);
      } else { contextMenu.menu.getMenuItemsById('reset').disable(); }
      _setCoordinates(_pageX, _pageY);
    });

    let keyToast;
    $(document).on(`keydown.${exports._hubID}`, (e) => {
      if (!visible) { return; }

      if (!e.originalEvent.repeat && e.which === 16 && !keyToast) {
        e.stopImmediatePropagation();
        keyToast = $.toast($.extend({}, DashboardGlobals.toastConfiguration, {
          heading: 'Panning with Shift key',
          text: 'While Shift key is pressed, double click to pan.',
          allowToastClose: false,
          hideAfter: false
        }));
      }
    }).on(`keyup.${exports._hubID} blur.${exports._hubID}`, (e) => {
      if (!visible) { return; }

      if (((e.type === 'keyup' && e.which === 16) || e.type === 'blur') && keyToast) {
        e.stopImmediatePropagation();
        keyToast.update({ allowToastClose: true });
        keyToast.close();
        keyToast = null;
      }
    });

    // Mouse events on map update coordinates
    $hub.on('mouseenter mousemove', (event) => {
      _setCoordinates(event.pageX, event.pageY);
    }).on('mouseleave', () => {
      _setCoordinates(null, null);
    });

    // Restore variables to default
    graph = {};
    positionHelper.clear();
    connections.relas.splice(0);
    connectorHelper.count = {};
    layerHelper.minZIndex = layerHelper.maxZIndex = 0;
    layerHelper.checkpoints = {};
    layerHelper._chainEdges = {};
    visibilityQueue.splice(0);
    svgHandler.relas = {};
    svgHandler.pairs = {};
    overlapHelper.destroy();

    exports._events.call('init', exports);

    return exports;
  };
  exports.init();

  exports.destroy = function () {
    exports.init();
    $hub.remove();

    overlapHelper.destroy(true);
    $(window).off(`.${exports._hubID}`);

    // clear unused cache keys
    DashboardCache.keys(`^Hub\\[${exports._hubID}\\]`).forEach((key) => DashboardCache.remove(key));

    // clear history
    exports._commands.clear();

    DashboardGlobals.destroyObj(exports);
  };

  exports.hasComp = function (compID) {
    return Object.prototype.hasOwnProperty.call(graph, compID);
  };

  exports.compList = function () {
    const arr = [];
    for (const compID in graph) { arr.push(compID); }
    return arr;
  };

  exports.compOptions = function (compID) {
    if (!exports.hasComp(compID)) { return {}; }

    const input = [];
    for (const param in graph[compID].input) {
      input.push({
        limit: graph[compID].limit[param],
        name: param,
        required: graph[compID].required[param],
        type: graph[compID].inputType[param]
      });
    }
    const output = [];
    for (const param in graph[compID].output) {
      output.push({
        name: param,
        type: graph[compID].outputType[param]
      });
    }

    return {
      component: graph[compID].component,
      input: input,
      output: output,
      listener: graph[compID].listener,
      autoUpdatable: graph[compID].autoUpdatable,
      minimized: graph[compID].minimized,
      hID: graph[compID].hID
    };
  };

  exports.connections = function () {
    const arr = [];
    connections.relas.forEach((obj) => arr.push({
      inputCompID: obj.inputCompID,
      inputParam: obj.inputParam,
      outputCompID: obj.outputCompID,
      outputParam: obj.outputParam
    }));
    return arr;
  };

  let _fromAddConnection = false;
  exports.removeConnection = function (inputCompID, inputParam, outputCompID, outputParam) {
    if (!exports.hasComp(inputCompID) || !exports.hasComp(outputCompID)) { return exports; }

    if (typeof inputParam !== 'string') { inputParam = '_'; }
    if (typeof outputParam !== 'string') { outputParam = '_'; }

    const cur = connections.get(inputCompID, inputParam, outputCompID, outputParam);
    if (cur.pos === -1) { return exports; }

    // reset inheritence level
    graph[inputCompID].level = 0;

    for (const [param, providers] of Object.entries(graph[inputCompID].input)) {
      // recalculate inheritence level based on undeleted params only
      if (param !== inputParam) {
        providers.forEach(function (provider) {
          graph[inputCompID].level = Math.max(graph[inputCompID].level, graph[provider.id].level + 1);
        });
        continue;
      }

      // remove outputCompID from input list
      let pos = -1;
      providers.forEach(function (provider, id) {
        // continue with inheritence level of irrelevant providers
        if (provider.id !== outputCompID || provider.param !== outputParam) { graph[inputCompID].level = Math.max(graph[inputCompID].level, graph[provider.id].level + 1); } else {
          // remove inputCompID from output list
          for (let i = 0; i < graph[outputCompID].output[outputParam].length; ++i) {
            if (graph[outputCompID].output[outputParam][i].id === inputCompID &&
              graph[outputCompID].output[outputParam][i].param === inputParam) {
              graph[outputCompID].output[outputParam].splice(i, 1);
              break;
            }
          }
          pos = id;
        }
      });
      if (pos > -1) { graph[inputCompID].input[param].splice(pos, 1); }
    }

    // remove routing line
    svgHandler.remove(cur.id);

    // remove connection from itemboxes
    let $itemboxes = $();
    if (!graph[inputCompID].component.options().silent) { $itemboxes = $itemboxes.add(graph[inputCompID].component.compInstance(true)); }
    if (!graph[outputCompID].component.options().silent) { $itemboxes = $itemboxes.add(graph[outputCompID].component.compInstance(true)); }
    $itemboxes.find(`.component__hub__traffic__itembox__item[data-connection="${ensureDoubleQuotes(cur.id)}"]`).remove();
    $itemboxes.each(function (i, elm) {
      const $elm = $(elm);
      if ($elm.children().length < 1) { $elm.html('<em>None</em>'); }
    });

    // remove connection from connection handler
    connections.relas.splice(cur.pos, 1);

    // trigger the update chain
    if (!_fromAddConnection) { _markTrigger(inputCompID); }

    exports._events.call('removeConnection', exports, {
      inputCompID: inputCompID,
      inputParam: inputParam,
      outputCompID: outputCompID,
      outputParam: outputParam
    });

    return exports;
  };

  exports.removeInputProviders = function (compID, param) {
    _cacheTriggers();
    if (exports.hasComp(compID)) {
      while (graph[compID].input[param].length) { exports.removeConnection(compID, param, graph[compID].input[param][0].id, graph[compID].input[param][0].param); }
    }
    _uncacheTriggers();
    return exports;
  };

  exports.removeAllInputProviders = function (compID) {
    _cacheTriggers();
    if (exports.hasComp(compID)) {
      for (const param in graph[compID].input) { exports.removeInputProviders(compID, param); }
    }
    _uncacheTriggers();
    return exports;
  };

  exports.addConnection = function (inputCompID, inputParam, outputCompID, outputParam) {
    if (typeof inputParam !== 'string') { inputParam = '_'; }
    if (typeof outputParam !== 'string') { outputParam = '_'; }

    // do the components exist?
    if (!exports.hasComp(inputCompID) ||
      !exports.hasParam(inputCompID, inputParam, 'input') ||
      !exports.hasComp(outputCompID) ||
      !exports.hasParam(outputCompID, outputParam, 'output')) { return exports; }

    // has the input parameter reached its connection limit?
    if (graph[inputCompID].limit[inputParam] && graph[inputCompID].input[inputParam].length >= graph[inputCompID].limit[inputParam]) {
      $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
        title: 'Input Provider Limit Reached',
        content: `The input parameter <strong>${ensureHTML(inputParam)}</strong> has reached its limit of connections.`
      }));
      return exports;
    }

    const inputType = graph[inputCompID].inputType[inputParam];
    const outputType = graph[outputCompID].outputType[outputParam];
    if (strict && inputType !== outputType && inputType !== '_' && outputType !== '_') {
      _raise(inputCompID, FLAG.ERROR, 'Connection is denied.');
      _raise(outputCompID, FLAG.ERROR, 'Connection is denied.');
      $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
        title: 'Strict Mode',
        content: `Unable to make the connection: Type <strong>${ensureHTML(outputType)}</strong> to Type <strong>${ensureHTML(inputType)}</strong>.`,
        onClose: function () {
          _markStatus(inputCompID);
          _markStatus(outputCompID);
        }
      }));
      return exports;
    }

    // does including the connection create a loop or duplicating edge?
    if (connections.get(inputCompID, inputParam, outputCompID, outputParam).id.length ||
      _detectChain(inputCompID, outputCompID)) { return exports; }

    // update previous routing
    _fromAddConnection = true;
    exports.removeConnection(inputCompID, inputParam, outputCompID, outputParam);
    _fromAddConnection = false;

    const emptyInput = !graph[inputCompID].input[inputParam].length;
    const emptyOutput = !graph[outputCompID].output[outputParam].length;

    graph[outputCompID].output[outputParam].push({
      id: inputCompID,
      param: inputParam
    });
    graph[inputCompID].input[inputParam].push({
      id: outputCompID,
      param: outputParam
    });
    graph[inputCompID].level = Math.max(graph[inputCompID].level, graph[outputCompID].level + 1);

    // add connection and draw line
    const id = connections.add(inputCompID, inputParam, outputCompID, outputParam);
    svgHandler.add(id);

    // update itembox if component is not in silent mode
    if (!graph[inputCompID].component.options().silent) {
      const $itembox = graph[inputCompID].component.compInstance(true).find(`.component__hub__traffic__itembox[data-type="input"][data-param="${ensureDoubleQuotes(inputParam)}"]`);
      if (emptyInput) { $itembox.html(''); }
      const outputType = graph[outputCompID].outputType[outputParam];
      $itembox.append($(`<div class="component__hub__traffic__itembox__item" data-connection="${ensureDoubleQuotes(id)}">
        <div class="component__hub__traffic__itembox__item__param">${outputType !== outputParam ? `<span class="paramtype">${ensureHTML(outputType)}.</span>` : ''}${ensureHTML(outputParam === '_' ? 'Any' : outputParam)}</div>
        <div class="component__hub__traffic__itembox__item__name" data-name-dependency="${ensureDoubleQuotes(outputCompID)}">${ensureHTML(graph[outputCompID].component.options().name)}</div>
      </div>`));
    }
    if (!graph[outputCompID].component.options().silent) {
      const $itembox = graph[outputCompID].component.compInstance(true).find(`.component__hub__traffic__itembox[data-type="output"][data-param="${ensureDoubleQuotes(outputParam)}"]`);
      if (emptyOutput) { $itembox.html(''); }
      const inputType = graph[inputCompID].inputType[inputParam];
      $itembox.append($(`<div class="component__hub__traffic__itembox__item" data-connection="${ensureDoubleQuotes(id)}">
        <div class="component__hub__traffic__itembox__item__param">${inputType !== inputParam ? `<span class="paramtype">${ensureHTML(inputType)}.</span>` : ''}${ensureHTML(inputParam === '_' ? 'Any' : inputParam)}</div>
        <div class="component__hub__traffic__itembox__item__name" data-name-dependency="${ensureDoubleQuotes(inputCompID)}">${ensureHTML(graph[inputCompID].component.options().name)}</div>
      </div>`));
    }

    // trigger the update chain
    _markTrigger(inputCompID);

    exports._events.call('addConnection', exports, {
      inputCompID: inputCompID,
      inputParam: inputParam,
      outputCompID: outputCompID,
      outputParam: outputParam
    });

    return exports;
  };

  exports.add = function (obj, startingPosition) {
    if (!obj.component) { return exports; }

    const compID = obj.component._compID;
    if (exports.hasComp(compID)) { return exports; }

    graph[compID] = {
      component: obj.component,
      limit: {},
      inputType: {},
      outputType: {},
      input: {},
      required: {},
      output: {},
      autoUpdatable: true,
      level: 0,
      flag: FLAG.UNKNOWN,
      message: '',
      minimized: false,
      listener: function () { },
      hID: DashboardGlobals.uniqueID('hc')
    };

    const compOptions = graph[compID].component.options();

    if (obj.autoUpdatable === false && !obj.component.options().silent) { graph[compID].autoUpdatable = false; }

    if ($.isFunction(obj.listener)) {
      graph[compID].listener = obj.listener;
      exports._events.on(`${compID}.ontrigger`, obj.listener);
    }

    // Attach useful component events
    graph[compID].component._events.on('triggered', function () {
      // check if required input is missing
      if (_detectMissingInput(compID)) return;

      _markProcessing(compID);
      const $hubComp = _compInstance(compID, true).addClass('processing');

      const input = {};

      // prepare input
      for (const [param, providers] of Object.entries(graph[compID].input)) {
        if (!Object.prototype.hasOwnProperty.call(input, param)) { input[param] = []; }
        if (param === '_') {
          providers.forEach(function (provider) {
            DashboardCache.keys(`^Hub\\[${exports._hubID}\\]:${provider.id}_`).forEach(function (item) {
              input[param].push({
                param: item.slice(item.indexOf('_') + 1),
                value: DashboardCache.get(item)
              });
            });
          });
        } else {
          providers.forEach(function (provider) {
            input[param].push({
              param: provider.param,
              value: DashboardCache.get(`Hub[${exports._hubID}]:${provider.id}_${provider.param}`)
            });
          });
        }
      }

      exports._events.invoke(`${this._compID}.ontrigger`, this, input).then((output) => {
        graph[compID]?.component._events.call('outputchange', graph[compID].component, output[0] || {});
      }).catch((reason) => {
        if (exports.hasComp(compID)) {
          _raise(compID, FLAG.ERROR, reason instanceof Error ? reason.message : reason);
        }
      }).finally(() => {
        $hubComp.removeClass('processing');
      });
    }).on('outputchange', function (output) {
      // save output object to cache
      const change = {};

      for (const [param, providers] of Object.entries(graph[compID].output)) {
        const query = `Hub[${exports._hubID}]:${compID}_${param}`;
        if (Object.prototype.hasOwnProperty.call(output, param) && DashboardCache.get(query) !== output[param]) {
          DashboardCache.set(query, output[param]);
          providers.forEach(function (provider) {
            change[provider.id] = true;
          });
        }
      }

      _markStatus(compID);

      for (const provider in change) { _markTrigger(provider); }
    }).on('component.levelchanged', function (levelChanged) {
      let ids = [];
      for (const [, providers] of Object.entries(graph[compID].output)) { ids = ids.concat(providers); }
      [...new Set(ids)].forEach(function (item) {
        graph[item].component.trigger('levelchanged', levelChanged);
      });
    }).on('afterinit', function () {
      graph[compID].component.trigger();
    }).on('afterduplicate', function (newComp) {
      exports.add({
        ...exports.compOptions(compID),
        component: newComp,
        listener: (input) => newComp.api.call('newinput', input)
      });
    });

    // Add handler for component's beforedestroy
    graph[compID].component._events.on('beforedestroy', function () {
      exports.remove(this._compID);
    });

    // Add component to hub
    {
      const getSelected = () => {
        let $selected = $();
        for (const elm of savedSelection) {
          const $elm = $(elm);
          if ($elm.hasClass('map__component')) { $selected = $selected.add($elm); }
        }
        return $selected;
      };
      const tempDiv = $(`<div class="map__component ${graph[compID].hID}" data-component-id="${compID}">
        <div class="map__component__title">${ensureHTML(compOptions.name)}</div>
        <div class="map__component__body" style="background: ${compOptions.background}; color: ${compOptions.color};">
          <div class="map__component__body__input">
            <div class="map__component__body__input__header">Input</div>
            <div class="map__component__body__input__item none">
              <div class="map__component__body__input__item__param"><em>None</em></div>
            </div>
          </div>
          <div class="map__component__body__input minimized">
            <div class="map__component__body__input__item">
              <div class="map__component__body__input__item__param"><strong>Input</strong></div>
            </div>
          </div>
          <div class="map__component__body__output">
            <div class="map__component__body__output__header">Output</div>
            <div class="map__component__body__output__item none">
              <div class="map__component__body__output__item__param"><em>None</em></div>
            </div>
          </div>
          <div class="map__component__body__output minimized">
            <div class="map__component__body__output__item">
              <div class="map__component__body__output__item__param"><strong>Output</strong></div>
            </div>
          </div>
        </div>
      </div>`).on('mousedown', function (e) {
        // do not process right clicks
        if (e.which === 3) return;

        saveSelection();
        if ($.inArray(this, savedSelection) === -1) { savedSelection = [this]; }
      }).draggable().on('dragstart', function () {
        preserveSelection();
        overlapHelper.interaction.force(true);

        getSelected().each(function () {
          const $this = $(this);
          const compID = $this.attr('data-component-id');

          DashboardCache.set(`Hub[${exports._hubID}]:Component[${graph[compID].hID}]_DraggableStartPosition`, {
            top: parseFloat($this.css('top')),
            left: parseFloat($this.css('left'))
          }, true);
          svgHandler.hide(compID); // hide svgs on begin dragging
        });
      }).on('dragstop', function () {
        selectionHandler.keepSelection();

        const undos = []; const redos = [];

        const selected = getSelected().each(function () {
          const $this = $(this);
          const compID = $this.attr('data-component-id');

          svgHandler.update(compID); // update svgs on end dragging

          const original = DashboardCache.get(`Hub[${exports._hubID}]:Component[${graph[compID].hID}]_DraggableStartPosition`);
          const current = { ...$this.position() };

          undos.push(function () {
            try {
              $this.css({
                top: original.top,
                left: original.left
              });
              svgHandler.update(compID);
            } catch (err) { }
          });
          redos.push(function () {
            try {
              $this.css({
                top: current.top,
                left: current.left
              });
              svgHandler.update(compID);
            } catch (err) { }
          });
        }).toArray();

        exports._commands.do({
          type: 'graph.component.drag',
          caller: () => selected.reduce((prev, curr) => prev || $.contains(document.documentElement, curr), false),
          undo: function () {
            undos.forEach((fn) => fn());
          },
          redo: function () {
            redos.forEach((fn) => fn());
          }
        });

        overlapHelper.interaction.release();
      }).on('drag', function (evt, ui) {
        const original = DashboardCache.get(`Hub[${exports._hubID}]:Component[${graph[compID].hID}]_DraggableStartPosition`);
        if (ui.helper.hasClass('persist')) {
          ui.position.top = original.top;
          ui.position.left = original.left;
        } else {
          const curTransform = _getCurrentTransform($map[0]); // get current transform
          const newTop = ui.position.top / curTransform.scaleY;
          const newLeft = ui.position.left / curTransform.scaleX;
          const dTop = newTop - original.top;
          const dLeft = newLeft - original.left;

          ui.position.top = newTop;
          ui.position.left = newLeft;

          getSelected().each(function () {
            const $this = $(this);
            const _compID = $this.attr('data-component-id');

            if (compID === _compID) return;

            const original = DashboardCache.get(`Hub[${exports._hubID}]:Component[${graph[_compID].hID}]_DraggableStartPosition`);
            $this.css('top', original.top + dTop);
            $this.css('left', original.left + dLeft);
          });
        }
      }).resizable({
        handles: 'se',
        minWidth: -1000000,
        minHeight: -1000000
      }).on('resize', function (evt, ui) {
        ui.element.css('height', 'auto');

        const original = DashboardCache.get(`Hub[${exports._hubID}]:Component[${graph[compID].hID}]_ResizableStartWidth`);
        const curTransform = _getCurrentTransform($map[0]); // get current transform
        const changeWidth = ui.size.width - ui.originalSize.width; // find change in width
        const newWidth = ui.originalSize.width + changeWidth / curTransform.scaleX; // adjust new width by our zoomScale
        const dWidth = (ui.size.width = Math.max(newWidth, ui.element[0].scrollWidth)) - original;

        getSelected().each(function () {
          const $this = $(this);
          const _compID = $this.attr('data-component-id');

          if (compID === _compID) return;

          const original = DashboardCache.get(`Hub[${exports._hubID}]:Component[${graph[_compID].hID}]_ResizableStartWidth`);
          $this.css('width', 0);
          $this.css('width', Math.max(original + dWidth, this.scrollWidth));
        });
      }).on('resizestart', function () {
        preserveSelection();
        overlapHelper.interaction.force(true);

        getSelected().each(function () {
          const $this = $(this);
          const compID = $this.attr('data-component-id');

          DashboardCache.set(`Hub[${exports._hubID}]:Component[${graph[compID].hID}]_ResizableStartWidth`, parseFloat($this.css('width') || $this.width()));
          svgHandler.hide(compID); // hide svgs on begin dragging
        });
      }).on('resizestop', function () {
        selectionHandler.keepSelection();

        const undos = []; const redos = [];

        const selected = getSelected().each(function () {
          const $this = $(this);
          const compID = $this.attr('data-component-id');

          svgHandler.update(compID); // update svgs on end dragging

          const oldWidth = DashboardCache.get(`Hub[${exports._hubID}]:Component[${graph[compID].hID}]_ResizableStartWidth`);
          const newWidth = $this.css('width');

          undos.push(function () {
            try {
              $this.css('width', oldWidth);
              svgHandler.update(compID);
            } catch (err) { }
          });
          redos.push(function () {
            try {
              $this.css('width', newWidth);
              svgHandler.update(compID);
            } catch (err) { }
          });
        }).toArray();

        exports._commands.do({
          type: 'graph.component.resize',
          caller: () => selected.reduce((prev, curr) => prev || $.contains(document.documentElement, curr), false),
          undo: function () {
            undos.forEach((fn) => fn());
          },
          redo: function () {
            redos.forEach((fn) => fn());
          }
        });

        overlapHelper.interaction.release();
      }).bindIframeFixEvents('drag resize');

      tempDiv.on('mousedown', function (event) {
        const $target = $(event.target).closest('.map__component__body__input__item, .map__component__body__output__item');
        if ($target.hasClass('none')) {
          tempDiv.draggable('enable');
        } else {
          tempDiv.draggable('disable');
        }
      }).on('mouseup', function () {
        tempDiv.draggable('enable');
      }).on('click', '.map__component__body__input__item, .map__component__body__output__item', function () {
        const $this = $(this);
        if ($this.hasClass('none')) { return; }

        const type = $this.hasClass('map__component__body__input__item') ? 'input' : 'output';
        const $connector = $this.find(`.map__component__body__${type}__item__connector`);
        const target = $connector.attr('data-target');
        const param = $connector.attr('data-param');

        if (!type || !target || !param || (type !== 'input' && type !== 'output')) { return; }

        $connector.addClass('active');

        const cur = DashboardCache.get(`Hub[${exports._hubID}]:ActiveConnector`);

        if (cur && cur.type && cur.target && cur.param) {
          DashboardCache.remove(`Hub[${exports._hubID}]:ActiveConnector`);
          $map.find('.map__component__body__input__item__connector, .map__component__body__output__item__connector').removeClass('active');

          if (cur.type !== 'input' && cur.type !== 'output') {
            // invalid type
            return;
          }

          let receiver = {
            type: type,
            target: target,
            param: param
          }; let sender = {
            type: cur.type,
            target: cur.target,
            param: cur.param
          };
          if (sender.type === 'input') { [receiver, sender] = [sender, receiver]; }

          if (connections.get(receiver.target, receiver.param, sender.target, sender.param).id.length) {
            exports.removeConnection(receiver.target, receiver.param, sender.target, sender.param);

            exports._commands.do({
              type: 'graph.component.removeConnection',
              caller: $hub,
              reservedIDs: ['ol', 'cn', 'pt', 'ln'],
              undo: function () {
                exports.addConnection(receiver.target, receiver.param, sender.target, sender.param);
              },
              redo: function () {
                exports.removeConnection(receiver.target, receiver.param, sender.target, sender.param);
              }
            });
          } else {
            exports.addConnection(receiver.target, receiver.param, sender.target, sender.param);

            exports._commands.do({
              type: 'graph.component.addConnection',
              caller: $hub,
              reservedIDs: ['ol', 'cn', 'pt', 'ln'],
              undo: function () {
                exports.removeConnection(receiver.target, receiver.param, sender.target, sender.param);
              },
              redo: function () {
                exports.addConnection(receiver.target, receiver.param, sender.target, sender.param);
              }
            });
          }
        } else {
          svgHandler.moving($connector);
          DashboardCache.set(`Hub[${exports._hubID}]:ActiveConnector`, {
            type: type,
            target: target,
            param: param
          });
        }
      });

      $(window).on(`mousedown.${exports._hubID}`, function (e) {
        const $target = $(e.target);
        if (!$target.closest('.map__component__body__input__item').length &&
          !$target.closest('.map__component__body__output__item').length) {
          DashboardCache.remove(`Hub[${exports._hubID}]:ActiveConnector`);
          $map.find('.map__component__body__input__item__connector, .map__component__body__output__item__connector').removeClass('active');
        }
      });

      graph[compID].component._events.on('afterrename', function (newName) {
        tempDiv.find('.map__component__title').text(newName);
      }).on('backgroundchange', function (background, color) {
        tempDiv.find('.map__component__body').css({
          background: background,
          color: color
        });
      });

      // double click anywhere except body toggle minimize/maximize
      tempDiv.on('dblclick', function (e) {
        if (!$(e.target).closest('.map__component__body').length) {
          exports.toggle(compID);

          exports._commands.do({
            type: 'graph.component.toggle',
            caller: tempDiv,
            undo: () => exports.toggle(compID),
            redo: () => exports.toggle(compID)
          });
        }
      });

      // add primary tag if needed
      if (compOptions.primary) { tempDiv.addClass('primary'); }

      $map.append(tempDiv);

      // positioning
      layerHelper.bringToFront(graph[compID].hID);
      layerHelper.watch(graph[compID].hID);
      positionHelper.watch(tempDiv, 'MapComponent');

      // set initial position if needed
      if (startingPosition) {
        startingPosition = $.extend({
          top: 0,
          left: 0
        }, startingPosition);

        tempDiv.css({
          top: parseFloat(startingPosition.top) || 0,
          left: parseFloat(startingPosition.left) || 0
        });
      }

      // context menu
      const compContextMenu = ContextMenu(`.${graph[compID].hID}`, {
        id: 'main',
        align: 'vertical',
        menus: [
          {
            name: 'To Workspace...',
            id: 'toworkspace',
            type: 'click'
          },
          {},
          {
            name: 'Color',
            id: 'color',
            type: 'click'
          },
          {
            name: 'Rename',
            id: 'rename',
            type: 'click'
          },
          {
            name: 'Duplicate',
            id: 'duplicate',
            type: 'click'
          }
        ].concat(compOptions.primary
          ? []
          : [
              {},
              {
                name: 'Delete',
                id: 'remove',
                type: 'click'
              }
            ])
      }).init();

      compContextMenu.menu._events
        .on('_show', () => {
          // select only the current component when ctx menu shows up
          for (const elm of selectionHandler.getSelection()) { removeSelected(elm); }
          selectionHandler.clearSelection();
          selectionHandler.select(tempDiv[0]);
          selectionHandler.keepSelection();
          addSelected(tempDiv);
        })
        .on('toworkspace', () => {
          exports._events.call('toworkspace', graph[compID].component);
        })
        .on('rename', () => {
          DashboardGlobals.launchInputBox('Rename Component', graph[compID].component.options().name, 'Type new name here', (newValue) => {
            graph[compID].component.rename(newValue);
          });
        })
        .on('duplicate', () => {
          positionHelper.impose(tempDiv, 'MapComponent');
          graph[compID].component.duplicate();
        })
        .on('remove', () => {
          graph[compID].component.destroy();
        })
        .on('color', ({ dontCloseAllMenus }) => dontCloseAllMenus());

      compContextMenu.menu.getMenuItemsById('color').$.spectrum({
        ...DashboardGlobals.spectrumConfiguration,
        color: compOptions.background,
        show: function () {
          compContextMenu.menu.mainMenu.hide();
        },
        move: function (color) {
          graph[compID].component.background(color.toHexString());
        },
        change: function (color) {
          graph[compID].component.background(color.toHexString());
        }
      });

      if (obj.minimized === true) { exports.minimize(compID); }

      // add to overlapHelper
      overlapHelper.add(tempDiv);
    }

    if ($.type(obj.input) === 'array') {
      obj.input.forEach(function (item) {
        exports.addParam(compID, item.name, {
          limit: item.limit,
          paramType: 'input',
          required: item.required,
          type: item.type
        });
      });
    }

    if ($.type(obj.output) === 'array') {
      obj.output.forEach(function (item) {
        exports.addParam(compID, item.name, {
          paramType: 'output',
          type: item.type
        });
      });
    }

    // Add hub utilities to component
    exports.refreshHubUtilities(compID);

    // Add useful events to component
    graph[compID].component._events.on('hub.parameter.input.add', (param, options) => {
      if (exports.hasParam(compID, param, 'input')) {
        return false;
      } else {
        try {
          exports.addParam(compID, param, {
            ...options,
            paramType: 'input'
          });
          return true;
        } catch (err) {
          return false;
        }
      }
    }).on('hub.parameter.input.has', (param) => {
      return exports.hasParam(compID, param, 'input');
    }).on('hub.parameter.input.remove', (param) => {
      if (!exports.hasParam(compID, param, 'input')) {
        return false;
      } else {
        try {
          exports.removeParam(compID, param, 'input');
          return true;
        } catch (err) {
          return false;
        }
      }
    }).on('hub.parameter.output.add', (param, options) => {
      if (exports.hasParam(compID, param, 'output')) {
        return false;
      } else {
        try {
          exports.addParam(compID, param, {
            ...options,
            paramType: 'output'
          });
          return true;
        } catch (err) {
          return false;
        }
      }
    }).on('hub.parameter.output.has', (param) => {
      return exports.hasParam(compID, param, 'output');
    }).on('hub.parameter.output.remove', (param) => {
      if (!exports.hasParam(compID, param, 'output')) {
        return false;
      } else {
        try {
          exports.removeParam(compID, param, 'output');
          return true;
        } catch (err) {
          return false;
        }
      }
    }).on('hub.parameter.all', () => {
      return exports.getAllParams(compID);
    });

    exports._events.call('add', exports);

    return exports;
  };

  exports.hasParam = function (compID, param, paramType = 'input') {
    if (paramType !== 'input' && paramType !== 'output') {
      paramType = 'input';
    }

    return exports.hasComp(compID) && Object.prototype.hasOwnProperty.call(paramType === 'input' ? graph[compID].input : graph[compID].output, param);
  };

  exports.addParam = function (compID, param, options = {}) {
    options = $.extend({
      limit: 0,
      paramType: 'input',
      required: false,
      type: param
    }, options);
    options.limit = Math.max(0, parseInt(options.limit));
    if (param === '_') {
      options.type = '_';
    } else {
      options.type = options.type || param;
    }
    if (options.paramType !== 'input' && options.paramType !== 'output') {
      options.paramType = 'input';
    }

    if (!exports.hasComp(compID) || exports.hasParam(compID, param, options.paramType)) {
      return exports;
    }

    const paramType = options.paramType === 'input' ? 'Input' : 'Output';
    const $item = $map.find(`.${graph[compID].hID}`);
    const $itemContainer = $item.find(`.map__component__body__${options.paramType}:not(.minimized)`);
    const $itemMinimized = $item.find(`.map__component__body__${options.paramType}.minimized`);

    // build input item html
    let name = ensureHTML(param);
    const type = options.type;
    name = name === '_' ? 'Any' : name;
    const $paramItem = $(`<div class="map__component__body__${options.paramType}__item">
      <div class="map__component__body__${options.paramType}__item__param">${type !== param ? `<span class="paramtype">${ensureHTML(type)}.</span>` : ''}${name}${options.required ? '<strong>*</strong>' : ''}${options.limit ? ` (${options.limit})` : ''}</div>
      <div class="map__component__body__${options.paramType}__item__connector ${DashboardGlobals.uniqueID('cc')}" data-target="${compID}" data-param="${ensureDoubleQuotes(param)}"></div>
    </div>`);

    // if the param is the first to be added
    if (!Object.keys(options.paramType === 'input' ? graph[compID].input : graph[compID].output).length) {
      $itemContainer.html(`<div class="map__component__body__${options.paramType}__header">${paramType}</div>`);
      $itemMinimized.html(`<div class="map__component__body__${options.paramType}__item">
        <div class="map__component__body__${options.paramType}__item__param"><strong>${paramType}</strong></div>
        <div class="map__component__body__${options.paramType}__item__connector ${DashboardGlobals.uniqueID('cc')}" data-target="${compID}"></div>
      </div>`);
    }

    $itemContainer.append($paramItem);

    if (options.paramType === 'input') {
      graph[compID].input[param] = [];
      graph[compID].inputType[param] = options.type;
      graph[compID].required[param] = !!options.required;
      graph[compID].limit[param] = options.limit;
    } else {
      graph[compID].output[param] = [];
      graph[compID].outputType[param] = options.type;
    }

    exports.refreshHubUtilities(compID);

    return exports;
  };

  exports.removeParam = function (compID, param, paramType = 'input') {
    if (paramType !== 'input' && paramType !== 'output') {
      paramType = 'input';
    }

    if (!exports.hasParam(compID, param, paramType)) {
      return exports;
    }

    // isolate the parameter
    if (paramType === 'input') {
      exports.removeInputProviders(compID, param);

      delete graph[compID].input[param];
      delete graph[compID].inputType[param];
      delete graph[compID].required[param];
      delete graph[compID].limit[param];
    } else {
      while (graph[compID].output[param].length) {
        const top = graph[compID].output[param][0];
        exports.removeConnection(top.id, top.param, compID, param);
      }

      delete graph[compID].output[param];
      delete graph[compID].outputType[param];
    }

    const type = paramType === 'input' ? 'Input' : 'Output';
    const $item = $map.find(`.${graph[compID].hID}`);
    const $itemContainer = $item.find(`.map__component__body__${paramType}:not(.minimized)`);
    const $itemMinimized = $item.find(`.map__component__body__${paramType}.minimized`);

    // if no param exists
    if (!Object.keys(paramType === 'input' ? graph[compID].input : graph[compID].output).length) {
      $itemContainer.html(`<div class="map__component__body__${paramType}__header">${type}</div>
      <div class="map__component__body__${paramType}__item none">
        <div class="map__component__body__${paramType}__item__param"><em>None</em></div>
      </div>`);
      $itemMinimized.html(`<div class="map__component__body__${paramType}__item">
        <div class="map__component__body__${paramType}__item__param"><strong>${type}</strong></div>
      </div>`);
    } else {
      $itemContainer.find(`.map__component__body__${paramType}__item__connector[data-target="${ensureDoubleQuotes(compID)}"][data-param="${ensureDoubleQuotes(param)}"]`).parent().remove();
    }

    exports.refreshHubUtilities(compID);

    return exports;
  };

  exports.getAllParams = function (compID) {
    if (!exports.hasComp(compID)) {
      return [];
    }

    const params = [];
    for (const param in graph[compID].input) {
      params.push({
        limit: graph[compID].limit[param],
        name: param,
        paramType: 'input',
        required: graph[compID].required[param],
        type: graph[compID].inputType[param]
      });
    }
    for (const param in graph[compID].output) {
      params.push({
        name: param,
        paramType: 'output',
        type: graph[compID].outputType[param]
      });
    }
    return params;
  };

  exports.refreshHubUtilities = function (compID) {
    if (!exports.hasComp(compID) || graph[compID].component.options().silent) {
      return exports;
    }

    const $comp = graph[compID].component.compInstance(true);

    // if hub utilities are not already there, ensure them
    if (!$comp.find('.component__hub').length) {
      exports.ensureHubUtilities(compID);
    }

    // Construct input string
    let inputString = '';
    for (const prop in graph[compID].input) {
      let name = ensureHTML(prop);
      const type = graph[compID].inputType[prop];
      name = name === '_' ? 'Any' : name;
      inputString += `<tr>
        <td style="text-align: center;">${type !== prop ? `<span class="paramtype">${ensureHTML(type)}.</span>` : ''}${name}${graph[compID].required[prop] ? '<strong>*</strong>' : ''}</td>
        <td>
          <div class="component__hub__traffic__itembox" data-type="input" data-param="${ensureDoubleQuotes(prop)}"><em>None</em></div>
        </td>
      </tr>`;
    }
    if (!inputString.length) {
      inputString = `<tr>
        <td style="text-align: center;" colspan="2">No input</td>
        <td style="display: none;"></td>
      </tr>`;
    }

    // Construct output string
    let outputString = '';
    for (const prop in graph[compID].output) {
      let name = ensureHTML(prop);
      const type = graph[compID].outputType[prop];
      name = name === '_' ? 'Any' : name;
      outputString += `<tr style="background: #eee;">
        <td style="text-align: center;">${type !== prop ? `<span class="paramtype">${ensureHTML(type)}.</span>` : ''}${name}</td>
        <td>
          <div class="component__hub__traffic__itembox" data-type="output" data-param="${ensureDoubleQuotes(prop)}"><em>None</em></div>
        </td>
      </tr>`;
    }
    if (!outputString.length) {
      outputString = `<tr style="background: #eee;">
        <td style="text-align: center;" colspan="2">No output</td>
        <td style="display: none;"></td>
      </tr>`;
    }

    $comp.find(`tbody[data-hub-utilities-of="${ensureDoubleQuotes(compID)}"]`).html(inputString + outputString);

    _markStatus(compID);

    return exports;
  };

  exports.ensureHubUtilities = function (compID) {
    if (!exports.hasComp(compID) || graph[compID].component.options().silent) {
      return exports;
    }

    const $comp = graph[compID].component.compInstance(true);

    // if hub utilities are already there, do nothing
    if ($comp.find('.component__hub').length) { return exports; }

    $comp.find('.component__header').after(`<div class="component__hub">
      <div class="component__hub__status"></div>
      <div class="component__hub__toggler">
        <a href="javascript:void(0);">Show traffic</a>
      </div>
      <div class="component__hub__traffic" style="display: none;">
        <div class="component__hub__traffic__message"></div>
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Ally</th>
            </tr>
          </thead>
          <tbody data-hub-utilities-of="${ensureDoubleQuotes(compID)}"></tbody>
        </table>
      </div>
    </div>`);

    // Initialize toggle click handler
    $comp.find('.component__hub__toggler a').on('click', function () {
      if (this.innerHTML === 'Show traffic') { this.innerHTML = 'Hide traffic'; } else { this.innerHTML = 'Show traffic'; }
      $comp.find('.component__hub__traffic').toggle('blind', DashboardGlobals.duration.normalPace);
    });

    // Add click event to status toggler
    $comp.find('.component__hub__status').on('click', function () {
      if ($comp.find('.component__hub').hasClass('connected') ||
        $comp.find('.component__hub').hasClass('idle')) {
        graph[compID].autoUpdatable = !(graph[compID].autoUpdatable || 0);
        _markStatus(compID);
      }
    });

    // Initialize hub table
    $comp.find('.component__hub__traffic table').disableSelection().addClass('cell-border').DataTable({
      ordering: false,
      responsive: true,
      info: false,
      paging: false,
      searching: false,
      autoWidth: false,
      columnDefs: [{
        targets: '_all',
        createdCell: function (td) {
          $(td).css('line-height', '1.5em');
        }
      }],
      columns: [{
        width: '30%',
        targets: [0]
      }, {
        width: '70%',
        targets: [1]
      }],
      dom: '<"component__hub__traffic__table"t>'
    });

    // update name in itemboxes
    graph[compID].component._events.on('afterrename', function (newName) {
      $(`.component__hub__traffic__itembox__item__name[data-name-dependency="${ensureDoubleQuotes(this._compID)}"]`).text(newName);
    });
  };

  exports.isolate = function (compID, trigger) {
    if (!exports.hasComp(compID)) { return exports; }

    _cacheTriggers();
    exports.removeAllInputProviders(compID);
    for (const param in graph[compID].output) {
      while (graph[compID].output[param].length) {
        const top = graph[compID].output[param][0];
        exports.removeConnection(top.id, top.param, compID, param);
      }
    }
    _uncacheTriggers();

    if (trigger === true) { _markTrigger(compID); }
    return exports;
  };

  exports.isIsolated = function (compID) {
    for (let i = 0; i < connections.relas.length; ++i) {
      if (connections.relas[i].inputCompID === compID ||
        connections.relas[i].outputCompID === compID) { return false; }
    }
    return true;
  };

  exports.minimize = function (compID) {
    if (exports.hasComp(compID) && !graph[compID].minimized) {
      const tmp = (svgHandler.relas[compID] || []).slice();
      svgHandler.update(compID, true, false);

      const $compIns = $map.find(`.${graph[compID].hID}`);

      $compIns.find('.map__component__body__input').hide();
      $compIns.find('.map__component__body__output').hide();
      $compIns.find('.map__component__body__input.minimized').show();
      $compIns.find('.map__component__body__output.minimized').show();

      graph[compID].minimized = true;
      tmp.forEach(function (item) {
        svgHandler.add(item.connectionID);
      });
    }

    return exports;
  };

  exports.maximize = function (compID) {
    if (exports.hasComp(compID) && graph[compID].minimized) {
      const tmp = (svgHandler.relas[compID] || []).slice();
      svgHandler.update(compID, true, false);

      const $compIns = $map.find(`.${graph[compID].hID}`);

      $compIns.find('.map__component__body__input').show();
      $compIns.find('.map__component__body__output').show();
      $compIns.find('.map__component__body__input.minimized').hide();
      $compIns.find('.map__component__body__output.minimized').hide();

      graph[compID].minimized = false;
      tmp.forEach(function (item) {
        svgHandler.add(item.connectionID);
      });
    }

    return exports;
  };

  exports.toggle = function (compID) {
    if (graph[compID]?.minimized) { exports.maximize(compID); } else { exports.minimize(compID); }
    return exports;
  };

  exports.remove = function (compID) {
    if (exports.hasComp(compID)) {
      exports.isolate(compID);
      _compInstance(compID, true).remove();
      graph[compID].component.compInstance(true).find('.component__hub').remove();

      // clear bound events
      graph[compID].component._events
        .off('hub.parameter.input.add')
        .off('hub.parameter.input.has')
        .off('hub.parameter.input.remove')
        .off('hub.parameter.output.add')
        .off('hub.parameter.output.has')
        .off('hub.parameter.output.remove')
        .off('hub.parameter.all');

      // clear unused cache keys
      DashboardCache.keys(`^Hub\\[${exports._hubID}\\]:${compID}_`).forEach((key) => DashboardCache.remove(key));
      DashboardCache.keys(`^Hub\\[${exports._hubID}\\]:Component\\[${graph[compID].hID}\\]_`).forEach((key) => DashboardCache.remove(key));
      delete graph[compID];

      exports._events.call('remove', exports, compID);
    }

    return exports;
  };

  exports.isStrict = () => strict;

  exports.unstrict = function () {
    strict = false;
    return exports;
  };

  exports.restrict = function () {
    if (strict) { return exports; }

    let invalid = 0;
    for (let i = 0; i < connections.relas.length; ++i) {
      if (connections.relas[i].inputParam !== connections.relas[i].outputParam) { ++invalid; }
    }

    if (invalid > 0) {
      $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
        title: 'Prohibited strict mode',
        content: `Detected <strong>${invalid} connection${invalid > 1 ? 's' : ''}</strong> of lower strict level. Please check and try again.`
      }));

      return false;
    }

    strict = true;
    return exports;
  };

  exports.state = {
    backup: function () {
      const stateObj = exports.state.normalize({});

      exports.compList().forEach(function (compID) {
        const compInstance = _compInstance(compID, true);
        stateObj.components.push({
          compID: compID,
          css: {
            top: compInstance.css('top') || '',
            left: compInstance.css('left') || '',
            zIndex: compInstance.css('z-index') || '',
            width: compInstance[0].style.width || ''
          }
        });
      });

      exports.connections().forEach(function (connection) {
        stateObj.connections.push({
          inputCompID: connection.inputCompID,
          inputParam: connection.inputParam,
          outputCompID: connection.outputCompID,
          outputParam: connection.outputParam,
          zIndex: _svgInstance(connection.inputCompID, connection.inputParam, connection.outputCompID, connection.outputParam, true).css('z-index')
        });
      });

      const curTransform = _getCurrentTransform($map[0]);
      stateObj.props.transform = `matrix(${curTransform.scaleX}, ${curTransform.skewY}, ${curTransform.skewX}, ${curTransform.scaleY}, ${curTransform.translateX}, ${curTransform.translateY})`;

      stateObj.props.layering.minZIndex = layerHelper.minZIndex;
      stateObj.props.layering.maxZIndex = layerHelper.maxZIndex;

      const savedPositions = positionHelper.savedPositions();
      for (const group in savedPositions) {
        stateObj.props.positioning[group] = savedPositions[group];
      }

      return stateObj;
    },
    restore: function (stateObj) {
      const normalizedObj = exports.state.normalize(stateObj);

      normalizedObj.components.forEach(function (obj) {
        if (!exports.hasComp(obj.compID)) { return; }
        if (!graph[obj.compID].component.options().silent) {
          _compInstance(obj.compID, true).css({
            position: 'absolute',
            top: obj.css.top,
            left: obj.css.left,
            zIndex: obj.css.zIndex,
            width: obj.css.width
          });
        }
      });

      // Make hub visible to make the commands work
      const curVisible = $hub.is(':visible');
      $hub.css('display', 'block');

      _cacheTriggers();
      normalizedObj.connections.forEach(function (obj) {
        exports.addConnection(obj.inputCompID, obj.inputParam, obj.outputCompID, obj.outputParam);
        _svgInstance(obj.inputCompID, obj.inputParam, obj.outputCompID, obj.outputParam, true).css('z-index', obj.zIndex);
      });
      _uncacheTriggers();

      const savedTransform = normalizedObj.props.transform.match(/matrix.*\((.+)\)/)[1].split(', ');
      ins.zoomAbs(parseFloat(savedTransform[4]), parseFloat(savedTransform[5]), parseFloat(savedTransform[0]));

      // Now return the hub to its previous display state
      $hub.css('display', curVisible ? 'block' : 'none');

      layerHelper.minZIndex = normalizedObj.props.layering.minZIndex;
      layerHelper.maxZIndex = normalizedObj.props.layering.maxZIndex;

      for (const group in normalizedObj.props.positioning) {
        positionHelper.fixPosition(normalizedObj.props.positioning[group], group);
      }
    },
    normalize: function (stateObj) {
      /*
      {
        components: [{
          compID,
          css: { top, left, zIndex, width }
        }...],
        connections: [{
          inputCompID, inputParam, outputCompID, outputParam, zIndex
        }...],
        props: {
          transform,
          layering: {
            minZIndex, maxZIndex
          },
          positioning: {
            group: { top, left }
            ...
          }
        }
      }
      */

      let normalizedObj = {};

      normalizedObj = $.extend({
        components: [],
        connections: [],
        props: {}
      }, stateObj);

      for (let i = 0; i < normalizedObj.components.length; ++i) {
        normalizedObj.components[i] = $.extend({
          compID: '',
          css: {}
        }, normalizedObj.components[i]);
        normalizedObj.components[i].css = $.extend({
          top: 0,
          left: 0,
          zIndex: '',
          width: ''
        }, normalizedObj.components[i].css);
      }

      for (let i = 0; i < normalizedObj.connections.length; ++i) {
        normalizedObj.connections[i] = $.extend({
          inputCompID: '',
          inputParam: '',
          outputCompID: '',
          outputParam: '',
          zIndex: ''
        }, normalizedObj.connections[i]);
      }

      normalizedObj.props = $.extend({
        transform: '',
        layering: {},
        positioning: {}
      }, normalizedObj.props);

      normalizedObj.props.layering = $.extend({
        minZIndex: 0,
        maxZIndex: 0
      }, normalizedObj.props.layering);

      normalizedObj.props.positioning = $.extend({}, normalizedObj.props.positioning);
      for (const group in normalizedObj.props.positioning) {
        normalizedObj.props.positioning[group] = $.extend({
          top: 0,
          left: 0,
          zIndex: ''
        }, normalizedObj.props.positioning[group]);
      }

      return normalizedObj;
    }
  };

  exports.getMapTransform = function () {
    return _getCurrentTransform($map[0]);
  };

  // ========== UTILITIES

  function _detectChain (compID, targetCompID) {
    if (graph[compID].level > graph[targetCompID].level) { return false; }

    const res = (function dfs (compID, targetCompID) {
      if (graph[compID].level === graph[targetCompID].level) { return compID === targetCompID; }

      let chain = false;
      for (const [, providers] of Object.entries(graph[compID].output)) { providers.forEach(provider => { chain |= dfs(provider.id, targetCompID); }); }
      return chain;
    })(compID, targetCompID);

    if (res) {
      _raise(compID, FLAG.ERROR, 'Connection is denied.');
      _raise(targetCompID, FLAG.ERROR, 'Connection is denied.');
      $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
        title: 'Loop detected',
        content: 'Cannot establish the required connection.',
        onClose: function () {
          _markStatus(compID);
          _markStatus(targetCompID);
        }
      }));
    }

    return res;
  }

  function _detectMissingInput (compID) {
    let missingInput = 0;
    for (const param in graph[compID].required) {
      if (!graph[compID].input[param].length) {
        graph[compID].component.compInstance(true).find(`.component__hub__traffic__itembox[data-type="input"][data-param="${ensureDoubleQuotes(param)}"]`).html('<em class="required">Required</em>');
        ++missingInput;
      }
    }
    if (missingInput) {
      _raise(compID, FLAG.ERROR, `Missing ${missingInput} parameter${missingInput > 1 ? 's' : ''}. Result of the last successful run (if any) is preserved.`);
      return true;
    }
    return false;
  }

  function _raise (compID, flag, message) {
    graph[compID].flag = flag;
    graph[compID].message = message;

    if (graph[compID].component.options().silent) { return; }

    const $comp = graph[compID].component.compInstance(true).find('.component__hub');

    for (const [, _class] of Object.entries(FLAG)) {
      if (_class !== flag) { $comp.removeClass(_class); } else { $comp.addClass(_class); }
    }

    $comp.find('.component__hub__traffic__message').html(message);
  }

  let _cachedMarkTrigger = 0; let _markTriggerCaches = [];
  function _markTrigger (compID) {
    if (_cachedMarkTrigger) {
      _markTriggerCaches.push(compID);
      return;
    }

    if (graph[compID].autoUpdatable) { graph[compID].component.trigger(); } else {
      _raise(compID, FLAG.IDLE, 'Congestion detected. <a class="component__hub__traffic__message__resolve" href="javascript:void(0);">Resolve</a>.');
      if (!graph[compID].component.options().silent) {
        graph[compID].component.compInstance(true).find('.component__hub__traffic__message__resolve').on('click', function () {
          // solve congestion by making component auto update, then trigger it
          graph[compID].autoUpdatable = true;
          _markStatus(compID);
          _markTrigger(compID);
        });
      }
    }
  }

  function _cacheTriggers () {
    ++_cachedMarkTrigger;
  }

  function _uncacheTriggers () {
    if (!(--_cachedMarkTrigger)) {
      for (const compID of new Set(_markTriggerCaches)) { _markTrigger(compID); }
      _markTriggerCaches = [];
    }
  }

  function _markProcessing (compID) {
    _raise(compID, FLAG.PROCESSING, 'Component is being updated.');
  }

  function _markStatus (compID) {
    if (!_detectMissingInput(compID)) {
      if (graph[compID].autoUpdatable) { _raise(compID, FLAG.CONNECTED, 'Connected.'); } else { _raise(compID, FLAG.IDLE, 'Paused.'); }
    }
  }

  function _getCurrentTransform (el) {
    const style = window.getComputedStyle(el);
    const matrix = style.transform || style.webkitTransform || style.mozTransform;

    if (!matrix || matrix === 'none' || matrix.includes('3d')) {
      return {
        scaleX: 1,
        skewY: 0,
        skewX: 0,
        scaleY: 1,
        translateX: 0,
        translateY: 0
      };
    }

    const matrixValues = matrix.match(/matrix.*\((.+)\)/)[1].split(', ');
    return {
      scaleX: parseFloat(matrixValues[0]),
      skewY: parseFloat(matrixValues[1]),
      skewX: parseFloat(matrixValues[2]),
      scaleY: parseFloat(matrixValues[3]),
      translateX: parseFloat(matrixValues[4]),
      translateY: parseFloat(matrixValues[5])
    };
  }

  function _getOffset (el) {
    let _x = 0; let _y = 0;
    while (el && !isNaN(el.offsetLeft) && !isNaN(el.clientLeft) && !isNaN(el.offsetTop) && !isNaN(el.clientTop)) {
      _x += el.offsetLeft + el.clientLeft;
      _y += el.offsetTop + el.clientTop;
      el = el.offsetParent;
    }
    return {
      top: _y,
      left: _x
    };
  }

  function _compInstance (compID, toSelector) {
    const $comp = exports.hasComp(compID) ? $map.find(`.${graph[compID].hID}`) : $('<div>');
    return toSelector ? $comp : $comp[0];
  }

  function _svgInstance (inputCompID, inputParam, outputCompID, outputParam, toSelector) {
    const $svg = $map.find(`[data-connection="${connections.get(inputCompID, inputParam, outputCompID, outputParam).id}"]`);
    return toSelector ? $svg : $svg[0];
  }

  function _getLineFromSvg (svg) {
    const $svg = $(svg);

    if ($svg.length) {
      const isDiagonal = $svg.attr('data-line-type') === 'diagonal';

      return {
        fromX: parseFloat($svg.css('left'), 10),
        fromY: -parseFloat($svg.css('top'), 10) - $svg.height() * !isDiagonal,
        toX: parseFloat($svg.css('left'), 10) + $svg.width(),
        toY: -parseFloat($svg.css('top'), 10) - $svg.height() * isDiagonal
      };
    }

    return undefined;
  }

  function _setCoordinates (pageX, pageY) {
    // Avoid undefined, use null
    pageX = pageX === undefined ? null : pageX;
    pageY = pageY === undefined ? null : pageY;

    const _coordinates = { x: pageX, y: pageY, s: null };
    _pageX = pageX; _pageY = pageY;

    // Get current scale from the map
    const $current = _getCurrentTransform($map[0]);
    _coordinates.s = $current.scaleX || null;
    if (_coordinates.s === null) { _coordinates.x = _coordinates.y = null; }

    // Since we accept pageX for x, we have to calculate the real x relative to the map
    const offset = $hub.offset();
    if (_coordinates.x !== null) { _coordinates.x = (_coordinates.x - offset.left - ($current.translateX || 0)) / _coordinates.s; }
    // Same for y
    if (_coordinates.y !== null) { _coordinates.y = (_coordinates.y - offset.top - ($current.translateY || 0)) / _coordinates.s; }

    // Render coordinates
    for (const item in _coordinates) {
      $hub.find(`.map__coordinates__item span.${item}`).text(
        _coordinates[item] === null ? 'N/A' : _coordinates[item].toFixed(2)
      );
    }
  }

  return exports;
}
