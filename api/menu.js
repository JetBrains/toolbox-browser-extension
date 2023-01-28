import 'regenerator-runtime/runtime';
import 'content-scripts-register-polyfill';
import {getManifestPermissions, getAdditionalPermissions} from 'webext-additional-permissions';

import logger from './consoleLogger';

const MENU_ITEM_ID = 'jetbrains-toolbox-toggle-domain';
const DETECT_ENTERPRISE_CONTENT_SCRIPT = 'jetbrains-toolbox-detect-enterprise.js';

const contentScriptUnregistrators = new Map();

let activeTabId = null;

const getTabUrl = tabId => new Promise((resolve, reject) => {
  chrome.tabs.executeScript(tabId, {code: 'window.location.href'}, result => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError);
    } else {
      resolve(result[0]);
    }
  });
});

const getDomain = url => {
  const parsedUrl = new URL(url);
  // domain should not include a port number:
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
};

const reloadTab = tabId => {
  chrome.tabs.executeScript(tabId, {code: 'window.location.reload()'}, () => {
    if (chrome.runtime.lastError) {
      logger().warn(`Failed to reload tab ${tabId}`, chrome.runtime.lastError);
    } else {
      logger().info(`Reloaded tab ${tabId}`);
    }
  });
};

const createMenu = (createProperties = {}) => {
  const contexts = [
    chrome.contextMenus.ContextType.BROWSER_ACTION
  ];
  const documentUrlPatterns = [
    'http://*/*',
    'https://*/*'
  ];
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      logger().warn('Failed to remove the existing menu', chrome.runtime.lastError);
    } else {
      logger().info('Removed the existing menu');
    }

    chrome.contextMenus.create({
      id: MENU_ITEM_ID,
      type: chrome.contextMenus.ItemType.CHECKBOX,
      title: 'Enable on this domain',
      ...createProperties,
      contexts,
      documentUrlPatterns
    }, () => {
      if (chrome.runtime.lastError) {
        logger().warn('Failed to create menu', chrome.runtime.lastError);
      } else {
        logger().info('Created menu');
      }
    });
  });
};

const generateDomainMatch = url => `${getDomain(url)}/*`;

const generateDomainPermissions = url => ({origins: [generateDomainMatch(url)]});

const manifestPermissionGranted = async url => {
  const manifestPermissions = await getManifestPermissions();
  const domainMatch = generateDomainMatch(url);
  return manifestPermissions.origins.includes(domainMatch);
};

const additionalPermissionGranted = url => new Promise((resolve, reject) => {
  const permissions = generateDomainPermissions(url);
  chrome.permissions.contains(permissions, result => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError);
    } else {
      resolve(result);
    }
  });
});

const updateMenuItem = updateProperties => {
  chrome.contextMenus.update(MENU_ITEM_ID, {
    type: chrome.contextMenus.ItemType.CHECKBOX,
    ...updateProperties
  }, () => {
    if (chrome.runtime.lastError) {
      logger().warn(
        `Failed to update menu item ${MENU_ITEM_ID} with new properties: ${JSON.stringify(updateProperties)}`,
        chrome.runtime.lastError,
      );
    } else {
      logger().info(
        `Updated menu item ${MENU_ITEM_ID} with new properties: ${JSON.stringify(updateProperties)}`
      );
    }
  });
};

const updateMenu = tabId => {
  getTabUrl(tabId).
    then(tabUrl => {
      manifestPermissionGranted(tabUrl).
        then(manifestGranted => {
          if (manifestGranted) {
            updateMenuItem({enabled: false, checked: true});
          } else {
            additionalPermissionGranted(tabUrl).
              then(additionalGranted => {
                updateMenuItem({enabled: true, checked: additionalGranted});
              }).
              catch(additionalError => {
                logger().warn(`Failed to check if additional permissions for ${tabUrl} are granted`, additionalError);
                updateMenuItem({enabled: false, checked: false});
              });
          }
        }).
        catch(manifestError => {
          logger().warn(`Failed to check if manifest permissions for ${tabUrl} are granted`, manifestError);

          additionalPermissionGranted(tabUrl).
            then(additionalGranted => {
              updateMenuItem({enabled: true, checked: additionalGranted});
            }).
            catch(additionalError => {
              logger().warn(`Failed to check if additional permissions for ${tabUrl} are granted`, additionalError);
              updateMenuItem({enabled: false, checked: false});
            });
        });
    }).
    catch((/*error*/) => {
      // lots of these errors which is quite obvious, suppress them
      // logger().warn(`Failed to get the URL opened in tab ${tabId}`, error);
      updateMenuItem({enabled: false, checked: false});
    });
};

