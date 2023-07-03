const APPLICATION_NAME = 'com.jetbrains.toolbox';

const MESSAGES = {
  GET_CAPABILITIES: 'get-capabilities'
};

export class ToolboxAppState {
  status;
  error;

  constructor(status, error = null) {
    this.status = status;
    this.error = error;
  }
}

export const RESPONSE_STATUS = {
  OK: 'ok',
  ERROR: 'error'
};

export const TOOLBOX_APP_STATUS = {
  INSTALLED: 'installed',
  INSTALLED_ERROR: 'installed-error',
  NOT_INSTALLED: 'not-installed'
};

const sendNativeMessage = request => new Promise((resolve, reject) => {
  chrome.runtime.sendNativeMessage(APPLICATION_NAME, request, response => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError.message);
    } else {
      resolve(response);
    }
  });
});

const requestId = () => crypto.randomUUID();

const request = (message, args = {}) => ({method: message, arguments: args, id: requestId()});

export const getCapabilities = async () => await sendNativeMessage(request(MESSAGES.GET_CAPABILITIES));

export const getToolboxAppState = async () => {
  try {
    const response = await getCapabilities();
    if (response.status === RESPONSE_STATUS.OK) {
      return new ToolboxAppState(TOOLBOX_APP_STATUS.INSTALLED);
    } else {
      return new ToolboxAppState(TOOLBOX_APP_STATUS.INSTALLED_ERROR, response.error);
    }
  } catch (e) {
    return new ToolboxAppState(TOOLBOX_APP_STATUS.NOT_INSTALLED, e);
  }
};
