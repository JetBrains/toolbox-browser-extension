import 'whatwg-fetch';
import {observe} from 'selector-observer';
import parseBitbucketUrl from 'parse-bitbucket-url';

import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  DEFAULT_LANGUAGE,
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

const fetchLanguages = () => new Promise(resolve => {
  // we don't know how to obtain repo languages in stash
  resolve(DEFAULT_LANGUAGE);
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

const createCloneButton = (tool, bitbucketMetadata) => {
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

  addCloneButtonEventHandler(button, bitbucketMetadata);

  return button;
};

const renderCloneButtons = bitbucketMetadata => {
  const cloneElement = document.querySelector('.clone-repo');
  if (!cloneElement) {
    return;
  }

  fetchTools(bitbucketMetadata).
    then(tools => {
      tools.forEach(tool => {
        const buttonContainer = document.createElement('li');
        buttonContainer.setAttribute('class', 'js-toolbox-clone-repo');

        const button = createCloneButton(tool, bitbucketMetadata);
        buttonContainer.appendChild(button);

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

    const filePathIndex = 6;
    const filePath = location.pathname.split('/').splice(filePathIndex).join('/');
    let lineNumber = location.hash.replace('#', '');
    if (lineNumber === '') {
      lineNumber = null;
    }

    callToolbox(getToolboxNavURN(tool.tag, bitbucketMetadata.repo, filePath, lineNumber));
  });
};

const createOpenButton = (tool, bitbucketMetadata) => {
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
  addOpenButtonEventHandler(button, tool, bitbucketMetadata);

  return buttonContainer;
};

const setOpenButtonTooltips = () => {
  const tooltipScript = document.createElement('script');
  tooltipScript.textContent = `jQuery('.${OPEN_BUTTON_JS_CSS_CLASS} > .aui-button:first-child').tipsy();`;
  document.body.appendChild(tooltipScript);
};

const openButtonsRendered = () => document.getElementsByClassName(OPEN_BUTTON_JS_CSS_CLASS).length > 0;

const renderOpenButtons = bitbucketMetadata => {
  if (openButtonsRendered()) {
    return;
  }
  const anchorElement = document.querySelector('.file-toolbar > .secondary > .aui-buttons:first-child');
  if (anchorElement) {
    fetchTools(bitbucketMetadata).
      then(tools => {
        tools.forEach(tool => {
          const action = createOpenButton(tool, bitbucketMetadata);
          anchorElement.insertAdjacentElement('beforebegin', action);
        });
        setOpenButtonTooltips();
      }).
      catch(() => {
        // do nothing
      });
  }
};

const removeOpenButtons = () => {
  document.querySelectorAll(`.${OPEN_BUTTON_JS_CSS_CLASS}`).forEach(button => {
    button.remove();
  });
};

const startTrackingDOMChanges = bitbucketMetadata =>
  observe('#file-content > .file-toolbar > .secondary > .aui-buttons > .file-blame', {
    add(/*el*/) {
      renderOpenButtons(bitbucketMetadata);
    },
    remove() {
      removeOpenButtons();
    }
  });

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
