import 'whatwg-fetch';
import {observe} from 'selector-observer';
import bb from 'bitbucket-url-to-object';

import {CLONE_PROTOCOLS, RUNTIME_MESSAGES} from './constants';

/* eslint-disable max-len */
const CLONE_BUTTON_PAGE_HEADER_WRAPPER_SELECTOR = '[data-qa="page-header-wrapper"] > div > div > div > div > div > div > button:last-child';
const CLONE_BUTTON_CONTENT_SELECTOR = '#root [data-testid="Content"] > div > div > div > div > div > div > div > div + div > div:last-child > button:last-child';
const CLONE_BUTTON_NARROW_PAGE_SELECTOR = '#root > div > div > div > header + div + div + div > div > div > div > div + div > div + div > button:last-child';
const CLONE_BUTTON_NARROW_PAGE_SIDE_PANEL_OPEN = '#root > div > div > div > div:last-child > div > div > div > div + div > div:last-child > button:last-child';
/* eslint-enable max-len */

const cloneButtonSelectors = [
  CLONE_BUTTON_CONTENT_SELECTOR,
  CLONE_BUTTON_PAGE_HEADER_WRAPPER_SELECTOR,
  CLONE_BUTTON_NARROW_PAGE_SELECTOR,
  CLONE_BUTTON_NARROW_PAGE_SIDE_PANEL_OPEN
];

const CLONE_ACTION_JS_CSS_CLASS = 'js-toolbox-clone-action';
const OPEN_ACTION_JS_CSS_CLASS = 'js-toolbox-open-action';

const fetchMetadata = () => new Promise((resolve, reject) => {
  const metadata = bb(window.location.toString());
  if (metadata) {
    // api.bitbucket.org intentionally doesn't support session authentication
    // eslint-disable-next-line camelcase
    metadata.api_url = metadata.api_url.replace('api.bitbucket.org/2.0', 'bitbucket.org/!api/2.0');
    fetch(`${metadata.api_url}?fields=links.clone`).
      then(response => response.json()).
      then(parsedResponse => {
        const extendedMetadata = {
          ...metadata,
          links: parsedResponse.links
        };
        resolve(extendedMetadata);
      }).
      catch(() => {
        reject();
      });
  } else {
    reject();
  }
});

const selectTools = () => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_TOOLS}, response => {
    if (response.error) {
      reject();
    } else {
      resolve(response.tools);
    }
  });
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

const cloneActionsRendered = () => document.getElementsByClassName(CLONE_ACTION_JS_CSS_CLASS).length > 0;

const addCloneActionEventHandler = (btn, bitbucketMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolType} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_PROTOCOL}, response => {
      const cloneURL = response.protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(bitbucketMetadata.links)
        : getSshCloneUrl(bitbucketMetadata.links);
      chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.CLONE_IN_TOOL, toolType, cloneURL});
    });
  });
};

const createCloneAction = (tool, cloneButton, bitbucketMetadata) => {
  const action = document.createElement('a');
  action.setAttribute('class', `${cloneButton.className} jt-button ${CLONE_ACTION_JS_CSS_CLASS}`);
  action.setAttribute('href', '#');
  action.dataset.toolType = tool.type;
  action.innerHTML = `<img alt="${tool.name}" src="${tool.icon_url}">`;

  addCloneActionEventHandler(action, bitbucketMetadata);

  return action;
};

// eslint-disable-next-line complexity
const renderCloneActionsSync = (tools, bitbucketMetadata, cloneButton = null) => {
  if (cloneActionsRendered()) {
    return;
  }

  if (!cloneButton) {
    // eslint-disable-next-line no-param-reassign
    cloneButton = document.querySelector(cloneButtonSelectors.join(', '));
  }
  if (!cloneButton || !cloneButton.textContent.includes('Clone')) {
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
};

const removeCloneActions = () => {
  const buttonGroup = document.querySelector('.jt-button-group');
  if (buttonGroup) {
    buttonGroup.parentElement.removeChild(buttonGroup);
  }
};

const renderCloneActions = (tools, bitbucketMetadata, cloneButton = null) => new Promise(resolve => {
  renderCloneActionsSync(tools, bitbucketMetadata, cloneButton);
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

    chrome.runtime.sendMessage({
      type: RUNTIME_MESSAGES.NAVIGATE_IN_TOOL,
      toolType: tool.type,
      project: bitbucketMetadata.repo,
      filePath,
      lineNumber
    });
  });
};

const createOpenAction = (tool, sampleAction, bitbucketMetadata) => {
  const action = sampleAction.cloneNode(true);
  action.classList.add(OPEN_ACTION_JS_CSS_CLASS);

  const actionButton = action.querySelector('button');
  actionButton.removeAttribute('disabled');

  const actionSpan = actionButton.querySelector('span > span');
  actionSpan.innerHTML =
    `<img alt="${tool.name}" src="${tool.icon_url}" width="16" height="16" style="vertical-align:text-bottom">`;

  addNavigateActionEventHandler(actionButton, tool, bitbucketMetadata);

  const tooltip = createButtonTooltip(actionButton, `Open this file in ${tool.name}`);
  action.appendChild(tooltip);

  return action;
};

const openActionsRendered = () => document.getElementsByClassName(OPEN_ACTION_JS_CSS_CLASS).length > 0;

const renderOpenActionsSync = (tools, bitbucketMetadata) => {
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
};

const renderOpenActions = (tools, bitbucketMetadata) => new Promise(resolve => {
  renderOpenActionsSync(tools, bitbucketMetadata);
  resolve();
});

const setupPageAction = () => new Promise((resolve, reject) => {
  fetchMetadata().
    then(metadata => {
      chrome.runtime.sendMessage({
        type: RUNTIME_MESSAGES.ENABLE_PAGE_ACTION,
        project: metadata.repo,
        https: getHttpsCloneUrl(metadata.links),
        ssh: getSshCloneUrl(metadata.links)
      });
      resolve(metadata);
    }).
    catch(() => {
      chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.DISABLE_PAGE_ACTION});
      reject();
    });
});

const trackUserNavigation = () => {
  const titleObserver = new MutationObserver((/*mutations*/) => {
    // re-init on client navigation
    setupPageAction().catch(() => {
      // do nothing
    });
  });
  titleObserver.observe(document.querySelector('title'), {childList: true});
};

const trackDOMChanges = () => {
  observe(cloneButtonSelectors.join(', '), {
    add(el) {
      if (el.textContent.includes('Clone')) {
        Promise.all([setupPageAction(), selectTools()]).
          then(([bitbucketMetadata, tools]) => {
            renderCloneActions(tools, bitbucketMetadata, el);
          }).
          catch(() => {
            // do nothing
          });
      }
    },
    remove(/*el*/) {
      removeCloneActions();
    }
  });
  observe('[data-qa="bk-file__header"] > div > [data-qa="bk-file__actions"]', {
    add(/*el*/) {
      Promise.all([setupPageAction(), selectTools()]).
        then(([bitbucketMetadata, tools]) => {
          renderOpenActions(tools, bitbucketMetadata);
        }).
        catch(() => {
          // do nothing
        });
    }
  });
};

const toolboxify = () => {
  // initial page load
  setupPageAction().
    catch(() => {
      // do nothing
    }).
    then(() => {
      trackUserNavigation();
      trackDOMChanges();
    });
};

export default toolboxify;
