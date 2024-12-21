import DomObserver from "../../utils/dom-observer.js";
import { getToolboxURN } from "../../../api/toolbox.js";
import { SUPPORTED_TOOLS } from "../../../constants.js";

export const observeIndexPage = (metadata, tools) => {
  const domObserver = new DomObserver("#copy-http-url-input");

  domObserver.start((el) => {
    const parentListItem = el.closest("li").parentElement.closest("li");
    const cloneActionsContainer = parentListItem.nextElementSibling;
    const cloneActionsList = cloneActionsContainer.querySelector("ul");

    const skipIntellijIdea = cloneActionsList.innerText.includes(SUPPORTED_TOOLS.idea.name);

    tools
      .filter((t) => (skipIntellijIdea ? t.tag !== "idea" : true))
      .forEach((tool) => {
        const sshItem = createCloneMenuItem(metadata, tool, true);
        cloneActionsList.appendChild(sshItem);
        const httpsItem = createCloneMenuItem(metadata, tool, false);
        cloneActionsList.appendChild(httpsItem);
      });
  });
};

const createCloneMenuItem = (metadata, tool, isSsh) => {
  const li = document.createElement("li");
  li.classList.add("gl-new-dropdown-item");
  li.tabIndex = 0;

  const a = document.createElement("a");
  a.classList.add("gl-new-dropdown-item-content");
  a.tabIndex = -1;
  a.target = "_self";
  a.href = getToolboxURN(tool.tag, isSsh ? metadata.sshCloneUrl : metadata.httpsCloneUrl);
  li.appendChild(a);

  const span = document.createElement("span");
  span.classList.add("gl-new-dropdown-item-text-wrapper");
  span.textContent = `${tool.name} (${isSsh ? "SSH" : "HTTPS"})`;
  a.appendChild(span);

  return li;
};
