import 'whatwg-fetch';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  DEFAULT_LANGUAGE
} from './common';

if (!window.hasRun) {
  window.hasRun = true;

  const getDom = (dom, node) => dom.querySelector(node).innerText.replace(/[\r\n]/g, '').trim();

  const fetchMetadata = () => new Promise((resolve, reject) => {
    const extension = document.querySelector('.gitee-project-extension');
    const repo = [];
    if (extension) {
      repo.language = getDom(extension, '.extension.lang') || {language: ''};
      repo.state = getDom(extension, '.extension.public') || {state: '1'};
      repo.https = getDom(extension, '.extension.https') || {https: ''};
      repo.ssh = getDom(extension, '.extension.ssh') || {ssh: ''};
      resolve(repo);
    } else {
      reject();
    }
  });

  const selectTools = language => {
    // All languages in Gitee match the common list with an exception of HTML
    const lang = language === 'html/css' ? 'html' : language;

    const selectedTools = lang && supportedLanguages[lang.toLowerCase()];
    return selectedTools && selectedTools.length > 0
      ? selectedTools
      : supportedLanguages[DEFAULT_LANGUAGE];
  };

  const renderActions = (tools, cloneUrl, sshUrl) => new Promise(resolve => {
    const selectedTools = tools.sort().map(toolId => {
      const tool = supportedTools[toolId];
      tool.cloneUrl = getToolboxURN(tool.tag, cloneUrl);
      tool.sshUrl = getToolboxURN(tool.tag, sshUrl);
      return tool;
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'get-tools':
          sendResponse(selectedTools);
          break;
        default:
          // unknown message
          break;
      }
    });

    resolve();
  });

  fetchMetadata().then(
    repo => {
      const tools = selectTools(repo.language.toLowerCase());
      renderActions(tools, repo.https, repo.ssh);
      chrome.runtime.sendMessage({type: 'enable-page-action'});
    }
  ).catch(() => {
    chrome.runtime.sendMessage({type: 'disable-page-action'});
  });
}
