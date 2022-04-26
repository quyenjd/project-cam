import EventCollection from './_collection';
import { TSessionWrapper } from '../elements/session.wrapper'; // eslint-disable-line

let _binded = false;

/**
 * Log API
 * @module LogRequest
 */
export default class LogRequest {
  /**
     * Bind all events to the event collection
     * @param {TSessionWrapper} sessions The session wrapper
     */
  static bindAll (sessions) {
    if (_binded) { return; }

    EventCollection.on({
      id: 'PushLog',
      name: 'request-push-log',
      caller: function (event, html) {
        sessions._events.call('sticky-log', sessions, html);
      }
    });

    _binded = true;
  }
}
