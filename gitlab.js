/** @author Johannes Tegnér <johannes@jitesoft.com> */
import 'whatwg-fetch';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  callToolbox,
  USAGE_THRESHOLD,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SET, getToolboxNavURN
} from './common';

if (!window.hasRun) {
  window.hasRun = true;

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
      const blobContentHolderElement = document.getElementById('blob-content-holder');
      if (blobContentHolderElement) {
        const breadcrumbsList = document.querySelector('.js-breadcrumbs-list');
        // eslint-disable-next-line no-magic-numbers
        const repoLinkContainerElement = breadcrumbsList.children[breadcrumbsList.childElementCount - 2];
        const repoLink = repoLinkContainerElement.firstElementChild;
        fetch(repoLink.href).
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
        fetch(`https://gitlab.com/api/v4/projects/${id}`).
          then(r => r.json()).
          then(meta => {
            resolve({
              ssh: meta.ssh_url_to_repo,
              https: meta.http_url_to_repo,
              id: meta.id,
              branch: meta.name
            });
          });
      }).catch(() => {
        reject();
      });
  });

  const fetchLanguages = gitlabMetadata => new Promise(resolve => {
    fetch(`https://gitlab.com/api/v4/projects/${gitlabMetadata.id}/languages`).then(response => {
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

  const renderPopupCloneActions = (gitlabMetadata, tools) => new Promise(resolve => {
    const preparedTools = tools.map(tool => ({
      ...tool,
      cloneUrl: getToolboxURN(tool.tag, gitlabMetadata.https),
      sshUrl: getToolboxURN(tool.tag, gitlabMetadata.ssh)
    }));

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'get-tools':
          sendResponse(preparedTools);
          break;
        case 'perform-action':
          callToolbox(message.action);
          break;
        // no default
      }
    });

    resolve();
  });

  const addToolboxActionEventHandler = (domElement, tool, gitlabMetadata) => {
    domElement.addEventListener('click', e => {
      e.preventDefault();

      const branchAndFilePath = location.pathname.split('/blob/')[1];
      const filePath = branchAndFilePath.split('/').splice(1).join('/');
      let lineNumber = location.hash.replace('#L', '');
      if (lineNumber === '') {
        lineNumber = null;
      }

      callToolbox(getToolboxNavURN(tool.tag, gitlabMetadata.branch, filePath, lineNumber));
    });
  };

  const createOpenAction = (gitlabMetadata, tool) => {
    const action = document.createElement('button');
    action.setAttribute('class', 'btn btn-sm');
    action.setAttribute('type', 'button');
    action.dataset.toggle = 'tooltip';
    action.dataset.placement = 'bottom';
    action.dataset.container = 'body';
    action.dataset.class = 'btn btn-sm';
    action.dataset.title = `Open this file in IntelliJ ${tool.name}`;
    action.dataset.originalTitle = action.dataset.title;
    action.setAttribute('aria-label', action.dataset.title);
    action.innerHTML =
      `<img alt="${tool.name}" src="${tool.icon}" width="15" height="15" style="position:relative;top:-2px">`;

    addToolboxActionEventHandler(action, tool, gitlabMetadata);

    return action;
  };

  const renderOpenActions = (gitlabMetadata, tools) => new Promise(resolve => {
    const buttonGroupAnchorElement = document.querySelector('.file-holder .file-actions .btn-group:last-child');
    if (buttonGroupAnchorElement) {
      const toolboxButtonGroup = document.createElement('div');
      toolboxButtonGroup.setAttribute('class', 'btn-group');
      toolboxButtonGroup.setAttribute('role', 'group');

      tools.forEach(tool => {
        const action = createOpenAction(gitlabMetadata, tool);
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
        then(tools => renderPopupCloneActions(metadata, tools).
          then(() => renderOpenActions(metadata, tools))
        )
      ).
      then(() => {
        chrome.runtime.sendMessage({type: 'enable-page-action'});
      }).
      catch(() => {
        chrome.runtime.sendMessage({type: 'disable-page-action'});
      });
  };

  toolboxify();
}
