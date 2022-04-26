import { DashboardEvents, DashboardCache, DashboardGlobals, DashboardPositioning, ensureHTML, DashboardHistory } from '../globals';
import Component from './component';
import Hub, { THub, HubComponentConfig } from './hub'; // eslint-disable-line
import EventCollection from '../events/_collection';

const EPSILON = 1e-3;

/**
 * @typedef {Object} Containers
 * @property {unknown} componentContainer Selector of the component container
 * @property {unknown} minComponentContainer Selector of the minimized component container
 * @property {unknown} hub Selector of the hub
 * @property {unknown} tabWorkspace Selector of the workspace tab item
 * @property {unknown} tabGraph Selector of the graph tab item
 */

/**
 * @typedef {Object} SessionOptions
 * @property {boolean} [strict=true] Whether to start the session in strict mode
 * @property {boolean} [readOnly=false] Whether to start the session in read only mode
 * @property {string} [name='Session'] Name of the session
 */

/**
 * @typedef {Object} ComponentOptions
 * @property {?string} id Component entity
 * @property {?string} name Component name
 * @property {?string} body Component HTML content
 * @property {?number} height Component default/minimum height
 * @property {?number} width Component default/minimum width
 * @property {?string[]} input Component input parameters
 * @property {?string[]} output Component output parameters
 * @property {?string} category Component category
 * @property {boolean} [minimized=false] Whether to start the component minimized
 * @property {boolean} [more=true] true to start the component expanded, false collapsed
 * @property {?string} version Component semantic version
 */

/**
 * @typedef {Object} SessionComponentPosition
 * @property {?{ top?: number, left?: number }} component Position of the component element
 * @property {?{ top?: number, left?: number }} hub Position of the component hub element
 */

/**
 * @typedef {Object} SessionState
 * @property {() => Promise<Object.<string, *>>} backup Return a snapshot object of the session
 * @property {(obj: Object.<string, *>) => Promise<boolean>} restore Restore the session from backup data
 * @property {(stateObj) => Object.<string, *>} normalize Normalize the backup data
 * @property {(obj: Object.<string, *>) => Promise<Object.<string, *>>} sanitizeComponents Sanitize all components in the backup data
 */

/**
 * @typedef {Object} TSessionHandler
 * @property {string} _sessionID Session id
 * @property {DashboardEvents} _events Event manager
 * @property {DashboardHistory} _commands Command manager
 * @property {unknown} componentContainer The session's component container
 * @property {unknown} minComponentContainer The session's minimized component container
 * @property {THub} hub The session's hub element
 * @property {() => SessionOptions} options Get the session options
 * @property {(newName: string) => TSessionHandler} rename Rename the session
 * @property {() => Promise<void>} destroy Destroy the session
 * @property {(entity: string) => TSessionHandler} allow Allow a component to be added into the session
 * @property {(entity: string) => Promise<TSessionHandler>} disallow Disallow a component.
 * This will remove all current instances of the component in the session.
 * @property {(entity: string, compDict: Object.<string, unknown>|null, compExtend?: { comp?: ComponentOptions, hub?: Partial<HubComponentConfig> }, startingPositions?: SessionComponentPosition) => Promise<TSessionHandler>} add
 * Add a component to the session
 * @property {SessionState} state Session state manager
 */

/**
 * Create a session handler
 * @param {Containers} containers Containers to operate the session handler on
 * @param {SessionOptions} obj The configuration object
 * @returns {TSessionHandler} The session handler instance
 */
