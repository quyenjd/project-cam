import { DashboardEvents, DashboardGlobals, DashboardStorage, DashboardVersion, ensureHTML } from '../globals';
import SessionHandler, { TSessionHandler } from './session'; // eslint-disable-line
import Tab, { TTab } from './tab'; // eslint-disable-line
import StickyMenu, { TStickyMenu } from './stickymenu'; // eslint-disable-line
import EventCollection from '../events/_collection';
import ContextMenu, { TContextMenu } from './contextmenu'; // eslint-disable-line
import DragDrop from './dragdrop';
import Overlay from './overlay';
import Spinner from './spinner';
import TreeList from './treelist';

const defaultComponentViewHeight = 150;

/**
 * @typedef {Object} WrapperBrowserView
 * @property {boolean} isEnabled Whether browser view is enabled or not
 * @property {() => void} enable Enable browser view
 * @property {() => void} disable Disable browser view
 * @property {() => void} toggle Call enable/disable accordingly
 */

/**
 * @typedef {Object} WrapperComponentView
 * @property {boolean} isEnabled Whether component view is enabled or not
 * @property {() => void} enable Enable component view
 * @property {() => void} disable Disable component view
 * @property {() => void} toggle Call enable/disable accordingly
 */

/**
 * @typedef {Object} WrapperAutoSave
 * @property {() => TSessionWrapper} init Start auto save
 * @property {() => TSessionWrapper} stop Stop auto save
 * @property {() => boolean} running Check whether auto save is running
 */

/**
 * @typedef {Object} WrapperState
 * @property {() => Promise<Object.<string, *>>} backup Return a snapshot object of the wrapper
 * @property {(obj: Object.<string, *>) => Promise<boolean>} restore Restore the wrapper from backup data
 * @property {(obj) => Object.<string, *>} normalize Normalize the backup data
 */

/**
 * @typedef {Object} TSessionWrapper
 * @property {string} _wrapperID Wrapper id
 * @property {TContextMenu} _ctxMenu Context menu
 * @property {DashboardEvents} _events Event manager
 * @property {TTab} _tabs Tabs
 * @property {TStickyMenu} _sticky Sticky menu
 * @property {DashboardVersion} _version Version manager
 * @property {() => Promise<TSessionWrapper>} init Initialize the wrapper
 * @property {WrapperBrowserView} browserView Browser view manager
 * @property {WrapperComponentView} componentView Component view manager
 * @property {() => string} addSession Add a new session to the session manager and return its id
 * @property {(sessionID: string) => Promise<string|null>} duplicateSession Duplicate a session and return the id of the new one
 * @property {(sessionID: string) => TSessionHandler|null} getSession Get the session with given id
 * @property {() => TSessionHandler|null} getCurrentSession Get current session
 * @property {(sessionID: string) => Promise<TSessionWrapper>} removeSession Remove a session
 * @property {(sessionID: string) => TSessionWrapper} switchTo Switch to a session
 * @property {WrapperAutoSave} autoSave Auto-save manager
 * @property {WrapperState} state Wrapper state manager
 */

/**
 * @typedef {Object} BrowserConfig
 * @property {boolean} autoShow Whether the browser should expand itself when hovered
 * @property {boolean} autoHide Whether the browser should collapse itself when left
 * @property {boolean} left Whether to stick the browser to the left of the screen
 * @property {boolean} show Whether to make the browser visible
 */

/**
 * @typedef {Object} LayoutConfig
 * @property {boolean} autoSave Whether to enable auto-save for the wrapper
 * @property {BrowserConfig} browser Browser configuration
 * @property {boolean} cleanCoExisting Whether to clean co-existing versions of the same package id
 * @property {boolean} componentView Whether to show the minimized component tray
 * @property {boolean} componentViewHeight Height of the minimized component tray
 * @property {boolean} forceInstall Whether to do a force installation of a package
 * @property {boolean} workspaceMode Whether to show the Workspace view instead of Graph
 */

/**
 * Create a session wrapper
 * @param {unknown} elm Selector of the element to initialize the wrapper on
 * @param {Partial<LayoutConfig>?} layout Initial layout configuration
 * @returns {TSessionWrapper} The session wrapper instance
 */
