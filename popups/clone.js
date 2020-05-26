import {
  RUNTIME_MESSAGES,
  TOOLBOX_ERRORS
} from '../constants';

const CONTENTS = {
  LOADING: 'loading',
  TOOLS: 'tools',
  NO_TOOLS: 'no-tools',
  INSTALL: 'install'
};

function showContent(content, show) {
  document.getElementById(content).style.display = show ? 'block' : 'none';
}

function showNoTools() {
  showContent(CONTENTS.NO_TOOLS, true);
  showContent(CONTENTS.LOADING, false);
}

function showInstall() {
  showContent(CONTENTS.INSTALL, true);
  showContent(CONTENTS.LOADING, false);
}

function setToolActionClickHandler(action) {
  action.addEventListener('click', e => {
    e.preventDefault();

    const toolAction = e.currentTarget;
    const toolType = toolAction.dataset.toolType;
    const protocolInput = document.querySelector('.js-protocol-input:checked');
    const protocol = protocolInput.value.toLowerCase();
    const cloneURL = toolAction.dataset[protocol];

    chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.CLONE_IN_TOOL, toolType, cloneURL});
  });
}

function createToolAction(tool, project, httpsUrl, sshUrl) {
  const action = document.createElement('button');
  action.setAttribute('type', 'button');
  action.setAttribute('class', 'tool-action');
  action.dataset.https = httpsUrl;
  action.dataset.ssh = sshUrl;
  action.dataset.toolType = tool.type;

  setToolActionClickHandler(action);

  const icon = document.createElement('img');
  icon.setAttribute('class', 'tool-action__icon');
  icon.setAttribute('alt', tool.name);
  icon.setAttribute('src', tool.icon_url);

  const actionText = document.createElement('div');
  actionText.setAttribute('class', 'tool-action__text');

  const toolName = document.createElement('div');
  toolName.setAttribute('class', 'tool-action__tool');
  toolName.textContent = tool.name;
  actionText.appendChild(toolName);

  const projectName = document.createElement('div');
  projectName.setAttribute('class', 'tool-action__project');
  projectName.textContent = project;
  actionText.appendChild(projectName);

  action.append(icon);
  action.append(actionText);

  return action;
}

function showTools(tools) {
  chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_PROTOCOL}, response => {
    const protocolInput = document.querySelector(`.js-protocol-input[value="${response.protocol}"]`);
    protocolInput.checked = true;
  });

  const query = decodeURI(location.search).substring(1).split('&').reduce((acc, paramString) => {
    const [param, value] = paramString.split('=');
    acc[param] = value;
    return acc;
  }, {});

  const inputs = document.querySelectorAll('input[type="radio"][name="protocol"]');
  inputs.forEach(input => {
    input.addEventListener('change', e => {
      if (e.currentTarget.checked) {
        chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.SAVE_PROTOCOL, protocol: e.currentTarget.value});
      }
    });
  });

  const fragment = document.createDocumentFragment();
  if (Array.isArray(tools)) {
    tools.forEach(tool => {
      fragment.append(createToolAction(tool, query.project, query.https, query.ssh));
    });
  }
  document.querySelector('.js-tool-actions').append(fragment);

  showContent(CONTENTS.TOOLS, true);
  showContent(CONTENTS.LOADING, false);
}

chrome.runtime.sendMessage({type: RUNTIME_MESSAGES.GET_TOOLS}, response => {
  if (response.error === TOOLBOX_ERRORS.COMMUNICATION_ERROR) {
    showInstall();
  } else if (response.error === TOOLBOX_ERRORS.TOOLS_NOT_FOUND) {
    showNoTools();
  } else if (response.tools) {
    showTools(response.tools);
  }
});
