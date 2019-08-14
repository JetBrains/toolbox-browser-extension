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

  const GITLAB_URL_REGEXP = /https:\/\/gitlab.com\/(.+)/;

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
    if (element === null) {
      reject();
    }

    const id = element.textContent.replace('Project ID:', '').trim();
    // noinspection JSUnresolvedVariable
    fetch(`https://gitlab.com/api/v4/projects/${id}`).
      then(r => r.json()).
      then(meta => {
        resolve({
          ssh: meta.ssh_url_to_repo,
          id: meta.id
        });
      });
  });


  const fetchLanguages = meta => new Promise(resolve => {
    fetch(`https://gitlab.com/api/v4/projects/${meta.id}/languages`).then(response => {
      resolve(response.json());
    }).catch(() => {
      resolve(DEFAULT_LANGUAGE_SET);
    });
  });

  const selectTools = languages => {
    const overallPoints = Object.values(languages).reduce((overall, current) => overall + current, 0);

    const filterLang = lang =>
      supportedLanguages[lang.toLowerCase()] && languages[lang] / overallPoints > USAGE_THRESHOLD;

    const selectedTools = Object.keys(languages).filter(filterLang).reduce((acc, lang) => {
      acc.push(...supportedLanguages[lang.toLowerCase()]);
      return acc;
    }, []);

    return selectedTools.length > 0
      ? Array.from(new Set(selectedTools))
      : supportedLanguages[DEFAULT_LANGUAGE];
  };

  const renderButtons = (tools, meta) => {
    const selectedTools = tools.sort().map(toolId => {
      const tool = supportedTools[toolId];
      tool.cloneUrl = getToolboxURN(tool.tag, meta.ssh);
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

  if (GITLAB_URL_REGEXP.test(window.location.href)) {
    fetchMetadata().
      then(meta => fetchLanguages(meta).
        then(selectTools).
        then(tools => renderButtons(tools, meta))).
      catch(() => { /*Do nothing.*/ });
  }
}
