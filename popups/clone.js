import {DEFAULT_ICONS} from '../constants';

function createOpenToolAction(tool, project, httpsUrl, sshUrl) {
  const toolAction = document.createElement('button');
  toolAction.setAttribute('type', 'button');
  toolAction.setAttribute('class', 'tool-action');
  toolAction.dataset.https = httpsUrl;
  toolAction.dataset.ssh = sshUrl;
  toolAction.dataset.tag = tool.tag;

  setToolActionClickHandler(toolAction);

  const icon = document.createElement('img');
  icon.setAttribute('class', 'tool-action__icon');
  icon.setAttribute('alt', tool.name);
  icon.setAttribute('src', DEFAULT_ICONS[tool.tag]);

  const actionText = document.createElement('div');
  actionText.setAttribute('class', 'tool-action__text');

  const toolName = document.createElement('div');
  toolName.setAttribute('class', 'tool-action__tool');
  toolName.textContent = tool.name;
  actionText.appendChild(toolName);

  const version = document.createElement('div');
  version.setAttribute('class', 'tool-action__version');
  version.textContent = tool.version;
  actionText.appendChild(version);

  toolAction.append(icon);
  toolAction.append(actionText);

  return toolAction;
}

function setToolActionClickHandler(action) {
  action.addEventListener('click', e => {
    e.preventDefault();

    const toolAction = e.currentTarget;

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      const toolTag = toolAction.dataset.tag;
      const protocolInput = document.querySelector('.js-protocol-input:checked');
      const protocol = protocolInput.value.toLowerCase();
      const cloneUrl = toolAction.dataset[protocol];
      chrome.tabs.sendMessage(tabs[0].id, {type: 'perform-action', toolTag, cloneUrl});
    });
  });
}

const query = decodeURI(location.search).substring(1).split('&').reduce((acc, paramString) => {
  const [param, value] = paramString.split('=');
  acc[param] = value;
  return acc;
}, {});

const inputs = document.querySelectorAll('input[type="radio"][name="protocol"]');
inputs.forEach(input => {
  input.addEventListener('change', e => {
    if (e.currentTarget.checked) {
      chrome.runtime.sendMessage({type: 'save-protocol', protocol: e.currentTarget.value});
    }
  });
});

chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
  const protocolInput = document.querySelector(`.js-protocol-input[value="${data.protocol}"]`);
  protocolInput.checked = true;
});

chrome.runtime.sendMessage({type: 'get-installed-tools'}, data => {
  if (data == null) {
    return;
  }

  const fragment = document.createDocumentFragment();
  data.tools.forEach(tool => {
    fragment.append(createOpenToolAction(tool, query.project, query.https, query.ssh));
  });
  document.querySelector('.js-tool-action-placeholder').remove();
  document.querySelector('.js-tool-actions').append(fragment);
});