export default function SessionWrapper (elm, layout) {
  // Load saved layout data
  const savedLayout = $.extend(true, {
    autoSave: true,
    browser: {
      autoShow: false,
      autoHide: true,
      left: true,
      show: true
    },
    cleanCoExisting: true,
    componentView: true,
    componentViewHeight: defaultComponentViewHeight,
    forceInstall: true,
    workspaceMode: true
  }, layout);

  const AUTO_SAVE_INTERVAL = 300000; // 5 minutes

  /**
   * @type {TSessionWrapper}
   */
  const exports = {
    _wrapperID: DashboardGlobals.uniqueID('sw'),
    _events: DashboardEvents()
  };
  const dict = {};
  let opening = '';

  let cachedAutoSave, $wrapper;

  // A utility to handle switching between modes, also taking care of opening sessions
  const modeSwitcher = (function () {
    const EXPORTS = {};
    let $workspaces = $(); let $workspaceMins = $(); let $graphs = $();

    EXPORTS.addWorkspace = function ($workspace) {
      $workspaces = _boilerplate($workspaces, $workspace, 'workspace');
      return EXPORTS;
    };

    EXPORTS.addWorkspaceMin = function ($workspaceMin) {
      $workspaceMins = _boilerplate($workspaceMins, $workspaceMin, 'workspace minimized');
      return EXPORTS;
    };

    EXPORTS.addGraph = function ($graph) {
      $graphs = _boilerplate($graphs, $graph, 'graph');
      return EXPORTS;
    };

    EXPORTS.update = function () {
      _cleanup();

      const _ = ($selector) => {
        $selector.filter(`[data-session="${opening.replace('"', '\\"')}"]`).show();
        $selector.filter(`:not([data-session="${opening.replace('"', '\\"')}"])`).hide();
      };

      _($workspaceMins);

      if (savedLayout.workspaceMode) {
        _($workspaces);
        $graphs.hide();

        // Take care of layout elements
        $wrapper.find('.WORKSPACE[data-role="layout"]').show();
        $wrapper.find('.GRAPH[data-role="layout"]').hide();
      } else {
        $workspaces.hide();
        _($graphs);

        // Take care of layout elements
        $wrapper.find('.WORKSPACE[data-role="layout"]').hide();
        $wrapper.find('.GRAPH[data-role="layout"]').show();
      }

      _updateWorkspaceHeight();

      return EXPORTS;
    };

    EXPORTS.query = function (sessionID) {
      sessionID = sessionID.replace('"', '\\"');

      return [
        $workspaces.filter(`[data-session="${sessionID}"]`),
        $workspaceMins.filter(`[data-session="${sessionID}"]`),
        $graphs.filter(`[data-session="${sessionID}"]`)
      ];
    };

    function _boilerplate ($elms, $elm, name) {
      const sessionID = $elm.attr('data-session');
      if (!sessionID) { throw new Error(`Wrapper: ${name} elements must have non-empty \`data-session\` attributes`); }

      return $elms.add($elm);
    }

    function _cleanup () {
      const _ = ($selector) =>
        $selector.filter((i, elm) => Object.prototype.hasOwnProperty.call(dict, $(elm).attr('data-session')));

      $workspaces = _($workspaces);
      $workspaceMins = _($workspaceMins);
      $graphs = _($graphs);
    }

    return EXPORTS;
  })();

  exports.init = async function () {
    const bottomnavStyle = `style="height: ${savedLayout.componentViewHeight}px;"`;

    $(elm).replaceWith($wrapper = $(`<div class="session-wrapper ${exports._wrapperID}" style="display: block; position: relative;">
      <div class="topnav">
        <div class="topnav__wrapper">
          <div class="topnav__wrapper__tablist">
            <div class="topnav__wrapper__tablist__item${savedLayout.workspaceMode ? ' active' : ''}" data-tab=".WORKSPACE">
              <div class="topnav__wrapper__tablist__item__title">Workspace</div>
            </div>
            <div class="topnav__wrapper__tablist__item${!savedLayout.workspaceMode ? ' active' : ''}" data-tab=".GRAPH">
              <div class="topnav__wrapper__tablist__item__title">Graph</div>
            </div>
          </div>
        </div>
      </div>

      <div class="g-container-span" style="height: 100vh; overflow: hidden;">
        <div class="topnav__mirror" data-role="layout" data-occupy-height=true></div>
        <div data-role="container" style="position: relative;">
          <div class="empty">
            <div class="empty__content">
              <div class="logo"></div>
              <div class="text">Wow, I&#39;m the first one!</div>
            </div>
            <div class="empty__hint"><strong>Hint:</strong> Start by creating a session!</div>
          </div>
        </div>
        <div class="bottomtab" data-role="layout" data-occupy-height=true></div>
        <div class="WORKSPACE bottomnav__mirror" ${bottomnavStyle} data-role="layout" data-occupy-height=true></div>
      </div>

      <div class="WORKSPACE bottomnav" data-role="layout">
        <div class="bottomnav__wrapper" ${bottomnavStyle}>
          <div class="bottomnav__wrapper__header">
            <div class="bottomnav__wrapper__header__title">Components</div>
          </div>
        </div>
      </div>
    </div>`
    ));

    // Initialize sticky menu
    const $workspaces = $wrapper.find('[data-role="container"]');
    exports._sticky = StickyMenu($workspaces, savedLayout.browser);
    exports._sticky.tabs.add('components', 'Components').add('logs', 'Logs');
    const $componentList = exports._sticky.tabs.instance('components', true);
    const $logList = exports._sticky.tabs.instance('logs', true);

    // Update hint position
    const $emptyHint = $wrapper.find('.empty__hint');
    const _updateHint = () => {
      if (exports._sticky.options().left) { $emptyHint.addClass('right'); } else { $emptyHint.removeClass('right'); }
    };
    _updateHint();

    // Sticky menu layout change event
    exports._sticky._events.on('change', (newConfig) => {
      _updateLayout('browser', newConfig);
      _updateHint();
    });

    // Initialize component list
    let packageInfo = '';
    const treeList = TreeList($componentList).setPlaceholder('Loading...');

    // Bind component list refresh event
    const treeListStorage = DashboardStorage.getStorageOfField('treelist');
    exports._events.on('sticky-refresh-components', async () => {
      // Get current expanding items
      let expandingItems = await treeListStorage.getFull();
      try {
        expandingItems = JSON.parse(expandingItems);
      } catch (err) {
        expandingItems = {};
      }

      // Reload all packages and components
      treeList.clear();

      // Load packages from back-end
      const packageList = EventCollection.events.GetPackages.sendSync().sort((a, b) => `${a}`.localeCompare(`${b}`));
      packageInfo = '';
      for (const packageId of packageList) {
        const id = 'pkg: ' + packageId;
        const packageItem = treeList.add(id).setTitle(id).setMore(true).setOpen(!!expandingItems[id]);

        // Bind event to save expand/collapse state
        treeList._events.on(`${id}.collapse`, () => {
          treeListStorage.setItem(id, false);
        }).on(`${id}.expand`, () => {
          treeListStorage.setItem(id, true);
        });

        // Load package information
        const pkg = await EventCollection.events.GetPackage.invoke(packageId);
        packageInfo += `<div${packageInfo.length ? ' style="margin-top: 0.5rem;"' : ''}>
          <strong>Package:</strong> ${ensureHTML(pkg.name)}<br />
          <strong>Description:</strong> <span style="white-space: pre-wrap;">${ensureHTML(pkg.description) || '<em style="opacity: 0.7;">No description.</em>'}</span>
        </div>`;

        if (!pkg.components.length) { packageItem.bodyInstance(true).text('No components found.'); }

        // Load component information
        pkg.components.forEach((componentId) => {
          EventCollection.events.GetComponent.invoke(componentId, true).then((component) => {
            if (!component) return;

            const _id = 'com: ' + componentId;
            const fullId = `${id}/${_id}`;
            const componentItem = treeList.add(fullId, false).setTitle(_id).setMore(true).setOpen(!!expandingItems[fullId]);

            // Bind event to save expand/collapse state
            treeList._events.on(`${fullId}.collapse`, () => {
              treeListStorage.setItem(fullId, false);
            }).on(`${fullId}.expand`, () => {
              treeListStorage.setItem(fullId, true);
            });

            componentItem.bodyInstance(true).html(`<div style="padding: 0.5em;">
              <strong>Name:</strong> ${ensureHTML(component.name)}<br />
              <strong>Category:</strong> ${ensureHTML(component.category)}<br />
              <strong>Input:</strong> ${component.input.length ? component.input.map((value) => `${value.type !== value.name ? `<span class="paramtype">${ensureHTML(value.type)}.</span>` : ''}${ensureHTML(value.name)}${value.required ? '*' : ''}${value.limit ? ` (${value.limit})` : ''}`).join(', ') : 'N/A'}<br />
              <strong>Output:</strong> ${component.output.length ? component.output.map((value) => `${value.type !== value.name ? `<span class="paramtype">${ensureHTML(value.type)}.</span>` : ''}${ensureHTML(value.name)}`).join(', ') : 'N/A'}<br />
              <strong>Backward-compatible with:</strong> ${ensureHTML(component.compatibleUntil)}+<br />
              <hr />
              <div style="width: 100%; font-size: 0.9em; white-space: pre-wrap;">${ensureHTML(component.description) || 'No description.'}</div>
            </div>`);

            let debounce = null;
            DragDrop(
              componentItem.headerInstance(true),
              '[data-role="WORKSPACE"], [data-role="GRAPH"]',
              '.sticky__edge, .sticky__placeholder, .sticky__menu'
            )._events
              .on('helper', () => componentId)
              .on('drag', async (event) => {
                const $draggedOn = $(document.elementFromPoint(event.pageX, event.pageY));
                const $relatedTabItem = $draggedOn.closest('.tab__list__item[data-tab-item-id]');
                if ($relatedTabItem.length) {
                  debounce = setTimeout(() => {
                    exports.switchTo($relatedTabItem.attr('data-tab-item-id'));
                    debounce = null;
                  }, DashboardGlobals.duration.userInteractionWait);
                } else if (debounce) { clearTimeout(debounce); }
              })
              .on('drop', (event) => {
                const session = exports.getCurrentSession();
                if (session) {
                  if (savedLayout.workspaceMode) {
                    const offset = $(session.componentContainer).offset();
                    session.add(componentId, null, {}, {
                      component: {
                        left: event.pageX - offset.left,
                        top: event.pageY - offset.top
                      }
                    });
                  } else {
                    const offset = session.hub.instance(true).offset();
                    const transform = session.hub.getMapTransform();
                    session.add(componentId, null, {}, {
                      hub: {
                        left: (event.pageX - offset.left - transform.translateX) / transform.scaleX,
                        top: (event.pageY - offset.top - transform.translateY) / transform.scaleY
                      }
                    });
                  }
                }
              });

            // Another way to add a component is with context menu
            const ctxMenu = ContextMenu(`.${DashboardGlobals.getQueryID(componentItem.headerInstance(true))}`, {
              id: 'main',
              align: 'vertical',
              menus: [
                {
                  name: 'Add to Current Session',
                  id: 'addtosession',
                  type: 'click'
                }
              ]
            }).init();
            ctxMenu.menu._events.on('addtosession', () => {
              exports.getCurrentSession().add(componentId);
            });

            // Disable the context menu item if no session is opening
            const ctxMenuItem = ctxMenu.menu.getMenuItemsById('addtosession');
            ctxMenu._events.on('beforeshow', () => {
              opening ? ctxMenuItem.enable() : ctxMenuItem.disable();
            });

            componentItem.instance(true).appendTo(packageItem.bodyInstance(true));
          });
        });

        // Context menu operation on each package
        ContextMenu('.' + DashboardGlobals.getQueryID(packageItem.headerInstance(true)), {
          id: 'main',
          align: 'vertical',
          menus: [
            {
              name: 'Remove This Package',
              id: 'removepackage',
              type: 'click'
            }
          ]
        }).init().menu._events.on('removepackage', () => {
          $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
            content: `This will remove the package (<strong>${ensureHTML(packageId)}</strong>) permanently. Are you sure?`,
            buttons: {
              confirm: () => {
                EventCollection.events.RemovePackage.invoke(packageId).then((ret) => {
                  if (ret) exports._events.invoke('sticky-refresh-components');
                });
                exports._sticky.tabs.setActive('logs');
              },
              cancel: () => { }
            }
          }));
        });
      }

      treeList.setPlaceholder('No packages found.');
      if (!packageInfo.length) { packageInfo = 'No packages found.'; }
    });
    exports._events.invoke('sticky-refresh-components');

    // Context menu operation on the component list
    const contextMenu = ContextMenu('.' + DashboardGlobals.getQueryID($componentList), {
      id: 'main',
      align: 'vertical',
      menus: [
        {
          name: 'Add Packages...',
          id: 'addpackages',
          type: 'click'
        },
        {},
        {
          name: 'Clean Co-Existing Versions After Installation',
          id: 'cleancoexisting',
          type: 'click',
          ticked: savedLayout.cleanCoExisting
        },
        {
          name: 'Force Package Installation',
          id: 'forceinstall',
          type: 'click',
          ticked: savedLayout.forceInstall
        },
        {},
        {
          name: 'View Package Info',
          id: 'packageinfo',
          type: 'click'
        }
      ]
    }).init();

    const menuCleanCoExisting = contextMenu.menu.getMenuItemsById('cleancoexisting');
    const menuForceInstall = contextMenu.menu.getMenuItemsById('forceinstall');

    contextMenu.menu._events.on('addpackages', () => {
      EventCollection.events.AddPackages.invoke(menuCleanCoExisting.isTicked(), menuForceInstall.isTicked()).then((ret) => {
        if (ret) exports._events.invoke('sticky-refresh-components');
      });
      exports._sticky.tabs.setActive('logs');
    }).on('cleancoexisting', () => {
      const isTicked = menuCleanCoExisting.isTicked();
      _updateLayout('cleanCoExisting', !isTicked);
      if (isTicked) { menuCleanCoExisting.untick(); } else { menuCleanCoExisting.tick(); }
    }).on('forceinstall', () => {
      const isTicked = menuForceInstall.isTicked();
      _updateLayout('forceInstall', !isTicked);
      if (isTicked) { menuForceInstall.untick(); } else { menuForceInstall.tick(); }
    }).on('packageinfo', () => {
      Overlay($componentList, {
        body: $('<div></div>').html(packageInfo),
        title: 'Package Information'
      }).show();
    });

    // Log list event
    $logList.addClass('logger').css('background', '#000');
    exports._events.on('sticky-log', (html) => {
      if (html === false) { $logList.html(''); } else { $logList.append(html); }
    });

    // Log list context menu
    ContextMenu('.logger', {
      id: 'main',
      align: 'vertical',
      menus: [
        {
          name: 'Clear',
          id: 'clear',
          type: 'click'
        }
      ]
    }).init().menu._events.on('clear', () => {
      $logList.html('');
    });

    const $container = $wrapper.find('.g-container-span');

    // Initialize tab list
    exports._tabs = Tab($wrapper.find('.bottomtab'), {
      noCloseIcon: true,
      noCollapse: true
    });

    // Initialize context menu on tab list
    const tabContextMenu = ContextMenu('.bottomtab', {
      id: 'main',
      align: 'vertical',
      menus: [
        {
          name: 'Add Session',
          id: 'addsession',
          type: 'click'
        },
        {},
        {
          name: 'Duplicate',
          id: 'duplicate',
          type: 'click'
        },
        {
          name: 'Rename Session...',
          id: 'renamesession',
          type: 'click'
        },
        {
          name: 'Remove Session...',
          id: 'removesession',
          type: 'click'
        }
      ]
    }).init();

    // Store the menu item the context menu is triggered on
    let $contextTabItem;
    tabContextMenu._events.on('beforeshow', (e) => {
      const $target = $(e.target).closest('.tab__list__item');
      if ($target.length) {
        $contextTabItem = $target;
        tabContextMenu.menu.getMenuItemsById('duplicate').enable();
        tabContextMenu.menu.getMenuItemsById('renamesession').enable();
        tabContextMenu.menu.getMenuItemsById('removesession').enable();
      } else {
        $contextTabItem = null;
        tabContextMenu.menu.getMenuItemsById('duplicate').disable();
        tabContextMenu.menu.getMenuItemsById('renamesession').disable();
        tabContextMenu.menu.getMenuItemsById('removesession').disable();
      }
    });
    tabContextMenu.menu._events.on('addsession', () => {
      exports.switchTo(exports.addSession());
    }).on('duplicate', () => {
      if ($contextTabItem) {
        exports.duplicateSession(exports._tabs.findItem($contextTabItem));
      }
    }).on('renamesession', () => {
      if ($contextTabItem) {
        const session = exports.getSession(exports._tabs.findItem($contextTabItem));
        if (session) {
          DashboardGlobals.launchInputBox('Rename Session', session.options().name, 'Type new name here', (newValue) => {
            session.rename(newValue);
          });
        }
      }
    }).on('removesession', () => {
      if ($contextTabItem) {
        const session = exports.getSession(exports._tabs.findItem($contextTabItem));
        if (session) {
          $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
            content: 'Are you sure to remove the session permanently?',
            buttons: {
              confirm: () => exports.removeSession(session._sessionID),
              cancel: () => { }
            }
          }));
        }
      }
    });

    // Initalize bottom nav to be resizable
    const $bottomnavMirror = $wrapper.find('.bottomnav__mirror');
    $bottomnavMirror.outerHeight($wrapper.find('.bottomnav').outerHeight());
    const $bottomnav = $wrapper.find('.bottomnav__wrapper');
    $bottomnav.resizable({
      handles: 'n',
      minHeight: $bottomnav.find('.bottomnav__wrapper__header').outerHeight(true) + 2,
      maxHeight: $container.height() * 0.5,
      resize: function (evt, ui) {
        ui.element.css('top', '');
        ui.element.css('width', '');
        $bottomnavMirror.height($bottomnav.outerHeight(true) - 1);
        _updateWorkspaceHeight();
      },
      stop: function () {
        _updateLayout('componentViewHeight', $bottomnavMirror.height());
      }
    }).bindIframeFixEvents('resize');

    // Hide bottom nav if componentView is false
    if (!savedLayout.componentView) {
      $bottomnav.hide();
      $bottomnavMirror.outerHeight(0);
    }

    // Double click to reset bottomnav resize
    $bottomnav.find('.ui-resizable-handle').on('dblclick', function () {
      // Remove red bar when double clicking
      $(this).trigger('mousemove');

      $bottomnav.height(defaultComponentViewHeight);
      $bottomnavMirror.height(defaultComponentViewHeight);
      _updateWorkspaceHeight();

      _updateLayout('componentViewHeight', $bottomnavMirror.height());
    });

    $(window).on(`resize.${exports._wrapperID}`, (function resize () {
      // Recalculate max height for bottom nav
      const maxHeightForMain = $container.height() * 0.5 - 8;
      $bottomnav.resizable('option', 'maxHeight', maxHeightForMain);
      $bottomnav.height(Math.min($bottomnav.height(), maxHeightForMain));

      const occupiedHeight = (function () {
        let total = 0;

        $container.find('[data-role="layout"][data-occupy-height]').each((i, elm) => {
          const $elm = $(elm);

          if ($elm.is(':visible')) { total += $elm.outerHeight(true); }
        });
        return total;
      })();
      const occupiedWidth = (function () {
        let total = 0;

        $container.find('[data-role="layout"][data-occupy-width]').each((i, elm) => {
          const $elm = $(elm);

          if ($elm.is(':visible')) { total += $elm.outerWidth(true); }
        });
        return total;
      })();

      // Recalculate max height for the container
      const scrollbarSize = document.documentElement.scrollWidth > document.documentElement.clientWidth ? 8 : 0;
      $wrapper.find('[data-role="container"]').height($container.height() - occupiedHeight - scrollbarSize + 1).width($container.width() - occupiedWidth + 1);

      return resize;
    })());

    // Initialize switching between tabs
    $wrapper.find('.topnav__wrapper__tablist__item').on('click', function () {
      const $this = $(this);
      const $active = $this.siblings('.active');
      $active.each((i, obj) => $(obj).removeClass('active'));

      if ($this.attr('data-tab') === '.WORKSPACE') { _updateLayout('workspaceMode', true); } else { _updateLayout('workspaceMode', false); }
      modeSwitcher.update();

      $this.addClass('active');
    });

    // Initialize context menu in Workspace
    exports._ctxMenu = ContextMenu('[data-role="container"]', {
      id: 'main',
      align: 'vertical',
      menus: [
        {
          name: 'Add Session',
          id: 'addsession',
          type: 'click'
        },
        {},
        {
          name: 'Rename Session...',
          id: 'renamesession',
          type: 'click'
        },
        {
          name: 'Remove Session...',
          id: 'removesession',
          type: 'click'
        }
      ],
      ignore: '.component'
    }).init();

    // Store the menu item the context menu is triggered on
    let ctxMenuSession;
    exports._ctxMenu._events.on('beforeshow', () => {
      ctxMenuSession = exports.getCurrentSession();
      if (ctxMenuSession) {
        exports._ctxMenu.menu.getMenuItemsById('renamesession').enable();
        exports._ctxMenu.menu.getMenuItemsById('removesession').enable();
      } else {
        exports._ctxMenu.menu.getMenuItemsById('renamesession').disable();
        exports._ctxMenu.menu.getMenuItemsById('removesession').disable();
      }
    });
    exports._ctxMenu.menu._events.on('addsession', () => {
      exports.switchTo(exports.addSession());
    }).on('renamesession', () => {
      if (ctxMenuSession) {
        DashboardGlobals.launchInputBox('Rename Session', ctxMenuSession.options().name, 'Type new name here', (newValue) => {
          ctxMenuSession.rename(newValue);
        });
      }
    }).on('removesession', () => {
      if (ctxMenuSession) {
        $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
          content: 'Are you sure to remove the session permanently?',
          buttons: {
            confirm: () => exports.removeSession(ctxMenuSession._sessionID),
            cancel: () => { }
          }
        }));
      }
    });

    modeSwitcher.update();

    exports._events.call('layout-update', exports, $.extend(true, {}, savedLayout));

    // Initialize a version manager instance
    exports._version = DashboardVersion(exports._wrapperID);

    // Restore old data if any
    let hasSavedData = false;
    await exports._version.init(function (savedData) {
      hasSavedData = true;
      try {
        const data = DashboardGlobals.decompressObj(savedData);
        Overlay($wrapper, {
          fixed: true,
          body: Spinner('Found unrecovered data. Restoring', true).html()
        }).show().then((overlay) => {
          exports.state.restore(data).finally(() => {
            overlay.destroy();
          });
        });
        return true;
      } catch (err) {
        return false;
      }
    });

    // If not restoring old data and autoSave is enabled, initialize it
    if (!hasSavedData && savedLayout.autoSave) {
      savedLayout.autoSave = false;
      exports.autoSave.init();
    }

    return exports;
  };

  exports.browserView = {
    get isEnabled () {
      return savedLayout.browser.show;
    },
    enable: () => {
      exports._sticky.show();
    },
    disable: () => {
      exports._sticky.hide();
    },
    toggle: () => {
      savedLayout.browser.show ? exports.browserView.disable() : exports.browserView.enable();
    }
  };

  exports.componentView = {
    get isEnabled () {
      return savedLayout.componentView;
    },
    enable: () => {
      $wrapper.find('.bottomnav__wrapper').show();
      $wrapper.find('.bottomnav__mirror').outerHeight($wrapper.find('.bottomnav').outerHeight());
      _updateWorkspaceHeight();

      _updateLayout('componentView', true);
    },
    disable: () => {
      $wrapper.find('.bottomnav__wrapper').hide();
      $wrapper.find('.bottomnav__mirror').outerHeight(0);
      _updateWorkspaceHeight();

      _updateLayout('componentView', false);
    },
    toggle: () => {
      savedLayout.componentView ? exports.componentView.disable() : exports.componentView.enable();
    }
  };

  exports.addSession = function () {
    // Prepare containers
    const $container = $wrapper.find('[data-role="container"]');
    const $workspace = $('<div class="g-row" data-role="WORKSPACE" style="overflow: auto; height: 100%; width: 100%; background: #fff;"></div>');
    const $graph = $('<div class="g-row" data-role="GRAPH" style="height: 100%; width: 100%; background: #fff;"></div>');
    const $bottomnavHeader = $wrapper.find('.bottomnav__wrapper__header');
    const $workspaceMin = $('<div class="bottomnav__wrapper__body" data-role="WORKSPACE_MINIMIZED"></div>');
    $workspace.appendTo($container);
    $workspaceMin.insertAfter($bottomnavHeader);
    $graph.appendTo($container);

    const session = SessionHandler({
      componentContainer: $workspace,
      minComponentContainer: $workspaceMin,
      hub: $graph,
      tabWorkspace: $wrapper.find('.topnav__wrapper__tablist__item[data-tab=".WORKSPACE"]'),
      tabGraph: $wrapper.find('.topnav__wrapper__tablist__item[data-tab=".GRAPH"]')
    });

    modeSwitcher.addWorkspace($workspace);
    modeSwitcher.addWorkspaceMin($workspaceMin);
    modeSwitcher.addGraph($graph);

    session._events
      .on('rename', function (name) {
        exports._tabs.updateTitle(session._sessionID, name);
      })
      .on('switch', exports.openSwitcher)
      .on('require', function (entity) {
        dict[this._sessionID].entities[entity] = [];
      })
      .on('componentManager.add', function (alt, ref, cache) {
        if (!Object.prototype.hasOwnProperty.call(dict[this._sessionID].entities, cache.entity)) { throw new Error(`An entity [${cache.entity}] has to be required before adding [session:${this.options().name}].`); }
        dict[this._sessionID].entities[cache.entity].push(ref._compID);
      })
      .on('componentManager.remove', function (alt, compID, cache) {
        dict[this._sessionID].entities[cache.entity] = dict[this._sessionID].entities[cache.entity].filter((item) => item !== compID);
      });

    dict[session._sessionID] = {
      entities: {},
      ref: session
    };

    exports._tabs.add(session._sessionID, session.options().name);
    exports._tabs._events.on(session._sessionID, () => exports.switchTo(session._sessionID));

    exports._events.call('add', exports, session._sessionID);
    exports.switchTo(session._sessionID);

    return session._sessionID;
  };

  exports.duplicateSession = async function (sessionID) {
    const session = exports.getSession(sessionID);
    if (!session) {
      return null;
    }

    return await Overlay($wrapper, {
      fixed: true,
      body: Spinner('Please wait while we are duplicating the sesison', true).html()
    }).show().then(async (overlay) => {
      const backupData = await session.state.backup();
      const newSession = exports.getSession(exports.addSession());
      if (newSession) {
        exports.switchTo(newSession);
        await newSession.state.restore(backupData);
        await overlay.hide();
        return newSession._sessionID;
      }
      return null;
    });
  };

  exports.getSession = function (sessionID) {
    return sessionID in dict ? dict[sessionID].ref : null;
  };

  exports.getCurrentSession = function () {
    return opening ? exports.getSession(opening) : null;
  };

  exports.removeSession = async function (sessionID) {
    if (sessionID in dict) {
      await dict[sessionID].ref.destroy();
      delete dict[sessionID];

      exports._tabs.remove(sessionID, true);

      exports._events.call('remove', exports, opening);
      opening = '';

      // eslint-disable-next-line
      for (const sessionID in dict) {
        exports.switchTo(sessionID);
        return exports;
      }

      modeSwitcher.update();

      exports._events.call('switch', exports, '');
    }

    return exports;
  };

  exports.switchTo = function (sessionID) {
    if (sessionID in dict && sessionID !== opening) {
      opening = sessionID;

      // Update mode switch
      modeSwitcher.update();

      // Set current session to active in tabs
      exports._tabs.setActive(sessionID);

      // Call switch events
      exports._events.call('switch', exports, opening);
    }

    return exports;
  };

  exports.autoSave = {};

  exports.autoSave.init = function () {
    if (savedLayout.autoSave) { return exports; }

    _updateLayout('autoSave', true);

    (async function _autoSave () {
      if (savedLayout.autoSave) {
        await exports._version.commit(DashboardGlobals.compressObj(await exports.state.backup(false)));
        $.toast($.extend({}, DashboardGlobals.toastConfiguration, {
          heading: 'Auto Save',
          text: 'Your latest work has just been saved for loss prevention.'
        }));
        cachedAutoSave = setTimeout(_autoSave, AUTO_SAVE_INTERVAL);
      }
    })();

    return exports;
  };

  exports.autoSave.stop = function () {
    if (savedLayout.autoSave) {
      _updateLayout('autoSave', false);
      clearTimeout(cachedAutoSave);
    }
    return exports;
  };

  exports.autoSave.running = () => savedLayout.autoSave;

  exports.state = {
    backup: function (showOverlay = true) {
      return Promise.resolve(showOverlay
        ? Overlay($wrapper, {
          fixed: true,
          body: Spinner('Please wait while we are saving your project', true).html()
        }).show()
        : undefined).then(async (overlay) => {
        const obj = exports.state.normalize({});

        for (const { id: sessionID } of exports._tabs.getState()) {
          if (!Object.prototype.hasOwnProperty.call(dict, sessionID)) { continue; }
          if (sessionID === opening) { obj.opening = obj.sessions.length; }
          obj.sessions.push(await dict[sessionID].ref.state.backup());
        }

        return Promise.resolve(overlay ? overlay.destroy() : undefined).then(() => obj);
      });
    },
    restore: function (obj) {
      return Overlay($wrapper, {
        fixed: true,
        body: Spinner('Restoring your project', true).html()
      }).show().then(async (overlay) => {
        await _destroy();

        obj = exports.state.normalize(obj);
        let openingSessionID = '';

        let ok = true;
        for (let idx = 0; idx < obj.sessions.length; ++idx) {
          const sessionState = obj.sessions[idx];
          const sessionID = exports.addSession();
          ok &&= await exports.getSession(sessionID).state.restore(sessionState);

          if (idx === obj.opening) { openingSessionID = sessionID; }
        }

        exports.switchTo(openingSessionID);
        exports._version = await DashboardVersion(exports._wrapperID).init();

        // If autoSave is enabled, initialize it
        if (savedLayout.autoSave) {
          savedLayout.autoSave = false;
          exports.autoSave.init();
        }

        return Promise.resolve(overlay ? overlay.destroy() : undefined).then(() => ok);
      });
    },
    normalize: (obj) => {
      if ($.type(obj) !== 'object') { return {}; }

      obj = $.extend(true, {
        opening: '',
        sessions: []
      }, obj);

      return obj;
    }
  };

  // === UTILITIES

  async function _destroy () {
    await exports._version.destroy();
    while (opening) await exports.removeSession(opening); // eslint-disable-line

    modeSwitcher.update();
  }

  function _updateWorkspaceHeight () {
    $(window).trigger(`resize.${exports._wrapperID}`);
  }

  function _updateLayout (key, value) {
    savedLayout[key] = value;

    // It is not necessary to wait for the layout storage to be updated since users
    // can easily adapt to the layout differences between two launches
    EventCollection.events.SetStorage.invoke('layout', JSON.stringify(savedLayout));

    exports._events.call('layout-update', exports, $.extend(true, {}, savedLayout));
  }

  return exports;
}
