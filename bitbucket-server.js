import 'whatwg-fetch';
import {observe} from 'selector-observer';
import parseBitbucketUrl from 'parse-bitbucket-url';
import jetBrainsIcon from '@jetbrains/logos/jetbrains/jetbrains.svg';

import {
  SUPPORTED_TOOLS,
  CLONE_PROTOCOLS
} from './constants';

import {
  getToolboxURN,
  getToolboxNavURN,
  callToolbox
} from './api/toolbox';

const OPEN_BUTTON_JS_CSS_CLASS = 'js-toolbox-open-button';

const fetchMetadata = () => new Promise((resolve, reject) => {
  const parsedStashUrl = document.querySelector('meta[name=application-name][content=Bitbucket]') &&
    parseBitbucketUrl(window.location.toString());
  if (!parsedStashUrl) {
    reject();
    return;
  }
  // normalize metadata
  const metadata = {
    // eslint-disable-next-line camelcase
    api_url: `${location.origin}/rest/api/latest/projects/${parsedStashUrl.owner}/repos/${parsedStashUrl.name}`,
    branch: parsedStashUrl.branch,
    repo: parsedStashUrl.name,
    user: parsedStashUrl.owner
  };
  fetch(metadata.api_url).
    then(response => response.json()).
    then(parsedResponse => {
      metadata.links = {
        clone: parsedResponse.links.clone
      };
      const httpLink = metadata.links.clone.find(l => l.name === 'http');
      if (httpLink) {
        // normalize name
        httpLink.name = 'https';
      }
      resolve(metadata);
    }).
    catch(() => {
      reject();
    });
});

const selectTools = () => new Promise(resolve => {
  resolve(Object.values(SUPPORTED_TOOLS));
});

// we don't know how to obtain repo languages in stash
const fetchTools = bitbucketMetadata => selectTools(bitbucketMetadata);

const renderPageAction = bitbucketMetadata => new Promise(resolve => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'get-tools':
        fetchTools(bitbucketMetadata).then(sendResponse);
        return true;
      case 'perform-action':
        const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
        callToolbox(toolboxAction);
        break;
      // no default
    }
    return undefined;
  });

  resolve();
});

const getCloneUrl = (links, which) => {
  const link = links.clone.find(l => l.name === which);
  return link ? link.href : '';
};

const getHttpsCloneUrl = links => getCloneUrl(links, 'https');
const getSshCloneUrl = links => getCloneUrl(links, 'ssh');

const addCloneButtonEventHandler = (btn, bitbucketMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(bitbucketMetadata.links)
        : getSshCloneUrl(bitbucketMetadata.links);
      const action = getToolboxURN(toolTag, cloneUrl);
      callToolbox(action);
    });
  });
};

const createCloneButton = tool => {
  const title = `Clone in ${tool.name}`;
  const button = document.createElement('a');
  button.setAttribute('class', 'aui-nav-item');
  button.setAttribute('href', '#');
  button.setAttribute('original-title', title);
  button.dataset.toolTag = tool.tag;

  const buttonIcon = document.createElement('span');
  buttonIcon.setAttribute('class', 'aui-icon toolbox-aui-icon');
  buttonIcon.setAttribute('style', `background-image:url(${tool.icon});background-size:contain`);

  const buttonLabel = document.createElement('span');
  buttonLabel.setAttribute('class', 'aui-nav-item-label');
  buttonLabel.textContent = title;

  button.appendChild(buttonIcon);
  button.appendChild(buttonLabel);

  return button;
};

const renderCloneButtons = bitbucketMetadata => {
  const cloneElement = document.querySelector('.clone-repo');
  if (!cloneElement) {
    return;
  }

  const showCloneButtonsButtonContainer = document.createElement('li');
  const showCloneButtonsButton = createCloneButton({
    name: 'IDE',
    icon: chrome.runtime.getURL(jetBrainsIcon)
  });
  showCloneButtonsButton.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.js-toolbox-clone-repo').forEach(btn => {
      btn.classList.toggle('hidden');
    });
  });
  showCloneButtonsButtonContainer.appendChild(showCloneButtonsButton);
  cloneElement.insertAdjacentElement('beforebegin', showCloneButtonsButtonContainer);

  fetchTools(bitbucketMetadata).
    then(tools => {
      tools.forEach(tool => {
        const buttonContainer = document.createElement('li');
        buttonContainer.setAttribute('class', 'js-toolbox-clone-repo hidden');

        const button = createCloneButton(tool);
        buttonContainer.appendChild(button);

        addCloneButtonEventHandler(button, bitbucketMetadata);

        cloneElement.insertAdjacentElement('beforebegin', buttonContainer);
      });
    }).catch(() => {
      // do nothing
    });
};

