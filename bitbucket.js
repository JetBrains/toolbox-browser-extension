import 'whatwg-fetch';
import bb from 'bitbucket-url-to-object';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  DEFAULT_LANGUAGE
} from './common';

if (!window.hasRun) {
  window.hasRun = true;

  const fetchMetadata = () => new Promise((resolve, reject) => {
    const metadata = bb(window.location.toString());
    if (metadata) {
      resolve(metadata);
    } else {
      reject();
    }
  });

  const selectTools = language => {
    // All languages in Bitbucket match the common list with an exception of HTML
    const lang = language === 'html/css' ? 'html' : language;

    const selectedTools = lang && supportedLanguages[lang.toLowerCase()];
    return selectedTools && selectedTools.length > 0
      ? selectedTools
      : supportedLanguages[DEFAULT_LANGUAGE];
  };

  const renderActions = (tools, cloneUrl, sshUrl) => new Promise(resolve => {
    const selectedTools = tools.
      sort().
      map(toolId => {
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

  const getLink = (links, which) => {
    const link = links.clone.find(l => l.name === which);
    return link ? link.href : '';
  };

  const getCloneUrl = links => getLink(links, 'https');
  const getSshCloneUrl = links => getLink(links, 'ssh');

  fetchMetadata().
    then(bitbucketMetadata => fetch(`${bitbucketMetadata.api_url}?fields=language,links.clone`).
      then(response => response.json()).
      then(parsedResponse => {
        const tools = selectTools(parsedResponse.language);
        const cloneUrl = getCloneUrl(parsedResponse.links);
        const sshUrl = getSshCloneUrl(parsedResponse.links);
        return renderActions(tools, cloneUrl, sshUrl);
      }).then(() => {
        chrome.runtime.sendMessage({type: 'enable-page-action'});
      })).
    catch(() => {
      chrome.runtime.sendMessage({type: 'disable-page-action'});
    });
}