export default function SessionHandler (containers, obj) {
  const c$ = {};

  for (const [param, val] of Object.entries($.extend({
    componentContainer: $(),
    minComponentContainer: $(),
    hub: $(),
    tabWorkspace: $(),
    tabGraph: $()
  }, containers))) {
    c$[param] = $(val);

    if (!c$[param].length) { throw new Error(`Session: containers.\`${param}\` is an invalid/non-existing element`); }
  }

  /**
   * @type {TSessionHandler}
   */
  const exports = {
    _sessionID: DashboardGlobals.uniqueID('ss'),
    _events: DashboardEvents(),
    _commands: DashboardHistory()
  };

  obj = $.extend({
    strict: true,
    readOnly: false
  }, obj);

  let strictMode = !!obj.strict; const readOnly = !!obj.readOnly;
  let name = 'Session';

  // Get name from the configuration object
  if (obj && Object.prototype.hasOwnProperty.call(obj, 'name') && $.type(obj.name) === 'string') { name = obj.name; }

  name = DashboardGlobals.fixDuplicateNames.run(name, 'Session');
  DashboardCache.set(`Session:${name}`, true);

  // Assign session attributes on containers
  c$.componentContainer.attr('data-session', exports._sessionID);
  c$.minComponentContainer.attr('data-session', exports._sessionID);
  c$.hub.attr('data-session', exports._sessionID);

  // Save list of allowed entities to be added into session
  // Will fire 'require' event if an unknown entity is being added
  const allows = {};

  // Positioning helper for freestyle mode
  const positionHelper = DashboardPositioning();

  // Layer helper for freestyle mode
  const layerHelper = {
    maxZIndex: 0,
    bringToFront: function (elm) {
      $(elm).css('z-index', ++layerHelper.maxZIndex);
    }
  };

  const componentManager = (function () {
    const EXPORTS = {};
    let dict = {}; let ref = {}; let cache = {};

    EXPORTS.add = function (entity, compRef, compDict, compCache) {
      const hasDict = function (compDict) {
        for (const comp in dict) {
          if (compDict === dict[comp]) { return true; }
        }
        return false;
      };

      if (compRef && !Object.prototype.hasOwnProperty.call(dict, compRef._compID)) {
        const compID = compRef._compID;

        if (compDict && !hasDict(compDict)) { dict[compID] = compDict; } else {
          for (let i = 1; ; ++i) {
            const defCompDict = `comp${i}`;
            if (!hasDict(defCompDict)) {
              dict[compID] = defCompDict;
              break;
            }
          }
        }

        ref[compID] = compRef;
        cache[compID] = { ...compCache, entity: entity };

        exports._events.call('componentManager.add', exports, dict[compID], ref[compID], cache[compID]);
      }
      return EXPORTS;
    };

    EXPORTS.id = {
      has: function (compID) {
        return Object.prototype.hasOwnProperty.call(dict, compID);
      },
      query: function (compID) {
        return Object.prototype.hasOwnProperty.call(dict, compID) ? dict[compID] : undefined;
      },
      ref: function (compID) {
        return Object.prototype.hasOwnProperty.call(ref, compID) ? ref[compID] : undefined;
      },
      cache: function (compID) {
        return Object.prototype.hasOwnProperty.call(cache, compID) ? cache[compID] : undefined;
      },
      remove: async function (compID, cleanUpOnly = false) {
        if (compID in ref) {
          if (!cleanUpOnly) {
            exports.hub.remove(compID);
            await ref[compID].destroy(true);
          }

          const _dict = dict[compID];
          const _cache = cache[compID];
          delete dict[compID];
          delete ref[compID];
          delete cache[compID];

          if (_dict && _cache) { exports._events.call('componentManager.remove', exports, _dict, compID, _cache); }
        }

        return EXPORTS;
      },
      getAll: function () {
        const res = [];
        for (const compID in dict) { res.push(compID); }
        return res;
      }
    };

    EXPORTS.alt = {
      has: function (compAlt) {
        for (const compID in dict) {
          if (dict[compID] === compAlt) { return true; }
        }
        return false;
      },
      query: function (compAlt) {
        for (const compID in dict) {
          if (dict[compID] === compAlt) { return compID; }
        }
        return undefined;
      },
      ref: function (compAlt) {
        return EXPORTS.id.ref(EXPORTS.alt.query(compAlt));
      },
      cache: function (compAlt) {
        return EXPORTS.id.cache(EXPORTS.alt.query(compAlt));
      },
      remove: async function (compAlt) {
        return await EXPORTS.id.remove(EXPORTS.alt.query(compAlt));
      },
      getAll: function () {
        const res = [];
        for (const compID in dict) { res.push(dict[compID]); }
        return res;
      }
    };

    EXPORTS.clear = async function () {
      for (const compID of EXPORTS.id.getAll()) { await EXPORTS.id.remove(compID); }
      dict = {}; ref = {}; cache = {};
      return EXPORTS;
    };

    return EXPORTS;
  })();

  /* === SESSION INITIALIZATION === */

  exports.componentContainer = c$.componentContainer.eq(0);
  exports.minComponentContainer = c$.minComponentContainer.eq(0);
  exports.hub = Hub(c$.hub.eq(0), strictMode);

  /* === SESSION CONSTANTS === */

  const minimizeHelper = (function () {
    const EXPORTS = {}; const minimized = {};

    EXPORTS.minimize = function (comp) {
      const category = componentManager.id.cache(comp._compID).category;

      let curCategoryGroup = exports.minComponentContainer.find(`.category[data-category="${category.replace('"', '\\"')}"]`);

      if (!curCategoryGroup.length) {
        // find the appropriate position to insert the category
        let $prev = $();
        exports.minComponentContainer.find('.category').each(function (idx, elm) {
          const $elm = $(elm);
          if ($elm.attr('data-category').localeCompare(category) < 0) { $prev = $elm; }
        });

        curCategoryGroup = $(`<div class="category active" data-category="${category.replace('"', '\\"')}">
          <div class="category__title">
            <div class="category__title__icon"></div>
            <div class="category__title__name">${ensureHTML(category)} (<span class="counter">0</span>)</div>
          </div>
          <div class="g-row category__body"></div>
        </div>`);
        curCategoryGroup.find('.category__title').on('click', function () {
          if (curCategoryGroup.hasClass('active')) {
            curCategoryGroup.find('.category__body').slideUp();
            curCategoryGroup.removeClass('active');
          } else {
            curCategoryGroup.find('.category__body').slideDown();
            curCategoryGroup.addClass('active');
          }
        });

        if ($prev.length) { curCategoryGroup.insertAfter($prev); } else { curCategoryGroup.appendTo(exports.minComponentContainer); }
      }

      const getIndexOfInstance = function ($mincomp) {
        return exports.componentContainer.find('.component').index(exports.componentContainer.find(`.component.${$mincomp.attr('data-belong-to-component')}`));
      };
      const curCompInstance = getIndexOfInstance(comp.minCompInstance(true));
      let $prev = $();

      // find the appropriate position to insert the mincomp instance
      curCategoryGroup.find('.component-minimized').each(function (idx, elm) {
        const $elm = $(elm);
        if (getIndexOfInstance($elm) < curCompInstance) { $prev = $elm; }
      });

      if ($prev.length) { comp.minCompInstance(true).parent().insertAfter($prev.parent()); } else { comp.minCompInstance(true).parent().prependTo(curCategoryGroup.find('.category__body')); }

      // update the counter
      if (!minimized[comp._compID]) { curCategoryGroup.find('.counter').html(parseInt(curCategoryGroup.find('.counter').html()) + 1); }
      minimized[comp._compID] = true;

      return EXPORTS;
    };

    EXPORTS.maximize = function (comp) {
      const category = componentManager.id.cache(comp._compID).category;
      const curCategoryGroup = exports.minComponentContainer.find(`.category[data-category="${category.replace('"', '\\"')}"]`);

      comp.minCompInstance(true).parent().insertAfter(curCategoryGroup);

      const newCount = parseInt(curCategoryGroup.find('.counter').html()) - 1;
      if (minimized[comp._compID]) {
        if (newCount <= 0) { curCategoryGroup.remove(); } else { curCategoryGroup.find('.counter').html(newCount); }
      }
      minimized[comp._compID] = false;
    };

    return EXPORTS;
  }());

  const componentWrapper = 'componentWrapper';
  const minComponentWrapper = 'minComponentWrapper';
  const componentWrapperClass = componentWrapper;
  const minComponentWrapperClass = `g-col-6 g-col-sm-4 g-col-md-3 ${minComponentWrapper}`;
  const componentDefaultEvents = DashboardEvents().on('beforeminimize', function () {
    this.minCompInstance(true).parent().show();
    minimizeHelper.minimize(this);
    componentManager.id.cache(this._compID).isMinimized = true;
  }).on('beforemaximize', function () {
    this.compInstance(true).parent().show();
    componentManager.id.cache(this._compID).isMinimized = false;
  }).on('afterminimize', function () {
    this.compInstance(true).parent().hide();
    exports._commands.do({
      type: 'workspace.component.minimize',
      caller: this.compInstance(true),
      undo: () => exports._commands.runWhenPaused(() => this.maximize()),
      redo: () => exports._commands.runWhenPaused(() => this.minimize())
    });
  }).on('aftermaximize', function () {
    this.minCompInstance(true).parent().hide();
    minimizeHelper.maximize(this);
    exports._commands.do({
      type: 'workspace.component.maximize',
      caller: this.compInstance(true),
      undo: () => exports._commands.runWhenPaused(() => this.minimize()),
      redo: () => exports._commands.runWhenPaused(() => this.maximize())
    });
  }).on('afterrename', function (newName, oldName) {
    const hub = exports.hub.instance(true);
    if (hub.is(':visible')) {
      exports.hub._commands.do({
        type: 'graph.component.rename',
        caller: hub,
        undo: () => exports.hub._commands.runWhenPaused(() => this.rename(oldName)),
        redo: () => exports.hub._commands.runWhenPaused(() => this.rename(newName))
      });
    } else {
      exports._commands.do({
        type: 'workspace.component.rename',
        caller: this.compInstance(true),
        undo: () => exports._commands.runWhenPaused(() => this.rename(oldName)),
        redo: () => exports._commands.runWhenPaused(() => this.rename(newName))
      });
    }
  }).on('backgroundchange', function (background, color, oldBackground) {
    const hub = exports.hub.instance(true);
    if (hub.is(':visible')) {
      exports.hub._commands.do({
        type: 'graph.component.backgroundchange',
        caller: hub,
        undo: () => exports.hub._commands.runWhenPaused(() => this.background(oldBackground)),
        redo: () => exports.hub._commands.runWhenPaused(() => this.background(background))
      });
    } else {
      exports._commands.do({
        type: 'workspace.component.backgroundchange',
        caller: this.compInstance(true),
        undo: () => exports._commands.runWhenPaused(() => this.background(oldBackground)),
        redo: () => exports._commands.runWhenPaused(() => this.background(background))
      });
    }
  }).on('afterinit', function () {
    if (this.options().silent) { return; }

    const $comp = this.compInstance(true);
    const $mincomp = this.minCompInstance(true);

    // call resizable
    const that = this;
    const resizeTo = (height, width) => {
      _setCompHeight(that._compID, height);

      const comp = componentManager.id.ref(that._compID);
      const $comp = comp.compInstance(true);
      const $compBody = $comp.find('.component__body');
      const space = $compBody.outerWidth() - $compBody.width();
      $compBody.css('width', `${Math.max(width - space, comp.options().width)}px`);
      $comp.add($comp.parents(`.${componentWrapper}`)).width($compBody.outerWidth(true));
    };
    $comp.resizable({
      handles: 'se',
      start: function (evt, ui) {
        $comp.attr('data-original-height', ui.size.height).attr('data-original-width', ui.size.width);
      },
      resize: function (evt, ui) {
        resizeTo(ui.size.height, ui.size.width);
      },
      stop: function (evt, ui) {
        const newHeight = ui.size.height;
        const newWidth = ui.size.width;
        const oldHeight = +$comp.attr('data-original-height');
        const oldWidth = +$comp.attr('data-original-width');

        // only push history if epsilon is exceeded
        if (Math.abs(newHeight - oldHeight) > EPSILON || Math.abs(newWidth - oldWidth) > EPSILON) {
          exports._commands.do({
            type: 'workspace.component.resize',
            caller: $comp,
            undo: function () {
              resizeTo(oldHeight, oldWidth);
            },
            redo: function () {
              resizeTo(newHeight, newWidth);
            }
          });
        }
      }
    }).bindIframeFixEvents('resize');

    // add event listener to window
    $(window).on(`resize.${exports._sessionID}${this._compID}`, function () {
      const $parent = $comp.parent();
      if ($comp[0].scrollWidth > $comp.width()) { $comp.css('width', ''); }
      if ($parent[0].scrollWidth > $parent.width()) { $parent.css('width', ''); }
    });

    // wrap inside a column
    if (!$comp.parent().hasClass(componentWrapperClass) || $comp.siblings().length) { $comp.wrap(`<div class="${componentWrapperClass}" style="display: none;"></div>`); }
    if (!$mincomp.parent().hasClass(minComponentWrapperClass) || $mincomp.siblings().length) { $mincomp.wrap(`<div class="${minComponentWrapperClass}" style="display: none;"></div>`); }

    // set parent width to the component width
    $comp.parents(`.${componentWrapper}`).css('width', $comp.css('width'));

    // minimize/maximize accordingly
    exports._commands.runWhenPaused(() => {
      return componentManager.id.cache(this._compID).isMinimized ? this.minimize() : this.maximize();
    });

    // refresh draggable
    safeDraggable('enable', true);

    exports.hub.refreshHubUtilities(this._compID);
  }).on('afterduplicate', function (comp) {
    comp._events.merge(componentDefaultEvents);

    const currentCache = componentManager.id.cache(this._compID);
    componentManager.add(currentCache.entity, comp, null, currentCache);
    comp.init();

    const $comp = this.compInstance(true);
    const $mincomp = this.minCompInstance(true);
    if ($comp.parent().draggable('instance')) { comp.compInstance(true).parent().draggable($comp.parent().draggable('option')).bindIframeFixEvents('drag'); }

    $comp.parent().after(comp.compInstance(true).parent());
    $mincomp.parent().after(comp.minCompInstance(true).parent());

    const $parent = comp.compInstance(true).parent();

    // watch the newly added element
    positionHelper.watch($parent, 'Component');

    // add layering to newly added element
    $parent.off('mousedown.layerhelper').on('mousedown.layerhelper', () => layerHelper.bringToFront($parent));

    // pass cached variables
    const nextCache = componentManager.id.cache(comp._compID);
    nextCache.category = currentCache.category;
    nextCache.isMore = true;
    nextCache.version = currentCache.version;
  }).on('afterdestroy', function (parentIns) {
    if (!this.options().silent) {
      parentIns.parentCompInstance.remove();
      parentIns.parentMinCompInstance.remove();

      $(window).off(`resize.${exports._sessionID}${this._compID}`);
      minimizeHelper.maximize(this);
    }

    componentManager.id.remove(this._compID, true);
  });
  const draggableConfiguration = {
    handle: '.component__header',
    opacity: DashboardGlobals.opacity,
    cursor: 'grabbing',
    start: (event, ui) => {
      $(event.target).attr('data-original-top', ui.position.top).attr('data-original-left', ui.position.left);
    },
    stop: (event, ui) => {
      const $target = $(event.target);
      const newTop = Math.max(0, ui.position.top);
      const newLeft = Math.max(0, ui.position.left);
      const oldTop = +$target.attr('data-original-top');
      const oldLeft = +$target.attr('data-original-left');
      $target.css({ top: newTop, left: newLeft });

      // only push history if epsilon is exceeded
      if (Math.abs(newTop - oldTop) > EPSILON || Math.abs(newLeft - oldLeft) > EPSILON) {
        exports._commands.do({
          type: 'workspace.component.drag',
          caller: $target,
          undo: function () {
            $target.css({ top: oldTop, left: oldLeft });
          },
          redo: function () {
            $target.css({ top: newTop, left: newLeft });
          }
        });
      }
    }
  };
  const safeDraggable = function (method, safe) {
    exports.componentContainer.find(`.${componentWrapper}`).each(function (i, obj) {
      const $obj = $(obj);
      $obj.draggable('instance') ? $obj.draggable(method) : (safe && $obj.draggable(draggableConfiguration).bindIframeFixEvents('drag').draggable(method));
    });
  };

  /* === SESSION PREPARATION === */

  // To Workspace switch for map's context menu
  exports.hub._events.on('toworkspace', function () {
    c$.tabWorkspace.trigger('click');
    exports.componentContainer.find('.focus').removeClass('focus');
    const $ins = this.isMaximized() ? this.compInstance(true) : this.minCompInstance(true);
    $ins.parent().addClass('focus').scrollintoview();
    setTimeout(() => $ins.parent().removeClass('focus'), 5000);
  });

  // Initialize listeners for outside event
  exports._events
    .on('redo', () => {
      if (exports.hub.instance(true).is(':visible')) { exports.hub._commands.redo(); } else { exports._commands.redo(); }
    })
    .on('undo', () => {
      if (exports.hub.instance(true).is(':visible')) { exports.hub._commands.undo(); } else { exports._commands.undo(); }
    })
    .on('save', () =>
      DashboardGlobals.compressObj(exports.state.backup())
    )
    .on('strict', () => {
      if (exports.hub.isStrict()) {
        exports.hub.unstrict();
        strictMode = false;
      } else { strictMode = !!exports.hub.restrict(); }
    })
    .on('switch', () => {
      exports._events.call('switch', exports);
    });

  _freestyle();

  /* === SESSION FUNCTIONALITIES === */

  exports.options = function () {
    return {
      strict: strictMode,
      readOnly: readOnly,
      name: name
    };
  };

  exports.rename = function (newName) {
    newName = `${newName ?? ''}`.trim();
    if (newName.length && newName !== name) {
      const oldName = name;

      DashboardCache.remove(`Session:${name}`);
      name = DashboardGlobals.fixDuplicateNames.run(newName, 'Session');
      DashboardCache.set(`Session:${name}`, true);

      exports._events.call('rename', exports, name, oldName);
    }
    return exports;
  };

  exports.destroy = async function () {
    if (readOnly) { return; }

    await componentManager.clear();
    exports.hub.destroy();
    exports.componentContainer.remove();
    exports.minComponentContainer.remove();
    exports._commands.clear();
    DashboardCache.remove(`Session:${name}`);

    DashboardGlobals.destroyObj(exports);
  };

  exports.allow = function (entity) {
    if (readOnly) { return exports; }

    if (!Object.prototype.hasOwnProperty.call(allows, entity)) {
      exports._events.call('require', exports, entity);
      allows[entity] = true;
    }
    return exports;
  };

  exports.disallow = async function (entity) {
    if (readOnly) { return exports; }

    for (const compID of componentManager.id.getAll()) {
      if (componentManager.id.cache(compID).entity === entity) {
        await componentManager.id.remove(compID);
      }
    }

    delete allows[entity];
    return exports;
  };

  exports.add = async function (entity, compDict, compExtend, startingPositions) {
    if (readOnly) { return exports; }

    let comp = {}; let hub = {};
    if (compExtend && $.type(compExtend) === 'object') {
      comp = $.extend(comp, compExtend.comp);
      hub = $.extend(hub, compExtend.hub);
    }

    startingPositions = $.extend(true, {
      component: null,
      hub: null
    }, startingPositions);

    // allow the entity first
    exports.allow(entity);

    let obj = await EventCollection.events.GetComponent.invoke(entity);
    if (comp && $.type(comp) === 'object') { obj = $.extend(obj, comp); }

    const componentEntity = obj.id;
    const componentName = obj.name;
    const componentBody = obj.body;
    const componentHeight = obj.defaultHeight;
    const componentWidth = obj.defaultWidth;
    const componentInput = obj.input;
    const componentOutput = obj.output;
    const componentCategory = obj.category;
    const componentMinimized = obj.minimized === true;
    const componentMore = !(obj.more === false);
    const componentVersion = obj.version;

    const tmpCompDiv = $('<div>');
    const tmpMinCompDiv = $('<div>');
    exports.componentContainer.append(tmpCompDiv);
    exports.minComponentContainer.append(tmpMinCompDiv);

    const component = Component({
      compElm: tmpCompDiv,
      minCompElm: tmpMinCompDiv,
      namespace: componentEntity + '@' + componentVersion,
      name: componentName,
      body: componentBody,
      height: componentHeight,
      width: componentWidth,
      primary: false
    });
    component._events.merge(componentDefaultEvents);

    componentManager.add(entity, component, compDict, {
      category: componentCategory,
      isMinimized: componentMinimized,
      isMore: true,
      version: componentVersion
    });

    component.init();

    if (!componentMore) { _setCompHeight(component._compID, -1); }

    const $parent = component.compInstance(true).parent().css('position', 'absolute');

    // set initial position of added element
    if (startingPositions.component) {
      startingPositions.component = $.extend({
        top: 0,
        left: 0
      }, startingPositions.component);

      positionHelper.watch($parent, 'Component', {
        top: parseFloat(startingPositions.component.top) || 0,
        left: parseFloat(startingPositions.component.left) || 0
      });
    } else { positionHelper.watch($parent, 'Component'); }

    // add layering to newly added element
    $parent.off('mousedown.layerhelper')
      .on('mousedown.layerhelper', () => layerHelper.bringToFront($parent));

    exports.hub.add($.extend(true, {
      component: component,
      input: componentInput,
      output: componentOutput,
      listener: (input) => component.api.call('newinput', input)
    }, hub), startingPositions.hub);

    exports._events.call('add', exports, component, entity);

    return exports;
  };

  exports.state = {
    backup: async function () {
      const obj = exports.state.normalize({});

      // Save global state
      obj.globals.strictMode = strictMode;
      obj.globals.name = name;
      obj.globals.scroll.cTop = exports.componentContainer.scrollTop();
      obj.globals.scroll.cLeft = exports.componentContainer.scrollLeft();
      obj.globals.scroll.mcTop = exports.minComponentContainer.scrollTop();
      obj.globals.scroll.mcLeft = exports.minComponentContainer.scrollLeft();
      obj.globals.maxZIndex = layerHelper.maxZIndex;

      // Save list of components
      const componentList = componentManager.id.getAll();
      const hubBackup = exports.hub.state.backup();
      const componentIndex = {};

      // Prepare component indexes for grid mode (deprecated, yet still usable)
      exports.componentContainer.find('[class^="cp"]').each(function (i, val) {
        const compID = val.className.match(/\bcp\w+/g)[0];
        componentIndex[compID] = i;
      });

      // Sort component list and hub backup by component index
      componentList.sort((x, y) => (componentIndex[x] < componentIndex[y] ? -1 : 1));
      hubBackup.components.sort((x, y) => (componentIndex[x.compID] < componentIndex[y.compID] ? -1 : 1));

      for (let idx = 0; idx < componentList.length; ++idx) {
        const compID = componentList[idx];

        // Get values from manager
        const compAlt = componentManager.id.query(compID);
        const compRef = componentManager.id.ref(compID);
        const compCache = componentManager.id.cache(compID);

        // Get current component configurations
        const compInstance = compRef.compInstance(true).parent();
        const compOptions = compRef.options();

        // Get state variables
        const compPosition = {
          top: compInstance.css('top'),
          left: compInstance.css('left'),
          zIndex: compInstance.css('z-index'),
          height: compInstance.find('.component__body').css('height'),
          width: compInstance[0].style.width || ''
        };

        // Get cached variables
        const compEntity = compCache.entity;
        const compIsMinimized = compCache.isMinimized;
        const compIsMore = compCache.isMore;
        const compVersion = compCache.version;

        // Get hub variables
        const compHubPosition = hubBackup.components[idx].css;
        const compHubOptions = exports.hub.compOptions(hubBackup.components[idx].compID);

        // Get saved state of components
        const compState = await compRef.state.backup();

        obj.components.push({
          alt: compAlt,
          entity: compEntity,
          isMinimized: compIsMinimized,
          isMore: compIsMore,
          version: compVersion,
          css: compPosition,
          state: compState,
          extend: {
            name: compOptions.name,
            primary: compOptions.primary,
            silent: compOptions.silent,
            background: compOptions.silent ? '' : compOptions.background
          },
          hub: {
            extend: {
              autoUpdatable: compHubOptions.autoUpdatable,
              minimized: compHubOptions.minimized
            },
            css: {
              top: compHubPosition.top,
              left: compHubPosition.left,
              zIndex: compHubPosition.zIndex,
              width: compHubPosition.width
            }
          }
        });
      }

      // Save hub information
      hubBackup.connections.forEach(function (conn) {
        obj.hub.connections.push({
          inputCompAlt: componentManager.id.query(conn.inputCompID),
          inputParam: conn.inputParam,
          outputCompAlt: componentManager.id.query(conn.outputCompID),
          outputParam: conn.outputParam,
          zIndex: conn.zIndex
        });
      });
      obj.hub.props = hubBackup.props;

      // Save positioning state
      const savedPositions = positionHelper.savedPositions();
      for (const group in savedPositions) {
        obj.positioning[group] = savedPositions[group];
      }

      return obj;
    },
    restore: async function (obj) {
      if (!(obj = await exports.state.sanitizeComponents(obj))) { return false; }

      // To prevent duplicate alt while loading
      const securableAlt = {
        dict: {},
        secure: function (alt) {
          let newAlt = alt;
          for (let i = 1; componentManager.alt.has(newAlt); newAlt = `comp${i++}`);
          securableAlt.dict[alt] = newAlt;

          return securableAlt;
        }
      };

      // Pause all positioning listeners before restoring
      DashboardGlobals.pausePositioning = true;

      // Set global state
      _freestyle();
      strictMode = obj.globals.strictMode;
      if (strictMode) { exports.hub.restrict(); } else { exports.hub.unstrict(); }
      exports.rename(obj.globals.name);
      layerHelper.maxZIndex = obj.globals.maxZIndex;

      // Import list of components
      const hubState = exports.hub.state.normalize({});

      for (const comp of obj.components) {
        comp.alt = securableAlt.secure(comp.alt).dict[comp.alt];

        await exports.add(comp.entity, comp.alt, {
          comp: $.extend(comp.extend, { minimized: comp.isMinimized, more: comp.isMore }),
          hub: comp.hub.extend
        });
        const compRef = componentManager.alt.ref(comp.alt);

        await compRef.state.restore(comp.state);

        compRef.compInstance(true)
          .css('width', comp.css.width)
          .parent().css({
            top: comp.css.top,
            left: comp.css.left,
            zIndex: comp.css.zIndex,
            width: comp.css.width
          })
          .find('.component__body').css('height', comp.css.height).outerWidth(comp.css.width);

        // Prepare .components for hub.state.restore()
        hubState.components.push({
          compID: compRef._compID,
          css: comp.hub.css
        });
      }

      // Prepare hub information
      obj.hub.connections.forEach(function (obj) {
        hubState.connections.push({
          inputCompID: componentManager.alt.query(securableAlt.dict[obj.inputCompAlt]),
          inputParam: obj.inputParam,
          outputCompID: componentManager.alt.query(securableAlt.dict[obj.outputCompAlt]),
          outputParam: obj.outputParam
        });
      });

      hubState.props = $.extend(hubState.props, obj.hub.props);

      exports.hub.state.restore(hubState);

      // Resume all positioning listeners after restoring
      DashboardGlobals.pausePositioning = false;

      // Restore positioning state
      for (const group in obj.positioning) {
        positionHelper.fixPosition(obj.positioning[group], group);
      }

      // Reset scroll of all containers
      exports.componentContainer.scrollTop(obj.globals.scroll.cTop).scrollLeft(obj.globals.scroll.cLeft);
      exports.minComponentContainer.scrollTop(obj.globals.scroll.mcTop).scrollLeft(obj.globals.scroll.mcLeft);

      return true;
    },
    normalize: function (stateObj) {
      /*
      {
        globals: {
          strictMode, name, maxZIndex
          scroll: { cTop, cLeft, mcTop, mcLeft }
        },
        components: [{
          alt, entity, isMinimized, isMore, version, state,
          css: { top, left, zIndex, height, width },
          extend: { name, primary, silent, background }
          hub: {
              extend: { autoUpdatable, minimized },
              css: { top, left, zIndex, width },
          }
        }...],
        hub: {
          connections: [{
            inputCompAlt, inputParam, outputCompAlt, outputParam, zIndex
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
        },
        positioning: {
          group: { top, left }
          ...
        }
      }
      */

      if ($.type(stateObj) !== 'object') { return {}; }

      let normalizedObj = {};

      normalizedObj = $.extend(true, {
        globals: {},
        components: [],
        hub: {},
        positioning: {}
      }, stateObj);

      normalizedObj.globals = $.extend(true, {
        strictMode: true,
        name: 'Session',
        scroll: {},
        maxZIndex: 0
      }, normalizedObj.globals);

      normalizedObj.globals.scroll = $.extend(true, {
        cTop: 0,
        cLeft: 0,
        mcTop: 0,
        mcLeft: 0
      }, normalizedObj.globals.scroll);

      for (let i = 0; i < normalizedObj.components.length; ++i) {
        normalizedObj.components[i] = $.extend(true, {
          alt: '',
          entity: '',
          isMinimized: false,
          isMore: true,
          state: '{}',
          css: {},
          extend: {},
          hub: {}
        }, normalizedObj.components[i]);

        normalizedObj.components[i].css = $.extend(true, {
          top: '',
          left: '',
          zIndex: '',
          height: '',
          width: ''
        }, normalizedObj.components[i].css);

        normalizedObj.components[i].extend = $.extend(true, {
          name: '',
          primary: false,
          silent: false,
          background: ''
        }, normalizedObj.components[i].extend);

        normalizedObj.components[i].hub = $.extend(true, {
          extend: {},
          css: {}
        }, normalizedObj.components[i].hub);

        normalizedObj.components[i].hub.css = $.extend(true, {
          top: 0,
          left: 0,
          zIndex: '',
          width: ''
        }, normalizedObj.components[i].hub.css);

        normalizedObj.components[i].hub.extend = $.extend(true, {
          name: '',
          primary: false,
          silent: false,
          background: ''
        }, normalizedObj.components[i].hub.extend);
      }

      normalizedObj.hub = $.extend(true, {
        connections: [],
        props: {}
      }, normalizedObj.hub);

      for (let i = 0; i < normalizedObj.hub.connections.length; ++i) {
        normalizedObj.hub.connections[i] = $.extend(true, {
          inputCompAlt: '',
          inputParam: '',
          outputCompAlt: '',
          outputParam: '',
          zIndex: ''
        }, normalizedObj.hub.connections[i]);
      }

      normalizedObj.hub.props = $.extend(true, {
        transform: '',
        layering: {},
        positioning: {}
      }, normalizedObj.hub.props);

      normalizedObj.hub.props.layering = $.extend(true, {
        minZIndex: 0,
        maxZIndex: 0
      }, normalizedObj.hub.props.layering);

      for (const group in normalizedObj.hub.props.positioning) {
        normalizedObj.hub.props.positioning[group] = $.extend(true, {
          top: 0,
          left: 0,
          zIndex: ''
        }, normalizedObj.hub.props.positioning[group]);
      }

      normalizedObj.positioning = $.extend({}, normalizedObj.positioning);
      for (const group in normalizedObj.positioning) {
        normalizedObj.positioning[group] = $.extend({
          top: 0,
          left: 0,
          zIndex: ''
        }, normalizedObj.positioning[group]);
      }

      return normalizedObj;
    },
    sanitizeComponents: async function (obj) {
      obj = exports.state.normalize(obj);

      // An array to save errors
      const errors = [];

      for (let index = 0; index < obj.components.length; ++index) {
        const comp = obj.components[index];
        const componentId = await EventCollection.events.GetCompatibleComponent.invoke(comp.entity);
        if (componentId) {
          const componentObj = await EventCollection.events.GetComponent.invoke(componentId, true);
          if ($.isEmptyObject(componentObj)) {
            errors.push({
              required: comp.entity,
              error: 'Missing'
            });
          }
        } else {
          errors.push({
            required: comp.entity,
            error: 'Unsupported'
          });
        }
        comp.entity = componentId;
      }

      if (errors.length) {
        let contentString = `<div class="componentpass__text">Found <span class="counter">${errors.length} error${errors.length > 1 ? 's' : ''}</span> while importing <strong>${ensureHTML(obj.globals.name)}</strong>:</div>
        <div class="componentpass">
          <div class="componentpass__item head">
              <div class="componentpass__item__col left">Required</div>
              <div class="componentpass__item__col right">Error</div>
          </div>`;

        errors.forEach(function (item) {
          contentString += `<div class="componentpass__item">
            <div class="componentpass__item__col left">${item.required}</div>
            <div class="componentpass__item__col right error">${item.error}</div>
          </div>`;
        });

        contentString += '</div>';

        $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
          title: 'Import failed',
          content: contentString
        }));
        return null;
      }

      return obj;
    }
  };

  /* === SESSION UTILITIES === */

  function _freestyle () {
    exports.componentContainer.find(`.${componentWrapper}`).get().reverse().forEach(function (elm) {
      const $elm = $(elm);
      const pos = $elm.position();
      positionHelper.watch($elm, 'Component');
      $elm.css({
        position: 'absolute',
        top: Math.max(0, pos.top),
        left: Math.max(0, pos.left),
        'z-index': 0
      })
        .off('mousedown.layerhelper')
        .on('mousedown.layerhelper', () => layerHelper.bringToFront($elm));
    });

    safeDraggable('enable', true);
  }

  function _setCompHeight (compID, height) {
    const cache = componentManager.id.cache(compID);
    const comp = componentManager.id.ref(compID);
    const compDefaultHeight = comp.options().height;
    const $comp = comp.compInstance(true);
    const headerHeight = $comp.find('.component__header').outerHeight(true) || 0;
    const hubHeight = $comp.find('.component__hub').outerHeight(true) || 0;
    const $compBody = $comp.find('.component__body');
    const space = $compBody.outerHeight() - $compBody.height();

    $comp.css('height', '');
    $compBody.css('height', `${Math.max(height - headerHeight - hubHeight - space, compDefaultHeight)}px`);
    if (height < (compDefaultHeight + headerHeight + hubHeight) / 2) {
      $comp.height(headerHeight);
      $comp.removeClass('primary').css('overflow', 'hidden').find('.component__header__modes.right').hide();
      cache.isMore = false;
    } else {
      if (comp.options().primary) { $comp.addClass('primary'); }
      $comp.css('overflow', '').find('.component__header__modes.right').show();
      cache.isMore = true;
    }
  }

  return exports;
}
