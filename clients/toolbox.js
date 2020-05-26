import {TOOLBOX_ERRORS} from '../constants';

const APPLICATION_NAME = 'com.jetbrains.toolbox';

const MESSAGE_NAMES = {
  TOOLS: 'tools',
  VERSION: 'version'
};

const sendMessage = name => new Promise((resolve, reject) => {
  chrome.runtime.sendNativeMessage(APPLICATION_NAME, {request: name}, response => {
    if (chrome.runtime.lastError) {
      reject(TOOLBOX_ERRORS.COMMUNICATION_ERROR);
    } else {
      resolve(response.data);
    }
  });
});

export const getVersion = () => sendMessage(MESSAGE_NAMES.VERSION);

export const getTools = () => sendMessage(MESSAGE_NAMES.TOOLS).then(tools => {
  if (Array.isArray(tools) && tools.length > 0) {
    return tools;
  }
  throw TOOLBOX_ERRORS.TOOLS_NOT_FOUND;
});

const callTool = action => {
  const code = `
    fakeToolboxAction = document.createElement('a');
    fakeToolboxAction.style = 'position:absolute;left:-9999em';
    fakeToolboxAction.href = '${action}';
    document.body.appendChild(fakeToolboxAction);
    fakeToolboxAction.click();
    document.body.removeChild(fakeToolboxAction);
    delete window.fakeToolboxAction;
  `;

  chrome.tabs.executeScript(null, {code}, () => {
    // eslint-disable-next-line no-void
    void chrome.runtime.lastError;
  });
};

export const cloneInTool = (toolType, cloneURL) => {
  const action = `jetbrains://${toolType}/checkout/git?checkout.repo=${cloneURL}&idea.required.plugins.id=Git4Idea`;
  callTool(action);
};

const convertNumberToIndex = number => number - 1;

export const navigateInTool = (toolType, project, filePath, lineNumber = null) => {
  const lineIndex = convertNumberToIndex(lineNumber == null ? 1 : lineNumber);
  const action = `jetbrains://${toolType}/navigate/reference?project=${project}&path=${filePath}:${lineIndex}`;
  callTool(action);
};
