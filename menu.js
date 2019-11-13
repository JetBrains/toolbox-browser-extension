import 'regenerator-runtime/runtime';
import 'content-scripts-register-polyfill';
import {getAdditionalPermissions, getManifestPermissions} from 'webext-additional-permissions';

import {getFromStorage, removeFromStorage, saveToStorage} from './storage';

const MENU_ITEM_IDS = {
  PARENT_ID: 'jetbrains-toolbox-toggle-domain-parent',
  DOMAIN_GITHUB_ID: 'jetbrains-toolbox-toggle-domain-github',
  DOMAIN_GITLAB_ID: 'jetbrains-toolbox-toggle-domain-gitlab',
  DOMAIN_BITBUCKET_ID: 'jetbrains-toolbox-toggle-domain-bitbucket'
};

const CONTENT_SCRIPTS = {
  COMMON: 'jetbrains-toolbox-common.js',
  GITHUB: 'jetbrains-toolbox-github.js',
  GITLAB: 'jetbrains-toolbox-gitlab.js',
  BITBUCKET: 'jetbrains-toolbox-bitbucket-stash.js'
};

const CONTENT_SCRIPTS_BY_MENU_ITEM_IDS = {
  [MENU_ITEM_IDS.DOMAIN_GITHUB_ID]: CONTENT_SCRIPTS.GITHUB,
  [MENU_ITEM_IDS.DOMAIN_GITLAB_ID]: CONTENT_SCRIPTS.GITLAB,
  [MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID]: CONTENT_SCRIPTS.BITBUCKET
};

const contentScriptUnregistrators = new Map();

let activeTabId = null;

function getTabUrl(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript(tabId, {
      code: 'window.location.href'
    }, result => {
      if (!chrome.runtime.lastError && result && result.length > 0) {
        const url = result[0];
        resolve(url);
      } else {
        reject();
      }
    });
  });
}

function reloadTab(tabId) {
  chrome.tabs.executeScript(tabId, {
    code: 'window.location.reload()'
  });
}

function createMenu() {
  const contexts = [
    chrome.contextMenus.ContextType.BROWSER_ACTION
  ];
  const documentUrlPatterns = [
    'http://*/*',
    'https://*/*'
  ];

  // keep calm and check the error
  // to not propagate it further
  chrome.contextMenus.remove(MENU_ITEM_IDS.PARENT_ID, () => chrome.runtime.lastError);
  chrome.contextMenus.create({
    id: MENU_ITEM_IDS.PARENT_ID,
    type: chrome.contextMenus.ItemType.NORMAL,
    title: 'Treat this domain as',
    contexts,
    documentUrlPatterns
  });
  chrome.contextMenus.create({
    parentId: MENU_ITEM_IDS.PARENT_ID,
    id: MENU_ITEM_IDS.DOMAIN_GITHUB_ID,
    type: chrome.contextMenus.ItemType.CHECKBOX,
    checked: false,
    title: 'GitHub.com',
    contexts,
    documentUrlPatterns
  });
  chrome.contextMenus.create({
    parentId: MENU_ITEM_IDS.PARENT_ID,
    id: MENU_ITEM_IDS.DOMAIN_GITLAB_ID,
    type: chrome.contextMenus.ItemType.CHECKBOX,
    checked: false,
    title: 'GitLab.com',
    contexts,
    documentUrlPatterns
  });
  chrome.contextMenus.create({
    parentId: MENU_ITEM_IDS.PARENT_ID,
    id: MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID,
    type: chrome.contextMenus.ItemType.CHECKBOX,
    checked: false,
    title: 'Bitbucket.org',
    contexts,
    documentUrlPatterns
  });
}

