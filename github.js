import {observe} from 'selector-observer';
import gh from 'github-url-to-object';

import {CLONE_PROTOCOLS} from './constants';

import {
  getToolboxCloneUrl,
  getToolboxOpenUrl,
  getInstalledTools,
  callToolbox,
  parseLineNumber
} from './web-api/toolbox-client';
import {info, warn, error} from './web-api/web-logger';
import {f} from './api/format';

const CLONE_BUTTON_GROUP_JS_CSS_CLASS = 'js-toolbox-clone-button-group';
const OPEN_BUTTON_JS_CSS_CLASS = 'js-toolbox-open-button';
const OPEN_MENU_ITEM_JS_CSS_CLASS = 'js-toolbox-open-menu-item';

const BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR = '.js-blob-header .BtnGroup + div:not(.BtnGroup)';

function fetchMetadata() {
  const repositoryContainerHeader = document.getElementById('repository-container-header');
  if (repositoryContainerHeader) {
    const metadata = gh(window.location.toString(), {enterprise: true});
    if (metadata) {
      info(f`Parsed repository metadata: ${metadata}`);
    } else {
      error('Failed to parse metadata');
    }
    return metadata;
  } else {
    warn('Missing repository container header');
    return null;
  }
}

const getHttpsCloneUrl = githubMetadata => `${githubMetadata.clone_url}.git`;
const getSshCloneUrl =
  githubMetadata => `git@${githubMetadata.host}:${githubMetadata.user}/${githubMetadata.repo}.git`;

const removeCloneButtons = () => {
  const cloneButtonGroup = document.querySelector(`.${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);
  if (cloneButtonGroup) {
    cloneButtonGroup.parentElement.removeChild(cloneButtonGroup);
    info('Removed the clone buttons');
  } else {
    info('No clone buttons found, nothing to remove');
  }
};

const addCloneButtonEventHandler = (btn, githubMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolId, toolTag} = e.currentTarget.dataset;

    info(`The clone button (${toolTag}:${toolId}) was clicked`);

    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(githubMetadata)
        : getSshCloneUrl(githubMetadata);
      const toolboxCloneUrl = getToolboxCloneUrl(toolId, cloneUrl);
      callToolbox(toolboxCloneUrl);
    });
  });

  info(`Added click handler for the clone button (${btn.dataset.toolTag})`);
};

const createCloneButton = (tool, githubMetadata, small = true) => {
  info(`Creating the clone button (${tool.tag}:${tool.id})`);

  const button = document.createElement('a');
  button.setAttribute(
    'class',
    `btn ${small ? 'btn-sm' : ''} tooltipped tooltipped-s tooltipped-multiline BtnGroup-item m-0`
  );
  button.setAttribute('href', '#');
  button.setAttribute('aria-label', `Clone in ${tool.name} ${tool.version}`);
  button.setAttribute('style', 'align-items:center');
  button.dataset.toolId = tool.id;
  button.dataset.toolTag = tool.tag;

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', `${tool.name} ${tool.version}`);
  buttonIcon.setAttribute('src', tool.defaultIcon);
  buttonIcon.setAttribute('width', '16');
  buttonIcon.setAttribute('height', '16');
  buttonIcon.setAttribute('style', 'vertical-align:text-top');
  button.appendChild(buttonIcon);

  addCloneButtonEventHandler(button, githubMetadata);

  return button;
};

const renderCloneButtons = (tools, githubMetadata) => {
  info(f`Rendering the clone buttons (${tools.map(t => t.tag)})`);

  let getRepoController = document.querySelector('.BtnGroup + .d-flex > get-repo-controller');
  getRepoController = getRepoController
    ? getRepoController.parentElement
    : document.querySelector('.js-get-repo-select-menu');

  if (getRepoController) {
    info('The repo controller element is found');

    const toolboxCloneButtonGroup = document.createElement('div');
    toolboxCloneButtonGroup.setAttribute('class', `BtnGroup ml-2 d-flex ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);

    tools.forEach(tool => {
      const btn = createCloneButton(tool, githubMetadata);
      toolboxCloneButtonGroup.appendChild(btn);

      info(`Embedded the clone button (${tool.tag}:${tool.id})`);
    });

    getRepoController.insertAdjacentElement('beforebegin', toolboxCloneButtonGroup);
  } else {
    // new UI as of 24.06.20
    getRepoController = document.querySelector('get-repo');
    if (getRepoController) {
      info('The repo controller element is found');

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

        info(`Embedded the clone button (${tool.tag}:${tool.id})`);
      });

      getRepoController.parentElement.insertAdjacentElement('beforebegin', toolboxCloneButtonGroup);
    } else {
      info('Missing the repo controller element, nowhere to render the clone buttons');
    }
  }
};

