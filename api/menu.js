import {normalizeManifestPermissions, queryAdditionalPermissions} from 'webext-permissions';

import {getActiveTabId, setActiveTabId} from './storage.js';

const MENU_ITEM_ID = 'jetbrains-toolbox-toggle-domain';
const DETECT_ENTERPRISE_CONTENT_SCRIPT = 'jetbrains-toolbox-detect-enterprise.js';

function getTabUrl(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: {tabId},
        func: () => window.location.href
      },
      results => {
        if (!chrome.runtime.lastError && results?.length > 0 && results[0] != null) {
          const url = results[0].result;
          resolve(url);
        } else {
          reject();
        }
      }
    );
  });
}

function getDomain(url) {
  const parsedUrl = new URL(url);
  // domain should not include a port number:
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
}

function reloadTab(tabId) {
  chrome.scripting.executeScript(
    {
      target: {tabId},
      func: () => window.location.reload()
    },
    () => chrome.runtime.lastError
  );
}

function createMenu() {
  return new Promise(resolve => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create(
        {
          id: MENU_ITEM_ID,
          type: chrome.contextMenus.ItemType.CHECKBOX,
          title: 'Enable on this domain',
          contexts: [chrome.contextMenus.ContextType.ACTION],
          documentUrlPatterns: ['http://*/*', 'https://*/*']
        },
        () => {
          // eslint-disable-next-line no-void
          void chrome.runtime.lastError;
          resolve();
        }
      );
    });
  });
}

function manifestPermissionGranted(url) {
  try {
    const manifestPermissions = normalizeManifestPermissions();
    const domainMatch = generateDomainMatch(url);
    return manifestPermissions.origins.includes(domainMatch);
  } catch {
    return false;
  }
}

function additionalPermissionGranted(url) {
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

function generateDomainMatch(url) {
  const domain = getDomain(url);
  return `${domain}/*`;
}

function generateDomainPermissions(url) {
  return {
    origins: [generateDomainMatch(url)]
  };
}

function updateMenuItem(updateProperties) {
  chrome.contextMenus.update(MENU_ITEM_ID, {
    type: chrome.contextMenus.ItemType.CHECKBOX,
    ...updateProperties
  }, () => {
    // eslint-disable-next-line no-void
    void chrome.runtime.lastError;
  });
}

function updateMenu(tabId, internalBrowserPage = false) {
  if (internalBrowserPage) {
    updateMenuItem({enabled: false, checked: false});
    return;
  }

  getTabUrl(tabId).
    then(tabUrl => {
      if (manifestPermissionGranted(tabUrl)) {
        updateMenuItem({enabled: false, checked: true});
      } else {
        additionalPermissionGranted(tabUrl).
          then(() => {
            updateMenuItem({enabled: true, checked: true});
          }).
          catch(() => {
            updateMenuItem({enabled: true, checked: false});
          });
      }
    }).
    catch(() => {
      updateMenuItem({enabled: true, checked: false});
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
  if (
    info.menuItemId !== MENU_ITEM_ID ||
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  const requestPermissions = info.checked;
  toggleDomainPermissions(requestPermissions, tab.url).then(() => {
    const domainMatch = generateDomainMatch(tab.url);
    if (requestPermissions) {
      registerEnterpriseContentScripts(domainMatch).then(() => {
        reloadTab(tab.id);
      });
    } else {
      chrome.scripting.unregisterContentScripts({ids: [domainMatch]});
      reloadTab(tab.id);
    }
  }).catch(() => {
    updateMenu(tab.id);
  });
}

function handleTabActivated(activeInfo) {
  setActiveTabId(activeInfo.tabId).then(() => {
    updateMenu(activeInfo.tabId);
  }).catch(() => {
    // do nothing
  });
}

function handleTabUpdated(tabId, changeInfo) {
  getActiveTabId().then(activeTabId => {
    if (activeTabId === tabId && changeInfo.status === 'complete') {
      updateMenu(tabId);
    }
  }).catch(() => {
    // do nothing
  });
}

function registerEnterpriseContentScripts(domainMatch) {
  return new Promise((resolve, reject) => {
    const contentScriptOptions = {
      id: domainMatch,
      matches: [domainMatch],
      js: [DETECT_ENTERPRISE_CONTENT_SCRIPT]
    };
    chrome.scripting.registerContentScripts([contentScriptOptions]).
      then(() => {
        resolve();
      }).
      catch(() => {
        // eslint-disable-next-line no-void
        void chrome.runtime.lastError;
        reject();
      });
  });
}

function registerContentScripts() {
  queryAdditionalPermissions().
    then(permissions => {
      permissions.origins.forEach(domainMatch => {
        registerEnterpriseContentScripts(domainMatch).catch(() => {
          // do nothing
        });
      });
    });
}

export function createExtensionMenu() {
  registerContentScripts();
  createMenu().then(() => {
    // do nothing
  }).catch(() => {
    // do nothing
  });

  chrome.contextMenus.onClicked.addListener(handleMenuItemClick);
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
}
