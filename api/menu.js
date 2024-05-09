import {normalizeManifestPermissions, queryAdditionalPermissions} from 'webext-permissions';

import {getActiveTabId, setActiveTabId} from './storage.js';

const MENU_ITEM_ID = 'jetbrains-toolbox-toggle-domain';
const DETECT_ENTERPRISE_CONTENT_SCRIPT = 'jetbrains-toolbox-detect-enterprise.js';

const getTabUrl = async (tabId) => {
  const results = await chrome.scripting.executeScript({
    target: {tabId},
    func: () => window.location.href
  });
  if (results?.length > 0 && results[0] != null) {
    return results[0].result;
  }
  throw new Error(`The URL of the tab ${tabId} is not available.`);
};

const getDomain = url => {
  const parsedUrl = new URL(url);
  // domain should not include a port number:
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
};

const reloadTab = tabId => {
  chrome.scripting.executeScript({
    target: {tabId},
    func: () => window.location.reload()
  }).catch(e => {
    console.error(`Failed to reload tab ${tabId} ${e.message}`);
  });
};

const createMenu = async () => {
  await chrome.contextMenus.removeAll();
  await chrome.contextMenus.create({
    id: MENU_ITEM_ID,
    type: chrome.contextMenus.ItemType.CHECKBOX,
    title: 'Enable on this domain',
    contexts: [chrome.contextMenus.ContextType.ACTION],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });
};

const manifestPermissionGranted = url => {
  try {
    const manifestPermissions = normalizeManifestPermissions();
    const domainMatch = generateDomainMatch(url);
    return manifestPermissions.origins.includes(domainMatch);
  } catch (e) {
    console.error(`Failed to check if the permission for URL ${url} is granted ${e.message}`);
    return false;
  }
};

const additionalPermissionGranted = url => {
  const permissions = generateDomainPermissions(url);
  return chrome.permissions.contains(permissions);
};

const generateDomainMatch = url => {
  const domain = getDomain(url);
  return `${domain}/*`;
};

const generateDomainPermissions = url => ({ origins: [generateDomainMatch(url)] });

const updateMenuItem = updateProperties => {
  chrome.contextMenus.update(MENU_ITEM_ID, {
    type: chrome.contextMenus.ItemType.CHECKBOX,
    ...updateProperties
  }).catch(e => {
    console.error(`Failed to update menu item ${e.message}`);
  });
};

const updateMenu = (tabId, internalBrowserPage = false) => {
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
          then(granted => {
            updateMenuItem({enabled: true, checked: granted});
          }).
          catch(e => {
            console.error(`Failed to check if the permission for URL ${tabUrl} is granted ${e.message}`);
            updateMenuItem({enabled: true, checked: false});
          });
      }
    }).
    catch(() => {
      // if the extension is not allowed to access the tab URL,
      // we cannot do anything but stick to the default state.
      // we won't pollute the console with errors in this case.
      updateMenuItem({enabled: true, checked: false});
    });
};

const toggleDomainPermissions = async (request, url) => {
  const permissions = generateDomainPermissions(url);
  const updatePermissions = request ? chrome.permissions.request : chrome.permissions.remove;
  const result = await updatePermissions(permissions);
  if (!result) {
    throw new Error(`Failed to ${request ? 'request' : 'remove'} permissions for ${url}.`);
  }
};

const handleMenuItemClick = (info, tab) => {
  if (
    info.menuItemId !== MENU_ITEM_ID ||
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  const requestPermissions = info.checked;
  toggleDomainPermissions(requestPermissions, tab.url)
    .then(() => {
      const domainMatch = generateDomainMatch(tab.url);
      if (requestPermissions) {
        registerEnterpriseContentScripts(domainMatch)
          .then(() => {
            reloadTab(tab.id);
          })
          .catch(e => {
            console.error(`Failed to register content scripts for ${domainMatch} ${e.message}`);
          });
      } else {
        unregisterEnterpriseContentScripts(domainMatch)
          .then(() => {
            reloadTab(tab.id);
          })
          .catch(e => {
            console.error(`Failed to unregister content scripts for ${domainMatch} ${e.message}`);
          });
      }
    })
    .catch(e => {
      console.error(`Failed to toggle permissions for tab ${tab.id} ${e.message}`);
      updateMenu(tab.id);
    });
};

const handleTabActivated = activeInfo => {
  setActiveTabId(activeInfo.tabId).then(() => {
    updateMenu(activeInfo.tabId);
  });
};

const handleTabUpdated = (tabId, changeInfo) => {
  getActiveTabId().then(activeTabId => {
    if (activeTabId === tabId && changeInfo.status === 'complete') {
      updateMenu(tabId);
    }
  });
};

const registerEnterpriseContentScripts = domainMatch => {
  const contentScriptOptions = {
    id: domainMatch,
    matches: [domainMatch],
    js: [DETECT_ENTERPRISE_CONTENT_SCRIPT]
  };
  return chrome.scripting.registerContentScripts([contentScriptOptions]);
};

const unregisterEnterpriseContentScripts = domainMatch =>
  chrome.scripting.unregisterContentScripts({ids: [domainMatch]});

const registerContentScripts = () => {
  queryAdditionalPermissions()
    .then(permissions => {
      permissions.origins.forEach(domainMatch => {
        registerEnterpriseContentScripts(domainMatch).catch(e => {
          console.error(`Failed to register enterprise content scripts for ${domainMatch} ${e.message}`);
        });
      });
    })
    .catch(e => {
      console.error(`Failed to query additional permissions ${e.message}`);
    });
};

export const createExtensionMenu = () => {
  registerContentScripts();
  createMenu().catch(e => {
    console.error(`Failed to create menu ${e.message}`);
  });

  chrome.contextMenus.onClicked.addListener(handleMenuItemClick);
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
};
