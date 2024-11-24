/** @author 诺墨 <normal@normalcoder.com> */

import { observe } from "selector-observer";

import {
  BROWSERS,
  CLONE_PROTOCOLS,
  DEFAULT_LANGUAGE,
  HUNDRED_PERCENT,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  USAGE_THRESHOLD,
} from "../../constants.js";

import {
  callToolbox,
  getToolboxNavURN,
  getToolboxURN,
  parseLineNumber,
} from "../../api/toolbox.js";

/*
 https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
  - more on wrappedJSObject
 https://stackoverflow.com/questions/40572065/calling-webpage-javascript-methods-from-browser-extension
  - folks do the same thing
 TODO: make the jquery popup work in Firefox to have one code for both browsers
*/
const getBrowser = () =>
  window.wrappedJSObject ? BROWSERS.FIREFOX : BROWSERS.CHROME;

const defaultFallbackExtractionStrategy = () => "";

const extractAllLanguages = (fallbackExtractionStrategy) => {
  const languages = [];

  document
    .querySelectorAll(".summary-languages-popup > .row")
    .forEach((rowElement) => {
      const langElement = rowElement.querySelector(".lang");
      const percentageElement = rowElement.querySelector(".percentage");
      if (langElement && percentageElement) {
        const percentage = parseFloat(percentageElement.textContent.trim());
        if (!isNaN(percentage)) {
          languages.push({
            language: langElement.textContent.trim(),
            percentage,
          });
        }
      }
    });

  return languages.length > 0 ? languages : fallbackExtractionStrategy();
};

const extractExtensionEntry = (
  extensionElement,
  selector,
  fallbackExtractionStrategy = defaultFallbackExtractionStrategy,
) =>
  extensionElement.querySelector(selector)?.textContent?.trim() ||
  fallbackExtractionStrategy();

const fetchMetadata = () => {
  const extension = document.querySelector(".gitee-project-extension");
  if (extension == null) {
    throw new Error("Gitee project extension is not found.");
  }

  return {
    language: extractAllLanguages(() =>
      extractExtensionEntry(extension, ".extension.lang"),
    ),
    state: extractExtensionEntry(extension, ".extension.public"),
    https: extractExtensionEntry(extension, ".extension.https"),
    ssh: extractExtensionEntry(extension, ".extension.ssh"),
    namespace: extractExtensionEntry(extension, ".extension.namespace"),
    repo: extractExtensionEntry(extension, ".extension.repo"),
    name: extractExtensionEntry(extension, ".extension.name"),
    branch: extractExtensionEntry(extension, ".extension.branch"),
  };
};

