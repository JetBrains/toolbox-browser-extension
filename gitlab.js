/** @author Johannes Tegnér <johannes@jitesoft.com> */
import 'whatwg-fetch';

import {
  CLONE_PROTOCOLS,
  RUNTIME_MESSAGES
} from './constants';

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

const selectTools = () => new Promise(resolve => {
  chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_TOOLS}, response => {
    resolve(response.tools);
  });
});

const addCloneActionEventHandler = (btn, gitlabMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolType} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_PROTOCOL}, response => {
      const cloneURL = response.protocol === CLONE_PROTOCOLS.HTTPS ? gitlabMetadata.https : gitlabMetadata.ssh;
      chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.CLONE_IN_TOOL, toolType, cloneURL});
    });
  });
};

const createCloneAction = (tool, gitlabMetadata) => {
  const action = document.createElement('a');
  action.setAttribute('class', 'gl-link btn has-tooltip');
  action.setAttribute('style', 'cursor:pointer');
  action.dataset.title = `Clone in ${tool.name}`;
  action.dataset.originalTitle = action.dataset.title;
  action.setAttribute('aria-label', action.dataset.title);
  action.dataset.toolType = tool.type;
  action.innerHTML =
    `<img alt="${tool.name}" src="${tool.icon_url}" width="16" height="16" style="vertical-align:text-top">`;

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

const addNavigateActionEventHandler = (domElement, tool, gitlabMetadata) => {
  domElement.addEventListener('click', e => {
    e.preventDefault();

    const branchAndFilePath = location.pathname.split('/blob/')[1];
    const filePath = branchAndFilePath.split('/').splice(1).join('/');
    let lineNumber = location.hash.replace('#L', '');
    if (lineNumber === '') {
      lineNumber = null;
    }

    chrome.runtime.sendMessage({
      type: RUNTIME_MESSAGES.NAVIGATE_IN_TOOL,
      toolType: tool.type,
      project: gitlabMetadata.repo,
      filePath,
      lineNumber
    });
  });
};

const createOpenAction = (tool, gitlabMetadata) => {
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
  action.innerHTML =
    `<img alt="${tool.name}" src="${tool.icon_url}" width="15" height="15" style="position:relative;top:-2px">`;

  addNavigateActionEventHandler(action, tool, gitlabMetadata);

  return action;
};

const renderOpenActions = (tools, gitlabMetadata) => new Promise(resolve => {
  const buttonGroupAnchorElement = document.querySelector('.file-holder .file-actions .btn-group:last-child');
  if (buttonGroupAnchorElement) {
    const toolboxButtonGroup = document.createElement('div');
    toolboxButtonGroup.setAttribute('class', 'btn-group ml-2');
    toolboxButtonGroup.setAttribute('role', 'group');

    tools.forEach(tool => {
      const action = createOpenAction(tool, gitlabMetadata);
      toolboxButtonGroup.appendChild(action);
    });

    buttonGroupAnchorElement.insertAdjacentElement('beforebegin', toolboxButtonGroup);
    buttonGroupAnchorElement.insertAdjacentText('beforebegin', '\n');
  }

  resolve();
});

const toolboxify = () => {
  Promise.all([fetchMetadata(), selectTools()]).
    then(([metadata, tools]) =>
      Promise.all([renderCloneActions(tools, metadata), renderOpenActions(tools, metadata)]).
        then(() => {
          chrome.runtime.sendMessage({
            type: RUNTIME_MESSAGES.ENABLE_PAGE_ACTION,
            project: metadata.repo,
            https: metadata.https,
            ssh: metadata.ssh
          });
        })
    ).
    catch(() => {
      chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.DISABLE_PAGE_ACTION});
    });
};

export default toolboxify;
