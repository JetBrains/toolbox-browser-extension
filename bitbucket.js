import {debounce} from 'throttle-debounce';
import 'whatwg-fetch';

import {
  DEFAULT_LANGUAGE,
  getToolboxURN,
  supportedLanguages,
  supportedTools
} from './common';

const MUTATION_DEBOUNCE_DELAY = 300;

function selectTools(language) {
  // All languages in Bitbucket match the common list with an exception of HTML
  const lang = language === 'html/css' ? 'html' : language;

  const selectedTools = lang && supportedLanguages[lang.toLowerCase()];
  return selectedTools && selectedTools.length > 0 ? selectedTools : supportedLanguages[DEFAULT_LANGUAGE];
}

function configureStyleSheet() {
  const styleId = 'jt-bitbucket-style';
  if (document.getElementById(styleId)) {
    return;
  }

  const styleSheet = document.createElement('style');
  styleSheet.id = styleId;
  // language=CSS
  styleSheet.innerHTML = `
    .jt-button-group {
      margin: 0 2px;
    }

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
}

function buttonsShown() {
  return !!document.getElementsByClassName('jt-button').length;
}

function renderButtons(tools, cloneCheckoutButton, cloneUrl) {
  if (buttonsShown()) {
    return;
  }

  configureStyleSheet();

  const buttonGroup = document.createElement('div');
  buttonGroup.setAttribute('class', 'jt-button-group');

  tools.
    sort().
    map(toolId => supportedTools[toolId]).
    forEach(tool => {
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

const handleUiChange = debounce(MUTATION_DEBOUNCE_DELAY, () => {
  if (buttonsShown()) {
    return;
  }

  const fullSlug = window.location.pathname.match(/^\/([^/]+\/[^/]+)\/src\//);
  const cloneCheckoutButton = document.querySelector('[data-qa="page-header-wrapper"] button[type="button"]');

  if (fullSlug && cloneCheckoutButton) {
    const metadataUrl = `${window.location.origin}/!api/2.0/repositories/${fullSlug[1]}?fields=language,links.clone`;

    fetch(metadataUrl).
      then(response => response.json()).
      then(rs => {
        const tools = selectTools(rs.language);
        const cloneUrl = getSshCloneUrl(rs.links);
        renderButtons(tools, cloneCheckoutButton, cloneUrl);
      }).
      catch(() => { /*Do nothing.*/ });
  }
});

function run() {
  const pageContent = document.querySelector('[class*="PageContent"]');

  if (pageContent) {
    // Set up mutation observer to deal with SPA navigation
    new MutationObserver(handleUiChange).
      observe(pageContent, {childList: true, subtree: true});
  }

  // Call it once no matter if we were able to set up mutation observer or not
  handleUiChange();
}

// Wait for the UI to load completely
document.addEventListener('readystatechange', function onReadyStateChange() {
  if (document.readyState === 'complete') {
    run();
  }
}, false);
