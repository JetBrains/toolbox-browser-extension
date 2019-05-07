import 'whatwg-fetch';

import {
  getToolboxURN,
  supportedLanguages,
  supportedTools
} from './common';

let styleSheetAdded = false;
let addingButtons = false;

function selectTools(language) {
  // All languages in Bitbucket match the common list with an exception of HTML
  if (language === 'html/css') {
    language = 'html';
  }

  const selectedToolIds = language && supportedLanguages[language.toLowerCase()];
  return selectedToolIds.length ? selectedToolIds : ['idea'];
}

function configureStyleSheet(fileName) {
  if (!styleSheetAdded) {
    const styleSheet = document.createElement("style");
    // language=CSS
    styleSheet.innerHTML = `
      .jt-button {
        margin: 0 2px;
      }

      .jt-button:hover {
        background: rgba(9, 30, 66, 0.08);
        cursor: pointer;
      }

      .jt-button img {
        align-self: center;
        width: 20px;
        height: 20px;
      }
    `;

    document.head.appendChild(styleSheet);
    styleSheetAdded = true;
  }
}

function renderButtons(tools, cloneCheckoutButton, cloneUrl) {
  configureStyleSheet();

  const buttonGroup = document.createElement('div');

  tools
    .map(toolId => supportedTools[toolId])
    .forEach(tool => {
      const btn = document.createElement('a');
      btn.setAttribute('class', `${cloneCheckoutButton.className} jt-button`);
      btn.setAttribute('href', getToolboxURN(tool.tag, cloneUrl));
      btn.setAttribute('title', `Open in ${tool.name}`);
      btn.innerHTML = `<img alt="${tool.name}" src="${tool.icon}">`;

      buttonGroup.appendChild(btn);
    });

  const item = cloneCheckoutButton.parentNode;
  item.parentNode.insertBefore(buttonGroup, item.nextSibling);
}

function getSshCloneUrl(links) {
  for (const link of links.clone) {
    if (link.name === 'ssh') {
      return link.href;
    }
  }
  return null;
}

function handleUiChange() {
  if (addingButtons || document.getElementsByClassName('jt-button').length) {
    // Buttons are being added or already exist in the DOM
    return;
  }

  const fullSlug = window.location.pathname.match(/^\/([^/]+\/[^/]+)\/src\//);
  const cloneCheckoutButton = document.querySelector('[data-qa="page-header-wrapper"] [class*="ActionsWrapper"] [type="button"]:not([aria-expanded])');

  if (fullSlug && cloneCheckoutButton) {
    addingButtons = true;
    const metadataUrl = `${window.location.origin}/!api/2.0/repositories/${fullSlug[1]}?fields=language,links.clone`;

    fetch(metadataUrl)
      .then(response => response.json())
      .then(rs => {
        const tools = selectTools(rs.language);
        const cloneUrl = getSshCloneUrl(rs.links);
        renderButtons(tools, cloneCheckoutButton, cloneUrl);
      })
      .catch(() => { /*Do nothing.*/ })
      .finally(() => addingButtons = false);
  }
}

function run() {
  const pageContent = document.querySelector('[class*="PageContent"]');

  if (pageContent) {
    // Set up mutation observer to deal with SPA navigation
    new MutationObserver(function () {
      handleUiChange();
    }).observe(pageContent, {childList: true, subtree: true});
  }

  // Call it once no matter if we were able to set up mutation observer or not
  handleUiChange();
}

// Wait for the UI to load completely
document.addEventListener('readystatechange', function onReadyStateChange() {
  if (document.readyState === "complete") {
    run();
  }
}, false);
