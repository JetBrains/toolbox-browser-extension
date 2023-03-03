/** @author Johannes Tegnér <johannes@jitesoft.com> */
import {observe} from 'selector-observer';

import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  USAGE_THRESHOLD,
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
import {info, warn} from './web-api/web-logger';
import {f} from './api/format';

const CLONE_BUTTON_GROUP_JS_CSS_CLASS = 'js-toolbox-clone-button-group';
const CLONE_BUTTON_JS_CSS_CLASS = 'js-toolbox-clone-button';
const OPEN_BUTTON_GROUP_JS_CSS_CLASS = 'js-toolbox-open-button-group';

const extractProjectIdFromPage = document => {
  const dataProjectId = document.body.dataset.projectId;
  if (dataProjectId) {
    return dataProjectId;
  }

  const homePanelMetadataElement = document.querySelector('.home-panel-metadata') || {children: []};
  const projectIdElement =
    Array.prototype.find.call(homePanelMetadataElement.children, c => c.textContent.includes('Project ID'));
  return projectIdElement
    ? projectIdElement.textContent.replace('Project ID:', '').trim()
    : null;
};

const getProjectId = async () => {
  info('Trying to find the project ID on the current page');

  let projectId = extractProjectIdFromPage(document);
  if (projectId) {
    info(`Found the project ID: ${projectId}`);
    return projectId;
  }

  const {findFile, project} = document.body.dataset;
  // we treat the presence of 'project' as a boolean flag saying we are able to get the project repo url
  if (findFile && project) {
    info('Trying to load the root project page and find the project ID there');

    const [repoPath] = findFile.split('/-/find_file/');
    const repoUrl = `${location.origin}${repoPath}`;
    const response = await fetch(repoUrl);
    const htmlString = await response.text();
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(htmlString, 'text/html');
    projectId = extractProjectIdFromPage(htmlDocument);
    if (projectId) {
      info(`Found the project ID: ${projectId}`);
      return projectId;
    }
  }

  throw new Error('Project ID is not found');
};

const fetchMetadata = async () => {
  const projectId = await getProjectId();

  const response = await fetch(`${location.origin}/api/v4/projects/${projectId}`);
  const metadata = await response.json();

  info(f`Parsed the repository metadata: ${metadata}`);

  return {
    ssh: metadata.ssh_url_to_repo,
    https: metadata.http_url_to_repo,
    id: metadata.id,
    repo: metadata.path
  };
};

const fetchLanguages = async gitlabMetadata => {
  try {
    const response = await fetch(`${location.origin}/api/v4/projects/${gitlabMetadata.id}/languages`);
    const languages = await response.json();
    info(f`Fetched languages: ${languages}`);
    return languages;
  } catch (e) {
    warn('Failed to fetch languages, resolving to default languages', e);
    return DEFAULT_LANGUAGE_SET;
  }
};

const selectTools = async languages => {
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
    info(`The language usage rate is too low, sticking to default language (${DEFAULT_LANGUAGE})`);
  }

  const normalizedToolIds = selectDefaultLanguage
    ? SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE]
    : Array.from(new Set(selectedToolIds));

  const tools = normalizedToolIds.sort().map(toolId => SUPPORTED_TOOLS[toolId]);

  info(f`Selected tools: ${tools.map(t => t.name)}`);

  return tools;
};

const fetchTools = async gitlabMetadata => {
  const languages = await fetchLanguages(gitlabMetadata);
  return selectTools(languages);
};

const removeCloneButtons = () => {
  const cloneButtons = document.querySelectorAll(`.${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);
  if (cloneButtons.length > 0) {
    cloneButtons.forEach(button => {
      button.remove();
    });
    info('Removed the clone buttons');
  } else {
    info('No clone buttons found, nothing to remove');
  }
};

const cloneButtonsRendered = () => document.getElementsByClassName(CLONE_BUTTON_GROUP_JS_CSS_CLASS).length > 0;

const addCloneButtonEventHandler = (button, gitlabMetadata) => {
  button.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;

    info(`The clone button (${toolTag}) was clicked`);

    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS ? gitlabMetadata.https : gitlabMetadata.ssh;
      const toolboxCloneUrl = getToolboxCloneUrl(toolTag, cloneUrl);
      callToolbox(toolboxCloneUrl);
    });
  });

  info(`Added click handler for the clone button (${button.dataset.toolTag})`);
};

const createCloneButton = (tool, gitlabMetadata) => {
  info(`Creating the clone button (${tool.tag})`);

  const button = document.createElement('a');
  button.setAttribute('class', `btn btn-default gl-button has-tooltip ${CLONE_BUTTON_JS_CSS_CLASS}`);
  button.dataset.title = `Clone in ${tool.name}`;
  button.dataset.originalTitle = button.dataset.title;
  button.dataset.toolTag = tool.tag;
  button.setAttribute('aria-label', button.dataset.title);

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', tool.name);
  buttonIcon.setAttribute('src', tool.icon);
  buttonIcon.setAttribute('class', 'gl-icon s16');
  button.appendChild(buttonIcon);

  addCloneButtonEventHandler(button, gitlabMetadata);

  return button;
};

const renderCloneButtons = (tools, gitlabMetadata) => {
  if (cloneButtonsRendered()) {
    info('The clone buttons are already rendered');
    return;
  }

  info(f`Rendering the clone buttons (${tools.map(t => t.tag)})`);

  const projectCloneHolder = document.querySelector('.project-clone-holder');

  if (projectCloneHolder) {
    info('The project clone holder is found');

    const buttonGroup = document.createElement('div');
    buttonGroup.setAttribute('class', `btn-group ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);

    tools.forEach(tool => {
      const button = createCloneButton(tool, gitlabMetadata);
      buttonGroup.append(button);

      info(`Embedded the clone button (${tool.tag})`);
    });

    projectCloneHolder.insertAdjacentElement('beforebegin', buttonGroup);
  } else {
    info('Missing the project clone holder element, nowhere to render the clone buttons');
  }
};

