import 'whatwg-fetch';
import gh from 'github-url-to-object';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  getToolboxNavURN,
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

  const fetchMetadata = () => new Promise((resolve, reject) => {
    const metadata = gh(window.location.toString(), {enterprise: true});
    if (metadata) {
      resolve(metadata);
    } else {
      reject();
    }
  });

  const checkResponseStatus = response => new Promise((resolve, reject) => {
    if (response.status >= MIN_VALID_HTTP_STATUS && response.status <= MAX_VALID_HTTP_STATUS) {
      resolve(response);
    } else {
      reject();
    }
  });

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

  const convertBytesToPercents = languages => new Promise(resolve => {
    const totalBytes = Object.
      values(languages).
      reduce((total, bytes) => total + bytes, 0);

    Object.
      keys(languages).
      forEach(key => {
        const percentFloat = languages[key] / totalBytes * HUNDRED_PERCENT;
        const percentString = percentFloat.toFixed(MAX_DECIMALS);
        languages[key] = parseFloat(percentString);
      });

    resolve(languages);
  });

  const extractLanguagesFromPage = githubMetadata => new Promise(resolve => {
    fetch(githubMetadata.https_url).
      then(response => response.text()).
      then(htmlString => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(htmlString, 'text/html');
        const languageElements = htmlDocument.querySelectorAll('.repository-lang-stats-numbers .lang');
        if (languageElements.length === 0) {
          resolve(DEFAULT_LANGUAGE_SET);
        } else {
          const allLanguages = Array.from(languageElements).reduce((acc, el) => {
            const percentEl = el.nextElementSibling;
            acc[el.textContent] = percentEl ? parseFloat(percentEl.textContent) : USAGE_THRESHOLD + 1;
            return acc;
          }, {});
          resolve(allLanguages);
        }
      }).
      catch(() => {
        resolve(DEFAULT_LANGUAGE_SET);
      });
  });

  const fetchLanguages = githubMetadata => new Promise(resolve => {
    fetch(`${githubMetadata.api_url}/languages`).
      then(checkResponseStatus).
      then(parseResponse).
      then(convertBytesToPercents).
      then(languages => {
        resolve(languages);
      }).
      catch(() => {
        extractLanguagesFromPage().
          then(languages => {
            resolve(languages);
          });
      });
  });

  const selectTools = languages => new Promise(resolve => {
    const overallPoints = Object.
      values(languages).
      reduce((overall, current) => overall + current, 0);

    const filterLang = language =>
      supportedLanguages[language.toLowerCase()] && languages[language] / overallPoints > USAGE_THRESHOLD;

    const selectedTools = Object.
      keys(languages).
      filter(filterLang).
      reduce((acc, key) => {
        acc.push(...supportedLanguages[key.toLowerCase()]);
        return acc;
      }, []);

    const result = selectedTools.length > 0
      ? Array.from(new Set(selectedTools))
      : supportedLanguages[DEFAULT_LANGUAGE];

    resolve(result);
  });

  const createContextMenuItem = (githubMetadata, tool, firstItem) => {
    const {user, repo, branch} = githubMetadata;
    const normalizedBranch = branch.split('/').shift();
    const filePath = location.pathname.replace(`/${user}/${repo}/blob/${normalizedBranch}/`, '');
    const lineNumber = location.hash.replace('#L', '');
    const navUrl = getToolboxNavURN(tool.tag, repo, filePath, lineNumber);

    const menuItem = document.createElement('a');
    menuItem.setAttribute('class', 'dropdown-item');
    menuItem.setAttribute('role', 'menu-item');
    menuItem.setAttribute('href', navUrl);
    if (firstItem) {
      menuItem.style.borderTop = '1px solid #eaecef';
    }
    menuItem.textContent = `Open in ${tool.name}`;

    menuItem.addEventListener('click', () => {
      const blobToolbar = document.querySelector('.BlobToolbar');
      if (blobToolbar) {
        blobToolbar.removeAttribute('open');
      }
    });

    const menuItemContainer = document.createElement('li');
    menuItemContainer.appendChild(menuItem);

    return menuItemContainer;
  };

  const renderActions = (githubMetadata, tools) => new Promise(resolve => {
    const cloneUrl = `${githubMetadata.clone_url}.git`;
    const sshUrl = `git@github.com:${githubMetadata.user}/${githubMetadata.repo}.git`;
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
        // no default
      }
    });

    // eslint-disable-next-line complexity
    document.body.addEventListener('click', e => {
      const clickedElement = e.target;
      if (
        (clickedElement.tagName === 'path' && clickedElement.parentElement.classList.contains('octicon')) ||
        (clickedElement.tagName === 'svg' && clickedElement.parentElement.classList.contains('btn-octicon')) ||
        (clickedElement.tagName === 'SUMMARY' && clickedElement.parentElement.classList.contains('BlobToolbar'))
      ) {
        const blobToolbarDropdown = document.querySelector('.BlobToolbar-dropdown');
        const prevItemIndices = blobToolbarDropdown.dataset.toolboxItemIndices
          ? JSON.parse(blobToolbarDropdown.dataset.toolboxItemIndices)
          : [];
        const nextItemIndices = [...prevItemIndices];
        selectedTools.forEach((tool, toolIndex) => {
          const menuItem = createContextMenuItem(githubMetadata, tool, toolIndex === 0);
          const idx = prevItemIndices.length === 0 ? null : prevItemIndices.shift();
          if (idx === null) {
            nextItemIndices.push(blobToolbarDropdown.childElementCount);
            blobToolbarDropdown.appendChild(menuItem);
          } else {
            blobToolbarDropdown.replaceChild(menuItem, blobToolbarDropdown.children[idx]);
          }
        });
        blobToolbarDropdown.dataset.toolboxItemIndices = JSON.stringify(nextItemIndices);
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
