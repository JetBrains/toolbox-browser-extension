import 'whatwg-fetch';
import {debounce} from 'throttle-debounce';
import bb from 'bitbucket-url-to-object';

import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  getToolboxURN,
  getToolboxNavURN,
  getProtocol,
  callToolbox,
  DEFAULT_LANGUAGE,
  CLONE_PROTOCOLS
} from './common';

const MUTATION_DEBOUNCE_DELAY_LEADING = 2000;
const MUTATION_DEBOUNCE_DELAY_TRAILING = 750;

const fetchMetadata = () => new Promise((resolve, reject) => {
  const metadata = bb(window.location.toString());
  if (metadata) {
    // api.bitbucket.org intentionally doesn't support session authentication
    // eslint-disable-next-line camelcase
    metadata.api_url = metadata.api_url.replace('api.bitbucket.org/2.0', 'bitbucket.org/!api/2.0');
    fetch(`${metadata.api_url}?fields=links.clone`).
      then(response => response.json()).
      then(parsedResponse => {
        resolve({
          ...metadata,
          links: parsedResponse.links
        });
      }).
      catch(() => {
        reject();
      });
  } else {
    reject();
  }
});

const fetchLanguages = bitbucketMetadata => new Promise((resolve, reject) => {
  fetch(`${bitbucketMetadata.api_url}?fields=language`).
    then(response => response.json()).
    then(parsedResponse => {
      resolve(parsedResponse.language);
    }).
    catch(() => {
      reject();
    });
});

const selectTools = language => new Promise(resolve => {
  // All languages in Bitbucket match the common list with an exception of HTML
  const normalizedLanguage = language === 'html/css' ? 'html' : language;

  const toolIds = normalizedLanguage && SUPPORTED_LANGUAGES[normalizedLanguage.toLowerCase()];
  const normalizedToolIds = toolIds && toolIds.length > 0
    ? toolIds
    : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  const tools = normalizedToolIds.
    sort().
    map(toolId => SUPPORTED_TOOLS[toolId]);

  resolve(tools);
});

let messageHandler = null;

const renderPopupCloneActions = tools => new Promise(resolve => {
  if (messageHandler && chrome.runtime.onMessage.hasListener(messageHandler)) {
    chrome.runtime.onMessage.removeListener(messageHandler);
  }
  messageHandler = (message, sender, sendResponse) => {
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
  chrome.runtime.onMessage.addListener(messageHandler);

  resolve();
});

const getCloneUrl = (links, which) => {
  const link = links.clone.find(l => l.name === which);
  return link ? link.href : '';
};

const getHttpsCloneUrl = links => getCloneUrl(links, 'https');
const getSshCloneUrl = links => getCloneUrl(links, 'ssh');

const addStyleSheet = () => {
  const sheetId = 'jt-bitbucket-style';
  if (document.getElementById(sheetId)) {
    return;
  }

  const styleSheet = document.createElement('style');
  styleSheet.setAttribute('id', sheetId);
  styleSheet.innerHTML = `
  .jt-button-group {
    display: inline-block;
    margin: 0 2px;
  }
  .jt-button {
    margin: 0 2px;
  }
  .jt-button:hover {
    background: rgba(9, 30, 66, 0.08);
    cursor: pointer;
  }
  .jt-button img {
    align-self: center;
    width: 18px;
    height: 18px;
  }
`;

  document.head.appendChild(styleSheet);
};

const createButtonTooltip = (button, text) => {
  const tooltip = document.createElement('div');

  tooltip.setAttribute('style', 'background-color:rgb(23,43,77); border-radius:3px;' +
    'box-sizing: border-box; color:#fff; display:none; font-size: 12px; line-height: 15.6px; max-width: 240px;' +
    'padding:2px 6px; position:absolute; transform:translate3d(calc(-100% - 8px),-130%,0);');
  tooltip.textContent = text;

  const TOOLTIP_TIMEOUT = 450;
  button.addEventListener('mouseenter', () => {
    button.setAttribute('style', 'cursor:pointer; background:rgba(9,30,66,0.08);');
    setTimeout(() => {
      tooltip.style.display = 'block';
    }, TOOLTIP_TIMEOUT);
  });
  button.addEventListener('mouseleave', () => {
    button.removeAttribute('style');
    setTimeout(() => {
      tooltip.style.display = 'none';
    }, TOOLTIP_TIMEOUT);
  });

  return tooltip;
};

const cloneActionsRendered = () => document.getElementsByClassName('js-toolbox-clone-action').length > 0;

const addCloneActionEventHandler = (btn, bitbucketMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    getProtocol().then(protocol => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(bitbucketMetadata.links)
        : getSshCloneUrl(bitbucketMetadata.links);
      const action = getToolboxURN(toolTag, cloneUrl);

      callToolbox(action);
    });
  });
};

const createCloneAction = (tool, cloneButton, bitbucketMetadata) => {
  const action = document.createElement('a');
  action.setAttribute('class', `${cloneButton.className} jt-button js-toolbox-clone-action`);
  action.setAttribute('href', '#');
  action.dataset.toolTag = tool.tag;
  action.innerHTML = `<img alt="${tool.name}" src="${tool.icon}">`;

  addCloneActionEventHandler(action, bitbucketMetadata);

  return action;
};

