import 'whatwg-fetch';
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
  getToolboxURN,
  getToolboxNavURN,
  callToolbox
} from './api/toolbox';

const CLONE_BUTTON_GROUP_JS_CSS_CLASS = 'js-toolbox-clone-button-group';
const OPEN_BUTTON_JS_CSS_CLASS = 'js-toolbox-open-button';
const OPEN_MENU_ITEM_JS_CSS_CLASS = 'js-toolbox-open-menu-item';

const fetchMetadata = () => new Promise((resolve, reject) => {
  const metadata = gh(window.location.toString(), {enterprise: true});
  if (metadata) {
    resolve(metadata);
  } else {
    reject();
  }
});

const checkResponseStatus = response => new Promise((resolve, reject) => {
  if (response.status >= MIN_VALID_HTTP_STATUS && response.status <= MAX_VALID_HTTP_STATUS) {
    resolve(response);
  } else {
    reject();
  }
});

const parseResponse = response => new Promise((resolve, reject) => {
  response.json().then(result => {
    if (Object.keys(result).length > 0) {
      resolve(result);
    } else {
      reject();
    }
  }).catch(() => {
    reject();
  });
});

const convertBytesToPercents = languages => new Promise(resolve => {
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

  resolve(languages);
});

const extractLanguagesFromPage = githubMetadata => new Promise(resolve => {
  // TBX-4762: private repos don't let use API, load root page and scrape languages off it
  fetch(githubMetadata.clone_url).
    then(response => response.text()).
    then(htmlString => {
      const parser = new DOMParser();
      const htmlDocument = parser.parseFromString(htmlString, 'text/html');
      const languageElements = htmlDocument.querySelectorAll('.repository-lang-stats-numbers .lang');
      if (languageElements.length === 0) {
        // see if it's new UI as of 24.06.20
        const newLanguageElements = htmlDocument.querySelectorAll(
          '[data-ga-click="Repository, language stats search click, location:repo overview"]'
        );
        if (newLanguageElements.length > 0) {
          const allLanguages = Array.from(newLanguageElements).reduce((acc, el) => {
            const langEl = el.querySelector('span');
            const percentEl = langEl.nextElementSibling;
            acc[langEl.textContent] = percentEl ? parseFloat(percentEl.textContent) : USAGE_THRESHOLD + 1;
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
          acc[el.textContent] = percentEl ? parseFloat(percentEl.textContent) : USAGE_THRESHOLD + 1;
          return acc;
        }, {});
        resolve(allLanguages);
      }
    }).
    catch(() => {
      resolve(DEFAULT_LANGUAGE_SET);
    });
});

const fetchLanguages = githubMetadata => new Promise(resolve => {
  fetch(`${githubMetadata.api_url}/languages`).
    then(checkResponseStatus).
    then(parseResponse).
    then(convertBytesToPercents).
    then(resolve).
    catch(() => {
      extractLanguagesFromPage(githubMetadata).
        then(resolve);
    });
});

const selectTools = languages => new Promise(resolve => {
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

  const normalizedToolIds = selectedToolIds.length > 0
    ? Array.from(new Set(selectedToolIds))
    : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  const tools = normalizedToolIds.
    sort().
    map(toolId => SUPPORTED_TOOLS[toolId]);

  resolve(tools);
});

const fetchTools = githubMetadata => fetchLanguages(githubMetadata).then(selectTools);

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
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(githubMetadata)
        : getSshCloneUrl(githubMetadata);
      const action = getToolboxURN(toolTag, cloneUrl);
      callToolbox(action);
    });
  });
};

const createCloneButton = (tool, githubMetadata, small = true) => {
  const button = document.createElement('a');
  button.setAttribute(
    'class',
    `btn ${small ? 'btn-sm' : ''} tooltipped tooltipped-s tooltipped-multiline BtnGroup-item d-flex`
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
      const toolboxCloneButtonGroup = document.createElement('div');
      const isOnPullRequestsTab = document.querySelector('#pull-requests-tab[aria-current="page"]');
      toolboxCloneButtonGroup.setAttribute(
        'class',
        `BtnGroup ${isOnPullRequestsTab ? 'ml-1' : 'mr-2'} d-flex ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`
      );
      tools.forEach(tool => {
        const btn = createCloneButton(tool, githubMetadata, false);
        toolboxCloneButtonGroup.appendChild(btn);
      });

      getRepoController.insertAdjacentElement('beforebegin', toolboxCloneButtonGroup);
    }
  }
};

const addOpenButtonEventHandler = (domElement, tool, githubMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    const {user, repo, branch} = githubMetadata;
    const normalizedBranch = branch.split('/').shift();
    const filePath = location.pathname.replace(`/${user}/${repo}/blob/${normalizedBranch}/`, '');
    let lineNumber = location.hash.replace('#L', '');
    if (lineNumber === '') {
      lineNumber = null;
    }

    callToolbox(getToolboxNavURN(tool.tag, repo, filePath, lineNumber));
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
  const actionAnchorElement = document.querySelector('.repository-content .Box-header .BtnGroup + div:not(.BtnGroup)');
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
    actionAnchorElement.prepend(actionAnchorFragment);
  }
};

const renderPageButtons = githubMetadata => {
  fetchTools(githubMetadata).
    then(tools => {
      renderCloneButtons(tools, githubMetadata);
      renderOpenButtons(tools, githubMetadata);
    }).
    catch(() => {
      // do nothing
    });
};

const startTrackingDOMChanges = githubMetadata =>
  observe(
    'get-repo,' +
    '.repository-content .Box-header .BtnGroup + div:not(.BtnGroup)',
    {
      add() {
        removePageButtons();
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

const toolboxify = () => {
  fetchMetadata().
    then(metadata => {
      renderPageAction(metadata).then(() => {
        enablePageAction(metadata);
      });

      chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
        let DOMObserver = null;
        if (data.allow) {
          DOMObserver = startTrackingDOMChanges(metadata);
        }
        chrome.runtime.onMessage.addListener(message => {
          switch (message.type) {
            case 'modify-pages-changed':
              if (message.newValue) {
                DOMObserver = startTrackingDOMChanges(metadata);
              } else {
                stopTrackingDOMChanges(DOMObserver);
              }
              break;
            // no default
          }
        });
      });
    }).
    catch(() => {
      disablePageAction();
    });
};

export default toolboxify;
