import { observe } from "selector-observer";
import gh from "github-url-to-object";

import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  USAGE_THRESHOLD,
  HUNDRED_PERCENT,
  MAX_DECIMALS,
  MIN_VALID_HTTP_STATUS,
  MAX_VALID_HTTP_STATUS,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SET,
  CLONE_PROTOCOLS,
} from "./constants.js";

import { getToolboxURN, getToolboxNavURN, callToolbox, parseLineNumber } from "./api/toolbox.js";

const CLONE_BUTTON_GROUP_JS_CSS_CLASS = "js-toolbox-clone-button-group";
const OPEN_BUTTON_JS_CSS_CLASS = "js-toolbox-open-button";
const OPEN_MENU_ITEM_JS_CSS_CLASS = "js-toolbox-open-menu-item";

const BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR = ".js-blob-header .BtnGroup + div:not(.BtnGroup)";

function fetchMetadata() {
  return (
    document.getElementById("repository-container-header") &&
    gh(window.location.toString(), { enterprise: true })
  );
}

const checkResponseStatus = (response) =>
  new Promise((resolve, reject) => {
    if (response.status >= MIN_VALID_HTTP_STATUS && response.status <= MAX_VALID_HTTP_STATUS) {
      resolve(response);
    } else {
      reject();
    }
  });

const parseResponse = (response) =>
  new Promise((resolve, reject) => {
    response
      .json()
      .then((result) => {
        if (Object.keys(result).length > 0) {
          resolve(result);
        } else {
          reject();
        }
      })
      .catch(() => {
        reject();
      });
  });

const convertBytesToPercents = (languages) =>
  new Promise((resolve) => {
    const totalBytes = Object.values(languages).reduce((total, bytes) => total + bytes, 0);

    Object.keys(languages).forEach((key) => {
      const percentFloat = (languages[key] / totalBytes) * HUNDRED_PERCENT;
      const percentString = percentFloat.toFixed(MAX_DECIMALS);
      languages[key] = parseFloat(percentString);
    });

    resolve(languages);
  });

const extractLanguagesFromPage = (githubMetadata) =>
  new Promise((resolve) => {
    // TBX-4762: private repos don't let use API, load root page and scrape languages off it
    fetch(githubMetadata.clone_url)
      .then((response) => response.text())
      .then((htmlString) => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(htmlString, "text/html");
        const languageElements = htmlDocument.querySelectorAll(
          ".repository-lang-stats-numbers .lang",
        );
        if (languageElements.length === 0) {
          // see if it's new UI as of 24.06.20
          const newLanguageElements = htmlDocument.querySelectorAll(
            '[data-ga-click="Repository, language stats search click, location:repo overview"]',
          );
          if (newLanguageElements.length > 0) {
            const allLanguages = Array.from(newLanguageElements).reduce((acc, el) => {
              const langEl = el.querySelector("span");
              const percentEl = langEl.nextElementSibling;
              acc[langEl.textContent] = percentEl
                ? parseFloat(percentEl.textContent)
                : USAGE_THRESHOLD + 1;
              return acc;
            }, {});
            if (Object.keys(allLanguages).length > 0) {
              resolve(allLanguages);
            } else {
              resolve(DEFAULT_LANGUAGE_SET);
            }
          } else {
            resolve(DEFAULT_LANGUAGE_SET);
          }
        } else {
          const allLanguages = Array.from(languageElements).reduce((acc, el) => {
            const percentEl = el.nextElementSibling;
            acc[el.textContent] = percentEl
              ? parseFloat(percentEl.textContent)
              : USAGE_THRESHOLD + 1;
            return acc;
          }, {});
          resolve(allLanguages);
        }
      })
      .catch(() => {
        resolve(DEFAULT_LANGUAGE_SET);
      });
  });

const fetchLanguages = (githubMetadata) =>
  new Promise((resolve) => {
    fetch(`${githubMetadata.api_url}/languages`)
      .then(checkResponseStatus)
      .then(parseResponse)
      .then(convertBytesToPercents)
      .then(resolve)
      .catch(() => {
        extractLanguagesFromPage(githubMetadata).then(resolve);
      });
  });

const selectTools = (languages) =>
  new Promise((resolve) => {
    const overallPoints = Object.values(languages).reduce(
      (overall, current) => overall + current,
      0,
    );

    const filterLang = (language) =>
      SUPPORTED_LANGUAGES[language.toLowerCase()] &&
      languages[language] / overallPoints > USAGE_THRESHOLD;

    const selectedToolIds = Object.keys(languages)
      .filter(filterLang)
      .reduce((acc, key) => {
        acc.push(...SUPPORTED_LANGUAGES[key.toLowerCase()]);
        return acc;
      }, []);

    const normalizedToolIds =
      selectedToolIds.length > 0
        ? Array.from(new Set(selectedToolIds))
        : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

    const tools = normalizedToolIds.sort().map((toolId) => SUPPORTED_TOOLS[toolId]);

    resolve(tools);
  });

