/** @author normalcoder <normal@normalcoder.com> */

import {
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

const fetchMetadata = async () => {
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

const renderActions = (tools, cloneUrl, sshUrl) => new Promise(resolve => {
  const selectedTools = tools.sort().map(toolId => {
    const tool = SUPPORTED_TOOLS[toolId];
    tool.cloneUrl = getToolboxURN(tool.tag, cloneUrl);
    tool.sshUrl = getToolboxURN(tool.tag, sshUrl);
    return tool;
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'get-tools':
        sendResponse(selectedTools);
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

fetchMetadata().
  then(
    metadata => {
      const tools = selectTools(metadata.language.toLowerCase());
      renderActions(tools, metadata.https, metadata.ssh);
      chrome.runtime.sendMessage({
        type: 'enable-page-action',
        project: metadata.name,
        https: metadata.https,
        ssh: metadata.ssh
      });
    }
  ).
  catch(() => {
    chrome.runtime.sendMessage({type: 'disable-page-action'});
  });

