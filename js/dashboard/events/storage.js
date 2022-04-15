import EventCollection from './_collection';

let _binded = false;

/**
 * Storage requests API
 * @class StorageRequest
 */
export default class StorageRequest {
  /**
     * Bind all events to the event collection
     */
  static bindAll () {
    if (_binded) { return; }

    EventCollection
      .on({
        id: 'GetStorage',
        name: 'request-get-storage',
        onlyInvoke: true
      })
      .on({
        id: 'SetStorage',
        name: 'request-set-storage',
        onlyInvoke: true
      })
      .on({
        id: 'GetField',
        name: 'request-get-field',
        onlyInvoke: true
      })
      .on({
        id: 'SetField',
        name: 'request-set-field',
        onlyInvoke: true
      });

    _binded = true;
  }
}
