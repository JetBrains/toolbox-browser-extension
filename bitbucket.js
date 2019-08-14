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

  const bitbucketMetadata = bb(window.location.toString());

  const selectTools = language => {
    // All languages in Bitbucket match the common list with an exception of HTML
    const lang = language === 'html/css' ? 'html' : language;

    const selectedTools = lang && supportedLanguages[lang.toLowerCase()];
    return selectedTools && selectedTools.length > 0
      ? selectedTools
      : supportedLanguages[DEFAULT_LANGUAGE];
  };

  const renderButtons = (tools, cloneUrl) => {
    const selectedTools = tools.
      sort().
      map(toolId => {
        const tool = supportedTools[toolId];
        tool.cloneUrl = getToolboxURN(tool.tag, cloneUrl);
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
  };

  const getSshCloneUrl = links => links.clone.find(link => link.name === 'ssh') || null;

  if (bitbucketMetadata) {
    fetch(`${bitbucketMetadata.api_url}?fields=language,links.clone`).
      then(response => response.json()).
      then(parsedResponse => {
        const tools = selectTools(parsedResponse.language);
        const cloneUrl = getSshCloneUrl(parsedResponse.links);
        renderButtons(tools, cloneUrl);
      }).
      catch(() => { /*Do nothing.*/ });
  }
}
