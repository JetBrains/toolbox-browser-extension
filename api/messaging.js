export const MESSAGES = {
  GET_LOGGING: 'get-logging',
  SAVE_LOGGING: 'save-logging'
};

export const request = (type, value = null) => ({type, value});

export const response = value => ({value});