const selectTools = (language, metadata) => {
  const languages = Array.isArray(language)
    ? language
    : [{ language, percentage: HUNDRED_PERCENT }];

  const normalizedLanguages = languages.map(({ language, percentage }) => {
    const lowerCasedLanguage = language.toLowerCase();
    const normalizedLanguage =
      lowerCasedLanguage === "html/css" ? "html" : lowerCasedLanguage;
    return { language: normalizedLanguage, percentage };
  });

  const THRESHOLD_PERCENT = USAGE_THRESHOLD * HUNDRED_PERCENT;

  const selectedTools = new Set(
    normalizedLanguages
      .filter(({ percentage }) => percentage > THRESHOLD_PERCENT)
      .flatMap(({ language }) => SUPPORTED_LANGUAGES[language] || []),
  );

  const toolsToReturn =
    selectedTools.size > 0
      ? Array.from(selectedTools)
      : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  return toolsToReturn.sort().map((toolId) => {
    const tool = { ...SUPPORTED_TOOLS[toolId] };
    tool.httpsUrl = getToolboxURN(tool.tag, metadata.https);
    tool.sshUrl = getToolboxURN(tool.tag, metadata.ssh);
    return tool;
  });
};

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

    content
      .querySelectorAll(":scope > :not(.menu-container, .tip-box)")
      .forEach((item) => {
        item.style.display = "none";
      });

    content.querySelector(".http-ssh-item").style.display = "";

    content.querySelector(".js-jb-tab-content").style.display = "";

    chrome.runtime.sendMessage({ type: "get-protocol" }, (data) => {
      switch (data.protocol) {
        case CLONE_PROTOCOLS.HTTPS: {
          const item = content.querySelector(".http-item");
          if (item) {
            item.style.display = "";
          }
          break;
        }
        case CLONE_PROTOCOLS.SSH: {
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

const renderCloneButtons = (tools, metadata) => {
  const modalDownload = document.getElementById("git-project-download-panel");
  if (modalDownload) {
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
    httpsInput.value = CLONE_PROTOCOLS.HTTPS;
    httpsInput.checked = true;
    httpsItem.append(httpsInput, "Clone with HTTPS");

    const sshItem = document.createElement("label");
    const sshInput = document.createElement("input");
    sshInput.type = "radio";
    sshInput.name = "protocol";
    sshInput.value = CLONE_PROTOCOLS.SSH;
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
        case CLONE_PROTOCOLS.HTTPS: {
          httpsInput.checked = true;
          break;
        }
        case CLONE_PROTOCOLS.SSH: {
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
      projectName.textContent = `${metadata.name} • ${metadata.branch}`;
      toolDataContainer.append(toolName, projectName);

      toolItem.append(icon, toolDataContainer);

      toolItem.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "get-protocol" }, (data) => {
          switch (data.protocol) {
            case CLONE_PROTOCOLS.HTTPS: {
              callToolbox(tool.httpsUrl);
              break;
            }
            case CLONE_PROTOCOLS.SSH: {
              callToolbox(tool.sshUrl);
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

    content
      .querySelector(".tip-box")
      ?.insertAdjacentElement("beforebegin", jbItem);

    // intercept the click event to show the JetBrains tab content
    menuContainer.addEventListener("click", menuContainerClickHandler, true);

    // preselect the JetBrains tab
    jbTab.click();

    chrome.runtime.onMessage.addListener((message) => {
      switch (message.type) {
        case "protocol-changed": {
          switch (message.newValue) {
            case CLONE_PROTOCOLS.HTTPS: {
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
            case CLONE_PROTOCOLS.SSH: {
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
  }
};

const removeCloneButtons = () => {
  document
    .querySelectorAll(".js-jb-tab, .js-jb-tab-content")
    .forEach((element) => {
      element.remove();
    });
  document
    .querySelector("#git-project-download-panel .menu-container")
    ?.removeEventListener("click", menuContainerClickHandler, true);
  document.querySelector('.item[data-type="http"]')?.click();
};

const executeChromeScript = (eventName) => {
  document.dispatchEvent(new CustomEvent(eventName, {}));
};

const executeFirefoxScript = (scriptContent) => {
  const script = document.createElement("script");
  script.textContent = scriptContent;
  document.body.append(script);
  script.remove();
};

const initOpenButtonsTooltips = () => {
  switch (getBrowser()) {
    case BROWSERS.CHROME:
      executeChromeScript("init-open-buttons-tooltips");
      break;
    case BROWSERS.FIREFOX:
      executeFirefoxScript(
        'window.jQuery(".js-open-button").popup({position:"bottom center"});',
      );
      break;
    // no default
  }
};

const destroyOpenButtonsTooltips = () => {
  switch (getBrowser()) {
    case BROWSERS.CHROME:
      executeChromeScript("destroy-open-buttons-tooltips");
      break;
    case BROWSERS.FIREFOX:
      executeFirefoxScript(
        'window.jQuery(".js-open-button").popup("destroy");',
      );
      break;
    // no default
  }
};

const renderOpenButtons = (optionsElement, tools, metadata) => {
  const openButtons = tools.map((tool) => {
    const openButton = document.createElement("a");
    openButton.classList.add("ui");
    openButton.classList.add("button");
    openButton.classList.add("has_tooltip");
    openButton.classList.add("js-open-button");
    openButton.href = "#";
    openButton.title = `Open in ${tool.name}`;
    openButton.textContent = tool.name;
    openButton.addEventListener("click", (e) => {
      e.preventDefault();

      const filePathIndex = 5;
      const filePath = location.pathname
        .split("/")
        .splice(filePathIndex)
        .join("/");
      const lineNumber = parseLineNumber(location.hash.replace("#L", ""));

      callToolbox(
        getToolboxNavURN(tool.tag, metadata.repo, filePath, lineNumber),
      );
    });

    return openButton;
  });
  const openButtonContainer = document.createElement("div");
  openButtonContainer.classList.add("ui");
  openButtonContainer.classList.add("mini");
  openButtonContainer.classList.add("buttons");
  openButtonContainer.classList.add("basic");
  openButtonContainer.classList.add("js-open-buttons");
  openButtonContainer.append(...openButtons);
  optionsElement.insertAdjacentElement("beforeend", openButtonContainer);
  initOpenButtonsTooltips();
};

const removeOpenButtons = () => {
  destroyOpenButtonsTooltips();
  document.querySelector(".js-open-buttons")?.remove();
};

const startTrackingDOMChanges = (tools, metadata) =>
  observe("#tree-content-holder .blob-header-title .options", {
    add(options) {
      renderOpenButtons(options, tools, metadata);
    },
  });

const stopTrackingDOMChanges = (observer) => {
  observer?.abort();
  removeOpenButtons();
};

try {
  const metadata = fetchMetadata();
  const tools = selectTools(metadata.language, metadata);

  chrome.runtime.sendMessage({ type: "get-modify-pages" }, (data) => {
    let DOMObserver = null;
    if (data.allow) {
      renderCloneButtons(tools, metadata);
      DOMObserver = startTrackingDOMChanges(tools, metadata);
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case "get-tools":
          sendResponse(tools);
          break;
        case "perform-action":
          const toolboxAction = getToolboxURN(
            message.toolTag,
            message.cloneUrl,
          );
          callToolbox(toolboxAction);
          break;
        case "modify-pages-changed":
          if (message.newValue) {
            renderCloneButtons(tools, metadata);
            DOMObserver = startTrackingDOMChanges(tools, metadata);
          } else {
            removeCloneButtons();
            stopTrackingDOMChanges(DOMObserver);
          }
          break;
        // no default
      }
    });
  });

  chrome.runtime.sendMessage({
    type: "enable-page-action",
    project: metadata.name,
    https: metadata.https,
    ssh: metadata.ssh,
  });
} catch (e) {
  chrome.runtime.sendMessage({ type: "disable-page-action" });
}
