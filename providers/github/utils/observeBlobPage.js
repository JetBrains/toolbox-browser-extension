import DomObserver from "../../../repositories/dom-observer.js";
import { callToolbox, getToolboxNavURN } from "../../../api/toolbox.js";

export const observeBlobPage = (metadata, tools) => {
  const domObserver = new DomObserver("#__primerPortalRoot__ ul[aria-label='Open with...']");

  domObserver.start((openWithMenu) => {
    const lastMenuItem = openWithMenu.lastChild;
    const openMenuItems = createOpenMenuItems(metadata, tools);
    openMenuItems.forEach((openMenuItem) => {
      lastMenuItem.insertAdjacentElement("beforebegin", openMenuItem);
    });
  });
};

const createOpenMenuItems = (metadata, tools) =>
  tools.map((tool) => createOpenMenuItem(metadata, tool));

const createOpenMenuItem = (metadata, tool) => {
  const menuItem = document.createElement("li");
  menuItem.classList.add("open-menu-item");

  const menuItemLink = document.createElement("a");
  menuItemLink.classList.add("open-menu-item-link");
  menuItemLink.href = "#";
  menuItemLink.addEventListener("click", (event) => {
    event.preventDefault();

    const { user, project, branch } = metadata;
    const normalizedBranch = branch.split("/").shift();
    const filePath = location.pathname.replace(`/${user}/${project}/blob/${normalizedBranch}/`, "");

    callToolbox(getToolboxNavURN(tool.tag, project, filePath));
  });

  const menuItemDiv = document.createElement("div");
  menuItemDiv.classList.add("open-menu-item-div");

  const menuItemSpan = document.createElement("span");
  menuItemSpan.classList.add("open-menu-item-span");
  menuItemSpan.textContent = tool.name;

  menuItemDiv.appendChild(menuItemSpan);
  menuItemLink.appendChild(menuItemDiv);
  menuItem.appendChild(menuItemLink);

  return menuItem;
};
