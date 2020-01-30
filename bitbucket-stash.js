import 'whatwg-fetch';
import parseBitbucketUrl from 'parse-bitbucket-url';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  getToolboxNavURN,
  getProtocol,
  callToolbox,
  DEFAULT_LANGUAGE,
  CLONE_PROTOCOLS
} from './common';

// if (!window.hasRun) {
//   window.hasRun = true;

  const fetchMetadata = () => new Promise((resolve, reject) => {
    const parsedStashUrl = document.querySelector('meta[name=application-name][content=Bitbucket]') &&
      parseBitbucketUrl(window.location.toString());
    if (!parsedStashUrl) {
      reject();
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

    const toolIds = normalizedLanguage && supportedLanguages[normalizedLanguage.toLowerCase()];
    const normalizedToolIds = toolIds && toolIds.length > 0
      ? toolIds
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

  const getCloneUrl = (links, which) => {
    const link = links.clone.find(l => l.name === which);
    return link ? link.href : '';
  };

  const getHttpsCloneUrl = links => getCloneUrl(links, 'https');
  const getSshCloneUrl = links => getCloneUrl(links, 'ssh');

  const addCloneActionEventHandler = (btn, bitbucketMetadata) => {
    btn.addEventListener('click', e => {
      e.preventDefault();

      const {toolTag} = e.currentTarget.dataset;
      getProtocol().then(protocol => {
        const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
          ? getHttpsCloneUrl(bitbucketMetadata.links)
          : getSshCloneUrl(bitbucketMetadata.links);
        const action = getToolboxURN(toolTag, cloneUrl);
        callToolbox(action);
      });
    });
  };

  const createCloneAction = (tool, bitbucketMetadata) => {
    const title = `Clone in ${tool.name}`;
    const action = document.createElement('a');
    action.setAttribute('class', 'aui-nav-item');
    action.setAttribute('href', '#');
    action.setAttribute('original-title', title);
    action.dataset.toolTag = tool.tag;

    const actionIcon = document.createElement('span');
    actionIcon.setAttribute('class', 'aui-icon toolbox-aui-icon');
    actionIcon.setAttribute('style', `background-image:url(${tool.icon});background-size:contain`);

    const actionLabel = document.createElement('span');
    actionLabel.setAttribute('class', 'aui-nav-item-label');
    actionLabel.textContent = title;

    action.appendChild(actionIcon);
    action.appendChild(actionLabel);

    addCloneActionEventHandler(action, bitbucketMetadata);

    return action;
  };

  // eslint-disable-next-line complexity
  const renderCloneActionsSync = (tools, bitbucketMetadata) => {
    const cloneElement = document.querySelector('.clone-repo');
    if (!cloneElement) {
      return;
    }

    tools.forEach(tool => {
      const toolboxCloneElement = document.createElement('li');
      toolboxCloneElement.setAttribute('class', 'js-toolbox-clone-repo');

      const action = createCloneAction(tool, bitbucketMetadata);
      toolboxCloneElement.appendChild(action);

      cloneElement.insertAdjacentElement('beforebegin', toolboxCloneElement);
    });
  };

  const renderCloneActions = (tools, bitbucketMetadata) => new Promise(resolve => {
    renderCloneActionsSync(tools, bitbucketMetadata);
    resolve();
  });

  const addNavigateActionEventHandler = (domElement, tool, bitbucketMetadata) => {
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

  const createOpenAction = (tool, bitbucketMetadata) => {
    const action = document.createElement('div');
    action.setAttribute('class', 'aui-buttons js-toolbox-open-action');

    const actionButton = document.createElement('button');
    actionButton.setAttribute('class', 'aui-button');
    actionButton.setAttribute('original-title', `Open this file in ${tool.name}`);
    actionButton.innerHTML =
      `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align:text-bottom">`;

    action.append(actionButton);
    addNavigateActionEventHandler(actionButton, tool, bitbucketMetadata);

    return action;
  };

  const setOpenActionTooltips = () => {
    const tooltipScript = document.createElement('script');
    tooltipScript.textContent = 'jQuery(".js-toolbox-open-action > .aui-button:first-child").tipsy();';
    document.body.appendChild(tooltipScript);
  };

  const renderOpenActionsSync = (tools, bitbucketMetadata) => {
    const anchorElement = document.querySelector('.file-toolbar > .secondary > .aui-buttons:first-child');
    if (anchorElement) {
      tools.forEach(tool => {
        const action = createOpenAction(tool, bitbucketMetadata);
        anchorElement.insertAdjacentElement('beforebegin', action);
      });
      setOpenActionTooltips();
    }
  };

  const renderOpenActions = (tools, bitbucketMetadata) => new Promise(resolve => {
    renderOpenActionsSync(tools, bitbucketMetadata);
    resolve();
  });

  const toolboxify = () => {
    fetchMetadata().
      then(metadata => fetchLanguages().
        then(selectTools).
        then(tools => renderPopupCloneActions(tools).
          then(() => renderCloneActions(tools, metadata)).
          then(() => renderOpenActions(tools, metadata))
        ).
        then(() => {
          chrome.runtime.sendMessage({
            type: 'enable-page-action',
            project: metadata.repo,
            https: getHttpsCloneUrl(metadata.links),
            ssh: getSshCloneUrl(metadata.links)
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