// eslint-disable-next-line complexity
const renderCloneActionsSync = debounce(MUTATION_DEBOUNCE_DELAY_TRAILING, false, (tools, bitbucketMetadata) => {
  if (cloneActionsRendered()) {
    return;
  }

  let cloneButton = document.querySelector('[data-qa="page-header-wrapper"] button[type="button"]');
  if (!cloneButton) {
    const commitListContainer = document.querySelector('[data-qa="commit-list-container"]');
    if (!commitListContainer) {
      return;
    }
    const preHeader = commitListContainer.previousElementSibling;
    if (!preHeader) {
      return;
    }
    const prePreHeader = preHeader.previousElementSibling;
    if (!prePreHeader) {
      return;
    }
    cloneButton = prePreHeader.querySelector(':nth-child(2) > :nth-child(2) > button');
    if (!cloneButton) {
      return;
    }
  }

  if (!cloneButton.textContent.includes('Clone')) {
    return;
  }

  addStyleSheet();

  const buttonGroup = document.createElement('div');
  buttonGroup.setAttribute('class', 'jt-button-group');

  tools.
    forEach(tool => {
      const btn = createCloneAction(tool, cloneButton, bitbucketMetadata);
      buttonGroup.appendChild(btn);

      const tooltip = createButtonTooltip(btn, `Clone in ${tool.name}`);
      buttonGroup.appendChild(tooltip);
    });

  cloneButton.insertAdjacentElement('beforebegin', buttonGroup);
});

const removeCloneActions = () => {
  const buttonGroup = document.querySelector('.jt-button-group');
  if (buttonGroup) {
    buttonGroup.parentElement.removeChild(buttonGroup);
  }
};

const renderCloneActions = (tools, bitbucketMetadata) => new Promise(resolve => {
  renderCloneActionsSync(tools, bitbucketMetadata);
  resolve();
});

const addNavigateActionEventHandler = (domElement, tool, bitbucketMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    const filePathIndex = 5;
    const filePath = location.pathname.split('/').splice(filePathIndex).join('/');
    let lineNumber = location.hash.replace('#lines-', '');
    if (lineNumber === '') {
      lineNumber = null;
    }

    callToolbox(getToolboxNavURN(tool.tag, bitbucketMetadata.repo, filePath, lineNumber));
  });
};

const createOpenAction = (tool, sampleAction, bitbucketMetadata) => {
  const action = sampleAction.cloneNode(true);
  action.classList.add('js-toolbox-open-action');

  const actionButton = action.querySelector('button');
  actionButton.removeAttribute('disabled');

  const actionSpan = actionButton.querySelector('span > span');
  actionSpan.innerHTML =
    `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align:text-bottom">`;

  addNavigateActionEventHandler(actionButton, tool, bitbucketMetadata);

  const tooltip = createButtonTooltip(actionButton, `Open this file in ${tool.name}`);
  action.appendChild(tooltip);

  return action;
};

const openActionsRendered = () => document.getElementsByClassName('js-toolbox-open-action').length > 0;

const renderOpenActionsSync = debounce(MUTATION_DEBOUNCE_DELAY_TRAILING, false, (tools, bitbucketMetadata) => {
  if (openActionsRendered()) {
    return;
  }

  const actionAnchorElement =
    document.querySelector('[data-qa="bk-file__actions"] > [data-qa="bk-file__action-button"]');

  if (actionAnchorElement) {
    tools.forEach(tool => {
      const action = createOpenAction(tool, actionAnchorElement, bitbucketMetadata);
      actionAnchorElement.insertAdjacentElement('beforebegin', action);
    });
  }
});

const renderOpenActions = (tools, bitbucketMetadata) => new Promise(resolve => {
  renderOpenActionsSync(tools, bitbucketMetadata);
  resolve();
});

const toolboxifyInternal = debounce(MUTATION_DEBOUNCE_DELAY_LEADING, true, () => {
  fetchMetadata().
    then(metadata => fetchLanguages(metadata).
      then(selectTools).
      then(tools => renderPopupCloneActions(tools).
        then(() => renderCloneActions(tools, metadata)).
        then(() => renderOpenActions(tools, metadata))
      ).
      then(() => {
        chrome.runtime.sendMessage({
          type: 'enable-page-action',
          project: metadata.repo,
          https: getHttpsCloneUrl(metadata.links),
          ssh: getSshCloneUrl(metadata.links)
        });
      })
    ).
    catch(() => {
      chrome.runtime.sendMessage({type: 'disable-page-action'});
    });
});

const startTrackingDOMChanges = () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    // eslint-disable-next-line complexity
    const observer = new MutationObserver(mutations => {
      let cloneButtonRemoved = false;
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') {
          continue;
        }
        if (mutation.removedNodes.length === 1 &&
          mutation.previousSibling &&
          mutation.previousSibling.classList.contains('jt-button-group')) {
          if (mutation.removedNodes[0].textContent === 'Clone') {
            cloneButtonRemoved = true;
          }
        }
        if (mutation.addedNodes.length === 0) {
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }
          if (node.querySelector('[data-qa="bk-file__header"]')) {
            toolboxifyInternal();
          }
        }
      }
      if (cloneButtonRemoved) {
        removeCloneActions();
      } else {
        toolboxifyInternal();
      }
    });
    observer.observe(rootElement, {childList: true, subtree: true});
  }
};

const toolboxify = () => {
  startTrackingDOMChanges();
};

export default toolboxify;
