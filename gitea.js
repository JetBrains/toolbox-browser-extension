import 'whatwg-fetch';

import {
  SUPPORTED_TOOLS,
  getToolboxURN,
  callToolbox
} from './common';

const fetchMetadata = () => new Promise((resolve, reject) => {
  const repo = [];
  const https = document.getElementById('repo-clone-https');
  const ssh = document.getElementById('repo-clone-ssh');
  if (https === null && ssh === null) {
    reject();
  }
  repo.https = https !== null ? https.getAttribute('data-link') : '';
  repo.ssh = ssh !== null ? ssh.getAttribute('data-link') : '';
  repo.name = window.location.pathname.split('/').pop();
  resolve(repo);
});

const renderActions = () => new Promise(resolve => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'get-tools':
        sendResponse(Object.values(SUPPORTED_TOOLS));
        break;
      case 'perform-action':
        const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
        callToolbox(toolboxAction);
        break;
      default:
        // unknown message
        break;
      // no default
    }
  });

  resolve();
});

const addCloneActionEventHandler = btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();

    const cloneURL = document.getElementById('repo-clone-url').value;

    const {toolTag} = e.currentTarget.dataset;

    const action = getToolboxURN(toolTag, cloneURL);

    callToolbox(action);
  });
};

const createCloneAction = tool => {
  const action = document.createElement('BUTTON');
  action.setAttribute('class', 'ui compact basic button jump poping up');
  const title = `Clone in ${tool.name}`;
  action.setAttribute('data-original', title);
  action.setAttribute('data-content', title);
  action.setAttribute('data-variation', 'inverted tiny');
  action.setAttribute('title', '');
  action.dataset.toolTag = tool.tag;
  action.innerHTML =
    `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align:text-top">`;

  addCloneActionEventHandler(action);

  return action;
};

const renderCloneActions = () => {
  const div = document.createElement('DIV');
  div.setAttribute('class', 'ui stackable secondary menu mobile--margin-between-items mobile--no-negative-margins');
  div.setAttribute('style', 'justify-content: center;');

  const items = document.createElement('DIV');
  items.setAttribute('class', 'fitted item');

  const container = document.createElement('DIV');
  container.setAttribute('class', 'ui action tiny input');

  Object.values(SUPPORTED_TOOLS).forEach(tool => {
    const btn = createCloneAction(tool);
    container.appendChild(btn);
  });

  items.appendChild(container);
  div.appendChild(items);

  const buttons = document.querySelector('div.repository').lastElementChild;
  buttons.insertBefore(div, buttons.firstChild);
};

const toolboxify = () => {
  fetchMetadata().then(
    repo => {
      renderActions();
      renderCloneActions();
      chrome.runtime.sendMessage({
        type: 'enable-page-action',
        project: repo.name,
        https: repo.https,
        ssh: repo.ssh
      });
    }
  ).catch(() => {
    chrome.runtime.sendMessage({type: 'disable-page-action'});
  });
};

export default toolboxify;
