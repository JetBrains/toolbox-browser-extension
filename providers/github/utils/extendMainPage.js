import { CLONE_PROTOCOLS } from "../../../constants.js";
import { callToolbox, getToolboxURN } from "../../../api/toolbox.js";
import DomObserver from "../../../repositories/dom-observer.js";

export const extendMainPage = (metadata, tools) => {
  const domObserver = new DomObserver("#clone-with-https, #clone-with-ssh");

  domObserver.start((input) => {
    const isSsh = input.id === "clone-with-ssh";

    const grandparent = input.parentElement.parentElement;

    if (grandparent.nextElementSibling?.classList.contains("js-tools-list")) {
      grandparent.parentElement.removeChild(grandparent.nextElementSibling);
    }

    const toolsList = createToolsList(metadata, tools, isSsh);
    grandparent.insertAdjacentElement("afterend", toolsList);

    chrome.runtime.sendMessage({
      type: "save-protocol",
      protocol: isSsh ? CLONE_PROTOCOLS.SSH : CLONE_PROTOCOLS.HTTPS,
    });
  });
};

const createToolsList = (metadata, tools, isSsh) => {
  const toolsList = document.createElement("ul");
  toolsList.classList.add("js-tools-list");

  tools.forEach((tool) => {
    const toolItem = createToolItem(metadata, tool, isSsh);
    toolsList.appendChild(toolItem);
  });

  return toolsList;
};

const createToolItem = (metadata, tool, isSsh) => {
  const installedTool = document.createElement("li");
  installedTool.classList.add("installed-tool");

  const toolIconContainer = document.createElement("span");
  toolIconContainer.classList.add("tool-icon-container");

  const toolIcon = document.createElement("img");
  toolIcon.setAttribute("alt", tool.name);
  toolIcon.setAttribute("src", tool.icon);
  toolIcon.setAttribute("width", "16");
  toolIcon.setAttribute("height", "16");

  toolIconContainer.appendChild(toolIcon);
  installedTool.appendChild(toolIconContainer);

  const toolText = document.createElement("span");
  toolText.textContent = `Clone with ${tool.name} via ${isSsh ? "SSH" : "HTTPS"}`;
  installedTool.appendChild(toolText);

  installedTool.addEventListener("click", () => {
    const cloneUrl = isSsh ? metadata.sshCloneUrl : metadata.httpsCloneUrl;
    const action = getToolboxURN(tool.tag, cloneUrl);
    callToolbox(action);
  });

  return installedTool;
};
