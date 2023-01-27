import {MESSAGES, request} from '../api/messaging';
import {AbstractLogger, LOG_MESSAGE_TYPE} from '../api/logger';

class WebLogger extends AbstractLogger {
  constructor(enabled = false) {
    super(enabled);
  }

  _log(type, message) {
    switch (type) {
      case LOG_MESSAGE_TYPE.INFO:
        this.#sendLogMessage(MESSAGES.LOG_INFO, message);
        break;

      case LOG_MESSAGE_TYPE.WARN:
        this.#sendLogMessage(MESSAGES.LOG_WARN, message);
        break;

      case LOG_MESSAGE_TYPE.ERROR:
        this.#sendLogMessage(MESSAGES.LOG_ERROR, message);
        break;

      default:
        // no default
        break;
    }
  }

  #sendLogMessage(type, message) {
    chrome.runtime.sendMessage(request(type, message));
  }
}

const webLogger = new WebLogger();

chrome.runtime.sendMessage(request(MESSAGES.GET_LOGGING), response => {
  webLogger.enable(response.value);
});

export const logger = () => webLogger;

