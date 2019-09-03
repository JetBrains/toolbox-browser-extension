import 'whatwg-fetch';
import gh from 'github-url-to-object';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  getToolboxNavURN,
  callToolbox,
  USAGE_THRESHOLD,
  HUNDRED_PERCENT,
  MAX_DECIMALS,
  MIN_VALID_HTTP_STATUS,
  MAX_VALID_HTTP_STATUS,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE_SET, getProtocol, CLONE_PROTOCOLS
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
      then(resolve).
      catch(() => {
        extractLanguagesFromPage(githubMetadata).
          then(resolve);
      });
  });

  const selectTools = languages => new Promise(resolve => {
    const overallPoints = Object.
      values(languages).
      reduce((overall, current) => overall + current, 0);

    const filterLang = language =>
      supportedLanguages[language.toLowerCase()] && languages[language] / overallPoints > USAGE_THRESHOLD;

    const selectedToolIds = Object.
      keys(languages).
      filter(filterLang).
      reduce((acc, key) => {
        acc.push(...supportedLanguages[key.toLowerCase()]);
        return acc;
      }, []);

    const normalizedToolIds = selectedToolIds.length > 0
      ? Array.from(new Set(selectedToolIds))
      : supportedLanguages[DEFAULT_LANGUAGE];

    const tools = normalizedToolIds.
      sort().
      map(toolId => supportedTools[toolId]);

    resolve(tools);
  });

  const getHttpsCloneUrl = githubMetadata => `${githubMetadata.clone_url}.git`;
  const getSshCloneUrl = githubMetadata => `git@github.com:${githubMetadata.user}/${githubMetadata.repo}.git`;

  const renderPopupCloneActions = tools => new Promise(resolve => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'get-tools':
          sendResponse(tools);
          break;
        case 'perform-action':
          const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
          callToolbox(toolboxAction);
          break;
        // no default
      }
    });

    resolve();
  });

  const renderCloneActions = (githubMetadata, tools) => new Promise(resolve => {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('BtnGroup');

    tools.
      forEach(tool => {
        const btn = document.createElement('a');
        btn.setAttribute('class', 'btn btn-sm tooltipped tooltipped-s tooltipped-multiline BtnGroup-item');
        btn.setAttribute('href', '#');
        btn.setAttribute('aria-label', `Clone in ${tool.name}`);
        btn.dataset.toolTag = tool.tag;
        btn.innerHTML =
          `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align: text-top;">`;
        btn.addEventListener('click', e => {
          e.preventDefault();

          const {toolTag} = e.currentTarget.dataset;
          getProtocol().then(protocol => {
            const cloneUrl =
              protocol === CLONE_PROTOCOLS.HTTPS ? getHttpsCloneUrl(githubMetadata) : getSshCloneUrl(githubMetadata);
            const action = getToolboxURN(toolTag, cloneUrl);

            callToolbox(action);
          });
        });

        buttonGroup.appendChild(btn);
      });

    const getRepoSelectMenu = document.querySelector('.js-get-repo-select-menu');
    getRepoSelectMenu.insertAdjacentElement('beforebegin', buttonGroup);

    resolve();
  });

  const addToolboxActionEventHandler = (domElement, tool, githubMetadata) => {
    domElement.addEventListener('click', e => {
      e.preventDefault();

      const {user, repo, branch} = githubMetadata;
      const normalizedBranch = branch.split('/').shift();
      const filePath = location.pathname.replace(`/${user}/${repo}/blob/${normalizedBranch}/`, '');
      let lineNumber = location.hash.replace('#L', '');
      if (lineNumber === '') {
        lineNumber = null;
      }

      callToolbox(getToolboxNavURN(tool.tag, repo, filePath, lineNumber));
    });
  };

  const createOpenAction = (githubMetadata, tool) => {
    const action = document.createElement('a');
    action.setAttribute('class', 'btn-octicon tooltipped tooltipped-nw');
    action.setAttribute('aria-label', `Open this file in ${tool.name}`);
    action.setAttribute('href', '#');
    action.innerHTML = `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16">`;

    addToolboxActionEventHandler(action, tool, githubMetadata);

    return action;
  };

  const createOpenMenuItem = (githubMetadata, tool, first) => {
    const menuItem = document.createElement('a');
    menuItem.setAttribute('class', 'dropdown-item');
    menuItem.setAttribute('role', 'menu-item');
    menuItem.setAttribute('href', '#');
    if (first) {
      menuItem.style.borderTop = '1px solid #eaecef';
    }
    menuItem.textContent = `Open in ${tool.name}`;

    addToolboxActionEventHandler(menuItem, tool, githubMetadata);
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

  const renderOpenActions = (githubMetadata, tools) => new Promise(resolve => {
    const actionAnchorElement =
      document.querySelector('.repository-content .Box-header .BtnGroup + div > .btn-octicon');

    if (actionAnchorElement) {
      tools.forEach(tool => {
        const action = createOpenAction(githubMetadata, tool);
        actionAnchorElement.insertAdjacentElement('beforebegin', action);
      });
    }

    // eslint-disable-next-line complexity
    document.body.addEventListener('click', e => {
      const clickedElement = e.target;
      if (
        (clickedElement.tagName === 'path' && clickedElement.parentElement.classList.contains('octicon')) ||
        (clickedElement.tagName === 'svg' && clickedElement.parentElement.classList.contains('btn-octicon')) ||
        (clickedElement.tagName === 'SUMMARY' && clickedElement.parentElement.classList.contains('BlobToolbar'))
      ) {
        const blobToolbarDropdown = document.querySelector('.BlobToolbar-dropdown');
        if (blobToolbarDropdown.dataset.toolboxified == null) {
          tools.forEach((tool, toolIndex) => {
            const menuItem = createOpenMenuItem(githubMetadata, tool, toolIndex === 0);
            blobToolbarDropdown.appendChild(menuItem);
          });
        }
        blobToolbarDropdown.dataset.toolboxified = 'true';
      }
    });

    resolve();
  });

  const startTrackingDOMChanges = (githubMetadata, tools) => new Promise(resolve => {
    const applicationMainElement = document.querySelector('.application-main');
    if (applicationMainElement) {
      // trace navigating to repo source files
      new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
            continue;
          }
          for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) {
              continue;
            }
            if (node.matches('.new-discussion-timeline')) {
              renderOpenActions(githubMetadata, tools);
            }
          }
        }
      }).observe(applicationMainElement, {childList: true, subtree: true});
    }

    resolve();
  });

  const toolboxify = () => {
    fetchMetadata().
      then(metadata => fetchLanguages(metadata).
        then(selectTools).
        then(tools => renderPopupCloneActions(tools).
          then(() => renderCloneActions(metadata, tools)).
          then(() => renderOpenActions(metadata, tools)).
          then(() => startTrackingDOMChanges(metadata, tools))
        ).
        then(() => {
          chrome.runtime.sendMessage({
            type: 'enable-page-action',
            project: metadata.repo,
            https: getHttpsCloneUrl(metadata),
            ssh: getSshCloneUrl(metadata)
          });
        })
      ).
      catch(() => {
        chrome.runtime.sendMessage({type: 'disable-page-action'});
      });
  };

  toolboxify();
}
