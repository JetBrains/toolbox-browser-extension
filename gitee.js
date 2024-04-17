/** @author 诺墨 <normal@normalcoder.com> */

import {observe} from 'selector-observer';

import {
  CLONE_PROTOCOLS,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS
} from './constants';

import {
  callToolbox,
  getToolboxNavURN,
  getToolboxURN,
  parseLineNumber
} from './api/toolbox';

const extractExtensionEntry = (extensionElement, selector) =>
  extensionElement.querySelector(selector)?.textContent?.trim() ?? '';

const fetchMetadata = () => {
  const extension = document.querySelector('.gitee-project-extension');
  if (extension == null) {
    throw new Error('Extension element not found');
  }

  return {
    language: extractExtensionEntry(extension, '.extension.lang'),
    state: extractExtensionEntry(extension, '.extension.public'),
    https: extractExtensionEntry(extension, '.extension.https'),
    ssh: extractExtensionEntry(extension, '.extension.ssh'),
    namespace: extractExtensionEntry(extension, '.extension.namespace'),
    repo: extractExtensionEntry(extension, '.extension.repo'),
    name: extractExtensionEntry(extension, '.extension.name'),
    branch: extractExtensionEntry(extension, '.extension.branch')
  };
};

const selectTools = (language, metadata) => {
  // All languages on Gitee match the common list except HTML
  const lang = language === 'html/css' ? 'html' : language;

  const selectedTools = lang && SUPPORTED_LANGUAGES[lang.toLowerCase()];
  const normalizedSelectedTools = selectedTools && selectedTools.length > 0
    ? selectedTools
    : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  return normalizedSelectedTools.sort().map(toolId => {
    const tool = SUPPORTED_TOOLS[toolId];
    tool.httpsUrl = getToolboxURN(tool.tag, metadata.https);
    tool.sshUrl = getToolboxURN(tool.tag, metadata.ssh);
    return tool;
  });
};

const menuContainerClickHandler = e => {
  const tab = e.target;
  const menuContainer = e.currentTarget;
  const content = menuContainer.parentElement;

  if (tab.dataset.type === 'jb') {
    e.stopImmediatePropagation();

    menuContainer.querySelectorAll('.item').forEach(item => {
      item.classList.remove('active');
    });
    tab.classList.add('active');

    content.querySelectorAll(':scope > :not(.menu-container, .tip-box)').forEach(item => {
      item.style.display = 'none';
    });

    content.querySelector('.http-ssh-item').style.display = '';

    content.querySelector('.js-jb-tab-content').style.display = '';

    chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
      switch (data.protocol) {
        case CLONE_PROTOCOLS.HTTPS: {
          const item = content.querySelector('.http-item');
          if (item) {
            item.style.display = '';
          }
          break;
        }
        case CLONE_PROTOCOLS.SSH: {
          const item = content.querySelector('.ssh-item');
          if (item) {
            item.style.display = '';
          }
          break;
        }
        default:
          break;
      }
    });
  } else {
    content.querySelectorAll('.forbid-warning-text').forEach(item => {
      if (item.style.display === 'none') {
        item.style.display = '';
      }
    });
  }
};

