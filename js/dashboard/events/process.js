import EventCollection from './_collection';

let _binded = false;

/**
 * Process API
 * @module ProcessRequest
 */
export default class ProcessRequest {
  /**
     * Bind all events to the event collection
     */
  static bindAll () {
    if (_binded) { return; }

    EventCollection
      .on({
        id: 'ComponentRunFile',
        name: 'request-component-run-file',
        onlyInvoke: true
      })
      .on({
        id: 'ComponentRunCommand',
        name: 'request-component-run-command',
        onlyInvoke: true
      })
      .on({
        id: 'ComponentRunCommandInShell',
        name: 'request-component-run-command-in-shell',
        onlyInvoke: true
      });

    _binded = true;
  }
}
