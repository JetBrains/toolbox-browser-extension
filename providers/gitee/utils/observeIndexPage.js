import DomObserver from "../../../src/services/DomObserver.js";
import { PROTOCOLS } from "../../../src/constants/protocols.js";
import { callToolbox, getToolboxCloneUrl } from "../../../src/services/Toolbox.js";

const menuContainerClickHandler = (e) => {
  const tab = e.target;
  const menuContainer = e.currentTarget;
  const content = menuContainer.parentElement;

  if (tab.dataset.type === "jb") {
    e.stopImmediatePropagation();

    menuContainer.querySelectorAll(".item").forEach((item) => {
      item.classList.remove("active");
    });
    tab.classList.add("active");

    content.querySelectorAll(":scope > :not(.menu-container, .tip-box)").forEach((item) => {
      item.style.display = "none";
    });

    content.querySelector(".http-ssh-item").style.display = "";

    content.querySelector(".js-jb-tab-content").style.display = "";

    chrome.runtime.sendMessage({ type: "get-protocol" }, (data) => {
      switch (data.protocol) {
        case PROTOCOLS.HTTPS: {
          const item = content.querySelector(".http-item");
          if (item) {
            item.style.display = "";
          }
          break;
        }
        case PROTOCOLS.SSH: {
          const item = content.querySelector(".ssh-item");
          if (item) {
            item.style.display = "";
          }
          break;
        }
        default:
          break;
      }
    });
  } else {
    content.querySelectorAll(".forbid-warning-text").forEach((item) => {
      if (item.style.display === "none") {
        item.style.display = "";
      }
    });
  }
};

export const observeIndexPage = (metadata, tools) => {
  const domObserver = new DomObserver("#git-project-download-panel");
  domObserver.start(null, null, (modalDownload) => {
    const content = modalDownload.querySelector(".content");
    const menuContainer = modalDownload.querySelector(".menu-container");

    // render the JetBrains tab
    const jbTab = document.createElement("a");
    jbTab.classList.add("item");
    jbTab.classList.add("js-jb-tab");
    jbTab.dataset.type = "jb";
    jbTab.textContent = "JETBRAINS";

    const items = menuContainer.querySelectorAll(".item");
    if (items.length > 0) {
      items.item(items.length - 1).insertAdjacentElement("afterend", jbTab);
    }

    // create the protocol switcher
    const protocolSwitcher = document.createElement("div");
    protocolSwitcher.classList.add("protocol-switcher");

    const httpsItem = document.createElement("label");
    const httpsInput = document.createElement("input");
    httpsInput.type = "radio";
    httpsInput.name = "protocol";
    httpsInput.value = PROTOCOLS.HTTPS;
    httpsInput.checked = true;
    httpsItem.append(httpsInput, "Clone with HTTPS");

    const sshItem = document.createElement("label");
    const sshInput = document.createElement("input");
    sshInput.type = "radio";
    sshInput.name = "protocol";
    sshInput.value = PROTOCOLS.SSH;
    sshItem.append(sshInput, "Clone with SSH");

    protocolSwitcher.append(httpsItem, sshItem);

    protocolSwitcher.addEventListener("change", (e) => {
      if (e.target.checked) {
        chrome.runtime.sendMessage({
          type: "save-protocol",
          protocol: e.target.value,
        });
      }
    });

    chrome.runtime.sendMessage({ type: "get-protocol" }, (data) => {
      switch (data.protocol) {
        case PROTOCOLS.HTTPS: {
          httpsInput.checked = true;
          break;
        }
        case PROTOCOLS.SSH: {
          sshInput.checked = true;
          break;
        }
        default:
          break;
      }
    });

    // create the JetBrains tab content
    const jbItem = document.createElement("div");
    jbItem.classList.add("jb-item");
    jbItem.classList.add("item-panel-box");
    jbItem.classList.add("mb-2");
    jbItem.classList.add("js-jb-tab-content");
    jbItem.style.display = "none";

    // create the tools list
    const toolsList = document.createElement("div");
    toolsList.classList.add("tools-list");

    tools.forEach((tool) => {
      const toolItem = document.createElement("div");
      toolItem.classList.add("tool-item");

      const icon = document.createElement("span");
      icon.classList.add("tool-item-icon");
      icon.style.backgroundImage = `url(${tool.icon})`;

      const toolDataContainer = document.createElement("div");
      toolDataContainer.classList.add("tool-data-container");
      const toolName = document.createElement("strong");
      toolName.textContent = tool.name;
      const projectName = document.createElement("span");
      projectName.classList.add("tool-item-description");
      projectName.textContent = metadata.repositoryDisplayName;
      toolDataContainer.append(toolName, projectName);

      toolItem.append(icon, toolDataContainer);

      toolItem.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "get-protocol" }, (data) => {
          switch (data.protocol) {
            case PROTOCOLS.HTTPS: {
              const httpsUrl = getToolboxCloneUrl(tool.tag, metadata.httpsCloneUrl);
              callToolbox(httpsUrl);
              break;
            }
            case PROTOCOLS.SSH: {
              const sshUrl = getToolboxCloneUrl(tool.tag, metadata.sshCloneUrl);
              callToolbox(sshUrl);
              break;
            }
            // no default
          }
        });
      });

      toolsList.append(toolItem);
    });

    const contentWrapper = document.createElement("div");
    contentWrapper.classList.add("tab-content-wrapper");
    contentWrapper.append(protocolSwitcher, toolsList);
    jbItem.append(contentWrapper);

    content.querySelector(".tip-box")?.insertAdjacentElement("beforebegin", jbItem);

    // intercept the click event to show the JetBrains tab content
    menuContainer.addEventListener("click", menuContainerClickHandler, true);

    // preselect the JetBrains tab
    jbTab.click();

    chrome.runtime.onMessage.addListener((message) => {
      switch (message.type) {
        case "protocol-changed": {
          switch (message.newValue) {
            case PROTOCOLS.HTTPS: {
              httpsInput.checked = true;
              let item = content.querySelector(".http-item");
              if (item) {
                item.style.display = "";
              }
              item = content.querySelector(".ssh-item");
              if (item) {
                item.style.display = "none";
              }
              break;
            }
            case PROTOCOLS.SSH: {
              sshInput.checked = true;
              let item = content.querySelector(".ssh-item");
              if (item) {
                item.style.display = "";
              }
              item = content.querySelector(".http-item");
              if (item) {
                item.style.display = "none";
              }
              break;
            }
            // no default
          }
          break;
        }
        default:
          // unknown message
          break;
      }
    });
  });
};