// TODO: refactor this: extract code to separate functions, assign CSS classes, etc.
const renderCloneButtons = (tools, metadata) => {
  const modalDownload = document.getElementById('git-project-download-panel');
  if (modalDownload) {
    const content = modalDownload.querySelector('.content');
    const menuContainer = modalDownload.querySelector('.menu-container');

    // render the JetBrains tab
    const jetbrainsTab = document.createElement('a');
    jetbrainsTab.classList.add('item');
    jetbrainsTab.classList.add('js-jb-tab');
    jetbrainsTab.dataset.type = 'jb';
    jetbrainsTab.textContent = 'JETBRAINS';

    const items = menuContainer.querySelectorAll('.item');
    if (items.length > 0) {
      items.item(items.length - 1).insertAdjacentElement('afterend', jetbrainsTab);
    }

    // create the protocol switcher
    const protocolSwitcher = document.createElement('div');
    protocolSwitcher.style.display = 'flex';
    protocolSwitcher.style.gap = '20px';

    const httpsItem = document.createElement('label');
    httpsItem.style.display = 'flex';
    httpsItem.style.gap = '8px';
    httpsItem.style.alignItems = 'center';
    const httpsInput = document.createElement('input');
    httpsInput.type = 'radio';
    httpsInput.name = 'protocol';
    httpsInput.value = CLONE_PROTOCOLS.HTTPS;
    httpsInput.checked = true;
    httpsItem.append(httpsInput, 'Clone with HTTPS');

    const sshItem = document.createElement('label');
    sshItem.style.display = 'flex';
    sshItem.style.gap = '8px';
    sshItem.style.alignItems = 'center';
    const sshInput = document.createElement('input');
    sshInput.type = 'radio';
    sshInput.name = 'protocol';
    sshInput.value = CLONE_PROTOCOLS.SSH;
    sshItem.append(sshInput, 'Clone with SSH');

    protocolSwitcher.append(httpsItem, sshItem);

    protocolSwitcher.addEventListener('change', e => {
      if (e.target.checked) {
        chrome.runtime.sendMessage({type: 'save-protocol', protocol: e.target.value});
      }
    });

    chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
      switch (data.protocol) {
        case CLONE_PROTOCOLS.HTTPS: {
          httpsInput.checked = true;
          break;
        }
        case CLONE_PROTOCOLS.SSH: {
          sshInput.checked = true;
          break;
        }
        default:
          break;
      }
    });

    // create the JetBrains tab content
    const jbItem = document.createElement('div');
    jbItem.classList.add('jb-item');
    jbItem.classList.add('item-panel-box');
    jbItem.classList.add('mb-2');
    jbItem.classList.add('js-jb-tab-content');
    jbItem.style.display = 'none';

    // create the tools list
    const toolsList = document.createElement('div');
    toolsList.style.display = 'flex';
    toolsList.style.flexDirection = 'column';
    toolsList.style.gap = '12px';

    tools.forEach(tool => {
      const toolItem = document.createElement('div');
      toolItem.style.display = 'flex';
      toolItem.style.gap = '8px';
      toolItem.style.alignItems = 'center';
      toolItem.style.cursor = 'pointer';

      const icon = document.createElement('span');
      icon.setAttribute('style', `background-image:url(${tool.icon});background-size:contain;width:32px;height:32px;`);

      const toolDataContainer = document.createElement('div');
      toolDataContainer.style.display = 'flex';
      toolDataContainer.style.flexDirection = 'column';
      const toolName = document.createElement('strong');
      toolName.textContent = tool.name;
      const projectName = document.createElement('span');
      projectName.textContent = `${metadata.name} • ${metadata.branch}`;
      toolDataContainer.append(toolName, projectName);

      toolItem.append(icon, toolDataContainer);

      toolItem.addEventListener('click', () => {
        chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
          switch (data.protocol) {
            case CLONE_PROTOCOLS.HTTPS: {
              callToolbox(tool.httpsUrl);
              break;
            }
            case CLONE_PROTOCOLS.SSH: {
              callToolbox(tool.sshUrl);
              break;
            }
            // no default
          }
        });
      });

      toolsList.append(toolItem);
    });

    const outerContainer = document.createElement('div');
    outerContainer.style.display = 'flex';
    outerContainer.style.flexDirection = 'column';
    outerContainer.style.gap = '20px';

    outerContainer.append(protocolSwitcher, toolsList);
    jbItem.append(outerContainer);

    content.querySelector('.tip-box')?.insertAdjacentElement('beforebegin', jbItem);

    // intercept the click event to show the JetBrains tab content
    menuContainer.addEventListener(
      'click',
      menuContainerClickHandler,
      true
    );

    // eslint-disable-next-line complexity
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
      case 'get-tools':
        sendResponse(tools);
        break;
      case 'perform-action':
        const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
        callToolbox(toolboxAction);
        break;
      case 'protocol-changed': {
        switch (message.newValue) {
          case CLONE_PROTOCOLS.HTTPS: {
            httpsInput.checked = true;
            let item = content.querySelector('.http-item');
            if (item) {
              item.style.display = '';
            }
            item = content.querySelector('.ssh-item');
            if (item) {
              item.style.display = 'none';
            }
            break;
          }
          case CLONE_PROTOCOLS.SSH: {
            sshInput.checked = true;
            let item = content.querySelector('.ssh-item');
            if (item) {
              item.style.display = '';
            }
            item = content.querySelector('.http-item');
            if (item) {
              item.style.display = 'none';
            }
            break;
          }
          // no default
        }
        break;
      }
      default:
        // unknown message
        break;
      }
    });
  }
};

