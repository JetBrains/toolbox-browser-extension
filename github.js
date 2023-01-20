import {observe} from 'selector-observer';
import gh from 'github-url-to-object';

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
  CLONE_PROTOCOLS
} from './constants';

import {
  getToolboxCloneUrl,
  getToolboxNavigateUrl,
  callToolbox,
  parseLineNumber
} from './web-api/toolbox';
import {MESSAGES, request} from './api/messaging';

const CLONE_BUTTON_GROUP_JS_CSS_CLASS = 'js-toolbox-clone-button-group';
const OPEN_BUTTON_JS_CSS_CLASS = 'js-toolbox-open-button';
const OPEN_MENU_ITEM_JS_CSS_CLASS = 'js-toolbox-open-menu-item';

const BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR = '.js-blob-header .BtnGroup + div:not(.BtnGroup)';

function fetchMetadata() {
  const repositoryContainerHeader = document.getElementById('repository-container-header');
  if (repositoryContainerHeader) {
    const metadata = gh(window.location.toString(), {enterprise: true});
    if (metadata) {
      chrome.runtime.sendMessage(request(
        MESSAGES.LOG_INFO,
        `Successfully parsed repository metadata: ${JSON.stringify(metadata)}`
      ));
    } else {
      chrome.runtime.sendMessage(request(MESSAGES.LOG_ERROR, 'Failed to parse metadata'));
    }
    return metadata;
  } else {
    chrome.runtime.sendMessage(request(MESSAGES.LOG_WARN, 'Missing repository container header'));
    return null;
  }
}

const throwIfInvalid = response => {
  if (response.status < MIN_VALID_HTTP_STATUS || response.status > MAX_VALID_HTTP_STATUS) {
    throw new Error(`HTTP request is invalid (response status: ${response.status})`);
  }
};

const parseResponse = async response => {
  const parsedResponse = await response.json();

  if (Object.keys(parsedResponse).length > 0) {
    chrome.runtime.sendMessage(request(
      MESSAGES.LOG_INFO,
      `Successfully parsed response: ${JSON.stringify(parsedResponse)}`
    ));
    return parsedResponse;
  } else {
    throw new Error('Response is empty');
  }
};

const convertBytesToPercents = languages => {
  const totalBytes = Object.
    values(languages).
    reduce((total, bytes) => total + bytes, 0);

  Object.
    keys(languages).
    forEach(key => {
      const percentFloat = languages[key] / totalBytes * HUNDRED_PERCENT;
      const percentString = percentFloat.toFixed(MAX_DECIMALS);
      languages[key] = parseFloat(percentString);
    });

  chrome.runtime.sendMessage(request(
    MESSAGES.LOG_INFO,
    `Successfully converted bytes to percents in languages: ${JSON.stringify(languages)}`
  ));

  return languages;
};

const extractLanguagesFromPage = async githubMetadata => {
  try {
    // TBX-4762: private repos don't let use API, load root page and scrape languages off it
    const htmlResponse = await fetch(githubMetadata.clone_url);
    const htmlString = await htmlResponse.text();
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(htmlString, 'text/html');

    let languageElements = htmlDocument.querySelectorAll('.repository-lang-stats-numbers .lang');

    if (languageElements.length > 0) {
      const allLanguages = Array.from(languageElements).reduce((acc, el) => {
        const percentEl = el.nextElementSibling;
        acc[el.textContent] = percentEl ? parseFloat(percentEl.textContent) : USAGE_THRESHOLD + 1;
        return acc;
      }, {});

      chrome.runtime.sendMessage(request(
        MESSAGES.LOG_INFO,
        `Successfully scraped languages: ${JSON.stringify(allLanguages)}`
      ));

      return allLanguages;
    }

    // see if it's new UI as of 24.06.20
    languageElements = htmlDocument.querySelectorAll(
      '[data-ga-click="Repository, language stats search click, location:repo overview"]'
    );

    if (languageElements.length === 0) {
      chrome.runtime.sendMessage(request(
        MESSAGES.LOG_WARN,
        'Failed to scrape languages from the root page, resolving to default languages'
      ));
      return DEFAULT_LANGUAGE_SET;
    }

    const allLanguages = Array.from(languageElements).reduce((acc, el) => {
      const langEl = el.querySelector('span');
      const percentEl = langEl.nextElementSibling;
      acc[langEl.textContent] = percentEl ? parseFloat(percentEl.textContent) : USAGE_THRESHOLD + 1;
      return acc;
    }, {});
    if (Object.keys(allLanguages).length === 0) {
      chrome.runtime.sendMessage(request(
        MESSAGES.LOG_WARN,
        'Failed to scrape languages from the root page, resolving to default languages'
      ));
      return DEFAULT_LANGUAGE_SET;
    }

    chrome.runtime.sendMessage(request(
      MESSAGES.LOG_INFO,
      `Successfully scraped languages: ${JSON.stringify(allLanguages)}`
    ));
    return allLanguages;
  } catch (error) {
    chrome.runtime.sendMessage(request(MESSAGES.LOG_ERROR, error.message));
    chrome.runtime.sendMessage(request(
      MESSAGES.LOG_WARN,
      'Failed to scrape languages from the root page, resolving to default languages'
    ));
    return DEFAULT_LANGUAGE_SET;
  }
};

