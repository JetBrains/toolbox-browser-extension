/* eslint-disable no-console */

import {MESSAGES} from './messaging';

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
      if (message.value) {
        logger().enable(message.value);
        logger().info('Logger is enabled');
      } else {
        logger().info('Logger is disabled');
        logger().enable(message.value);
      }
      break;
    // no default
  }
});

export default function logger() {
  if (!window.__logger__) {
    window.__logger__ = new Logger();
  }
  return window.__logger__;
}
