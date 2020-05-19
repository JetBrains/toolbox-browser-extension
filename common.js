import ideaIcon from '@jetbrains/logos/intellij-idea/intellij-idea.svg';

export const DEFAULT_TOOL = {
  name: 'IntelliJ IDEA',
  tag: 'idea',
  // eslint-disable-next-line camelcase
  icon_url: chrome.runtime.getURL(ideaIcon)
};

export const CLONE_PROTOCOLS = {
  HTTPS: 'HTTPS',
  SSH: 'SSH'
};

const convertNumberToIndex = number => number - 1;

export function getToolboxURN(toolTag, cloneUrl) {
  return `jetbrains://${toolTag}/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;
}

export function getToolboxNavURN(toolTag, project, filePath, lineNumber = null) {
  const lineIndex = convertNumberToIndex(lineNumber == null ? 1 : lineNumber);
  const columnIndex = convertNumberToIndex(1);
  return `jetbrains://${toolTag}/navigate/reference?project=${project}&path=${filePath}:${lineIndex}:${columnIndex}`;
}

export function callToolbox(action) {
  const fakeAction = document.createElement('a');
  fakeAction.style.position = 'absolute';
  fakeAction.style.left = '-9999em';
  fakeAction.href = action;
  document.body.appendChild(fakeAction);
  fakeAction.click();
  document.body.removeChild(fakeAction);
}

export function getProtocol() {
  return new Promise(resolve => {
    chrome.storage.local.get(['protocol'], result => {
      resolve(result.protocol || CLONE_PROTOCOLS.HTTPS);
    });
  });
}

export function saveProtocol(value) {
  return new Promise(resolve => {
    chrome.storage.local.set({protocol: value}, () => {
      resolve();
    });
  });
}
