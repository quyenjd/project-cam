const { webContents } = require('electron');
const Logger = require('../logger');
const EC = require('./_collection');

const pushLogFn = ({ html }) => {
  EC.events.PushLog.send(webContents.getAllWebContents(), html);
};

/**
 * Log API
 * @module LogRequest
 */
module.exports = class LogRequest {
  /**
   * Bind all events to the event collection
   */
  static bindAll () {
    EC.on({
      id: 'PushLog',
      name: 'request-push-log'
    });

    Logger.onLogged(pushLogFn);
  }
};
