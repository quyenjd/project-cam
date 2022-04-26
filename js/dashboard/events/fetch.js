import EventCollection from './_collection';

let _binded = false;

/**
 * Fetch API
 * @module FetchRequest
 */
export default class FetchRequest {
  /**
     * Bind all events to the event collection
     */
  static bindAll () {
    if (_binded) { return; }

    EventCollection.on({
      id: 'ComponentFetch',
      name: 'request-component-fetch',
      onlyInvoke: true
    });

    _binded = true;
  }
}
