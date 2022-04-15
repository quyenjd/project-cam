import SessionWrapper from './dashboard/elements/session.wrapper';
import { DashboardMenubar, DashboardMenubarButtons, DashboardGlobals, DashboardUnloadConfirm, DashboardStorage } from './dashboard/globals';
import EventCollection from './dashboard/events/_collection';
import FetchRequest from './dashboard/events/fetch';
import FileRequest from './dashboard/events/file';
import LogRequest from './dashboard/events/log';
import PackageRequest from './dashboard/events/package';
import ProcessRequest from './dashboard/events/process';
import StorageRequest from './dashboard/events/storage';
import SystemInfoRequest from './dashboard/events/systeminfo';
import WindowRequest from './dashboard/events/window';

$(window).on('DOMContentLoaded', async function () {
  // Bind independent APIs
  FetchRequest.bindAll();
  ProcessRequest.bindAll();
  StorageRequest.bindAll();
  SystemInfoRequest.bindAll();
  WindowRequest.bindAll();

  // For debugging in Electron window
  hotkeys('f5', () => {
    EventCollection.events.Reload.send();
  });

  // Initialize the wrapper with the stored layout
  let layout = await EventCollection.events.GetStorage.invoke('layout');
  try {
    layout = JSON.parse(layout);
  } catch (err) {
    layout = {};
  }

  const sessions = SessionWrapper($('#app'), layout);

  // Bind APIs that depend on the wrapper
  FileRequest.bindAll(sessions);
  LogRequest.bindAll(sessions);
  PackageRequest.bindAll(sessions);

  // Listen to view changing events
  sessions._events.on('layout-update', (newConfig) => {
    if (newConfig.browser.show) { DashboardMenubar.getMenuItemsById('browser').tick(); } else { DashboardMenubar.getMenuItemsById('browser').untick(); }
    if (newConfig.componentView) { DashboardMenubar.getMenuItemsById('components').tick(); } else { DashboardMenubar.getMenuItemsById('components').untick(); }
  });

  // Listen to session switching events
  sessions._events.on('switch', afterSessionSwitching);
  afterSessionSwitching();

  // Initialize session wrapper
  await sessions.init();

  // Initialize JQuery tooltip
  $.fn.updateTitle('');

  // Initialize menu bar buttons (only if not on Darwin)
  if (window.platform.get() !== 'darwin') {
    DashboardMenubarButtons.mainMenu.$.addClass('buttons').find('.menubar__item svg').css('margin', '5px 8px');
    DashboardMenubarButtons.mainMenu.show(null, true);
    DashboardMenubarButtons.mainMenu.$.parent().css({ left: '', right: 0, boxShadow: 'none', zIndex: DashboardGlobals.menubarButtonsZIndex });
  }

  // Initialize menu bar
  DashboardMenubar.mainMenu.show(null, true);
  DashboardMenubar.mainMenu.$.parent().css({
    width: '100%',
    paddingRight: window.platform.get() === 'darwin' ? 0 : DashboardMenubarButtons.mainMenu.$.width(),
    overflow: 'hidden'
  }).children().css({
    width: '100%',
    overflow: 'auto'
  }).css('-webkit-app-region', 'drag');

  // Bind events to menu bar
  const commonStorage = DashboardStorage.getStorageOfField('common');
  DashboardMenubar._events
    .on('newproject', () => {
      DashboardUnloadConfirm(() => {
        DashboardStorage.clear();
        EventCollection.events.Unload.send('newproject');
      });
    })
    .on('openproject', () => {
      EventCollection.events.OpenProject.invoke();
    })
    .on('saveproject', () => {
      sessions.state.backup().then((backupData) => {
        EventCollection.events.SaveProject.invoke(DashboardGlobals.compressObj(backupData));
      });
    })
    .on('saveprojectas', () => {
      sessions.state.backup().then((backupData) => {
        EventCollection.events.SaveProjectAs.invoke(DashboardGlobals.compressObj(backupData));
      });
    })
    .on('undo', () => {
      const curSession = sessions.getCurrentSession();
      if (curSession) { curSession._events.call('undo'); }
    })
    .on('redo', () => {
      const curSession = sessions.getCurrentSession();
      if (curSession) { curSession._events.call('redo'); }
    })
    .on('autosave', (e) => {
      if (sessions.autoSave.running()) {
        $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
          content: 'Are you sure to disable auto save? Any unsaved progress will be lost in the event of crashes and shutdowns.',
          buttons: {
            confirm: () => {
              sessions.autoSave.stop();
              e.menuItem.untick();
            },
            cancel: () => { }
          }
        }));
      } else {
        $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
          content: 'Are you sure to enable auto save? It may reduce the performance when working on big projects.',
          buttons: {
            confirm: () => {
              sessions.autoSave.init();
              e.menuItem.tick();
            },
            cancel: () => { }
          }
        }));
      }
    })
    .on('newsession', () => {
      sessions.switchTo(sessions.addSession());
    })
    .on('opensession', () => {
      EventCollection.events.OpenSession.invoke();
    })
    .on('importsession', () => {
      EventCollection.events.ImportSession.invoke();
    })
    .on('savesessionas', () => {
      const curSession = sessions.getCurrentSession();
      if (curSession) {
        EventCollection.events.SaveSessionAs.invoke(
          DashboardGlobals.compressObj(curSession._events.call('save'))
        );
      }
    })
    .on('absoluteapicheck', ({ menuItem }) => {
      if (menuItem.isTicked()) {
        $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
          content: 'Are you sure to disable Absolute API Permission Check? This will allow the components to <strong>access your files</strong> via absolute paths <strong>without you knowing it</strong>.',
          buttons: {
            confirm: () => {
              menuItem.untick();
              commonStorage.setItem('absolute_api_check', 'false');
            },
            cancel: () => { }
          }
        }));
      } else {
        menuItem.tick();
        commonStorage.setItem('absolute_api_check', 'true');
      }
    })
    .on('portapiwarning', ({ menuItem }) => {
      if (menuItem.isTicked()) {
        $.confirm($.extend({}, DashboardGlobals.confirmConfiguration, {
          content: 'Are you sure to disable Port API Warning? This will allow the components to <strong>arbitrarily</strong> listen to ports that might lead to <strong>cyclic updates</strong> that <strong>freeze</strong> the application.',
          buttons: {
            confirm: () => {
              menuItem.untick();
              commonStorage.setItem('port_api_warning', 'false');
            },
            cancel: () => { }
          }
        }));
      } else {
        menuItem.tick();
        commonStorage.setItem('port_api_warning', 'true');
      }
    })
    .on('strict', (e) => {
      const curSession = sessions.getCurrentSession();
      if (curSession) {
        curSession._events.call('strict');
        if (curSession.options().strict) { e.menuItem.tick(); } else { e.menuItem.untick(); }
      }
    })
    .on('exit', () => {
      EventCollection.events.Unload.send('exit');
    })
    .on('browser', () => {
      sessions.browserView.toggle();
    })
    .on('components', () => {
      sessions.componentView.toggle();
    });

  if (window.platform.get() !== 'darwin') {
    // Bind events to menu bar buttons (only if not on Darwin)
    DashboardMenubarButtons._events
      .on('minimize', () => {
        EventCollection.events.Minimize.send();
      })
      .on('maximize', () => {
        EventCollection.events.Maximize.send();
      })
      .on('unmaximize', () => {
        EventCollection.events.Unmaximize.send();
      })
      .on('close', () => {
        // Call implemented exit handler from the menubar
        DashboardMenubar._events.call('exit', null);
      });
  } else {
    // Bind events to traffic light buttons (if on Darwin)
    const $lights = DashboardMenubar.getMenuItemsById('trafficlights').$.find('.trafficlight');

    const $close = $lights.find('.trafficlight-close');
    const $minimize = $lights.find('.trafficlight-minimize');
    const $fullscreen = $lights.find('.trafficlight-fullscreen');

    const maximize = () => {
      WindowRequest.getIsMaximized() ? EventCollection.events.Unmaximize.send() : EventCollection.events.Maximize.send();
    };

    $lights.on('click', (e) => {
      const target = e.target;
      if ($close.has(target).length) {
        // Call implemented exit handler from the menubar
        DashboardMenubar._events.call('exit', null);
      } else if ($minimize.has(target).length) { EventCollection.events.Minimize.send(); } else if ($fullscreen.has(target).length) { maximize(); }
    }).on('dblclick', (e) => {
      const target = e.target;
      if ($close.has(target).length || $minimize.has(target).length || $fullscreen.has(target).length) return;
      maximize();
    });
  }

  // Tick auto save if enabled
  if (sessions.autoSave.running()) { DashboardMenubar.getMenuItemsById('autosave').tick(); } else { DashboardMenubar.getMenuItemsById('autosave').untick(); }

  // Tick absolute api check if enabled
  if ((await commonStorage.getItem('absolute_api_check')) !== 'false') { DashboardMenubar.getMenuItemsById('absoluteapicheck').tick(); } else { DashboardMenubar.getMenuItemsById('absoluteapicheck').untick(); }

  // Tick port api warning if enabled
  if ((await commonStorage.getItem('port_api_warning')) !== 'false') { DashboardMenubar.getMenuItemsById('portapiwarning').tick(); } else { DashboardMenubar.getMenuItemsById('portapiwarning').untick(); }

  // Perform check if the window is in maximize mode
  EventCollection.events.IsMaximized.sendSync();

  // UTILITIES
  function afterSessionSwitching (newSessionID) {
    // enable/disable menu items accordingly
    const items = ['importsession', 'savesessionas', 'strict'];
    items.forEach((item) => {
      if (newSessionID) { DashboardMenubar.getMenuItemsById(item).enable(); } else { DashboardMenubar.getMenuItemsById(item).disable(); }
    });

    // update strict mode toggler to correct tick state
    const strictItem = DashboardMenubar.getMenuItemsById('strict');
    const curSession = sessions.getCurrentSession();
    if (curSession && curSession.options().strict) { strictItem.tick(); } else { strictItem.untick(); }
  }
}).on('beforeunload', () => {
  DashboardStorage.clear();
});
