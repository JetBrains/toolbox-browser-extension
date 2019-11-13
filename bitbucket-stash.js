import 'whatwg-fetch';
import {debounce} from 'throttle-debounce';
import parseBitbucketUrl from 'parse-bitbucket-url';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  getToolboxNavURN,
  getProtocol,
  callToolbox,
  DEFAULT_LANGUAGE,
  CLONE_PROTOCOLS
} from './common';

const MUTATION_DEBOUNCE_DELAY = 150;

if (!window.hasRun) {
  window.hasRun = true;

  const fetchMetadata = () => new Promise((resolve, reject) => {
    const parsedStashUrl = document.querySelector('meta[name=application-name][content=Bitbucket]') &&
      parseBitbucketUrl(window.location.toString());
    if (!parsedStashUrl) {
      reject();
    }
    // normalize metadata
    const metadata = {
      // eslint-disable-next-line camelcase
      api_url: `${location.origin}/rest/api/latest/projects/${parsedStashUrl.owner}/repos/${parsedStashUrl.name}`,
      branch: parsedStashUrl.branch,
      repo: parsedStashUrl.name,
      user: parsedStashUrl.owner
    };
    fetch(metadata.api_url).
      then(response => response.json()).
      then(parsedResponse => {
        metadata.links = {
          clone: parsedResponse.links.clone
        };
        const httpLink = metadata.links.clone.find(l => l.name === 'http');
        if (httpLink) {
          // normalize name
          httpLink.name = 'https';
        }
        resolve(metadata);
      }).
      catch(() => {
        reject();
      });
  });

  const fetchLanguages = () => new Promise(resolve => {
    // don't know how to obtain repo languages in stash
    resolve(DEFAULT_LANGUAGE);
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

  const getCloneUrl = (links, which) => {
    const link = links.clone.find(l => l.name === which);
    return link ? link.href : '';
  };

  const getHttpsCloneUrl = links => getCloneUrl(links, 'https');
  const getSshCloneUrl = links => getCloneUrl(links, 'ssh');

  const addStyleSheet = () => {
    const sheetId = 'toolbox-bitbucket-stash-style';
    if (document.getElementById(sheetId)) {
      return;
    }

    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('id', sheetId);
    styleSheet.textContent = `
      .toolbox-aui-icon {
        background-size: contain;
      }
    `;

    document.head.appendChild(styleSheet);
  };

  /*
  const createButtonTooltip = (button, text) => {
    const tooltip = document.createElement('div');

    tooltip.setAttribute('style', 'background-color:rgb(23,43,77); border-radius:3px;' +
      'box-sizing: border-box; color:#fff; display:none; font-size: 12px; line-height: 15.6px; max-width: 240px;' +
      'padding:2px 6px; position:absolute; transform:translate3d(calc(-100% - 8px),-130%,0);');
    tooltip.textContent = text;

    const TOOLTIP_TIMEOUT = 450;
    button.addEventListener('mouseenter', () => {
      button.setAttribute('style', 'cursor:pointer; background:rgba(9,30,66,0.08);');
      setTimeout(() => {
        tooltip.style.display = 'block';
      }, TOOLTIP_TIMEOUT);
    });
    button.addEventListener('mouseleave', () => {
      button.removeAttribute('style');
      setTimeout(() => {
        tooltip.style.display = 'none';
      }, TOOLTIP_TIMEOUT);
    });

    return tooltip;
  };
  */
  const cloneActionsRendered = () => document.getElementsByClassName('js-toolbox-clone-repo').length > 0;

  const addCloneActionEventHandler = (btn, bitbucketMetadata) => {
    btn.addEventListener('click', e => {
      e.preventDefault();

      const {toolTag} = e.currentTarget.dataset;
      getProtocol().then(protocol => {
        const cloneUrl = protocol === CLONE_PROTOCOLS.HTTPS
          ? getHttpsCloneUrl(bitbucketMetadata.links)
          : getSshCloneUrl(bitbucketMetadata.links);
        const action = getToolboxURN(toolTag, cloneUrl);
        callToolbox(action);
      });
    });
  };

  const createCloneAction = (tool, bitbucketMetadata) => {
    const title = `Clone in ${tool.name}`;
    const action = document.createElement('a');
    action.setAttribute('class', 'aui-nav-item');
    action.setAttribute('href', '#');
    action.setAttribute('original-title', title);
    action.dataset.toolTag = tool.tag;

    const actionIcon = document.createElement('span');
    actionIcon.setAttribute('class', 'aui-icon toolbox-aui-icon');
    actionIcon.setAttribute('style', `background-image:url(${tool.icon})`);

    const actionLabel = document.createElement('span');
    actionLabel.setAttribute('class', 'aui-nav-item-label');
    actionLabel.textContent = title;

    action.appendChild(actionIcon);
    action.appendChild(actionLabel);

    addCloneActionEventHandler(action, bitbucketMetadata);

    return action;
  };

  // eslint-disable-next-line complexity
  const renderCloneActionsSync = debounce(MUTATION_DEBOUNCE_DELAY, false, (tools, bitbucketMetadata) => {
    if (cloneActionsRendered()) {
      return;
    }

    const cloneElement = document.querySelector('.clone-repo');
    if (!cloneElement) {
      return;
    }

    addStyleSheet();

    tools.forEach(tool => {
      const toolboxCloneElement = document.createElement('li');
      toolboxCloneElement.setAttribute('class', 'js-toolbox-clone-repo');

      const action = createCloneAction(tool, bitbucketMetadata);
      toolboxCloneElement.appendChild(action);

      cloneElement.insertAdjacentElement('beforebegin', toolboxCloneElement);
    });
  });

  const removeCloneActions = () => {
    const buttonGroup = document.querySelector('.jt-button-group');
    if (buttonGroup) {
      buttonGroup.parentElement.removeChild(buttonGroup);
    }
  };

  const renderCloneActions = (tools, bitbucketMetadata) => new Promise(resolve => {
    renderCloneActionsSync(tools, bitbucketMetadata);
    resolve();
  });

  const addNavigateActionEventHandler = (domElement, tool, bitbucketMetadata) => {
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

  const createOpenAction = (tool, sampleAction, bitbucketMetadata) => {
    const action = sampleAction.cloneNode(true);
    action.classList.add('js-toolbox-open-action');

    const actionButton = action.querySelector('button');
    actionButton.removeAttribute('disabled');

    const actionSpan = actionButton.querySelector('span > span');
    actionSpan.innerHTML =
      `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align:text-bottom">`;

    addNavigateActionEventHandler(actionButton, tool, bitbucketMetadata);

    // const tooltip = createButtonTooltip(actionButton, `Open this file in ${tool.name}`);
    // action.appendChild(tooltip);

    return action;
  };

  const openActionsRendered = () => document.getElementsByClassName('js-toolbox-open-action').length > 0;

  const renderOpenActionsSync = debounce(MUTATION_DEBOUNCE_DELAY, false, (tools, bitbucketMetadata) => {
    if (openActionsRendered()) {
      return;
    }

    const actionAnchorElement =
      document.querySelector('[data-qa="bk-file__actions"] > [data-qa="bk-file__action-button"]');

    if (actionAnchorElement) {
      tools.forEach(tool => {
        const action = createOpenAction(tool, actionAnchorElement, bitbucketMetadata);
        actionAnchorElement.insertAdjacentElement('beforebegin', action);
      });
    }
  });

  const renderOpenActions = (tools, bitbucketMetadata) => new Promise(resolve => {
    renderOpenActionsSync(tools, bitbucketMetadata);
    resolve();
  });

  const startTrackingDOMChanges = (tools, bitbucketMetadata) => new Promise(resolve => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      // trace navigating to repo source files
      // eslint-disable-next-line complexity
      new MutationObserver(mutations => {
        let cloneButtonRemoved = false;
        for (const mutation of mutations) {
          if (mutation.type !== 'childList') {
            continue;
          }
          if (mutation.removedNodes.length === 1 &&
            mutation.previousSibling &&
            mutation.previousSibling.classList.contains('jt-button-group')) {
            if (mutation.removedNodes[0].textContent === 'Clone') {
              cloneButtonRemoved = true;
            }
          }
          if (mutation.addedNodes.length === 0) {
            continue;
          }
          for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) {
              continue;
            }
            if (node.matches('.monaco-builder-hidden')) {
              renderOpenActionsSync(tools, bitbucketMetadata);
            }
          }
        }
        if (cloneButtonRemoved) {
          removeCloneActions();
        } else {
          renderCloneActionsSync(tools, bitbucketMetadata);
        }
      }).observe(rootElement, {childList: true, subtree: true});
    }

    resolve();
  });

  const toolboxify = () => {
    fetchMetadata().
      then(metadata => fetchLanguages().
        then(selectTools).
        then(tools => renderPopupCloneActions(tools).
          then(() => renderCloneActions(tools, metadata)).
          then(() => renderOpenActions(tools, metadata)).
          then(() => startTrackingDOMChanges(tools, metadata))
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
