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
