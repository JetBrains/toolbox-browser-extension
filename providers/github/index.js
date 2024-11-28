import { fetchMetadata, getHttpsCloneUrl, getSshCloneUrl } from "./utils/metadata.js";
import { fetchTools } from "./utils/tools.js";
import { callToolbox, getToolboxURN } from "../../api/toolbox.js";
import DomObserver from "../../utils/dom-observer.js";
import { CLONE_PROTOCOLS } from "../../constants.js";

export async function toolboxify(isEnterprise = false) {
  const metadata = fetchMetadata(isEnterprise);

  if (!metadata) {
    return;
  }

  const tools = await fetchTools(metadata);

  initPageAction(metadata, tools);

  listenToDomChanges(metadata, tools);
}

const initPageAction = (metadata, tools) => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "get-tools":
        sendResponse(tools);
        return true;
      case "perform-action":
        const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
        callToolbox(toolboxAction);
        break;
      // no default
    }
    return undefined;
  });

  chrome.runtime.sendMessage({
    type: "enable-page-action",
    project: metadata.repo,
    https: getHttpsCloneUrl(metadata),
    ssh: getSshCloneUrl(metadata),
  });
};

const listenToDomChanges = (metadata, tools) => {
  const httpsInputObserver = new DomObserver("#clone-with-https, #clone-with-ssh");

  httpsInputObserver.start((input) => {
    const isSsh = input.id === "clone-with-ssh";

    const grandparent = input.parentElement.parentElement;

    if (grandparent.nextElementSibling.classList.contains("js-toolbox-tools")) {
      grandparent.parentElement.removeChild(grandparent.nextElementSibling);
    }

    const toolsList = document.createElement("ul");
    toolsList.classList.add("js-toolbox-tools");

    tools.forEach((tool) => {
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

      toolsList.appendChild(installedTool);
    });

    grandparent.insertAdjacentElement("afterend", toolsList);

    chrome.runtime.sendMessage({
      type: "save-protocol",
      protocol: isSsh ? CLONE_PROTOCOLS.SSH : CLONE_PROTOCOLS.HTTPS,
    });
  });
};
