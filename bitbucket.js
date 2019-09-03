import 'whatwg-fetch';
import {debounce} from 'throttle-debounce';
import bb from 'bitbucket-url-to-object';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  getToolboxNavURN,
  callToolbox,
  DEFAULT_LANGUAGE
} from './common';

const MUTATION_DEBOUNCE_DELAY = 300;

if (!window.hasRun) {
  window.hasRun = true;

  const fetchMetadata = () => new Promise((resolve, reject) => {
    const metadata = bb(window.location.toString());
    if (metadata) {
      fetch(`${metadata.api_url}?fields=links.clone`).
        then(response => response.json()).
        then(parsedResponse => {
          resolve({
            ...metadata,
            links: parsedResponse.links
          });
        }).
        catch(() => {
          reject();
        });
    } else {
      reject();
    }
  });

  const fetchLanguages = bitbucketMetadata => new Promise((resolve, reject) => {
    fetch(`${bitbucketMetadata.api_url}?fields=language`).
      then(response => response.json()).
      then(parsedResponse => {
        resolve(parsedResponse.language);
      }).
      catch(() => {
        reject();
      });
  });

  const selectTools = language => new Promise(resolve => {
    // All languages in Bitbucket match the common list with an exception of HTML
    const normalizedLanguage = language === 'html/css' ? 'html' : language;

    const toolIds = normalizedLanguage && supportedLanguages[normalizedLanguage.toLowerCase()];
    const normalizedToolIds = toolIds && toolIds.length > 0
      ? toolIds
      : supportedLanguages[DEFAULT_LANGUAGE];

    const tools = normalizedToolIds.
      sort().
      map(toolId => supportedTools[toolId]);

    resolve(tools);
  });

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

  const addToolboxActionEventHandler = (domElement, tool, bitbucketMetadata) => {
    domElement.addEventListener('click', e => {
      e.preventDefault();

      const filePathIndex = 5;
      const filePath = location.pathname.split('/').splice(filePathIndex).join('/');
      let lineNumber = location.hash.replace('#lines-', '');
      if (lineNumber === '') {
        lineNumber = null;
      }

      callToolbox(getToolboxNavURN(tool.tag, bitbucketMetadata.repo, filePath, lineNumber));
    });
  };

  const createOpenAction = (bitbucketMetadata, tool, sampleAction) => {
    const tooltip = document.createElement('div');

    tooltip.setAttribute('style', 'background-color:rgb(23,43,77); border-radius:3px;' +
      'box-sizing: border-box; color:#fff; display:none; font-size: 12px; line-height: 15.6px; max-width: 240px;' +
      'padding:2px 6px; position:absolute; transform:translate3d(calc(-100% - 8px),-130%,0);');
    tooltip.textContent = `Open this file in ${tool.name}`;

    const action = sampleAction.cloneNode(true);
    action.classList.add('js-toolbox-open-action');

    const actionButton = action.querySelector('button');
    actionButton.removeAttribute('disabled');

    const TOOLTIP_TIMEOUT = 450;
    actionButton.addEventListener('mouseenter', () => {
      actionButton.setAttribute('style', 'cursor:pointer; background:rgba(9,30,66,0.08);');
      setTimeout(() => {
        tooltip.style.display = 'block';
      }, TOOLTIP_TIMEOUT);
    });
    actionButton.addEventListener('mouseleave', () => {
      actionButton.removeAttribute('style');
      setTimeout(() => {
        tooltip.style.display = 'none';
      }, TOOLTIP_TIMEOUT);
    });

    const actionSpan = actionButton.querySelector('span > span');
    actionSpan.innerHTML =
      `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align:text-bottom">`;

    addToolboxActionEventHandler(actionButton, tool, bitbucketMetadata);

    action.appendChild(tooltip);

    return action;
  };

  const openActionsRendered = () => document.getElementsByClassName('js-toolbox-open-action').length > 0;

  const renderOpenActionsSync = debounce(MUTATION_DEBOUNCE_DELAY, true, (bitbucketMetadata, tools) => {
    if (openActionsRendered()) {
      return;
    }

    const actionAnchorElement =
      document.querySelector('[data-qa="bk-file__actions"] > [data-qa="bk-file__action-button"]');

    if (actionAnchorElement) {
      tools.forEach(tool => {
        const action = createOpenAction(bitbucketMetadata, tool, actionAnchorElement);
        actionAnchorElement.insertAdjacentElement('beforebegin', action);
      });
    }
  });

  const renderOpenActions = (bitbucketMetadata, tools) => new Promise(resolve => {
    renderOpenActionsSync(bitbucketMetadata, tools);
    resolve();
  });

  const startTrackingDOMChanges = (bitbucketMetadata, tools) => new Promise(resolve => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
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
            if (node.matches('.monaco-builder-hidden')) {
              renderOpenActions(bitbucketMetadata, tools);
            }
          }
        }
      }).observe(rootElement, {childList: true, subtree: true});
    }

    resolve();
  });

  const getCloneUrl = (links, which) => {
    const link = links.clone.find(l => l.name === which);
    return link ? link.href : '';
  };

  const getHttpsCloneUrl = links => getCloneUrl(links, 'https');
  const getSshCloneUrl = links => getCloneUrl(links, 'ssh');

  const toolboxify = () => {
    fetchMetadata().
      then(metadata => fetchLanguages(metadata).
        then(selectTools).
        then(tools => renderPopupCloneActions(tools).
          then(() => renderOpenActions(metadata, tools).
            then(() => startTrackingDOMChanges(metadata, tools))
          )
        ).
        then(() => {
          chrome.runtime.sendMessage({
            type: 'enable-page-action',
            project: metadata.repo,
            https: getHttpsCloneUrl(metadata.links),
            ssh: getSshCloneUrl(metadata.links)
          });
        })
      ).
      catch(() => {
        chrome.runtime.sendMessage({type: 'disable-page-action'});
      });
  };

  toolboxify();
}
