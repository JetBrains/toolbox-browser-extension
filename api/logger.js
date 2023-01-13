/* eslint-disable no-console */

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

  warn(message, error = null) {
    if (this.#enabled) {
      if (error) {
        this.error(error.message);
      }
      console.warn(message);
    }
  }

  error(message) {
    if (this.#enabled) {
      console.error(message);
    }
  }
}

export default function logger() {
  if (!window.__logger__) {
    window.__logger__ = new Logger();
  }
  return window.__logger__;
}