const fetchLanguages = async githubMetadata => {
  try {
    const response = await fetch(`${githubMetadata.api_url}/languages`);
    throwIfInvalid(response);
    const languages = await parseResponse(response);
    return convertBytesToPercents(languages);
  } catch (error) {
    chrome.runtime.sendMessage(request(
      MESSAGES.LOG_ERROR,
      error.message
    ));
    chrome.runtime.sendMessage(request(
      MESSAGES.LOG_WARN,
      'Failed to fetch languages, trying to scrape them from the root page'
    ));
    return await extractLanguagesFromPage(githubMetadata);
  }
};

const selectTools = languages => {
  const overallPoints = Object.
    values(languages).
    reduce((overall, current) => overall + current, 0);

  const filterLang = language =>
    SUPPORTED_LANGUAGES[language.toLowerCase()] && languages[language] / overallPoints > USAGE_THRESHOLD;

  const selectedToolIds = Object.
    keys(languages).
    filter(filterLang).
    reduce((acc, key) => {
      acc.push(...SUPPORTED_LANGUAGES[key.toLowerCase()]);
      return acc;
    }, []);

  const selectDefaultLanguage = selectedToolIds.length === 0;

  if (selectDefaultLanguage) {
    chrome.runtime.sendMessage(request(
      MESSAGES.LOG_INFO,
      `The language usage rate is too low, sticking to default language (${DEFAULT_LANGUAGE})`
    ));
  }

  const normalizedToolIds = selectDefaultLanguage
    ? SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE]
    : Array.from(new Set(selectedToolIds));

  const tools = normalizedToolIds.sort().map(toolId => SUPPORTED_TOOLS[toolId]);
  chrome.runtime.sendMessage(request(
    MESSAGES.LOG_INFO,
    `Selected tools: ${tools.map(t => t.name).join(', ')}`
  ));

  return tools;
};

const fetchTools = async githubMetadata => {
  const languages = await fetchLanguages(githubMetadata);
  return selectTools(languages);
};

const getHttpsCloneUrl = githubMetadata => `${githubMetadata.clone_url}.git`;
const getSshCloneUrl =
  githubMetadata => `git@${githubMetadata.host}:${githubMetadata.user}/${githubMetadata.repo}.git`;

let handleMessage = null;

const renderPageAction = githubMetadata => new Promise(resolve => {
  if (handleMessage && chrome.runtime.onMessage.hasListener(handleMessage)) {
    chrome.runtime.onMessage.removeListener(handleMessage);
  }
  handleMessage = (message, sender, sendResponse) => {
    switch (message.type) {
      case 'get-tools':
        fetchTools(githubMetadata).then(sendResponse);
        return true;
      case 'perform-action':
        const toolboxCloneUrl = getToolboxCloneUrl(message.toolTag, message.cloneUrl);
        callToolbox(toolboxCloneUrl);
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
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(githubMetadata)
        : getSshCloneUrl(githubMetadata);
      const toolboxCloneUrl = getToolboxCloneUrl(toolTag, cloneUrl);
      callToolbox(toolboxCloneUrl);
    });
  });
};

const createCloneButton = (tool, githubMetadata, small = true) => {
  const button = document.createElement('a');
  button.setAttribute(
    'class',
    `btn ${small ? 'btn-sm' : ''} tooltipped tooltipped-s tooltipped-multiline BtnGroup-item m-0`
  );
  button.setAttribute('href', '#');
  button.setAttribute('aria-label', `Clone in ${tool.name}`);
  button.setAttribute('style', 'align-items:center');
  button.dataset.toolTag = tool.tag;

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', tool.name);
  buttonIcon.setAttribute('src', tool.icon);
  buttonIcon.setAttribute('width', '16');
  buttonIcon.setAttribute('height', '16');
  buttonIcon.setAttribute('style', 'vertical-align:text-top');
  button.appendChild(buttonIcon);

  addCloneButtonEventHandler(button, githubMetadata);

  return button;
};