const removeCloneButtons = () => {
  document.querySelectorAll('.js-toolbox-clone-repo').forEach(buttonContainer => {
    buttonContainer.remove();
  });
};

const addOpenButtonEventHandler = (domElement, tool, bitbucketMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    let filePath;
    let lineNumber;
    if (location.pathname.search('pull-requests') !== 0) {
      filePath = location.hash.replace('#', '');
    } else {
      const filePathIndex = 6;
      lineNumber = location.hash.replace('#', '');
      if (lineNumber === '') {
        lineNumber = null;
      }
      filePath = location.pathname.split('/').splice(filePathIndex).join('/');
    }

    callToolbox(getToolboxNavURN(tool.tag, bitbucketMetadata.repo, filePath, lineNumber));
  });
};

const createButtonWithToolIcon = tool => {
  const buttonContainer = document.createElement('div');
  buttonContainer.setAttribute('class', `aui-buttons ${OPEN_BUTTON_JS_CSS_CLASS}`);

  const button = document.createElement('button');
  button.setAttribute('class', 'aui-button');
  button.setAttribute('original-title', `Open this file in ${tool.name}`);

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', tool.name);
  buttonIcon.setAttribute('src', tool.icon);
  buttonIcon.setAttribute('width', '16');
  buttonIcon.setAttribute('height', '16');
  buttonIcon.setAttribute('style', 'vertical-align:text-bottom');
  button.appendChild(buttonIcon);

  buttonContainer.append(button);

  return buttonContainer;
};

const createOpenButton = (tool, bitbucketMetadata) => {
  const buttonContainer = createButtonWithToolIcon(tool);
  addOpenButtonEventHandler(buttonContainer.firstChild, tool, bitbucketMetadata);

  return buttonContainer;
};

const setOpenButtonTooltips = () => {
  const tooltipScript = document.createElement('script');
  tooltipScript.textContent = `jQuery('.${OPEN_BUTTON_JS_CSS_CLASS} > .aui-button:first-child').tipsy();`;
  document.body.appendChild(tooltipScript);
};


const getLastSelectedToolKey = bitbucketMetadata => `last-used-tool-${bitbucketMetadata.repo}`;

const getLastSelectedTool = bitbucketMetadata => {
  const toolName = localStorage.getItem(getLastSelectedToolKey(bitbucketMetadata)) || 'idea';
  for (const supportedToolsKey in SUPPORTED_TOOLS) {
    if (SUPPORTED_TOOLS[supportedToolsKey].tag === toolName) {
      return SUPPORTED_TOOLS[supportedToolsKey];
    }
  }
  return SUPPORTED_TOOLS.idea;
};

const setLastSelectedTool = (toolTag, bitbucketMetadata) => {
  localStorage.setItem(getLastSelectedToolKey(bitbucketMetadata), toolTag);
};