const toggleDomainPermissions = (request, url) => new Promise((resolve, reject) => {
  const permissions = generateDomainPermissions(url);
  const updatePermissions = request ? chrome.permissions.request : chrome.permissions.remove;
  updatePermissions(permissions, success => {
    if (success) {
      const action = request ? 'Requested' : 'Removed';
      logger().info(`${action} domain permissions for ${url}`);
      resolve();
    } else {
      const action = request ? 'request' : 'remove';
      logger().warn(`Failed to ${action} domain permissions for ${url}`, chrome.runtime.lastError);
      reject();
    }
  });
});

const registerEnterpriseContentScripts = domainMatch => new Promise((resolve, reject) => {
  const contentScriptOptions = {
    matches: [domainMatch],
    js: [
      {file: DETECT_ENTERPRISE_CONTENT_SCRIPT}
    ]
  };
  // implementation of chrome.contentScripts.register doesn't work as expected in FF
  // (returns promise which doesn't resolve soon)
  (window.browser || window.chrome).contentScripts.register(contentScriptOptions).
    then(newUnregistrator => {
      if (contentScriptUnregistrators.has(domainMatch)) {
        const prevUnregistrator = contentScriptUnregistrators.get(domainMatch);
        prevUnregistrator.unregister();
      }
      contentScriptUnregistrators.set(domainMatch, newUnregistrator);
      logger().info(`Registered enterprise content scripts for ${domainMatch}`);
      resolve();
    }).
    catch(() => {
      logger().warn(`Failed to register enterprise content scripts for ${domainMatch}`, chrome.runtime.lastError);
      reject();
    });
});

const unregisterEnterpriseContentScripts = domainMatch => {
  if (contentScriptUnregistrators.has(domainMatch)) {
    const unregistrator = contentScriptUnregistrators.get(domainMatch);
    unregistrator.unregister();

    logger().info(`Unregistered enterprise content scripts for ${domainMatch}`);

    contentScriptUnregistrators.delete(domainMatch);
  } else {
    logger().warn(`Missing the unregistrator of enterprise content scripts for ${domainMatch}`);
  }
};

const handleMenuItemClick = (info, tab) => {
  if (info.menuItemId !== MENU_ITEM_ID) {
    return;
  }

  logger().info(`The ${MENU_ITEM_ID} menu item was clicked`);

  if (tab.url.startsWith('chrome://')) {
    updateMenu(tab.id);
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
      unregisterEnterpriseContentScripts(domainMatch);
      reloadTab(tab.id);
    }
  }).catch(() => {
    updateMenu(tab.id);
  });
};

const handleTabActivated = activeInfo => {
  activeTabId = activeInfo.tabId;
  updateMenu(activeInfo.tabId);
};

const handleTabUpdated = (tabId, changeInfo) => {
  if (activeTabId === tabId && changeInfo.status === 'complete') {
    updateMenu(tabId);
  }
};

const registerContentScripts = () => {
  getAdditionalPermissions().
    then(permissions => {
      permissions.origins.forEach(domainMatch => {
        registerEnterpriseContentScripts(domainMatch).catch(() => {
          // do nothing
        });
      });
    });
};

export default function createExtensionMenu() {
  registerContentScripts();
  createMenu();

  chrome.contextMenus.onClicked.addListener(handleMenuItemClick);
  chrome.tabs.onActivated.addListener(handleTabActivated);
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
}
