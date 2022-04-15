import EventCollection from './_collection';
import { TSessionWrapper } from '../elements/session.wrapper'; // eslint-disable-line

let _binded = false;

/**
 * Package API
 * @module PackageRequest
 */
export default class PackageRequest {
  /**
     * Bind all events to the event collection
     * @param {TSessionWrapper} sessions The session wrapper
     */
  static bindAll (sessions) {
    if (_binded) { return; }

    EventCollection.on({
      id: 'RefreshPackages',
      name: 'request-refresh-packages',
      caller: function () {
        sessions._events.call('sticky-refresh-components');
      }
    }).on({
      id: 'GetPackages',
      name: 'request-get-packages'
    }).on({
      id: 'GetPackage',
      name: 'request-get-package',
      onlyInvoke: true
    }).on({
      id: 'GetComponent',
      name: 'request-get-component',
      onlyInvoke: true
    }).on({
      id: 'GetCompatibleComponent',
      name: 'request-get-compatible-component',
      onlyInvoke: true
    }).on({
      id: 'AddPackages',
      name: 'request-add-packages',
      onlyInvoke: true
    }).on({
      id: 'CompilePackage',
      name: 'request-compile-package',
      onlyInvoke: true
    }).on({
      id: 'RemovePackage',
      name: 'request-remove-package',
      onlyInvoke: true
    });

    _binded = true;
  }
}