const renderCloneButtons = (tools, githubMetadata) => {
  let getRepoController = document.querySelector('.BtnGroup + .d-flex > get-repo-controller');
  getRepoController = getRepoController
    ? getRepoController.parentElement
    : document.querySelector('.js-get-repo-select-menu');

  if (getRepoController) {
    const toolboxCloneButtonGroup = document.createElement('div');
    toolboxCloneButtonGroup.setAttribute('class', `BtnGroup ml-2 d-flex ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);

    tools.forEach(tool => {
      const btn = createCloneButton(tool, githubMetadata);
      toolboxCloneButtonGroup.appendChild(btn);
    });

    getRepoController.insertAdjacentElement('beforebegin', toolboxCloneButtonGroup);
  } else {
    // new UI as of 24.06.20
    getRepoController = document.querySelector('get-repo');
    if (getRepoController) {
      const summary = getRepoController.querySelector('summary');
      // the Code tab contains the green Code button (primary),
      // the Pull requests tab contains the ordinary Code button (outlined)
      const isOnCodeTab = summary && summary.classList.contains('Button--primary');

      const toolboxCloneButtonGroup = document.createElement('div');
      toolboxCloneButtonGroup.setAttribute(
        'class',
        `BtnGroup ${isOnCodeTab
          ? 'd-block ml-2'
          : 'flex-md-order-2'} ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`
      );

      tools.forEach(tool => {
        const btn = createCloneButton(tool, githubMetadata, !isOnCodeTab);
        toolboxCloneButtonGroup.appendChild(btn);
      });

      getRepoController.parentElement.insertAdjacentElement('beforebegin', toolboxCloneButtonGroup);
    }
  }
};

const addOpenButtonEventHandler = (domElement, tool, githubMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    const {user, repo, branch} = githubMetadata;
    const normalizedBranch = branch.split('/').shift();
    const filePath = location.pathname.replace(`/${user}/${repo}/blob/${normalizedBranch}/`, '');
    const lineNumber = parseLineNumber(location.hash.replace('#L', ''));

    callToolbox(getToolboxNavigateUrl(tool.tag, repo, filePath, lineNumber));
  });
};

// when navigating with back and forward buttons
// we have to re-create open actions b/c their click handlers got lost somehow
const removeOpenButtons = () => {
  const actions = document.querySelectorAll(`.${OPEN_BUTTON_JS_CSS_CLASS}`);
  actions.forEach(action => {
    action.parentElement.removeChild(action);
  });

  const menuItems = document.querySelectorAll(`.${OPEN_MENU_ITEM_JS_CSS_CLASS}`);
  menuItems.forEach(item => {
    item.parentElement.removeChild(item);
  });
};

const removePageButtons = () => {
  removeCloneButtons();
  removeOpenButtons();
};

const createOpenButton = (tool, githubMetadata) => {
  const action = document.createElement('a');
  action.setAttribute('class', `btn-octicon tooltipped tooltipped-nw ${OPEN_BUTTON_JS_CSS_CLASS}`);
  action.setAttribute('aria-label', `Open this file in ${tool.name}`);
  action.setAttribute('href', '#');

  const actionIcon = document.createElement('img');
  actionIcon.setAttribute('alt', tool.name);
  actionIcon.setAttribute('src', tool.icon);
  actionIcon.setAttribute('width', '16');
  actionIcon.setAttribute('height', '16');
  action.appendChild(actionIcon);

  addOpenButtonEventHandler(action, tool, githubMetadata);

  return action;
};

const createOpenMenuItem = (tool, first, githubMetadata) => {
  const menuItem = document.createElement('a');
  menuItem.setAttribute('class', 'dropdown-item');
  menuItem.setAttribute('role', 'menu-item');
  menuItem.setAttribute('href', '#');
  if (first) {
    menuItem.style.borderTop = '1px solid #eaecef';
  }
  menuItem.textContent = `Open in ${tool.name}`;

  addOpenButtonEventHandler(menuItem, tool, githubMetadata);
  menuItem.addEventListener('click', () => {
    const blobToolbar = document.querySelector('.BlobToolbar');
    if (blobToolbar) {
      blobToolbar.removeAttribute('open');
    }
  });

  const menuItemContainer = document.createElement('li');
  menuItemContainer.setAttribute('class', OPEN_MENU_ITEM_JS_CSS_CLASS);
  menuItemContainer.appendChild(menuItem);

  return menuItemContainer;
};

const renderOpenButtons = (tools, githubMetadata) => {
  const actionAnchorElement = document.querySelector(BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR);
  const actionAnchorFragment = document.createDocumentFragment();
  const blobToolbarDropdown = document.querySelector('.BlobToolbar-dropdown');

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

const renderPageButtons = githubMetadata => {
  fetchTools(githubMetadata).
    then(tools => {
      removePageButtons();
      renderCloneButtons(tools, githubMetadata);
      renderOpenButtons(tools, githubMetadata);
    }).
    catch(() => {
      // do nothing
    });
};

const startTrackingDOMChanges = githubMetadata =>
  observe(
    `get-repo, ${BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR}`,
    {
      add() {
        renderPageButtons(githubMetadata);
      },
      remove() {
        removePageButtons();
      }
    }
  );

const stopTrackingDOMChanges = observer => {
  if (observer) {
    observer.abort();
  }
};

const enablePageAction = githubMetadata => {
  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: githubMetadata.repo,
    https: getHttpsCloneUrl(githubMetadata),
    ssh: getSshCloneUrl(githubMetadata)
  });
};

const disablePageAction = () => {
  chrome.runtime.sendMessage({type: 'disable-page-action'});
};

class GitHubObserver {
  constructor() {
    if (this.constructor === GitHubObserver) {
      throw new Error('Abstract classes can\'t be instantiated.');
    }
  }

  // eslint-disable-next-line no-unused-vars
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
      timer = setTimeout(
        () => {
          callback.apply(this, args);
        },
        timeout
      );
    };
  }

  observe(onChange) {
    if (this._observer !== null) {
      return;
    }

    const onChangeDebounced = this._debounce(onChange);

    this._observer = new MutationObserver(mutationList => {
      for (const mutation of mutationList) {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'aria-busy' || mutation.attributeName === 'data-turbo-loaded')
        ) {
          onChangeDebounced();
        }
      }
    });

    this._observer.observe(document.querySelector('html'), {attributes: true});

    this._observer = observe(
      '#repository-container-header',
      {
        add() {
          onChangeDebounced();
        },
        remove() {
          onChangeDebounced();
        }
      }
    );
  }

  abort() {
    this._observer?.disconnect();

    this._observer = null;
  }
}

class HistoryObserver extends GitHubObserver {
  constructor() {
    super();

    this._handlePopState = null;
  }

  observe(onChange) {
    if (this._handlePopState !== null) {
      return;
    }

    this._handlePopState = () => {
      setTimeout(onChange);
    };

    window.addEventListener('popstate', this._handlePopState);
  }

  abort() {
    if (this._handlePopState === null) {
      return;
    }

    window.removeEventListener('popstate', this._handlePopState);

    this._handlePopState = null;
  }
}

class ProjectObserver extends GitHubObserver {
  constructor() {
    super();

    this._isObserving = false;
    this._metadata = null;
    this._domObserver = null;
    this._historyObserver = null;
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
      const enteredProject = Boolean(metadata) && (!this._metadata || metadata.clone_url !== this._metadata.clone_url);
      const leftProject = Boolean(this._metadata) && (!metadata || this._metadata.clone_url !== metadata.clone_url);

      if (enteredProject) {
        onProjectEnter(metadata);
      } else if (leftProject) {
        onProjectLeave();
      }

      this._metadata = metadata;
    };

    this._domObserver = new DomObserver();
    this._historyObserver = new HistoryObserver();

    this._domObserver.observe(handleChange);
    // this._historyObserver.observe(handleChange);
  }

  abort() {
    if (this._isObserving) {
      this._domObserver.abort();
      this._historyObserver.abort();

      this._domObserver = null;
      this._historyObserver = null;
    }
  }
}

const toolboxify = () => {
  let githubMetadata = null;
  let DOMObserver = null;

  const handleInnerMessage = message => {
    switch (message.type) {
      case 'modify-pages-changed':
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
    metadata => {
      githubMetadata = metadata;

      renderPageAction(metadata).then(() => {
        enablePageAction(metadata);
      });

      chrome.runtime.sendMessage({type: 'get-modify-pages'}, response => {
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
    }
  );
};

export default toolboxify;
