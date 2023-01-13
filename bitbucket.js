import {observe} from 'selector-observer';
import bb from 'bitbucket-url-to-object';

import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  DEFAULT_LANGUAGE,
  CLONE_PROTOCOLS
} from './constants';

import {
  getToolboxCloneUrl,
  getToolboxNavigateUrl,
  callToolbox,
  parseLineNumber
} from './web-api/toolbox';

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

const CLONE_BUTTON_JS_CSS_CLASS = 'js-toolbox-clone-button';
const OPEN_BUTTON_JS_CSS_CLASS = 'js-toolbox-open-button';

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
      catch(reject);
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

const fetchTools = bitbucketMetadata => fetchLanguages(bitbucketMetadata).then(selectTools);

let onMessageHandler = null;

const renderPageAction = bitbucketMetadata => new Promise(resolve => {
  if (onMessageHandler && chrome.runtime.onMessage.hasListener(onMessageHandler)) {
    chrome.runtime.onMessage.removeListener(onMessageHandler);
  }
  onMessageHandler = (message, sender, sendResponse) => {
    switch (message.type) {
      case 'get-tools':
        fetchTools(bitbucketMetadata).then(sendResponse);
        return true;
      case 'perform-action':
        const toolboxCloneUrl = getToolboxCloneUrl(message.toolTag, message.cloneUrl);
        callToolbox(toolboxCloneUrl);
        break;
      // no default
    }
    return undefined;
  };
  chrome.runtime.onMessage.addListener(onMessageHandler);

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

const cloneButtonsRendered = () => document.getElementsByClassName(CLONE_BUTTON_JS_CSS_CLASS).length > 0;

const addCloneButtonEventHandler = (btn, bitbucketMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(bitbucketMetadata.links)
        : getSshCloneUrl(bitbucketMetadata.links);
      const toolboxCloneUrl = getToolboxCloneUrl(toolTag, cloneUrl);
      callToolbox(toolboxCloneUrl);
    });
  });
};

const createCloneButton = (tool, cloneButton, bitbucketMetadata) => {
  const button = document.createElement('a');
  button.setAttribute('class', `${cloneButton.className} jt-button ${CLONE_BUTTON_JS_CSS_CLASS}`);
  button.setAttribute('href', '#');
  button.dataset.toolTag = tool.tag;

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', tool.name);
  buttonIcon.setAttribute('src', tool.icon);
  button.appendChild(buttonIcon);

  addCloneButtonEventHandler(button, bitbucketMetadata);

  return button;
};

const removeCloneButtons = () => {
  const buttonGroup = document.querySelector('.jt-button-group');
  if (buttonGroup) {
    buttonGroup.parentElement.removeChild(buttonGroup);
  }
};

const renderCloneButtons = (tools, bitbucketMetadata, cloneButton = null) => {
  if (cloneButtonsRendered()) {
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
      const btn = createCloneButton(tool, cloneButton, bitbucketMetadata);
      buttonGroup.appendChild(btn);

      const tooltip = createButtonTooltip(btn, `Clone in ${tool.name}`);
      buttonGroup.appendChild(tooltip);
    });

  cloneButton.insertAdjacentElement('beforebegin', buttonGroup);
};

const removeOpenButtons = () => {
  document.querySelectorAll(`.${OPEN_BUTTON_JS_CSS_CLASS}`).forEach(b => {
    b.remove();
  });
};

const addOpenButtonEventHandler = (domElement, tool, bitbucketMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    const filePathIndex = 5;
    const filePath = location.pathname.split('/').splice(filePathIndex).join('/');
    const lineNumber = parseLineNumber(location.hash.replace('#lines-', ''));

    callToolbox(getToolboxNavigateUrl(tool.tag, bitbucketMetadata.repo, filePath, lineNumber));
  });
};

