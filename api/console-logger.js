/* eslint-disable no-console */

import {AbstractLogger, LOG_MESSAGE_TYPE} from './abstract-logger';

class ConsoleLogger extends AbstractLogger {
  constructor(enabled = false) {
    super(enabled);
  }

  _log(type, message) {
    switch (type) {
      case LOG_MESSAGE_TYPE.INFO:
        console.info(message);
        break;

      case LOG_MESSAGE_TYPE.WARN:
        console.warn(message);
        break;

      case LOG_MESSAGE_TYPE.ERROR:
        console.error(message);
        break;

      // no default
    }
  }
}

const consoleLogger = new ConsoleLogger();

export const enableLogger = enable => consoleLogger.enable(enable);
export const info = message => consoleLogger.info(message);
export const warn = (message, error = null) => consoleLogger.warn(message, error);
export const error = message => consoleLogger.error(message);
