import { convertNumberToIndex } from "../utils/index.js";

export const getToolboxCloneUrl = (toolTag, cloneUrl) =>
  `jetbrains://${toolTag}/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;

export const getToolboxNavigateUrl = (toolTag, project, filePath, lineNumber = null) => {
  const lineIndex = convertNumberToIndex(lineNumber == null ? 1 : lineNumber);
  const columnIndex = convertNumberToIndex(1);
  const encodedToolTag = encodeURIComponent(toolTag);
  const encodedProject = encodeURIComponent(project);

  return `jetbrains://${encodedToolTag}/navigate/reference?project=${encodedProject}&path=${filePath}:${lineIndex}:${columnIndex}`;
};

export const callToolbox = (action) => {
  const fakeAction = document.createElement("a");
  fakeAction.style.position = "absolute";
  fakeAction.style.left = "-9999em";
  fakeAction.href = action;
  document.body.appendChild(fakeAction);
  fakeAction.click();
  document.body.removeChild(fakeAction);
};
