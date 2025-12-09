import { DomObserver, getToolboxCloneUrl, callToolbox } from "../../../services/index.js";
import { SUPPORTED_TOOLS } from "../../../models/index.js";
import { PROTOCOLS } from "../../../constants/index.js";

export const observeIndexPage = (metadata, tools, showExternalButtons = false) => {
  if (showExternalButtons) {
    observeExternalButtons(metadata, tools);
  }
  // Always add dropdown items
  observeDropdownItems(metadata, tools);
};

const observeExternalButtons = (metadata, tools) => {
  const domObserver = new DomObserver('[data-testid="code-dropdown"]');

  domObserver.start((codeDropdownEl) => {
    // Remove any previously added button group
    const existingButtonGroup = codeDropdownEl.parentElement.querySelector('[data-testid="toolbox-clone-button-group"]');
    if (existingButtonGroup) {
      existingButtonGroup.remove();
    }

    // Find the parent container that holds the Code button and overflow menu
    const buttonsContainer = codeDropdownEl.parentElement;

    // Create a single button group with all IDE logos
    const buttonGroup = createUnifiedCloneButtonGroup(metadata, tools);

    // Insert the button group before the Code dropdown
    buttonsContainer.insertBefore(buttonGroup, codeDropdownEl);
  });
};

const observeDropdownItems = (metadata, tools) => {
  const domObserver = new DomObserver("#copy-http-url-input");

  domObserver.start((el) => {
    const parentListItem = el.closest("li").parentElement.closest("li");
    const cloneActionsContainer = parentListItem.nextElementSibling;
    const cloneActionsList = cloneActionsContainer.querySelector("ul");

    // Remove any previously added items
    cloneActionsList.querySelectorAll('[data-testid="toolbox-clone-menu-item"]').forEach((item) => item.remove());

    let skipIntellijIdea = false;
    cloneActionsList.querySelectorAll("[data-testid='disclosure-dropdown-item']").forEach((el) => {
      if (el.textContent.includes(SUPPORTED_TOOLS.idea.name)) {
        el.dataset.testid = "clone-menu-item";
        skipIntellijIdea = true;
      }
    });

    tools
      .filter((t) => (skipIntellijIdea ? t.tag !== SUPPORTED_TOOLS.idea.tag : true))
      .forEach((tool) => {
        const item = createModernCloneMenuItem(metadata, tool);
        cloneActionsList.appendChild(item);
      });
  });
};

const createUnifiedCloneButtonGroup = (metadata, tools) => {
  // Create a single button group container for all IDEs
  const buttonGroup = document.createElement("div");
  buttonGroup.setAttribute("role", "group");
  buttonGroup.classList.add("gl-button-group", "btn-group");
  buttonGroup.dataset.testid = "toolbox-clone-button-group";

  // Add a button for each tool
  tools.forEach((tool) => {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("class", "btn gl-button btn-default btn-md btn-icon");
    button.setAttribute("aria-label", `Clone in ${tool.name}`);
    button.setAttribute("title", `Clone in ${tool.name}`);
    button.dataset.toolTag = tool.tag;

    const icon = document.createElement("img");
    icon.setAttribute("alt", tool.name);
    icon.setAttribute("src", tool.icon);
    icon.setAttribute("class", "gl-button-icon gl-icon s16");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");
    button.appendChild(icon);

    // Click handler that respects user's protocol preference
    button.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: "get-protocol" }, ({ protocol }) => {
        const cloneUrl = protocol === PROTOCOLS.HTTPS ? metadata.httpsCloneUrl : metadata.sshCloneUrl;
        const action = getToolboxCloneUrl(tool.tag, cloneUrl);
        callToolbox(action);
      });
    });

    buttonGroup.appendChild(button);
  });

  return buttonGroup;
};

const createModernCloneMenuItem = (metadata, tool) => {
  const li = document.createElement("li");
  li.setAttribute("tabindex", "0");
  li.setAttribute("data-testid", "toolbox-clone-menu-item");
  li.setAttribute("label", "Open with");
  li.classList.add("gl-mb-3", "gl-flex", "gl-w-full", "gl-items-center", "gl-justify-between", "gl-px-4", "gl-py-2", "gl-new-dropdown-item");

  // Tool name span
  const nameSpan = document.createElement("span");
  nameSpan.classList.add("gl-min-w-0");
  nameSpan.textContent = tool.name;
  li.appendChild(nameSpan);

  // Button group container
  const buttonGroup = document.createElement("div");
  buttonGroup.setAttribute("role", "group");
  buttonGroup.classList.add("gl-button-group", "btn-group");

  // SSH button
  const sshButton = document.createElement("button");
  sshButton.setAttribute("type", "button");
  sshButton.classList.add("btn", "gl-button", "btn-default", "btn-sm");

  const sshSpan = document.createElement("span");
  sshSpan.classList.add("gl-button-text");
  sshSpan.textContent = "SSH";
  sshButton.appendChild(sshSpan);

  sshButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const action = getToolboxCloneUrl(tool.tag, metadata.sshCloneUrl);
    callToolbox(action);
  });

  // HTTPS button
  const httpsButton = document.createElement("button");
  httpsButton.setAttribute("type", "button");
  httpsButton.classList.add("btn", "gl-button", "btn-default", "btn-sm");

  const httpsSpan = document.createElement("span");
  httpsSpan.classList.add("gl-button-text");
  httpsSpan.textContent = "HTTPS";
  httpsButton.appendChild(httpsSpan);

  httpsButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const action = getToolboxCloneUrl(tool.tag, metadata.httpsCloneUrl);
    callToolbox(action);
  });

  buttonGroup.appendChild(sshButton);
  buttonGroup.appendChild(httpsButton);
  li.appendChild(buttonGroup);

  return li;
};
