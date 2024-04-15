/** @author normalcoder <normal@normalcoder.com> */

import {
  CLONE_PROTOCOLS,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS
} from './constants';

import {
  callToolbox,
  getToolboxURN
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

const selectTools = language => {
  // All languages on Gitee match the common list except HTML
  const lang = language === 'html/css' ? 'html' : language;

  const selectedTools = lang && SUPPORTED_LANGUAGES[lang.toLowerCase()];
  return selectedTools && selectedTools.length > 0
    ? selectedTools
    : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
};

// TODO: refactor this: extract code to separate functions, assign CSS classes, etc.
const renderActions = (tools, metadata) => {
  const selectedTools = tools.sort().map(toolId => {
    const tool = SUPPORTED_TOOLS[toolId];
    tool.httpsUrl = getToolboxURN(tool.tag, metadata.https);
    tool.sshUrl = getToolboxURN(tool.tag, metadata.ssh);
    return tool;
  });

  const modalDownload = document.getElementById('git-project-download-panel');
  if (modalDownload) {
    const content = modalDownload.querySelector('.content');
    const menuContainer = modalDownload.querySelector('.menu-container');

    // render the JetBrains tab
    const jetbrainsTab = document.createElement('a');
    jetbrainsTab.classList.add('item');
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
    jbItem.style.display = 'none';

    // create the tools list
    const toolsList = document.createElement('div');
    toolsList.style.display = 'flex';
    toolsList.style.flexDirection = 'column';
    toolsList.style.gap = '12px';

    selectedTools.forEach(tool => {
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
      e => {
        const targetItem = e.target;
        if (targetItem.dataset.type === 'jb') {
          e.stopImmediatePropagation();

          menuContainer.querySelectorAll('.item').forEach(item => {
            item.classList.remove('active');
          });
          targetItem.classList.add('active');

          content.querySelectorAll(':scope > :not(.menu-container, .tip-box)').forEach(item => {
            item.style.display = 'none';
          });

          content.querySelector('.http-ssh-item').style.display = '';

          jbItem.style.display = '';

          chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
            switch (data.protocol) {
              case CLONE_PROTOCOLS.HTTPS: {
                const item = content.querySelector('.http-item');
                if (item) {
                  item.style.display = '';
                }
              }
                break;
              case CLONE_PROTOCOLS.SSH: {
                const item = content.querySelector('.ssh-item');
                if (item) {
                  item.style.display = '';
                }
              }
                break;
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
      },
      true
    );

    // eslint-disable-next-line complexity
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
      case 'get-tools':
        sendResponse(selectedTools);
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

try {
  const metadata = fetchMetadata();
  const tools = selectTools(metadata.language.toLowerCase());
  renderActions(tools, metadata);
  chrome.runtime.sendMessage({
    type: 'enable-page-action',
    project: metadata.name,
    https: metadata.https,
    ssh: metadata.ssh
  });
} catch (e) {
  chrome.runtime.sendMessage({type: 'disable-page-action'});
}
