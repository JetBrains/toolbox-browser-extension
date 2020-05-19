import 'whatwg-fetch';
import {observe} from 'selector-observer';
import gh from 'github-url-to-object';

import {
  getToolboxURN,
  getToolboxNavURN,
  getProtocol,
  callToolbox,
  CLONE_PROTOCOLS
} from './common';

const CLONE_BUTTON_GROUP_JS_CSS_CLASS = 'js-toolbox-clone-button-group';
const OPEN_ACTION_JS_CSS_CLASS = 'js-toolbox-open-action';
const OPEN_MENU_ITEM_JS_CSS_CLASS = 'js-toolbox-open-menu-item';

const fetchMetadata = () => new Promise((resolve, reject) => {
  const metadata = gh(window.location.toString(), {enterprise: true});
  if (metadata) {
    resolve(metadata);
  } else {
    reject();
  }
});

let installedTools = null;

const selectTools = () => new Promise(resolve => {
  if (installedTools) {
    resolve(installedTools);
  } else {
    chrome.runtime.sendMessage({type: 'get-tools'}, response => {
      installedTools = response.tools;
      resolve(installedTools);
    });
  }
});

const getHttpsCloneUrl = githubMetadata => `${githubMetadata.clone_url}.git`;
const getSshCloneUrl =
  githubMetadata => `git@${githubMetadata.host}:${githubMetadata.user}/${githubMetadata.repo}.git`;

let onMessageHandler = null;

const renderPopupCloneActions = tools => new Promise(resolve => {
  if (onMessageHandler && chrome.runtime.onMessage.hasListener(onMessageHandler)) {
    chrome.runtime.onMessage.removeListener(onMessageHandler);
  }
  onMessageHandler = (message, sender, sendResponse) => {
    switch (message.type) {
      case 'get-tools':
        sendResponse(tools);
        break;
      case 'perform-action':
        const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
        callToolbox(toolboxAction);
        break;
      // no default
    }
  };
  chrome.runtime.onMessage.addListener(onMessageHandler);

  resolve();
});

