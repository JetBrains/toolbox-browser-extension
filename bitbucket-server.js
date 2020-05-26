import 'whatwg-fetch';
import {observe} from 'selector-observer';
import parseBitbucketUrl from 'parse-bitbucket-url';

import {
  CLONE_PROTOCOLS,
  RUNTIME_MESSAGES
} from './constants';

const OPEN_ACTION_JS_CSS_CLASS = 'js-toolbox-open-action';

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

const selectTools = () => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_TOOLS}, response => {
    if (response.error) {
      reject();
    } else {
      resolve(response.tools);
    }
  });
});

const getCloneUrl = (links, which) => {
  const link = links.clone.find(l => l.name === which);
  return link ? link.href : '';
};

const getHttpsCloneURL = links => getCloneUrl(links, 'https');
const getSshCloneURL = links => getCloneUrl(links, 'ssh');

const addCloneActionEventHandler = (btn, bitbucketMetadata) => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const {toolType} = e.currentTarget.dataset;
    chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_PROTOCOL}, response => {
      const cloneURL = response.protocol === CLONE_PROTOCOLS.HTTPS
        ? getHttpsCloneURL(bitbucketMetadata.links)
        : getSshCloneURL(bitbucketMetadata.links);
      chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.CLONE_IN_TOOL, toolType, cloneURL});
    });
  });
};

const createCloneAction = (tool, bitbucketMetadata) => {
  const title = `Clone in ${tool.name}`;
  const action = document.createElement('a');
  action.setAttribute('class', 'aui-nav-item');
  action.setAttribute('href', '#');
  action.setAttribute('original-title', title);
  action.dataset.toolType = tool.type;

  const actionIcon = document.createElement('span');
  actionIcon.setAttribute('class', 'aui-icon toolbox-aui-icon');
  actionIcon.setAttribute('style', `background-image:url(${tool.icon_url});background-size:contain`);

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

    chrome.runtime.sendMessage({
      type: RUNTIME_MESSAGES.NAVIGATE_IN_TOOL,
      toolType: tool.type,
      project: bitbucketMetadata.repo,
      filePath,
      lineNumber
    });
  });
};

const createOpenAction = (tool, bitbucketMetadata) => {
  const action = document.createElement('div');
  action.setAttribute('class', `aui-buttons ${OPEN_ACTION_JS_CSS_CLASS}`);

  const actionButton = document.createElement('button');
  actionButton.setAttribute('class', 'aui-button');
  actionButton.setAttribute('original-title', `Open this file in ${tool.name}`);
  actionButton.innerHTML =
    `<img alt="${tool.name}" src="${tool.icon_url}" width="16" height="16" style="vertical-align:text-bottom">`;

  action.append(actionButton);
  addNavigateActionEventHandler(actionButton, tool, bitbucketMetadata);

  return action;
};

const setOpenActionTooltips = () => {
  const tooltipScript = document.createElement('script');
  tooltipScript.textContent = `jQuery('.${OPEN_ACTION_JS_CSS_CLASS} > .aui-button:first-child').tipsy();`;
  document.body.appendChild(tooltipScript);
};

const openActionsRendered = () => document.getElementsByClassName(OPEN_ACTION_JS_CSS_CLASS).length > 0;

const renderOpenActionsSync = (tools, bitbucketMetadata) => {
  if (openActionsRendered()) {
    return;
  }
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

const trackDOMChanges = (tools, bitbucketMetadata) => {
  observe('#file-content > .file-toolbar > .secondary > .aui-buttons > .file-blame', {
    add(/*el*/) {
      renderOpenActions(tools, bitbucketMetadata);
    }
  });
};

const toolboxify = () => {
  Promise.all([fetchMetadata(), selectTools()]).
    then(([metadata, tools]) =>
      Promise.all([
        renderCloneActions(tools, metadata),
        renderOpenActions(tools, metadata),
        trackDOMChanges(tools, metadata)
      ]).
        then(() => {
          chrome.runtime.sendMessage({
            type: RUNTIME_MESSAGES.ENABLE_PAGE_ACTION,
            project: metadata.repo,
            https: getHttpsCloneURL(metadata.links),
            ssh: getSshCloneURL(metadata.links)
          });
        })
    ).
    catch(() => {
      chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.DISABLE_PAGE_ACTION});
    });
};

export default toolboxify;
