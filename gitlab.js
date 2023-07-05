/** @author Johannes Tegnér <johannes@jitesoft.com> */
import {observe} from 'selector-observer';

import {CLONE_PROTOCOLS} from './constants';

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

const fetchTools = () => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage({type: 'get-installed-tools'}, toolsResponse => {
    if (toolsResponse.errorMessage) {
      reject(new Error(toolsResponse.errorMessage));
    } else {
      resolve(toolsResponse.tools);
    }
  });
});

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

    const {toolId, toolTag} = e.currentTarget.dataset;

    info(`The clone button (${toolTag}:${toolId}) was clicked`);

    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS ? gitlabMetadata.https : gitlabMetadata.ssh;
      const toolboxCloneUrl = getToolboxCloneUrl(toolId, cloneUrl);
      callToolbox(toolboxCloneUrl);
    });
  });

  info(`Added click handler for the clone button (${button.dataset.toolTag})`);
};

const createCloneButton = (tool, gitlabMetadata) => {
  info(`Creating the clone button (${tool.tag}:${tool.id})`);

  const button = document.createElement('a');
  button.setAttribute('class', `btn btn-default gl-button has-tooltip ${CLONE_BUTTON_JS_CSS_CLASS}`);
  button.dataset.title = `Clone in ${tool.name} ${tool.version}`;
  button.dataset.originalTitle = button.dataset.title;
  button.dataset.toolId = tool.id;
  button.dataset.toolTag = tool.tag;
  button.setAttribute('aria-label', button.dataset.title);

  const buttonIcon = document.createElement('img');
  buttonIcon.setAttribute('alt', `${tool.name} ${tool.version}`);
  buttonIcon.setAttribute('src', tool.defaultIcon);
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

      info(`Embedded the clone button (${tool.tag}:${tool.id})`);
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

    info(`The open button (${tool.tag}:${tool.id}) was clicked`);

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

    const parsedLineNumber = parseLineNumber(lineNumber);

    callToolbox(getToolboxNavigateUrl(tool.id, gitlabMetadata.repo, filePath, parsedLineNumber));
  });

  info(`Added click handler for the open button (${tool.tag}:${tool.id})`);
};

const createOpenButton = (tool, gitlabMetadata, filePath) => {
  info(`Creating the open button (${tool.tag}:${tool.id})`);

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
  buttonIcon.setAttribute('src', tool.defaultIcon);
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
        fetchTools().
          then(tools => {
            renderOpenButtons(tools, gitlabMetadata, el);
          }).
          catch(e => {
            warn('Failed to render the open buttons', e);
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
          fetchTools().
            then(tools => {
              renderCloneButtons(tools, metadata);
            }).
            catch(e => {
              warn('Failed to render the clone buttons', e);
            });
          DOMObserver = startTrackingDOMChanges(metadata);
        }

        chrome.runtime.onMessage.addListener(message => {
          switch (message.type) {
            case 'modify-pages-changed':
              if (message.newValue) {
                fetchTools().
                  then(tools => {
                    renderCloneButtons(tools, metadata);
                  }).
                  catch(e => {
                    warn('Failed to render the clone buttons', e);
                  });
                DOMObserver = startTrackingDOMChanges(metadata);
              } else {
                removeCloneButtons();
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
        });
      });
    }).
    catch(e => {
      warn('Failed to fetch the metadata', e);
      disablePageAction();
    });
};

export default toolboxify;
