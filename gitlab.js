/** @author Johannes Tegnér <johannes@jitesoft.com> */
import 'whatwg-fetch';

import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  getToolboxURN,
  getToolboxNavURN,
  getProtocol,
  callToolbox,
  USAGE_THRESHOLD,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SET,
  CLONE_PROTOCOLS,
  MAX_TIMEOUT_MILLISECONDS
} from './common';

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

const renderPopupCloneActions = tools => new Promise(resolve => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  });

  resolve();
});

const addCloneActionEventHandler = (btn, gitlabMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolTag} = e.currentTarget.dataset;
    getProtocol().then(protocol => {
      const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS ? gitlabMetadata.https : gitlabMetadata.ssh;
      const action = getToolboxURN(toolTag, cloneUrl);

      callToolbox(action);
    });
  });
};

const createCloneAction = (tool, gitlabMetadata) => {
  const action = document.createElement('a');
  action.setAttribute('class', 'gl-link btn has-tooltip');
  action.setAttribute('style', 'cursor:pointer');
  action.dataset.title = `Clone in ${tool.name}`;
  action.dataset.originalTitle = action.dataset.title;
  action.dataset.toolTag = tool.tag;
  action.setAttribute('aria-label', action.dataset.title);

  const actionIcon = document.createElement('img');
  actionIcon.setAttribute('alt', tool.name);
  actionIcon.setAttribute('src', tool.icon);
  actionIcon.setAttribute('width', '16');
  actionIcon.setAttribute('height', '16');
  actionIcon.setAttribute('style', 'vertical-align:text-top');
  action.appendChild(actionIcon);

  addCloneActionEventHandler(action, gitlabMetadata);

  return action;
};

const renderCloneActions = (tools, gitlabMetadata) => new Promise(resolve => {
  const gitCloneHolder = document.querySelector('.js-git-clone-holder');
  const gitCloneHolderParent = gitCloneHolder ? gitCloneHolder.parentElement : null;
  if (gitCloneHolderParent) {
    tools.forEach(tool => {
      const btn = createCloneAction(tool, gitlabMetadata);
      gitCloneHolderParent.insertAdjacentElement('beforebegin', btn);
    });
  }

  resolve();
});

const addNavigateActionEventHandlerSingleFileView = (domElement, tool, gitlabMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    const branchAndFilePath = location.pathname.split('/blob/')[1];
    const filePath = branchAndFilePath.split('/').splice(1).join('/');
    let lineNumber = location.hash.replace('#L', '');
    if (lineNumber === '') {
      lineNumber = null;
    }

    callToolbox(getToolboxNavURN(tool.tag, gitlabMetadata.repo, filePath, lineNumber));
  });
};

const addNavigateActionEventHandlerMergeRequestView = (domElement, tool, gitlabMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();
    let lineNumber = null;
    const fileHolder = e.currentTarget.closest('.diff-file.file-holder');
    const filePath = fileHolder.dataset.path;
    const firstDiffLine = fileHolder.querySelector('tbody tr a[data-linenumber]');
    if (firstDiffLine) {
      lineNumber = parseInt(firstDiffLine.dataset.linenumber, 10);
    }

    callToolbox(getToolboxNavURN(tool.tag, gitlabMetadata.repo, filePath, lineNumber));
  });
};

const createOpenAction = (tool, gitlabMetadata, viewType) => {
  const action = document.createElement('button');
  action.setAttribute('class', 'btn btn-sm');
  action.setAttribute('type', 'button');
  action.dataset.toggle = 'tooltip';
  action.dataset.placement = 'bottom';
  action.dataset.container = 'body';
  action.dataset.class = 'btn btn-sm';
  action.dataset.title = `Open this file in ${tool.name}`;
  action.dataset.originalTitle = action.dataset.title;
  action.setAttribute('aria-label', action.dataset.title);

  const actionIcon = document.createElement('img');
  actionIcon.setAttribute('alt', tool.name);
  actionIcon.setAttribute('src', tool.icon);
  actionIcon.setAttribute('width', '15');
  actionIcon.setAttribute('height', '15');
  actionIcon.setAttribute('style', 'position:relative;top:-2px');
  action.appendChild(actionIcon);

  switch (viewType) {
    case 'blob':
      addNavigateActionEventHandlerSingleFileView(action, tool, gitlabMetadata);
      break;
    case 'merge_request':
      addNavigateActionEventHandlerMergeRequestView(action, tool, gitlabMetadata);
      break;
    default:
      return null;
  }

  return action;
};

const renderOpenActions = (tools, gitlabMetadata) => {
  const buttonGroupAnchorElements = document.querySelectorAll('.file-holder .file-actions .btn-group:last-child');
  if (!buttonGroupAnchorElements || buttonGroupAnchorElements.length === 0) {
    return false;
  }

  const viewType = location.pathname.match(/merge_request|blob/)[0];
  buttonGroupAnchorElements.forEach(buttonGroupAnchorElement => {
    const toolboxButtonGroup = document.createElement('div');
    toolboxButtonGroup.setAttribute('class', 'btn-group ml-2');
    toolboxButtonGroup.setAttribute('role', 'group');

    tools.forEach(tool => {
      const action = createOpenAction(tool, gitlabMetadata, viewType);
      if (action !== null) {
        toolboxButtonGroup.appendChild(action);
      }
    });

    buttonGroupAnchorElement.insertAdjacentElement('beforebegin', toolboxButtonGroup);
    buttonGroupAnchorElement.insertAdjacentText('beforebegin', '\n');
  });

  return true;
};

const tryRenderOpenActions = (tools, gitlabMetadata) => new Promise(resolve => {
  let retryLimit = 10;
  const loopMethod = () => {
    setTimeout(() => {
      if (renderOpenActions(tools, gitlabMetadata) === false && retryLimit-- > 0) {
        loopMethod();
      } else {
        resolve();
      }
    }, MAX_TIMEOUT_MILLISECONDS);
  };

  loopMethod();

  resolve();
});

const toolboxify = () => {
  fetchMetadata().
    then(metadata => fetchLanguages(metadata).
      then(selectTools).
      then(tools => renderPopupCloneActions(tools).
        then(() => renderCloneActions(tools, metadata)).
        then(() => tryRenderOpenActions(tools, metadata))
      ).
      then(() => {
        chrome.runtime.sendMessage({
          type: 'enable-page-action',
          project: metadata.repo,
          https: metadata.https,
          ssh: metadata.ssh
        });
      })
    ).
    catch(() => {
      chrome.runtime.sendMessage({type: 'disable-page-action'});
    });
};

export default toolboxify;