const createOpenButtonsMenu = (container, bitbucketMetadata, isCodeReview) => {
  const openButtonContainer = document.createElement('div');
  const diffActionsList = document.createElement('div');
  diffActionsList.setAttribute('class', 'diff-actions-open-in-toolbox');
  diffActionsList.setAttribute('style', 'position: relative; display: inline-flex; align-items: center;');
  diffActionsList.append(openButtonContainer);
  container.prepend(diffActionsList);

  const createToolBtn = tool => {
    const activeTool = createOpenButton(tool, bitbucketMetadata);
    if (isCodeReview) {
      activeTool.firstChild.setAttribute('style', 'font-size: 15px;');
    }
    openButtonContainer.append(activeTool);
    return activeTool;
  };
  let activeTool = createToolBtn(getLastSelectedTool(bitbucketMetadata));

  const toolSelect = document.createElement('div');
  diffActionsList.append(toolSelect);
  toolSelect.setAttribute('class', 'diff-actions-tool-select hidden');
  toolSelect.setAttribute('style', 'position: absolute;' +
    'z-index: 3;' +
    'background: #fff;' +
    'display: flex;' +
    'flex-direction: column;' +
    'border-radius: 3px;' +
    'box-shadow: rgb(9 30 66 / 25%) 0px 4px 8px -2px, rgb(9 30 66 / 31%) 0px 0px 1px;\n' +
    'padding: 5px 4px 0px;' +
    'left: -4px;' +
    'top: 37px;'
  );

  const tooglefileToolbarZIndex = () => {
    const toolBar = document.querySelector('.file-toolbar');
    // eslint-disable-next-line no-magic-numbers
    toolBar.style.zIndex = toolBar.style.zIndex === '' ? 3 : '';
  };

  const toolSelectToggleButton = document.createElement('button');
  toolSelectToggleButton.addEventListener('click', () => {
    if (!isCodeReview) {
      tooglefileToolbarZIndex();
    }
    toolSelect.classList.toggle('hidden');
  });
  toolSelectToggleButton.setAttribute('class', 'aui-button');
  toolSelectToggleButton.setAttribute('style', 'background: transparent; padding: 2px;');
  diffActionsList.append(toolSelectToggleButton);
  const toolSelectToggleIcon = document.createElement('span');
  toolSelectToggleIcon.setAttribute('class', 'aui-icon aui-icon-small aui-iconfont-chevron-right');
  toolSelectToggleIcon.setAttribute('style', 'cursor: pointer; transform: rotate(90deg);');
  if (!isCodeReview) {
    toolSelectToggleIcon.style.marginBottom = '4px';
  }
  toolSelectToggleButton.append(toolSelectToggleIcon);

  window.addEventListener('click', e => {
    if (e.target !== container && !container.contains(e.target) && !toolSelect.classList.contains('hidden')) {
      toolSelect.classList.add('hidden');
      if (!isCodeReview) {
        tooglefileToolbarZIndex();
      }
    }
  });

  fetchTools(bitbucketMetadata).then(tools => {
    tools.forEach(tool => {
      const toolSelectButtonContainer = createButtonWithToolIcon(tool, bitbucketMetadata);
      toolSelectButtonContainer.firstChild.addEventListener('click', () => {
        activeTool.remove();
        activeTool = createToolBtn(tool);
        setLastSelectedTool(tool.tag, bitbucketMetadata);
        toolSelect.classList.add('hidden');
        if (!isCodeReview) {
          tooglefileToolbarZIndex();
        }
      });
      toolSelectButtonContainer.setAttribute('style', 'margin: 0 0 5px;');
      if (isCodeReview) {
        toolSelectButtonContainer.style.fontSize = '15px';
      }
      toolSelect.append(toolSelectButtonContainer);
    });
    setOpenButtonTooltips();
  }).catch(() => {
    // do nothing
  });
};

const openButtonsRendered = () => document.getElementsByClassName(OPEN_BUTTON_JS_CSS_CLASS).length > 0;

const renderOpenButtons = bitbucketMetadata => {
  if (openButtonsRendered()) {
    return;
  }
  const anchorElement = document.querySelector('.file-toolbar > .secondary > .aui-buttons:first-child');
  if (anchorElement) {
    createOpenButtonsMenu(anchorElement, bitbucketMetadata);
  }
};

const removeOpenButtons = () => {
  document.querySelectorAll(`.${OPEN_BUTTON_JS_CSS_CLASS}`).forEach(button => {
    button.remove();
  });
};

const renderOpenButtonsInCodeReview = bitbucketMetadata => {
  const diffActionsContainer = document.querySelector('.diff-actions');
  if (!diffActionsContainer) {
    return;
  }
  createOpenButtonsMenu(diffActionsContainer, bitbucketMetadata, true);
};

const startTrackingDOMChanges = bitbucketMetadata => {
  observe('#file-content > .file-toolbar > .secondary > .aui-buttons > .file-blame', {
    add(/*el*/) {
      renderOpenButtons(bitbucketMetadata);
    },
    remove() {
      removeOpenButtons();
    }
  });

  observe('.diff-actions', {
    add(/*el*/) {
      renderOpenButtonsInCodeReview(bitbucketMetadata);
    }
  });
};

const stopTrackingDOMChanges = observer => {
  if (observer) {
    observer.abort();
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

const toolboxify = () => {
  fetchMetadata().
    then(metadata => {
      renderPageAction(metadata).then(() => {
        enablePageAction(metadata);
      });

      chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
        let DOMObserver = null;
        if (data.allow) {
          renderCloneButtons(metadata);
          DOMObserver = startTrackingDOMChanges(metadata);
        }

        chrome.runtime.onMessage.addListener(message => {
          switch (message.type) {
            case 'modify-pages-changed':
              if (message.newValue) {
                renderCloneButtons(metadata);
                DOMObserver = startTrackingDOMChanges(metadata);
              } else {
                removeCloneButtons();
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
