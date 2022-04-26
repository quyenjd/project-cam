import EventCollection from './_collection';
import { DashboardGlobals, DashboardMenubarButtons, DashboardStorage, DashboardUnloadConfirm, ensureHTML } from '../globals';

let _binded = false; let _maximized = false;

/**
 * Window requests API
 * @class WindowRequest
 */
export default class WindowRequest {
  /**
     * Check if the window is maximized
     * @returns {boolean} true if the window is maximized, false otherwise
     */
  static getIsMaximized () {
    return _maximized;
  }

  /**
     * Bind all events to the event collection
     */
  static bindAll () {
    if (_binded) { return; }

    EventCollection
      .on({
        id: 'Reload',
        name: 'request-reload'
      })
      .on({
        id: 'Unload',
        name: 'request-unload'
      })
      .on({
        id: 'Maximize',
        name: 'request-maximize',
        caller: () => {
          _maximized = true;
          DashboardMenubarButtons.getMenuItemsById('maximize').hide();
          DashboardMenubarButtons.getMenuItemsById('unmaximize').show();
        }
      })
      .on({
        id: 'Unmaximize',
        name: 'request-unmaximize',
        caller: () => {
          _maximized = false;
          DashboardMenubarButtons.getMenuItemsById('maximize').show();
          DashboardMenubarButtons.getMenuItemsById('unmaximize').hide();
        }
      })
      .on({
        id: 'IsMaximized',
        name: 'request-is-maximized'
      })
      .on({
        id: 'Minimize',
        name: 'request-minimize'
      })
      .on({
        id: 'RaiseError',
        name: 'request-raise-error',
        caller: (event, err) => {
          $.alert($.extend({}, DashboardGlobals.alertConfiguration, {
            title: 'Error',
            content: `<span style="white-space: pre-wrap;">${ensureHTML(err)}</span>`
          }));
        }
      })
      .on({
        id: 'Destroy',
        name: 'request-destroy'
      })
      .on({
        id: 'WillClose',
        name: 'request-will-close',
        caller: () => {
          DashboardUnloadConfirm(() => {
            DashboardStorage.clear();
            EventCollection.events.Destroy.send();
          });
        }
      });

    _binded = true;
  }
}
