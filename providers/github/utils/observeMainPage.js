import { CLONE_PROTOCOLS } from "../../../constants.js";
import { callToolbox, getToolboxURN } from "../../../api/toolbox.js";
import DomObserver from "../../../repositories/dom-observer.js";

export const observeMainPage = (metadata, tools) => {
  const domObserver = new DomObserver("#clone-with-https, #clone-with-ssh");

  domObserver.start((input) => {
    const isSsh = input.id === "clone-with-ssh";

    const grandparent = input.parentElement.parentElement;

    if (grandparent.nextElementSibling?.classList.contains("js-clone-menu")) {
      grandparent.parentElement.removeChild(grandparent.nextElementSibling);
    }

    const cloneMenu = createCloneMenu(metadata, tools, isSsh);
    grandparent.insertAdjacentElement("afterend", cloneMenu);

    chrome.runtime.sendMessage({
      type: "save-protocol",
      protocol: isSsh ? CLONE_PROTOCOLS.SSH : CLONE_PROTOCOLS.HTTPS,
    });
  });
};

const createCloneMenu = (metadata, tools, isSsh) => {
  const cloneMenu = document.createElement("ul");
  cloneMenu.classList.add("js-clone-menu");

  tools.forEach((tool) => {
    const toolItem = createCloneMenuItem(metadata, tool, isSsh);
    cloneMenu.appendChild(toolItem);
  });

  return cloneMenu;
};

const createCloneMenuItem = (metadata, tool, isSsh) => {
  const menuItem = document.createElement("li");
  menuItem.classList.add("clone-menu-item");

  const iconContainer = document.createElement("span");
  iconContainer.classList.add("clone-menu-item-icon-container");

  const icon = document.createElement("img");
  icon.setAttribute("alt", tool.name);
  icon.setAttribute("src", tool.icon);
  icon.setAttribute("width", "16");
  icon.setAttribute("height", "16");

  iconContainer.appendChild(icon);
  menuItem.appendChild(iconContainer);

  const textContainer = document.createElement("span");
  textContainer.textContent = `Clone with ${tool.name} via ${isSsh ? "SSH" : "HTTPS"}`;
  menuItem.appendChild(textContainer);

  menuItem.addEventListener("click", () => {
    const cloneUrl = isSsh ? metadata.sshCloneUrl : metadata.httpsCloneUrl;
    const action = getToolboxURN(tool.tag, cloneUrl);
    callToolbox(action);
  });

  return menuItem;
};