const fetchTools = (githubMetadata) => fetchLanguages(githubMetadata).then(selectTools);

const getHttpsCloneUrl = (githubMetadata) => `${githubMetadata.clone_url}.git`;
const getSshCloneUrl = (githubMetadata) =>
  `git@${githubMetadata.host}:${githubMetadata.user}/${githubMetadata.repo}.git`;

let handleMessage = null;

const renderPageAction = (githubMetadata) =>
  new Promise((resolve) => {
    if (handleMessage && chrome.runtime.onMessage.hasListener(handleMessage)) {
      chrome.runtime.onMessage.removeListener(handleMessage);
    }
    handleMessage = (message, sender, sendResponse) => {
      switch (message.type) {
        case "get-tools":
          fetchTools(githubMetadata).then(sendResponse);
          return true;
        case "perform-action":
          const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
          callToolbox(toolboxAction);
          break;
        // no default
      }
      return undefined;
    };
    chrome.runtime.onMessage.addListener(handleMessage);

    resolve();
  });

const removeCloneButtons = () => {
  const cloneButtonGroup = document.querySelector(`.${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);
  if (cloneButtonGroup) {
    cloneButtonGroup.parentElement.removeChild(cloneButtonGroup);
  }
};

const addCloneButtonEventHandler = (btn, githubMetadata) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();

    const { toolTag } = e.currentTarget.dataset;
    chrome.runtime.sendMessage({ type: "get-protocol" }, ({ protocol }) => {
      const cloneUrl =
        protocol === CLONE_PROTOCOLS.HTTPS
          ? getHttpsCloneUrl(githubMetadata)
          : getSshCloneUrl(githubMetadata);
      const action = getToolboxURN(toolTag, cloneUrl);
      callToolbox(action);
    });
  });
};

const createCloneButton = (tool, githubMetadata, small = true) => {
  const button = document.createElement("a");
  button.setAttribute(
    "class",
    `btn ${small ? "btn-sm" : ""} tooltipped tooltipped-s tooltipped-multiline BtnGroup-item m-0`,
  );
  button.setAttribute("href", "#");
  button.setAttribute("aria-label", `Clone in ${tool.name}`);
  button.setAttribute("style", "align-items:center");
  button.dataset.toolTag = tool.tag;

  const buttonIcon = document.createElement("img");
  buttonIcon.setAttribute("alt", tool.name);
  buttonIcon.setAttribute("src", tool.icon);
  buttonIcon.setAttribute("width", "16");
  buttonIcon.setAttribute("height", "16");
  buttonIcon.setAttribute("style", "vertical-align:text-top");
  button.appendChild(buttonIcon);

  addCloneButtonEventHandler(button, githubMetadata);

  return button;
};

const renderCloneButtons = (tools, githubMetadata, actionListElement) => {
  const ghActionsListElement = actionListElement?.children[1]?.children[1];

  if (ghActionsListElement) {
    const jbActionsListElement = document.createElement("ul");
    tools.forEach((tool) => {
      const jbActionElement = document.createElement("li");
      jbActionElement.style.padding = "16px";

      const iconContainerElement = document.createElement("span");
      iconContainerElement.style.display = "flex";
      iconContainerElement.style.alignItems = "center";
      iconContainerElement.style.justifyContent = "center";
      iconContainerElement.style.height = "20px";
      iconContainerElement.style.marginRight = "8px";
      iconContainerElement.style.minWidth = "16px";
      iconContainerElement.style.width = "20px";

      const iconElement = document.createElement("img");
      iconElement.setAttribute("alt", tool.name);
      iconElement.setAttribute("src", tool.icon);
      iconElement.setAttribute("width", "16");
      iconElement.setAttribute("height", "16");

      iconContainerElement.appendChild(iconElement);

      jbActionElement.appendChild(iconContainerElement);

      jbActionsListElement.appendChild(jbActionElement);
    });

    ghActionsListElement.parentNode.insertBefore(jbActionsListElement, ghActionsListElement);
  }

  // let getRepoController = document.querySelector(
  //   ".BtnGroup + .d-flex > get-repo-controller",
  // );
  // getRepoController = getRepoController
  //   ? getRepoController.parentElement
  //   : document.querySelector(".js-get-repo-select-menu");

  // if (getRepoController) {
  //   const toolboxCloneButtonGroup = document.createElement("div");
  //   toolboxCloneButtonGroup.setAttribute(
  //     "class",
  //     `BtnGroup ml-2 d-flex ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`,
  //   );
  //
  //   tools.forEach((tool) => {
  //     const btn = createCloneButton(tool, githubMetadata);
  //     toolboxCloneButtonGroup.appendChild(btn);
  //   });
  //
  //   getRepoController.insertAdjacentElement(
  //     "beforebegin",
  //     toolboxCloneButtonGroup,
  //   );
  // } else {
  //   // new UI as of 24.06.20
  //   getRepoController = document.querySelector("get-repo");
  //   if (getRepoController) {
  //     const summary = getRepoController.querySelector("summary");
  //     // the Code tab contains the green Code button (primary),
  //     // the Pull requests tab contains the ordinary Code button (outlined)
  //     const isOnCodeTab =
  //       summary && summary.classList.contains("Button--primary");
  //
  //     const toolboxCloneButtonGroup = document.createElement("div");
  //     toolboxCloneButtonGroup.setAttribute(
  //       "class",
  //       `BtnGroup ${
  //         isOnCodeTab ? "d-block ml-2" : "flex-md-order-2"
  //       } ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`,
  //     );
  //
  //     tools.forEach((tool) => {
  //       const btn = createCloneButton(tool, githubMetadata, !isOnCodeTab);
  //       toolboxCloneButtonGroup.appendChild(btn);
  //     });
  //
  //     getRepoController.parentElement.insertAdjacentElement(
  //       "beforebegin",
  //       toolboxCloneButtonGroup,
  //     );
  //   }
  // }
};

const addOpenButtonEventHandler = (domElement, tool, githubMetadata) => {
  domElement.addEventListener("click", (e) => {
    e.preventDefault();

    const { user, repo, branch } = githubMetadata;
    const normalizedBranch = branch.split("/").shift();
    const filePath = location.pathname.replace(`/${user}/${repo}/blob/${normalizedBranch}/`, "");
    const lineNumber = parseLineNumber(location.hash.replace("#L", ""));

    callToolbox(getToolboxNavURN(tool.tag, repo, filePath, lineNumber));
  });
};

// when navigating with back and forward buttons
// we have to re-create open actions b/c their click handlers got lost somehow
const removeOpenButtons = () => {
  const actions = document.querySelectorAll(`.${OPEN_BUTTON_JS_CSS_CLASS}`);
  actions.forEach((action) => {
    action.parentElement.removeChild(action);
  });

  const menuItems = document.querySelectorAll(`.${OPEN_MENU_ITEM_JS_CSS_CLASS}`);
  menuItems.forEach((item) => {
    item.parentElement.removeChild(item);
  });
};

const removePageButtons = () => {
  removeCloneButtons();
  removeOpenButtons();
};

const createOpenButton = (tool, githubMetadata) => {
  const action = document.createElement("a");
  action.setAttribute("class", `btn-octicon tooltipped tooltipped-nw ${OPEN_BUTTON_JS_CSS_CLASS}`);
  action.setAttribute("aria-label", `Open this file in ${tool.name}`);
  action.setAttribute("href", "#");

  const actionIcon = document.createElement("img");
  actionIcon.setAttribute("alt", tool.name);
  actionIcon.setAttribute("src", tool.icon);
  actionIcon.setAttribute("width", "16");
  actionIcon.setAttribute("height", "16");
  action.appendChild(actionIcon);

  addOpenButtonEventHandler(action, tool, githubMetadata);

  return action;
};

const createOpenMenuItem = (tool, first, githubMetadata) => {
  const menuItem = document.createElement("a");
  menuItem.setAttribute("class", "dropdown-item");
  menuItem.setAttribute("role", "menu-item");
  menuItem.setAttribute("href", "#");
  if (first) {
    menuItem.style.borderTop = "1px solid #eaecef";
  }
  menuItem.textContent = `Open in ${tool.name}`;

  addOpenButtonEventHandler(menuItem, tool, githubMetadata);
  menuItem.addEventListener("click", () => {
    const blobToolbar = document.querySelector(".BlobToolbar");
    if (blobToolbar) {
      blobToolbar.removeAttribute("open");
    }
  });

  const menuItemContainer = document.createElement("li");
  menuItemContainer.setAttribute("class", OPEN_MENU_ITEM_JS_CSS_CLASS);
  menuItemContainer.appendChild(menuItem);

  return menuItemContainer;
};

const renderOpenButtons = (tools, githubMetadata) => {
  const actionAnchorElement = document.querySelector(BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR);
  const actionAnchorFragment = document.createDocumentFragment();
  const blobToolbarDropdown = document.querySelector(".BlobToolbar-dropdown");

  tools.forEach((tool, toolIndex) => {
    if (actionAnchorElement) {
      const action = createOpenButton(tool, githubMetadata);
      actionAnchorFragment.appendChild(action);
    }
    if (blobToolbarDropdown) {
      const menuItem = createOpenMenuItem(tool, toolIndex === 0, githubMetadata);
      blobToolbarDropdown.appendChild(menuItem);
    }
  });
  if (actionAnchorElement) {
    actionAnchorElement.append(actionAnchorFragment);
  }
};

const renderPageButtons = (githubMetadata, actionListElement) => {
  fetchTools(githubMetadata)
    .then((tools) => {
      // removePageButtons();
      renderCloneButtons(tools, githubMetadata, actionListElement);
      // renderOpenButtons(tools, githubMetadata);
    })
    .catch(() => {
      // do nothing
    });
};

const startTrackingDOMChanges = (githubMetadata) =>
  observe(`#__primerPortalRoot__ .react-overview-code-button-action-list`, {
    add(actionListElement) {
      renderPageButtons(githubMetadata, actionListElement);
    },
    remove() {
      removePageButtons();
    },
  });

const stopTrackingDOMChanges = (observer) => {
  if (observer) {
    observer.abort();
  }
};

const enablePageAction = (githubMetadata) => {
  chrome.runtime.sendMessage({
    type: "enable-page-action",
    project: githubMetadata.repo,
    https: getHttpsCloneUrl(githubMetadata),
    ssh: getSshCloneUrl(githubMetadata),
  });
};

const disablePageAction = () => {
  chrome.runtime.sendMessage({ type: "disable-page-action" });
};

class GitHubObserver {
  constructor() {
    if (this.constructor === GitHubObserver) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  observe(onChange) {
    this._throwNotImplemented(this.observe);
  }

  abort() {
    this._throwNotImplemented(this.abort);
  }

  _throwNotImplemented(method) {
    throw new Error(`Method '${method.name}' is not implemented.`);
  }
}

class DomObserver extends GitHubObserver {
  constructor() {
    super();

    this._observer = null;
  }

  // eslint-disable-next-line no-magic-numbers
  static DEFAULT_TIMEOUT = 150;

  _debounce(callback, timeout = DomObserver.DEFAULT_TIMEOUT) {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        callback.apply(this, args);
      }, timeout);
    };
  }

  observe(onChange) {
    if (this._observer !== null) {
      return;
    }

    const onChangeDebounced = this._debounce(onChange);

    this._observer = new MutationObserver((mutationList) => {
      for (const mutation of mutationList) {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "aria-busy" || mutation.attributeName === "data-turbo-loaded")
        ) {
          onChangeDebounced();
        }
      }
    });

    this._observer.observe(document.querySelector("html"), {
      attributes: true,
    });

    this._observer = observe("#repository-container-header", {
      add() {
        onChangeDebounced();
      },
      remove() {
        onChangeDebounced();
      },
    });
  }

  abort() {
    this._observer?.disconnect();

    this._observer = null;
  }
}