const addOpenButtonEventHandler = (domElement, tool, githubMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    info(`The open button/menu item (${tool.tag}:${tool.id}) was clicked`);

    const {user, repo, branch} = githubMetadata;
    const normalizedBranch = branch.split('/').shift();
    const filePath = location.pathname.replace(`/${user}/${repo}/blob/${normalizedBranch}/`, '');
    const lineNumber = parseLineNumber(location.hash.replace('#L', ''));

    callToolbox(getToolboxOpenUrl(tool.id, repo, filePath, lineNumber));
  });

  info(`Added click handler for the open button/menu item (${tool.tag}:${tool.id})`);
};

// when navigating with back and forward buttons
// we have to re-create open actions b/c their click handlers got lost somehow
const removeOpenButtons = () => {
  const actions = document.querySelectorAll(`.${OPEN_BUTTON_JS_CSS_CLASS}`);
  if (actions.length > 0) {
    actions.forEach(action => {
      action.parentElement.removeChild(action);
    });
    info('Removed the open buttons');
  } else {
    info('No open buttons found, nothing to remove');
  }

  const menuItems = document.querySelectorAll(`.${OPEN_MENU_ITEM_JS_CSS_CLASS}`);
  if (menuItems.length > 0) {
    menuItems.forEach(item => {
      item.parentElement.removeChild(item);
    });
    info('Removed the open menu items');
  } else {
    info('No open menu items found, nothing to remove');
  }
};

const removePageButtons = () => {
  info('Removing the embedded page buttons if any');

  removeCloneButtons();
  removeOpenButtons();
};

const createOpenButton = (tool, githubMetadata) => {
  info(`Creating the open button (${tool.tag}:${tool.id})`);

  const action = document.createElement('a');
  action.setAttribute('class', `btn-octicon tooltipped tooltipped-nw ${OPEN_BUTTON_JS_CSS_CLASS}`);
  action.setAttribute('aria-label', `Open this file in ${tool.name} ${tool.version}`);
  action.setAttribute('href', '#');

  const actionIcon = document.createElement('img');
  actionIcon.setAttribute('alt', `${tool.name} ${tool.version}`);
  actionIcon.setAttribute('src', tool.defaultIcon);
  actionIcon.setAttribute('width', '16');
  actionIcon.setAttribute('height', '16');
  action.appendChild(actionIcon);

  addOpenButtonEventHandler(action, tool, githubMetadata);

  return action;
};

const createOpenMenuItem = (tool, first, githubMetadata) => {
  info(`Creating the open menu item (${tool.tag}:${tool.id})`);

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
  info(
    `Added click handler for the open menu item (${tool.tag}:${tool.id}), closing the blob toolbar dropdown element`
  );

  const menuItemContainer = document.createElement('li');
  menuItemContainer.setAttribute('class', OPEN_MENU_ITEM_JS_CSS_CLASS);
  menuItemContainer.appendChild(menuItem);

  return menuItemContainer;
};

const renderOpenButtons = (tools, githubMetadata) => {
  info(f`Rendering the open buttons (${tools.map(t => `${t.tag}:${t.id}`)})`);

  const actionAnchorElement = document.querySelector(BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR);
  const actionAnchorFragment = document.createDocumentFragment();
  const blobToolbarDropdown = document.querySelector('.BlobToolbar-dropdown');

  tools.forEach((tool, toolIndex) => {
    if (actionAnchorElement) {
      const action = createOpenButton(tool, githubMetadata);
      actionAnchorFragment.appendChild(action);

      info(`Embedded the open button (${tool.tag}:${tool.id})`);
    }
    if (blobToolbarDropdown) {
      const menuItem = createOpenMenuItem(tool, toolIndex === 0, githubMetadata);
      blobToolbarDropdown.appendChild(menuItem);

      info(`Embedded the open menu item (${tool.tag}:${tool.id})`);
    }
  });

  if (actionAnchorElement) {
    actionAnchorElement.append(actionAnchorFragment);
  } else {
    info('Missing the action anchor element, nowhere to render the open buttons');
  }
  if (!blobToolbarDropdown) {
    info('Missing the blob toolbar dropdown element, nowhere to render the open menu items');
  }
};

