/* eslint-disable no-console */

import {AbstractLogger, LOG_MESSAGE_TYPE} from './abstractLogger';

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

export default function logger() {
  return consoleLogger;
}