function domainPermissionGranted(url) {
  return new Promise((resolve, reject) => {
    const permissions = generateDomainPermissions(url);
    chrome.permissions.contains(permissions, result => {
      if (result) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

function getDomain(url) {
  return new URL(url).origin;
}

function generateDomainMatch(url) {
  const domain = getDomain(url);
  return `${domain}/*`;
}

function generateDomainPermissions(url) {
  return {
    origins: [generateDomainMatch(url)]
  };
}

function getContentScriptsByDomains() {
  return new Promise((resolve, reject) => {
    getAdditionalPermissions().
      then(permissions => {
        const additionalGrantedDomains = permissions.origins.map(getDomain);
        getFromStorage(additionalGrantedDomains).then(resolve).catch(reject);
      }).
      catch(reject);
  });
}

function updateMenuItem(id, updateProperties) {
  chrome.contextMenus.update(id, updateProperties);
}

function updateMenu(tabId) {
  Promise.all([getTabUrl(tabId), getManifestPermissions()]).
    then(([tabUrl, manifestPermissions]) => {
      const domain = getDomain(tabUrl);
      const manifestPermissionGranted = manifestPermissions.origins.some(p => p.startsWith(domain));
      updateMenuItem(MENU_ITEM_IDS.PARENT_ID, {enabled: !manifestPermissionGranted});

      if (!manifestPermissionGranted) {
        domainPermissionGranted(tabUrl).
          then(() => {
            getFromStorage(domain).
              then(contentScript => {
                switch (contentScript) {
                  case CONTENT_SCRIPTS.GITHUB:
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITHUB_ID, {checked: true});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITLAB_ID, {checked: false});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID, {checked: false});
                    break;
                  case CONTENT_SCRIPTS.GITLAB:
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITHUB_ID, {checked: false});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITLAB_ID, {checked: true});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID, {checked: false});
                    break;
                  case CONTENT_SCRIPTS.BITBUCKET:
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITHUB_ID, {checked: false});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITLAB_ID, {checked: false});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID, {checked: true});
                    break;
                  default:
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITHUB_ID, {checked: false});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITLAB_ID, {checked: false});
                    updateMenuItem(MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID, {checked: false});
                    break;
                }
              }).
              catch(() => {
                updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITHUB_ID, {checked: false});
                updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITLAB_ID, {checked: false});
                updateMenuItem(MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID, {checked: false});
              });
          }).
          catch(() => {
            updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITHUB_ID, {checked: false});
            updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITLAB_ID, {checked: false});
            updateMenuItem(MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID, {checked: false});
          });
      }
    }).
    catch(() => {
      updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITHUB_ID, {checked: false});
      updateMenuItem(MENU_ITEM_IDS.DOMAIN_GITLAB_ID, {checked: false});
      updateMenuItem(MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID, {checked: false});
    });
}

function toggleDomainPermissions(request, url) {
  return new Promise((resolve, reject) => {
    const permissions = generateDomainPermissions(url);
    const updatePermissions = request ? chrome.permissions.request : chrome.permissions.remove;
    updatePermissions(permissions, success => {
      if (success) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

function handleMenuItemClick(info, tab) {
  if (!tab) {
    return;
  }
  if (info.menuItemId === MENU_ITEM_IDS.DOMAIN_GITHUB_ID ||
    info.menuItemId === MENU_ITEM_IDS.DOMAIN_GITLAB_ID ||
    info.menuItemId === MENU_ITEM_IDS.DOMAIN_BITBUCKET_ID) {
    const requestPermissions = info.checked;
    toggleDomainPermissions(requestPermissions, tab.url).
      then(() => {
        const domain = getDomain(tab.url);
        if (requestPermissions) {
          const domainMatch = generateDomainMatch(domain);
          const contentScriptOptions = {
            matches: [domainMatch],
            js: [
              {file: CONTENT_SCRIPTS.COMMON},
              {file: CONTENT_SCRIPTS_BY_MENU_ITEM_IDS[info.menuItemId]}
            ]
          };
          // implementation of chrome.contentScripts doesn't work as expected in FF
          // eslint-disable-next-line no-undef
          (window.browser || window.chrome).contentScripts.register(contentScriptOptions).
            then(newUnregistrator => {
              const prevUnregistrator = contentScriptUnregistrators.get(domain);
              if (prevUnregistrator) {
                prevUnregistrator.unregister();
              }
              contentScriptUnregistrators.set(domain, newUnregistrator);
              saveToStorage(domain, CONTENT_SCRIPTS_BY_MENU_ITEM_IDS[info.menuItemId]).then(() => {
                reloadTab(tab.id);
              });
            });
        } else {
          const unregistrator = contentScriptUnregistrators.get(domain);
          unregistrator.unregister();
          contentScriptUnregistrators.delete(domain);
          removeFromStorage(domain).then(() => {
            reloadTab(tab.id);
          });
        }
      }).
      catch(() => {
        updateMenuItem(info.menuItemId, {checked: !requestPermissions});
      });
  }
}

function handleTabActivated(activeInfo) {
  activeTabId = activeInfo.tabId;
  updateMenu(activeInfo.tabId);
}

function handleTabUpdated(tabId, changeInfo) {
  if (activeTabId === tabId && changeInfo.status === 'complete') {
    updateMenu(tabId);
  }
}

export function createExtensionMenu() {
  // update menu items according to granted permissions (make checked, disabled, etc.)
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  // request or remove permissions
  chrome.contextMenus.onClicked.addListener(handleMenuItemClick);

  getContentScriptsByDomains().then(result => {
    Object.keys(result).forEach(domain => {
      const domainMatch = generateDomainMatch(domain);
      const unregistrator = chrome.contentScripts.register({
        matches: [domainMatch],
        js: [
          {file: CONTENT_SCRIPTS.COMMON},
          {file: result[domain]}
        ]
      });
      contentScriptUnregistrators.set(domain, unregistrator);
    });
    createMenu();
  });
}
