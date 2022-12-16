/* eslint-disable no-console */

import {MESSAGES} from './messages';

class Logger {
  #enabled;

  constructor(enabled = false) {
    this.#enabled = enabled;
  }

  enable(enabled) {
    this.#enabled = enabled;
  }

  info(message) {
    if (this.#enabled) {
      console.info(message);
    }
  }

  warn(message) {
    if (this.#enabled) {
      console.warn(message);
    }
  }

  error(message) {
    if (this.#enabled) {
      console.error(message);
    }
  }
}

chrome.runtime.onMessage.addListener(message => {
  switch (message.type) {
    case MESSAGES.SAVE_LOGGING:
      if (message.allow) {
        ensureLogger().enable(message.allow);
        ensureLogger().info('Logger is enabled');
      } else {
        ensureLogger().info('Logger is disabled');
        ensureLogger().enable(message.allow);
      }
      break;
    // no default
  }
});

export default function ensureLogger() {
  if (!window.__logger__) {
    window.__logger__ = new Logger();
  }
  return window.__logger__;
}
