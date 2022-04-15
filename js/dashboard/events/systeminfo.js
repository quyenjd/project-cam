import EventCollection from './_collection';

let _binded = false;

/**
 * System information API
 * @module SystemInfoRequest
 */
export default class SystemInfoRequest {
  /**
     * Bind all events to the event collection
     */
  static bindAll () {
    if (_binded) { return; }

    EventCollection.on({
      id: 'ComponentSystemInfo',
      name: 'request-component-system-info',
      onlyInvoke: true
    });

    _binded = true;
  }
}