const removeCloneActions = () => {
  const cloneButtonGroup = document.querySelector(`.${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);
  if (cloneButtonGroup) {
    cloneButtonGroup.parentElement.removeChild(cloneButtonGroup);
  }
};

const addCloneActionEventHandler = (btn, githubMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    getProtocol().then(protocol => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(githubMetadata)
        : getSshCloneUrl(githubMetadata);
      const action = getToolboxURN(toolTag, cloneUrl);

      callToolbox(action);
    });
  });
};

const createCloneAction = (tool, githubMetadata) => {
  const action = document.createElement('a');
  action.setAttribute('class', 'btn btn-sm tooltipped tooltipped-s tooltipped-multiline BtnGroup-item');
  action.setAttribute('href', '#');
  action.setAttribute('aria-label', `Clone in ${tool.name}`);
  action.dataset.toolTag = tool.type;
  action.innerHTML =
    `<img alt="${tool.name}" src="${tool.icon_url}" width="16" height="16" style="vertical-align: text-top;">`;

  addCloneActionEventHandler(action, githubMetadata);

  return action;
};

const renderCloneActionsSync = (tools, githubMetadata) => {
  let getRepoController = document.querySelector('.BtnGroup + .d-flex > get-repo-controller');
  getRepoController = getRepoController
    ? getRepoController.parentElement
    : document.querySelector('.js-get-repo-select-menu');

  if (getRepoController) {
    // the buttons still exist on the previous page after clicking on the 'Back' button;
    // only create them if they are absent
    let toolboxCloneButtonGroup = document.querySelector(`.${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);
    if (!toolboxCloneButtonGroup) {
      toolboxCloneButtonGroup = document.createElement('div');
      toolboxCloneButtonGroup.setAttribute('class', `BtnGroup ml-2 ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);

      tools.forEach(tool => {
        const btn = createCloneAction(tool, githubMetadata);
        toolboxCloneButtonGroup.appendChild(btn);
      });

      getRepoController.insertAdjacentElement('beforebegin', toolboxCloneButtonGroup);
    }
  }
};

const renderCloneActions = (tools, githubMetadata) => new Promise(resolve => {
  renderCloneActionsSync(tools, githubMetadata);
  resolve();
});

const addNavigateActionEventHandler = (domElement, tool, githubMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    const {user, repo, branch} = githubMetadata;
    const normalizedBranch = branch.split('/').shift();
    const filePath = location.pathname.replace(`/${user}/${repo}/blob/${normalizedBranch}/`, '');
    let lineNumber = location.hash.replace('#L', '');
    if (lineNumber === '') {
      lineNumber = null;
    }

    callToolbox(getToolboxNavURN(tool.type, repo, filePath, lineNumber));
  });
};

// when navigating with back and forward buttons
// we have to re-create open actions b/c their click handlers got lost somehow
const removeOpenActions = () => {
  const actions = document.querySelectorAll(`.${OPEN_ACTION_JS_CSS_CLASS}`);
  actions.forEach(action => {
    action.parentElement.removeChild(action);
  });

  const menuItems = document.querySelectorAll(`.${OPEN_MENU_ITEM_JS_CSS_CLASS}`);
  menuItems.forEach(item => {
    item.parentElement.removeChild(item);
  });
};

const removePageActions = () => {
  removeCloneActions();
  removeOpenActions();
};

const createOpenAction = (tool, githubMetadata) => {
  const action = document.createElement('a');
  action.setAttribute('class', `btn-octicon tooltipped tooltipped-nw ${OPEN_ACTION_JS_CSS_CLASS}`);
  action.setAttribute('aria-label', `Open this file in ${tool.name}`);
  action.setAttribute('href', '#');
  action.innerHTML = `<img alt="${tool.name}" src="${tool.icon_url}" width="16" height="16">`;

  addNavigateActionEventHandler(action, tool, githubMetadata);

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

  addNavigateActionEventHandler(menuItem, tool, githubMetadata);
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

const renderOpenActionsSync = (tools, githubMetadata) => {
  const actionAnchorElement = document.querySelector('.repository-content .Box-header .BtnGroup + div');
  const actionAnchorFragment = document.createDocumentFragment();
  const blobToolbarDropdown = document.querySelector('.BlobToolbar-dropdown');

  tools.forEach((tool, toolIndex) => {
    if (actionAnchorElement) {
      const action = createOpenAction(tool, githubMetadata);
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

const renderOpenActions = (tools, githubMetadata) => new Promise(resolve => {
  renderOpenActionsSync(tools, githubMetadata);
  resolve();
});

const renderPageActions = (tools, githubMetadata) => new Promise((resolve, reject) => {
  Promise.
    all([
      renderCloneActions(tools, githubMetadata),
      renderOpenActions(tools, githubMetadata)
    ]).
    then(() => {
      resolve();
    }).
    catch(() => {
      reject();
    });
});

const init = () => new Promise((resolve, reject) => {
  fetchMetadata().
    then(metadata => selectTools().
      then(tools => renderPopupCloneActions(tools).then(() => {
        chrome.runtime.sendMessage({
          type: 'enable-page-action',
          project: metadata.repo,
          https: getHttpsCloneUrl(metadata),
          ssh: getSshCloneUrl(metadata)
        });
        resolve({tools, metadata});
      }))
    ).
    catch(() => {
      chrome.runtime.sendMessage({type: 'disable-page-action'});
      reject();
    });
});

const trackDOMChanges = () => {
  observe('.new-discussion-timeline', {
    add() {
      init().
        then(({tools, metadata}) => renderPageActions(tools, metadata)).
        catch(() => {
          // do nothing
        });
    },
    remove() {
      removePageActions();
    }
  });
};

const toolboxify = () => {
  trackDOMChanges();
};

export default toolboxify;