class ProjectObserver extends GitHubObserver {
  constructor() {
    super();

    this._isObserving = false;
    this._metadata = null;
    this._domObserver = null;
  }

  observe(onProjectEnter, onProjectLeave) {
    if (this._isObserving) {
      return;
    }

    this._isObserving = true;
    this._metadata = fetchMetadata();

    if (this._metadata) {
      onProjectEnter(this._metadata);
    } else {
      onProjectLeave();
    }

    const handleChange = () => {
      const metadata = fetchMetadata();
      const enteredProject =
        Boolean(metadata) && (!this._metadata || metadata.clone_url !== this._metadata.clone_url);
      const leftProject =
        Boolean(this._metadata) && (!metadata || this._metadata.clone_url !== metadata.clone_url);

      if (enteredProject) {
        onProjectEnter(metadata);
      } else if (leftProject) {
        onProjectLeave();
      }

      this._metadata = metadata;
    };

    this._domObserver = new DomObserver();
    this._domObserver.observe(handleChange);
  }

  abort() {
    if (this._isObserving) {
      this._domObserver.abort();
      this._domObserver = null;
    }
  }
}

const toolboxify = () => {
  let githubMetadata = null;
  let DOMObserver = null;

  const handleInnerMessage = (message) => {
    switch (message.type) {
      case "modify-pages-changed":
        if (message.newValue) {
          DOMObserver = startTrackingDOMChanges(githubMetadata);
        } else {
          stopTrackingDOMChanges(DOMObserver);
        }
        break;
      // no default
    }
  };

  const projectObserver = new ProjectObserver();
  projectObserver.observe(
    (metadata) => {
      githubMetadata = metadata;

      renderPageAction(metadata).then(() => {
        enablePageAction(metadata);
      });

      chrome.runtime.sendMessage({ type: "get-modify-pages" }, (response) => {
        if (response.allow) {
          DOMObserver = startTrackingDOMChanges(githubMetadata);
        }
        chrome.runtime.onMessage.addListener(handleInnerMessage);
      });
    },
    () => {
      disablePageAction();
      stopTrackingDOMChanges(DOMObserver);
      chrome.runtime.onMessage.removeListener(handleInnerMessage);
    },
  );
};

export default toolboxify;