const removeCloneButtons = () => {
  document.querySelectorAll('.js-jb-tab, .js-jb-tab-content').forEach(element => {
    element.remove();
  });
  document.
    querySelector('#git-project-download-panel .menu-container')?.
    removeEventListener('click', menuContainerClickHandler, true);
  document.querySelector('.item[data-type="http"]')?.click();
};

const renderOpenButtons = (optionsElement, tools, metadata) => {
  const openButtons = tools.map(tool => {
    const openButton = document.createElement('a');
    openButton.classList.add('ui');
    openButton.classList.add('button');
    openButton.classList.add('has_tooltip');
    openButton.href = '#';
    openButton.title = `Open in ${tool.name}`;
    openButton.textContent = tool.name;
    openButton.addEventListener('click', e => {
      e.preventDefault();

      const filePathIndex = 5;
      const filePath = location.pathname.split('/').splice(filePathIndex).join('/');
      const lineNumber = parseLineNumber(location.hash.replace('#L', ''));

      callToolbox(getToolboxNavURN(tool.tag, metadata.repo, filePath, lineNumber));
    });

    let tooltip = null;
    openButton.addEventListener('mouseenter', e => {
      const rect = e.target.getBoundingClientRect();
      // eslint-disable-next-line no-magic-numbers
      const x = rect.left - rect.width / 2 + window.scrollX;
      const y = rect.bottom + window.scrollY;

      tooltip = document.createElement('div');
      tooltip.classList.add('ui');
      tooltip.classList.add('popup');
      tooltip.classList.add('bottom');
      tooltip.classList.add('center');
      tooltip.classList.add('transition');
      tooltip.classList.add('visible');
      tooltip.style.inset = `${y}px auto auto ${x}px`;
      tooltip.style.display = 'block !important';
      tooltip.innerHTML = `<div class='content'>${e.target.title}</div>`;
      document.body.appendChild(tooltip);
    });

    openButton.addEventListener('mouseleave', () => {
      if (tooltip) {
        document.body.removeChild(tooltip);
        tooltip = null;
      }
    });

    return openButton;
  });
  const openButtonContainer = document.createElement('div');
  openButtonContainer.classList.add('ui');
  openButtonContainer.classList.add('mini');
  openButtonContainer.classList.add('buttons');
  openButtonContainer.classList.add('basic');
  openButtonContainer.classList.add('js-open-buttons');
  openButtonContainer.append(...openButtons);
  optionsElement.insertAdjacentElement('beforeend', openButtonContainer);
};

const removeOpenButtons = () => {
  const openButtonContainer = document.querySelector('.js-open-buttons');
  if (openButtonContainer) {
    openButtonContainer.remove();
  }
};

const startTrackingDOMChanges = (tools, metadata) => {
  const selector = '#tree-content-holder .blob-header-title .options';

  return observe(selector, {
    add(options) {
      renderOpenButtons(options, tools, metadata);
    }
  });
};

try {
  const metadata = fetchMetadata();
  const tools = selectTools(metadata.language.toLowerCase(), metadata);

  chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
    let DOMObserver = null;
    if (data.allow) {
      renderCloneButtons(tools, metadata);
      DOMObserver = startTrackingDOMChanges(tools, metadata);
    }
    chrome.runtime.onMessage.addListener(message => {
      switch (message.type) {
        case 'modify-pages-changed':
          if (message.newValue) {
            renderCloneButtons(tools, metadata);
            DOMObserver = startTrackingDOMChanges(tools, metadata);
          } else {
            removeCloneButtons();
            DOMObserver.abort();
            removeOpenButtons();
          }
          break;
          // no default
      }
    });
  });

  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: metadata.name,
    https: metadata.https,
    ssh: metadata.ssh
  });
} catch (e) {
  chrome.runtime.sendMessage({type: 'disable-page-action'});
}
