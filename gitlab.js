/** @author Johannes Tegnér <johannes@jitesoft.com> */
import 'whatwg-fetch';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  getToolboxNavURN,
  getProtocol,
  callToolbox,
  USAGE_THRESHOLD,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SET,
  CLONE_PROTOCOLS
} from './common';

// if (!window.hasRun) {
//   window.hasRun = true;

  const extractProjectIdFromPage = document => {
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
        const [repoPath] = findFile.split('/find_file/');
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
              repo: meta.name
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
      supportedLanguages[language.toLowerCase()] && languages[language] / overallPoints > USAGE_THRESHOLD;

    const selectedToolIds = Object.
      keys(languages).
      filter(filterLang).
      reduce((acc, key) => {
        acc.push(...supportedLanguages[key.toLowerCase()]);
        return acc;
      }, []);

    const normalizedToolIds = selectedToolIds.length > 0
      ? Array.from(new Set(selectedToolIds))
      : supportedLanguages[DEFAULT_LANGUAGE];

    const tools = normalizedToolIds.
      sort().
      map(toolId => supportedTools[toolId]);

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
    action.setAttribute('class', 'input-group-text btn btn-xs has-tooltip');
    action.setAttribute('style', 'cursor:pointer');
    action.dataset.title = `Clone in ${tool.name}`;
    action.dataset.originalTitle = action.dataset.title;
    action.setAttribute('aria-label', action.dataset.title);
    action.dataset.toolTag = tool.tag;
    action.innerHTML =
      `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align:text-top">`;

    addCloneActionEventHandler(action, gitlabMetadata);

    return action;
  };

  const renderCloneActions = (tools, gitlabMetadata) => new Promise(resolve => {
    const gitCloneHolder = document.querySelector('.js-git-clone-holder');
    const gitCloneHolderParent = gitCloneHolder ? gitCloneHolder.parentElement : null;
    if (gitCloneHolderParent) {
      const buttonGroup = document.createElement('div');
      buttonGroup.setAttribute('class', 'd-inline-flex append-right-8');
      buttonGroup.setAttribute('style', 'margin-top: 16px;');
      tools.forEach(tool => {
        const btn = createCloneAction(tool, gitlabMetadata);
        buttonGroup.appendChild(btn);
      });

      gitCloneHolderParent.insertAdjacentElement('beforebegin', buttonGroup);
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

      callToolbox(getToolboxNavURN(tool.tag, gitlabMetadata.repo, filePath, lineNumber));
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
      `<img alt="${tool.name}" src="${tool.icon}" width="15" height="15" style="position:relative;top:-2px">`;

    addNavigateActionEventHandler(action, tool, gitlabMetadata);

    return action;
  };

  const renderOpenActions = (tools, gitlabMetadata) => new Promise(resolve => {
    const buttonGroupAnchorElement = document.querySelector('.file-holder .file-actions .btn-group:last-child');
    if (buttonGroupAnchorElement) {
      const toolboxButtonGroup = document.createElement('div');
      toolboxButtonGroup.setAttribute('class', 'btn-group');
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
    fetchMetadata().
      then(metadata => fetchLanguages(metadata).
        then(selectTools).
        then(tools => renderPopupCloneActions(tools).
          then(() => renderCloneActions(tools, metadata)).
          then(() => renderOpenActions(tools, metadata))
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
//   toolboxify();
// }
