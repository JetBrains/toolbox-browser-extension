import logger from './webLogger';

const convertNumberToIndex = number => number - 1;

export const parseLineNumber = lineNumber => {
  const parsedValue = parseInt(lineNumber, 10);
  return isNaN(parsedValue) ? 1 : parsedValue;
};

export const getToolboxCloneUrl = (toolTag, cloneUrl) =>
  `jetbrains://${toolTag}/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;

export const getToolboxNavigateUrl = (toolTag, project, filePath, lineNumber = null) => {
  const lineIndex = convertNumberToIndex(lineNumber == null ? 1 : lineNumber);
  const columnIndex = convertNumberToIndex(1);

  return `jetbrains://${toolTag}/navigate/reference?project=${project}&path=${filePath}:${lineIndex}:${columnIndex}`;
};

export const callToolbox = url => {
  const fakeAction = document.createElement('a');
  fakeAction.style.position = 'absolute';
  fakeAction.style.left = '-9999em';
  fakeAction.href = url;
  document.body.appendChild(fakeAction);
  fakeAction.click();

  logger().info(`Called Toolbox with ${url}`);

  document.body.removeChild(fakeAction);
};
