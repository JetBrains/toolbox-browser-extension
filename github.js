import 'whatwg-fetch';
import gh from 'github-url-to-object';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  USAGE_THRESHOLD,
  HUNDRED_PERCENT,
  MAX_DECIMALS,
  MIN_VALID_HTTP_STATUS,
  MAX_VALID_HTTP_STATUS,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SET
} from './common';

if (!window.hasRun) {
  window.hasRun = true;
  const githubInfo = gh(window.location.toString(), {enterprise: true});

  const selectTools = langs => {
    const overallPoints = Object.
      keys(langs).
      map(lang => langs[lang]).
      reduce((overall, current) => overall + current, 0);

    const filterLang = lang =>
      supportedLanguages[lang.toLowerCase()] && langs[lang] / overallPoints > USAGE_THRESHOLD;

    const selectedTools = Object.keys(langs).filter(filterLang).reduce((acc, lang) => {
      acc.push(...supportedLanguages[lang.toLowerCase()]);
      return acc;
    }, []);

    return selectedTools.length > 0 ? Array.from(new Set(selectedTools)) : supportedLanguages[DEFAULT_LANGUAGE];
  };

  const renderButtons = tools => {
    const cloneUrl = `git@github.com:${githubInfo.user}/${githubInfo.repo}.git`;
    const selectedTools = tools.sort().map(toolId => {
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

  const extractLanguagesFromPage = () => new Promise(resolve => {
    fetch(githubInfo.https_url).then(response => response.text()).then(htmlString => {
      const parser = new DOMParser();
      const htmlDocument = parser.parseFromString(htmlString, 'text/html');
      const langElements = htmlDocument.querySelectorAll('.repository-lang-stats-numbers .lang');
      if (langElements.length === 0) {
        resolve(DEFAULT_LANGUAGE_SET);
      } else {
        const allLangs = Array.from(langElements).reduce((acc, langEl) => {
          const percentEl = langEl.nextElementSibling;
          acc[langEl.textContent] = percentEl ? parseFloat(percentEl.textContent) : USAGE_THRESHOLD + 1;
          return acc;
        }, {});
        resolve(allLangs);
      }
    }).catch(() => {
      resolve(DEFAULT_LANGUAGE_SET);
    });
  });

  const checkStatus = response => {
    if (response.status >= MIN_VALID_HTTP_STATUS && response.status <= MAX_VALID_HTTP_STATUS) {
      return response;
    } else {
      const error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
  };

  const parseResponse = response => new Promise((resolve, reject) => {
    response.json().then(result => {
      if (Object.keys(result).length > 0) {
        resolve(result);
      } else {
        reject();
      }
    }).catch(() => {
      reject();
    });
  });

  const convertBytesToPercents = langs => {
    const totalBytes = Object.keys(langs).reduce((acc, lang) => acc + langs[lang], 0);
    Object.keys(langs).forEach(lang => {
      const percentFloat = langs[lang] / totalBytes * HUNDRED_PERCENT;
      const percentString = percentFloat.toFixed(MAX_DECIMALS);
      langs[lang] = parseFloat(percentString);
    });
    return langs;
  };

  const fetchLanguages = () => {
    const languagesUrl = `${githubInfo.api_url}/languages`;
    return new Promise(resolve => {
      fetch(languagesUrl).then(checkStatus).then(parseResponse).then(convertBytesToPercents).then(langs => {
        resolve(langs);
      }).catch(() => {
        extractLanguagesFromPage().then(langs => {
          resolve(langs);
        });
      });
    });
  };

  if (githubInfo) {
    fetchLanguages().
      then(selectTools).
      then(renderButtons);
  }
}