const createOpenButton = (tool, sampleButton, bitbucketMetadata) => {
  const button = sampleButton.cloneNode(true);
  button.classList.add(OPEN_BUTTON_JS_CSS_CLASS);

  const actionButton = button.querySelector('button');
  actionButton.removeAttribute('disabled');

  const actionSpan = actionButton.querySelector('span > span');
  while (actionSpan.firstChild) {
    actionSpan.removeChild(actionSpan.lastChild);
  }

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', tool.name);
  buttonIcon.setAttribute('src', tool.icon);
  buttonIcon.setAttribute('width', '16');
  buttonIcon.setAttribute('height', '16');
  buttonIcon.setAttribute('style', 'vertical-align:text-bottom');
  actionSpan.appendChild(buttonIcon);

  addOpenButtonEventHandler(actionButton, tool, bitbucketMetadata);

  const tooltip = createButtonTooltip(actionButton, `Open this file in ${tool.name}`);
  button.appendChild(tooltip);

  return button;
};

const openButtonsRendered = () => document.getElementsByClassName(OPEN_BUTTON_JS_CSS_CLASS).length > 0;

const renderOpenButtons = (tools, bitbucketMetadata) => {
  if (openButtonsRendered()) {
    return;
  }

  const actionAnchorElement =
    document.querySelector('[data-qa="bk-file__actions"] > [data-qa="bk-file__action-button"]');

  if (actionAnchorElement) {
    tools.forEach(tool => {
      const action = createOpenButton(tool, actionAnchorElement, bitbucketMetadata);
      actionAnchorElement.insertAdjacentElement('beforebegin', action);
    });
  }
};

const startTrackingDOMChanges = () => {
  const cloneButtonsObserver = observe(cloneButtonSelectors.join(', '), {
    add(el) {
      if (el.textContent.includes('Clone')) {
        fetchMetadata().then(metadata => {
          fetchTools(metadata).then(tools => {
            renderCloneButtons(tools, metadata, el);
          });
        });
      }
    },
    remove(/*el*/) {
      removeCloneButtons();
    }
  });

  const openButtonsObserver = observe('[data-qa="bk-file__header"] > div > [data-qa="bk-file__actions"]', {
    add(/*el*/) {
      fetchMetadata().then(metadata => {
        fetchTools(metadata).then(tools => {
          renderOpenButtons(tools, metadata);
        });
      });
    },
    remove(/*el*/) {
      removeOpenButtons();
    }
  });

  return [cloneButtonsObserver, openButtonsObserver];
};

const stopTrackingDOMChanges = observers => {
  if (observers) {
    observers.forEach(o => {
      o.abort();
    });
  }
};

const enablePageAction = bitbucketMetadata => {
  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: bitbucketMetadata.repo,
    https: getHttpsCloneUrl(bitbucketMetadata.links),
    ssh: getSshCloneUrl(bitbucketMetadata.links)
  });
};

const disablePageAction = () => {
  chrome.runtime.sendMessage({type: 'disable-page-action'});
};

const refreshPageAction = () => {
  fetchMetadata().
    then(metadata => {
      renderPageAction(metadata).then(() => {
        enablePageAction(metadata);
      });
    }).
    catch(() => {
      disablePageAction();
    });
};

const startTrackingClientNavigation = () => {
  const titleObserver = new MutationObserver((/*mutations*/) => {
    // refresh on client navigation
    refreshPageAction();
  });
  titleObserver.observe(document.querySelector('title'), {childList: true});
};

const toolboxify = () => {
  refreshPageAction();
  startTrackingClientNavigation();
  chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
    let DOMObservers = null;
    if (data.allow) {
      DOMObservers = startTrackingDOMChanges();
    }
    chrome.runtime.onMessage.addListener(message => {
      switch (message.type) {
        case 'modify-pages-changed':
          if (message.newValue) {
            DOMObservers = startTrackingDOMChanges();
          } else {
            stopTrackingDOMChanges(DOMObservers);
          }
          break;
        // no default
      }
    });
  });
};

export default toolboxify;
