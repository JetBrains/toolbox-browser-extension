/** @author Johannes Tegnér <johannes@jitesoft.com> */
import 'whatwg-fetch';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  USAGE_THRESHOLD,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SET
} from './common';

if (!window.hasRun) {
  window.hasRun = true;

  const fetchMetadata = () => new Promise((resolve, reject) => {
    let element = null;
    const {children} = document.querySelector('.home-panel-metadata') || {children: []};

    for (let i = children.length; i-- > 0;) {
      // eslint-disable-next-line no-magic-numbers
      if (children[i].textContent.indexOf('Project ID') !== -1) {
        element = children[i];
        break;
      }
    }
    if (element) {
      const id = element.textContent.replace('Project ID:', '').trim();
      // noinspection JSUnresolvedVariable
      fetch(`https://gitlab.com/api/v4/projects/${id}`).
        then(r => r.json()).
        then(meta => {
          resolve({
            ssh: meta.ssh_url_to_repo,
            https: meta.http_url_to_repo,
            id: meta.id
          });
        });
    } else {
      reject();
    }
  });

  const fetchLanguages = gitlabMetadata => new Promise(resolve => {
    fetch(`https://gitlab.com/api/v4/projects/${gitlabMetadata.id}/languages`).then(response => {
      resolve(response.json());
    }).catch(() => {
      resolve(DEFAULT_LANGUAGE_SET);
    });
  });

  const selectTools = languages => new Promise(resolve => {
    const overallPoints = Object.values(languages).reduce((overall, current) => overall + current, 0);

    const filterLang = language =>
      supportedLanguages[language.toLowerCase()] && languages[language] / overallPoints > USAGE_THRESHOLD;

    const selectedTools = Object.keys(languages).filter(filterLang).reduce((acc, key) => {
      acc.push(...supportedLanguages[key.toLowerCase()]);
      return acc;
    }, []);

    const result = selectedTools.length > 0
      ? Array.from(new Set(selectedTools))
      : supportedLanguages[DEFAULT_LANGUAGE];

    resolve(result);
  });

  const renderActions = (gitlabMetadata, tools) => new Promise(resolve => {
    const selectedTools = tools.sort().map(toolId => {
      const tool = supportedTools[toolId];
      tool.cloneUrl = getToolboxURN(tool.tag, gitlabMetadata.https);
      tool.sshUrl = getToolboxURN(tool.tag, gitlabMetadata.ssh);
      return tool;
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'get-tools':
          sendResponse(selectedTools);
          break;
        // no default
      }
    });

    resolve();
  });

  fetchMetadata().
    then(metadata => fetchLanguages(metadata).
      then(selectTools).
      then(tools => renderActions(metadata, tools)).
      then(() => {
        chrome.runtime.sendMessage({type: 'enable-page-action'});
      })).
    catch(() => {
      chrome.runtime.sendMessage({type: 'disable-page-action'});
    });
}
