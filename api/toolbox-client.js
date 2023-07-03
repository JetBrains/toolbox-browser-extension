const APPLICATION_NAME = 'com.jetbrains.toolbox';

const MESSAGES = {
  GET_CAPABILITIES: 'get-capabilities',
  GET_INSTALLED_TOOLS: 'get-installed-tools'
};

export const RESPONSE_STATUS = {
  OK: 'ok',
  ERROR: 'error'
};

export const TOOLBOX_APP_STATUS = {
  INSTALLED: 'installed',
  INSTALLED_ERROR: 'installed-error',
  NOT_INSTALLED: 'not-installed'
};

export class ToolboxAppState {
  status;
  error;

  constructor(status, error = null) {
    this.status = status;
    this.error = error;
  }
}

class Request {
  method;
  arguments;
  id;

  constructor(message, args = {}) {
    this.method = message;
    this.arguments = args;
    this.id = Request.requestId();
  }

  static requestId() {
    return crypto.randomUUID();
  }
}

const sendNativeMessage = request => new Promise((resolve, reject) => {
  chrome.runtime.sendNativeMessage(APPLICATION_NAME, request, response => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError);
    } else {
      resolve(response);
    }
  });
});

export const getCapabilities = () => sendNativeMessage(new Request(MESSAGES.GET_CAPABILITIES));

export const getInstalledTools = () => sendNativeMessage(new Request(MESSAGES.GET_INSTALLED_TOOLS));

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
