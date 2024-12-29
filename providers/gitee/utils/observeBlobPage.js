import DomObserver from "../../../src/services/DomObserver.js";
import { parseLineNumber } from "../../../src/utils/lineNumber.js";
import { callToolbox, getToolboxNavigateUrl } from "../../../src/services/Toolbox.js";

const BROWSERS = {
  CHROME: "chrome",
  FIREFOX: "firefox",
};

/*
 https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
  - more on wrappedJSObject
 https://stackoverflow.com/questions/40572065/calling-webpage-javascript-methods-from-browser-extension
  - folks do the same thing
 TODO: make the jquery popup work in Firefox to have one code for both browsers
*/
const getBrowser = () => (window.wrappedJSObject ? BROWSERS.FIREFOX : BROWSERS.CHROME);

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
      executeFirefoxScript('window.jQuery(".js-open-button").popup({position:"bottom center"});');
      break;
    // no default
  }
};

export const observeBlobPage = (metadata, tools) => {
  const domObserver = new DomObserver("#tree-content-holder .blob-header-title .options");
  domObserver.start((optionsElement) => {
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
        const filePath = location.pathname.split("/").splice(filePathIndex).join("/");
        const lineNumber = parseLineNumber(location.hash.replace("#L", ""));

        callToolbox(getToolboxNavigateUrl(tool.tag, metadata.repository, filePath, lineNumber));
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
  });
};
