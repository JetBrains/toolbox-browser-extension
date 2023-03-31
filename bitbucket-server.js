import {observe} from 'selector-observer';
import parseBitbucketUrl from 'parse-bitbucket-url';

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
import {info, warn} from './web-api/web-logger';
import {f} from './api/format';

const CLONE_CONTAINER_JS_CSS_CLASS = 'js-toolbox-clone-repo';
const OPEN_BUTTON_JS_CSS_CLASS = 'js-toolbox-open-button';

const fetchMetadata = async () => {
  if (document.querySelector('meta[name=application-name][content=Bitbucket]') == null) {
    throw new Error('The open URL does not belong to Bitbucket');
  }

  const currentLocation = window.location.toString();
  const parsedStashUrl = parseBitbucketUrl(currentLocation);

  if (!parsedStashUrl) {
    throw new Error(`Failed to parse the open URL: ${currentLocation}`);
  }

  // normalize metadata
  const metadata = {
    // eslint-disable-next-line camelcase
    api_url: `${window.location.origin}/rest/api/latest/projects/${parsedStashUrl.owner}/repos/${parsedStashUrl.name}`,
    branch: parsedStashUrl.branch,
    repo: parsedStashUrl.name,
    user: parsedStashUrl.owner
  };

  const htmlResponse = await fetch(metadata.api_url);
  const parsedResponse = await htmlResponse.json();

  metadata.links = {
    clone: parsedResponse.links.clone
  };

  const httpLink = metadata.links.clone.find(l => l.name === 'http');
  if (httpLink) {
    // normalize name
    httpLink.name = 'https';
  }

  info(f`Parsed repository metadata: ${metadata}`);

  return metadata;
};

const fetchLanguages = () => {
  info('We don\'t know yet how to get the repo language on Bitbucket Server, sticking to the default language');
  return DEFAULT_LANGUAGE;
};

const selectTools = language => {
  // All languages in Bitbucket match the common list with an exception to HTML
  const normalizedLanguage = language === 'html/css' ? 'html' : language;

  const toolIds = normalizedLanguage && SUPPORTED_LANGUAGES[normalizedLanguage.toLowerCase()];
  if (!toolIds) {
    warn(`No tools found for language ${normalizedLanguage}, sticking to the default language`);
  }
  const normalizedToolIds = toolIds ? toolIds : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  const tools = normalizedToolIds.
    sort().
    map(toolId => SUPPORTED_TOOLS[toolId]);

  info(f`Selected tools: ${tools}`);

  return tools;
};

const fetchTools = bitbucketMetadata => {
  const language = fetchLanguages(bitbucketMetadata);
  return selectTools(language);
};

const getCloneUrl = (links, which) => {
  const link = links.clone.find(l => l.name === which);

  if (link) {
    const {href} = link;

    info(`The clone URL is ${href}`);

    return href;
  } else {
    warn(`Failed to get the clone URL (${which})`);
    return '';
  }
};

const getHttpsCloneUrl = links => getCloneUrl(links, 'https');
const getSshCloneUrl = links => getCloneUrl(links, 'ssh');

const addCloneButtonEventHandler = (btn, bitbucketMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;

    info(`The clone button (${toolTag}) was clicked`);

    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneUrl(bitbucketMetadata.links)
        : getSshCloneUrl(bitbucketMetadata.links);
      const toolboxCloneUrl = getToolboxCloneUrl(toolTag, cloneUrl);
      callToolbox(toolboxCloneUrl);
    });
  });

  info(`Added click handler for the clone button (${btn.dataset.toolTag})`);
};

const createCloneButton = (tool, bitbucketMetadata) => {
  info(`Creating the clone button (${tool.tag})`);

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
    warn('Missing the clone repo element, nowhere to render the clone buttons');
    return;
  }

  fetchTools(bitbucketMetadata).forEach(tool => {
    const classEnding = tool.tag.replace('-', '');
    const buttonContainerClass = `${CLONE_CONTAINER_JS_CSS_CLASS} ${CLONE_CONTAINER_JS_CSS_CLASS}-${classEnding}`;

    if (document.getElementsByClassName(buttonContainerClass).length === 0) {
      const buttonContainer = document.createElement('li');
      buttonContainer.setAttribute('class', buttonContainerClass);

      const button = createCloneButton(tool, bitbucketMetadata);
      buttonContainer.appendChild(button);

      cloneElement.insertAdjacentElement('beforebegin', buttonContainer);

      info(`Embedded the clone button (${tool.tag})`);
    } else {
      info(`The clone button (${tool.tag}) is already rendered`);
    }
  });
};