const addOpenButtonEventHandler = (buttonElement, tool, gitlabMetadata) => {
  const mrPageHashPartsCount = 3;

  buttonElement.addEventListener('click', e => {
    e.preventDefault();

    info(`The open button (${tool.tag}) was clicked`);

    const filePath = e.currentTarget.dataset.filePath;
    let lineNumber = '';
    if (document.body.dataset.page === 'projects:merge_requests:show') {
      const hashParts = location.hash.split('_');
      if (hashParts.length === mrPageHashPartsCount) {
        lineNumber = hashParts.pop();
      }
    } else {
      lineNumber = location.hash.replace('#L', '');
    }

    callToolbox(getToolboxNavigateUrl(tool.tag, gitlabMetadata.repo, filePath, lineNumber));
  });

  info(`Added click handler for the open button (${tool.tag})`);
};

const createOpenButton = (tool, gitlabMetadata, filePath) => {
  info(`Creating the open button (${tool.tag})`);

  const button = document.createElement('button');
  button.setAttribute('class', 'btn btn-default btn-md gl-button btn-icon');
  button.setAttribute('type', 'button');
  button.dataset.toggle = 'tooltip';
  button.dataset.placement = 'bottom';
  button.dataset.container = 'body';
  button.dataset.class = 'btn btn-default btn-md gl-button btn-icon';
  button.dataset.title = `Open this file in ${tool.name}`;
  button.dataset.originalTitle = button.dataset.title;
  button.dataset.filePath = filePath;
  button.setAttribute('aria-label', button.dataset.title);

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', tool.name);
  buttonIcon.setAttribute('src', tool.icon);
  buttonIcon.setAttribute('class', 'gl-icon s16');
  button.appendChild(buttonIcon);

  addOpenButtonEventHandler(button, tool, gitlabMetadata);

  return button;
};

const openButtonsRendered = targetElement =>
  targetElement.getElementsByClassName(OPEN_BUTTON_GROUP_JS_CSS_CLASS).length > 0;

const renderOpenButtons = (tools, gitlabMetadata, targetElement) => {
  if (openButtonsRendered(targetElement)) {
    info('The open buttons are already rendered');
    return;
  }

  info(f`Rendering the open buttons (${tools.map(t => t.tag)})`);

  const buttonGroupAnchorElement = targetElement.querySelector('.file-actions .btn-group:last-child');
  if (buttonGroupAnchorElement) {
    const copyFilePathButton = targetElement.querySelector('.file-header-content button[id^="clipboard-button"]');
    if (copyFilePathButton) {
      const toolboxButtonGroup = document.createElement('div');
      toolboxButtonGroup.setAttribute('class', `btn-group ml-2 ${OPEN_BUTTON_GROUP_JS_CSS_CLASS}`);
      toolboxButtonGroup.setAttribute('role', 'group');

      const {text: filePath} = JSON.parse(copyFilePathButton.dataset.clipboardText);
      if (filePath) {
        tools.forEach(tool => {
          const action = createOpenButton(tool, gitlabMetadata, filePath);
          toolboxButtonGroup.appendChild(action);
        });

        buttonGroupAnchorElement.insertAdjacentElement('afterend', toolboxButtonGroup);
      } else {
        info('Missing the file path in the copy file path button, unable to create the open buttons');
      }
    } else {
      info('The copy file path button is not found, nowhere to render the open buttons');
    }
  } else {
    info('The button group in the file actions element is not found, nowhere to render the open buttons');
  }
};

const startTrackingDOMChanges = gitlabMetadata => {
  info('Started observing DOM');

  return observe(
    '.file-holder',
    {
      add(el) {
        info('Found the file holder element to embed the open buttons to');
        fetchTools(gitlabMetadata).then(tools => {
          renderOpenButtons(tools, gitlabMetadata, el);
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

const enablePageAction = gitlabMetadata => {
  info('Enabling the page action');

  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: gitlabMetadata.repo,
    https: gitlabMetadata.https,
    ssh: gitlabMetadata.ssh
  });
};

const disablePageAction = () => {
  info('Disabling the page action');

  chrome.runtime.sendMessage({type: 'disable-page-action'});
};

const toolboxify = () => {
  let DOMObserver = null;

  fetchMetadata().
    then(metadata => {
      enablePageAction(metadata);

      chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
        if (data.allow) {
          fetchTools(metadata).then(tools => {
            renderCloneButtons(tools, metadata);
          });
          DOMObserver = startTrackingDOMChanges(metadata);
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          switch (message.type) {
            case 'modify-pages-changed':
              if (message.newValue) {
                fetchTools(metadata).then(tools => {
                  renderCloneButtons(tools, metadata);
                });
                DOMObserver = startTrackingDOMChanges(metadata);
              } else {
                removeCloneButtons();
                stopTrackingDOMChanges(DOMObserver);
              }
              break;
            case 'get-tools':
              fetchTools(metadata).then(sendResponse);
              return true;
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
      warn('Failed to fetch the metadata', e);
      disablePageAction();
    });
};

export default toolboxify;
