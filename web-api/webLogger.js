import {MESSAGES, request} from '../api/messaging';
import {AbstractLogger, LOG_MESSAGE_TYPE} from '../api/abstractLogger';

class WebLogger extends AbstractLogger {
  constructor(enabled = false) {
    super(enabled);

    chrome.runtime.onMessage.addListener(message => {
      if (message.type === MESSAGES.TOGGLE_WEB_LOGGER) {
        this.enable(message.value);
      }
    });
  }

  _log(type, message) {
    switch (type) {
      case LOG_MESSAGE_TYPE.INFO:
        chrome.runtime.sendMessage(request(MESSAGES.LOG_INFO, message));
        break;

      case LOG_MESSAGE_TYPE.WARN:
        chrome.runtime.sendMessage(request(MESSAGES.LOG_WARN, message));
        break;

      case LOG_MESSAGE_TYPE.ERROR:
        chrome.runtime.sendMessage(request(MESSAGES.LOG_ERROR, message));
        break;

      // no default
    }
  }
}

const webLogger = new WebLogger();

chrome.runtime.sendMessage(request(MESSAGES.GET_LOGGING), response => {
  webLogger.enable(response.value);
});

export default function logger() {
  return webLogger;
}

