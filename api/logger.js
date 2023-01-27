/* eslint-disable no-console */

import {MESSAGES} from './messaging';

export const LOG_MESSAGE_TYPE = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

export class AbstractLogger {
  #enabled;

  constructor(enabled = false) {
    this.#enabled = enabled;

    chrome.runtime.onMessage.addListener(message => {
      if (message.type === MESSAGES.SAVE_LOGGING) {
        this.enable(message.value);
      }
    });
  }

  enable(enabled) {
    this.#enabled = enabled;

    if (enabled) {
      this.info(`Logger '${this.constructor.name}' is enabled`);
    }
  }

  info(message) {
    if (this.#enabled) {
      this._log(LOG_MESSAGE_TYPE.INFO, message);
    }
  }

  warn(message, error = null) {
    if (this.#enabled) {
      if (error) {
        this.error(error.message);
      }
      this._log(LOG_MESSAGE_TYPE.WARN, message);
    }
  }

  error(message) {
    if (this.#enabled) {
      this._log(LOG_MESSAGE_TYPE.ERROR, message);
    }
  }

  // eslint-disable-next-line no-unused-vars
  _log(type, message) {
    throw new Error('Method #log is abstract and must be implemented');
  }
}


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
      default:
        // no default
        break;
    }
  }
}

export default function logger() {
  if (!window.__logger__) {
    window.__logger__ = new ConsoleLogger();
  }
  return window.__logger__;
}