const removeCloneButtons = () => {
  const buttonContainers = document.querySelectorAll(`.${CLONE_CONTAINER_JS_CSS_CLASS}`);

  if (buttonContainers.length === 0) {
    info('No clone buttons found, nothing to remove');
  } else {
    buttonContainers.forEach(buttonContainer => {
      buttonContainer.remove();
    });
    info('Removed the clone buttons');
  }
};

const addOpenButtonEventHandler = (domElement, tool, bitbucketMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    info(`The open button (${tool.tag}) was clicked`);

    const filePathIndex = 6;
    const filePath = location.pathname.split('/').splice(filePathIndex).join('/');
    const lineNumber = parseLineNumber(location.hash.replace('#', ''));

    callToolbox(getToolboxNavigateUrl(tool.tag, bitbucketMetadata.repo, filePath, lineNumber));
  });

  info(`Added click handler for the open button (${tool.tag})`);
};

const createOpenButton = (tool, bitbucketMetadata) => {
  info(`Creating the open button (${tool.tag})`);

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

  info('Embedded the custom tooltips script');
};

const openButtonsRendered = () => document.getElementsByClassName(OPEN_BUTTON_JS_CSS_CLASS).length > 0;

const renderOpenButtons = bitbucketMetadata => {
  if (openButtonsRendered()) {
    info('The open buttons are already rendered');
    return;
  }

  const anchorElement = document.querySelector('.file-toolbar > .secondary > .aui-buttons:first-child');
  if (anchorElement) {
    const tools = fetchTools(bitbucketMetadata);
    tools.forEach(tool => {
      const action = createOpenButton(tool, bitbucketMetadata);
      anchorElement.insertAdjacentElement('beforebegin', action);
      info(`Embedded the open button (${tool.tag})`);
    });
    setOpenButtonTooltips();
  } else {
    info('Missing the anchor element, nowhere to render the open buttons');
  }
};

const removeOpenButtons = () => {
  const openButtons = document.querySelectorAll(`.${OPEN_BUTTON_JS_CSS_CLASS}`);

  if (openButtons.length > 0) {
    openButtons.forEach(button => {
      button.remove();
      info('Removed the open buttons');
    });
  } else {
    info('No open buttons found, nothing to remove');
  }
};

const startTrackingDOMChanges = bitbucketMetadata => {
  info('Started observing DOM');

  return observe('#file-content > .file-toolbar > .secondary > .aui-buttons > .file-blame', {
    add(/*el*/) {
      info('Found a place to embed the open buttons');
      renderOpenButtons(bitbucketMetadata);
    },
    remove() {
      info('Missing the place to embed the open buttons');
      removeOpenButtons();
    }
  });
};

const stopTrackingDOMChanges = observer => {
  if (observer) {
    info('Stopped observing DOM');
    observer.abort();
  } else {
    info('Missing the observer, observing DOM, nothing to stop');
  }
};

const enablePageAction = bitbucketMetadata => {
  info('Enabling the page action');

  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: bitbucketMetadata.repo,
    https: getHttpsCloneUrl(bitbucketMetadata.links),
    ssh: getSshCloneUrl(bitbucketMetadata.links)
  });
};

const disablePageAction = () => {
  info('Disabling the page action');
  chrome.runtime.sendMessage({type: 'disable-page-action'});
};

const toolboxify = () => {
  fetchMetadata().
    then(metadata => {
      enablePageAction(metadata);

      chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
        let DOMObserver = null;
        if (data.allow) {
          renderCloneButtons(metadata);
          DOMObserver = startTrackingDOMChanges(metadata);
        } else {
          info('Embedding the clone buttons is prohibited in the settings');
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

            case 'get-tools':
              sendResponse(fetchTools(metadata));
              // if the fetchTools becomes asynchronous, remove the break and uncomment the return below,
              // like in other cases in the extension
              // return true;
              break;

            case 'perform-action':
              const toolboxCloneUrl = getToolboxCloneUrl(message.toolTag, message.cloneUrl);
              callToolbox(toolboxCloneUrl);
              break;

            // no default
          }

          return undefined;
        });
      });
    }).
    catch(e => {
      warn('Failed to fetch metadata', e);
      disablePageAction();
    });
};

export default toolboxify;
