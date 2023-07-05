import {info} from './web-logger';

const convertNumberToIndex = number => number - 1;

export const parseLineNumber = lineNumber => {
  const parsedValue = parseInt(lineNumber, 10);
  return isNaN(parsedValue) ? 1 : parsedValue;
};

export const getToolboxCloneUrl = (toolId, cloneUrl) =>
  `jetbrains://${toolId}.tool/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;

export const getToolboxOpenUrl = (toolId, project, filePath, lineNumber = null) => {
  const line = convertNumberToIndex(lineNumber == null ? 1 : lineNumber);
  const column = convertNumberToIndex(1);

  return `jetbrains://${toolId}.tool/navigate/reference?project=${project}&path=${filePath}:${line}:${column}`;
};

export const callToolbox = url => {
  const fakeAction = document.createElement('a');
  fakeAction.style.position = 'absolute';
  fakeAction.style.left = '-9999em';
  fakeAction.href = url;
  document.body.appendChild(fakeAction);
  fakeAction.click();

  info(`Called Toolbox App with ${url}`);

  document.body.removeChild(fakeAction);
};

export const getInstalledTools = () => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage({type: 'get-installed-tools'}, toolsResponse => {
    if (toolsResponse.errorMessage) {
      reject(new Error(toolsResponse.errorMessage));
    } else {
      resolve(toolsResponse.tools);
    }
  });
});
