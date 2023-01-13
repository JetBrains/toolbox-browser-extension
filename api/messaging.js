export const MESSAGES = {
  GET_LOGGING: 'get-logging',
  SAVE_LOGGING: 'save-logging',
  LOG_INFO: 'log-info'
};

export const request = (type, value = null) => ({type, value});

export const response = value => ({value});