const renderPageButtons = async githubMetadata => {
  try {
    info('Rendering the page buttons');

    const tools = await getInstalledTools();

    removePageButtons();
    renderCloneButtons(tools, githubMetadata);
    renderOpenButtons(tools, githubMetadata);
  } catch (e) {
    warn('Failed to render the page buttons', e);
  }
};

const startTrackingDOMChanges = githubMetadata => {
  info('Started observing DOM');

  return observe(
    `get-repo, ${BLOB_HEADER_BUTTON_GROUP_SCC_SELECTOR}`,
    {
      add() {
        info('Found a place to embed the page buttons');
        renderPageButtons(githubMetadata).then(() => {
          // nothing to do here
        });
      }
    }
  );
};

const stopTrackingDOMChanges = observer => {
  if (observer) {
    observer.abort();
    info('Stopped observing DOM');
  } else {
    info('Missing the observer, observing DOM, nothing to stop');
  }
};

const enablePageAction = githubMetadata => {
  info('Enabling the page action');

  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: githubMetadata.repo,
    https: getHttpsCloneUrl(githubMetadata),
    ssh: getSshCloneUrl(githubMetadata)
  });
};

const disablePageAction = () => {
  info('Disabling the page action');
  chrome.runtime.sendMessage({type: 'disable-page-action'});
};

class AbstractGitHubObserver {
  constructor() {
    if (this.constructor === AbstractGitHubObserver) {
      throw new Error('Abstract classes can\'t be instantiated');
    }
  }

  // eslint-disable-next-line no-unused-vars
  observe(onChange) {
    this.#throwNotImplemented(this.observe);
  }

  abort() {
    this.#throwNotImplemented(this.abort);
  }

  #throwNotImplemented(method) {
    throw new Error(`Method '${method.name}' is not implemented`);
  }
}

class DomObserver extends AbstractGitHubObserver {
  #observer;

  constructor() {
    super();

    this.#observer = null;
  }

  observe(onChange) {
    if (this.#observer !== null) {
      return;
    }

    const observerName = this.constructor.name;

    info(`${observerName}: started observing DOM`);

    this.#observer = observe(
      '#repository-container-header',
      {
        add() {
          info(`${observerName}: found repository container header`);
          onChange();
        },
        remove() {
          info(`${observerName}: repository container header is not found`);
          onChange();
        }
      }
    );
  }

  abort() {
    this.#observer?.abort();
    this.#observer = null;

    info(`${this.constructor.name}: stopped observing DOM`);
  }
}

class ProjectObserver extends AbstractGitHubObserver {
  #isObserving;
  #metadata;
  #domObserver;

  constructor() {
    super();

    this.#isObserving = false;
    this.#metadata = null;
    this.#domObserver = null;
  }

  observe(onProjectEnter, onProjectLeave) {
    if (this.#isObserving) {
      return;
    }

    info(`${this.constructor.name}: started observing projects`);

    this.#isObserving = true;
    this.#metadata = fetchMetadata();

    if (this.#metadata) {
      info(`${this.constructor.name}: entered a project`);
      onProjectEnter(this.#metadata);
    } else {
      info(`${this.constructor.name}: left a project`);
      onProjectLeave();
    }

    const handleChange = () => {
      const metadata = fetchMetadata();
      const enteredProject = Boolean(metadata) && (!this.#metadata || metadata.clone_url !== this.#metadata.clone_url);
      const leftProject = Boolean(this.#metadata) && (!metadata || this.#metadata.clone_url !== metadata.clone_url);

      if (enteredProject) {
        info(`${this.constructor.name}: entered a project`);
        onProjectEnter(metadata);
      } else if (leftProject) {
        info(`${this.constructor.name}: left a project`);
        onProjectLeave();
      }

      this.#metadata = metadata;
    };

    this.#domObserver = new DomObserver();

    this.#domObserver.observe(handleChange);
  }

  abort() {
    if (this.#isObserving) {
      this.#domObserver.abort();
      this.#domObserver = null;

      info(`${this.constructor.name}: stopped observing projects`);
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
      case 'perform-action':
        const toolboxCloneUrl = getToolboxCloneUrl(message.toolId, message.cloneUrl);
        callToolbox(toolboxCloneUrl);
        break;
      // no default
    }
    return undefined;
  };

  const projectObserver = new ProjectObserver();
  projectObserver.observe(
    metadata => {
      githubMetadata = metadata;

      enablePageAction(metadata);

      chrome.runtime.sendMessage({type: 'get-modify-pages'}, response => {
        if (response.allow) {
          DOMObserver = startTrackingDOMChanges(metadata);
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
