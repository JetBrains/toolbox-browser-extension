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

const getProjectId = () => new Promise((resolve, reject) => {
  let projectId = extractProjectIdFromPage(document);
  if (projectId) {
    resolve(projectId);
  } else {
    const {findFile, project} = document.body.dataset;
    // we treat 'project' as a boolean flag saying
    // we are able to get the project repo url
    if (findFile && project) {
      const [repoPath] = findFile.split('/-/find_file/');
      const repoUrl = `${location.origin}${repoPath}`;
      fetch(repoUrl).
        then(response => response.text()).
        then(htmlString => {
          const parser = new DOMParser();
          const htmlDocument = parser.parseFromString(htmlString, 'text/html');
          projectId = extractProjectIdFromPage(htmlDocument);
          if (projectId === null) {
            reject();
          } else {
            resolve(projectId);
          }
        });
    } else {
      reject();
    }
  }
});

const fetchMetadata = () => new Promise((resolve, reject) => {
  getProjectId().
    then(id => {
      fetch(`${location.origin}/api/v4/projects/${id}`).
        then(r => r.json()).
        then(meta => {
          resolve({
            ssh: meta.ssh_url_to_repo,
            https: meta.http_url_to_repo,
            id: meta.id,
            repo: meta.path
          });
        });
    }).
    catch(() => {
      reject();
    });
});

const fetchLanguages = gitlabMetadata => new Promise(resolve => {
  fetch(`${location.origin}/api/v4/projects/${gitlabMetadata.id}/languages`).then(response => {
    resolve(response.json());
  }).catch(() => {
    resolve(DEFAULT_LANGUAGE_SET);
  });
});

const selectTools = languages => new Promise(resolve => {
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

  const normalizedToolIds = selectedToolIds.length > 0
    ? Array.from(new Set(selectedToolIds))
    : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  const tools = normalizedToolIds.
    sort().
    map(toolId => SUPPORTED_TOOLS[toolId]);

  resolve(tools);
});

const fetchTools = gitlabMetadata => fetchLanguages(gitlabMetadata).then(selectTools);

const renderPageAction = gitlabMetadata => new Promise(resolve => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'get-tools':
        fetchTools(gitlabMetadata).then(sendResponse);
        return true;
      case 'perform-action':
        const toolboxCloneUrl = getToolboxCloneUrl(message.toolTag, message.cloneUrl);
        callToolbox(toolboxCloneUrl);
        break;
      // no default
    }
    return undefined;
  });

  resolve();
});

const removeCloneButtons = () => {
  document.querySelectorAll(`.${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`).forEach(button => {
    button.remove();
  });
};

const cloneButtonsRendered = () => document.getElementsByClassName(CLONE_BUTTON_GROUP_JS_CSS_CLASS).length > 0;

const addCloneButtonEventHandler = (button, gitlabMetadata) => {
  button.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: 'get-protocol'}, ({protocol}) => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS ? gitlabMetadata.https : gitlabMetadata.ssh;
      const toolboxCloneUrl = getToolboxCloneUrl(toolTag, cloneUrl);
      callToolbox(toolboxCloneUrl);
    });
  });
};

const createCloneButton = (tool, gitlabMetadata) => {
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
    return;
  }

  const projectCloneHolder = document.querySelector('.project-clone-holder');

  if (projectCloneHolder) {
    const buttonGroup = document.createElement('div');
    buttonGroup.setAttribute('class', `btn-group ${CLONE_BUTTON_GROUP_JS_CSS_CLASS}`);

    tools.forEach(tool => {
      const button = createCloneButton(tool, gitlabMetadata);
      buttonGroup.append(button);
    });

    projectCloneHolder.insertAdjacentElement('beforebegin', buttonGroup);
  }
};

const addOpenButtonEventHandler = (buttonElement, tool, gitlabMetadata) => {
  const mrPageHashPartsCount = 3;

  buttonElement.addEventListener('click', e => {
    e.preventDefault();

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
};

const createOpenButton = (tool, gitlabMetadata, filePath) => {
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
    return;
  }

  const buttonGroupAnchorElement = targetElement.querySelector('.file-actions .btn-group:last-child');
  if (buttonGroupAnchorElement) {
    const toolboxButtonGroup = document.createElement('div');
    toolboxButtonGroup.setAttribute('class', `btn-group ml-2 ${OPEN_BUTTON_GROUP_JS_CSS_CLASS}`);
    toolboxButtonGroup.setAttribute('role', 'group');

    const copyFilePathButton = targetElement.querySelector('.file-header-content button[id^="clipboard-button"]');
    if (copyFilePathButton) {
      try {
        const {text: filePath} = JSON.parse(copyFilePathButton.dataset.clipboardText);
        if (filePath) {
          tools.forEach(tool => {
            const action = createOpenButton(tool, gitlabMetadata, filePath);
            toolboxButtonGroup.appendChild(action);
          });

          buttonGroupAnchorElement.insertAdjacentElement('afterend', toolboxButtonGroup);
        }
      } catch {
        // do nothing
      }
    }
  }
};

const startTrackingDOMChanges = gitlabMetadata =>
  observe(
    '.file-holder',
    {
      add(el) {
        fetchTools(gitlabMetadata).then(tools => {
          renderOpenButtons(tools, gitlabMetadata, el);
        });
      }
    }
  );

const stopTrackingDOMChanges = observer => {
  if (observer) {
    observer.abort();
  }
};

const enablePageAction = gitlabMetadata => {
  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: gitlabMetadata.repo,
    https: gitlabMetadata.https,
    ssh: gitlabMetadata.ssh
  });
};

const disablePageAction = () => {
  chrome.runtime.sendMessage({type: 'disable-page-action'});
};

const toolboxify = () => {
  let DOMObserver = null;

  fetchMetadata().
    then(metadata => {
      renderPageAction(metadata).then(() => {
        enablePageAction(metadata);
      });

      chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
        if (data.allow) {
          fetchTools(metadata).then(tools => {
            renderCloneButtons(tools, metadata);
          });
          DOMObserver = startTrackingDOMChanges(metadata);
        }
        chrome.runtime.onMessage.addListener(message => {
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
