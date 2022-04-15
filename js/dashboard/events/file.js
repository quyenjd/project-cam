import EventCollection from './_collection';
import { TSessionWrapper } from '../elements/session.wrapper'; // eslint-disable-line
import { DashboardGlobals, DashboardMenubar, DashboardUnloadConfirm } from '../globals';

let _binded = false;

/**
 * File requests API
 * @class FileRequest
 */
export default class FileRequest {
  /**
     * Bind all events to the event collection
     * @param {TSessionWrapper} sessions The session wrapper
     */
  static bindAll (sessions) {
    if (_binded) { return; }

    EventCollection
      .on({
        id: 'OpenProject',
        name: 'request-open-project',
        caller: (event, data) => {
          DashboardUnloadConfirm(() => {
            updateMenubarName(data.ellipted, data.fullPath);
            sessions.state.restore(DashboardGlobals.decompressObj(data.data));
          });
        },
        onlyInvoke: true
      })
      .on({
        id: 'SaveProject',
        name: 'request-save-project',
        caller: (event, newFileInfo) => {
          updateMenubarName(newFileInfo.ellipted, newFileInfo.fullPath);
        },
        onlyInvoke: true
      })
      .on({
        id: 'SaveProjectAs',
        name: 'request-save-project-as',
        onlyInvoke: true
      })
      .on({
        id: 'EnableSaveAs',
        name: 'request-enable-save-as',
        caller: () => {
          DashboardMenubar.getMenuItemsById('saveprojectas').enable();
        }
      })
      .on({
        id: 'OpenSession',
        name: 'request-open-session',
        caller: (event, data) => {
          const session = sessions.getSession(sessions.addSession());
          session.state.restore(data.data);
          sessions.switchTo(session._sessionID);
        },
        onlyInvoke: true
      })
      .on({
        id: 'ImportSession',
        name: 'request-import-session',
        caller: (event, data) => {
          const session = sessions.getCurrentSession();
          if (session) { session.state.restore(data.data); }
        },
        onlyInvoke: true
      })
      .on({
        id: 'SaveSessionAs',
        name: 'request-save-session-as',
        onlyInvoke: true
      })
      .on({
        id: 'ComponentReadFile',
        name: 'request-component-read-file',
        onlyInvoke: true
      })
      .on({
        id: 'ComponentReadFileFrom',
        name: 'request-component-read-file-from',
        onlyInvoke: true
      })
      .on({
        id: 'ComponentSaveFile',
        name: 'request-component-save-file',
        onlyInvoke: true
      })
      .on({
        id: 'ComponentSaveFileAs',
        name: 'request-component-save-file-as',
        onlyInvoke: true
      })
      .on({
        id: 'ReadFile',
        name: 'request-read-file',
        onlyInvoke: true
      })
      .on({
        id: 'SaveFile',
        name: 'request-save-file',
        onlyInvoke: true
      });

    _binded = true;
  }
}

// UTILITIES
function updateMenubarName (ellipted, full) {
  const fileItem = DashboardMenubar.getMenuItemsById('file');
  fileItem.name = ellipted;
  fileItem.$.attr('title', full);
}
