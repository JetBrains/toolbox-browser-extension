export const LOG_MESSAGE_TYPE = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

export class AbstractLogger {
  #enabled;

  constructor(enabled = false) {
    this.#enabled = enabled;
  }

  enable(enabled) {
    this.#enabled = enabled;

    this.info(`${this.constructor.name} is enabled`);
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
