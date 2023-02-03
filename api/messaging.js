export const MESSAGES = {
  GET_LOGGING: 'get-logging',
  SAVE_LOGGING: 'save-logging',
  ENABLE_WEB_LOGGER: 'enable-web-logger',
  LOG_INFO: 'log-info',
  LOG_WARN: 'log-warn',
  LOG_ERROR: 'log-error'
};

export const request = (type, value = null) => ({type, value});

export const response = value => ({value});
