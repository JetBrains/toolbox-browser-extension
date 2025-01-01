import {
  ActionMenu,
  getProtocol,
  saveProtocol,
  getModifyPages,
  saveModifyPages,
  isHostPermissionGrantedByManifest,
  isHostPermissionGrantedByUser,
  registerContentScript,
  requestHostPermission,
  revokeHostPermission,
  unregisterContentScript,
} from "../services/index.js";

const actionMenu = new ActionMenu();

const handleInstalled = () => {
  const manifest = chrome.runtime.getManifest();
  void chrome.runtime.setUninstallURL(
    `https://www.jetbrains.com/toolbox-app/uninstall/extension/?version=${manifest.version}`,
  );

  actionMenu.create(handleMenuCheckedChanged);
};

const handleMenuCheckedChanged = async (checked, url) => {
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:")
  ) {
    // internal browser pages, do nothing
    actionMenu.update({ checked: !checked });
    return;
  }

  if (checked) {
    try {
      if (await requestHostPermission(url)) {
        await registerContentScript(url);
        await reloadActiveTab();
      } else {
        // revert the menu state
        actionMenu.update({ checked: false });
      }
    } catch (error) {
      console.error(error);
    }
  } else {
    try {
      if (await revokeHostPermission(url)) {
        await unregisterContentScript(url);
        await reloadActiveTab();
      } else {
        // revert the menu state
        actionMenu.update({ checked: true });
      }
    } catch (error) {
      console.error(error);
    }
  }
};

const handleMessage = (message, sender, sendResponse) => {
  switch (message.type) {
    case "enable-page-action":
      chrome.action.setIcon({
        tabId: sender.tab.id,
        path: { 128: "icons/icon-128.png" },
      });

      const { project, https, ssh } = message;
      const url = encodeURI(`popups/clone.html?project=${project}&https=${https}&ssh=${ssh}`);
      chrome.action.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL(url),
      });
      break;
    case "disable-page-action":
      chrome.action.setIcon({
        tabId: sender.tab.id,
        path: { 128: "icons/icon-disabled-128.png" },
      });
      chrome.action.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL("popups/disabled.html"),
      });
      break;
    case "get-protocol":
      getProtocol().then((protocol) => {
        sendResponse({ protocol });
      });
      return true;
    case "save-protocol":
      saveProtocol(message.protocol)
        .then(() => {
          // sync options page if it is open
          chrome.runtime
            .sendMessage({
              type: "protocol-changed",
              newValue: message.protocol,
            })
            .catch(() => {
              // do nothing
            });
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((t) => {
              chrome.tabs
                .sendMessage(t.id, {
                  type: "protocol-changed",
                  newValue: message.protocol,
                })
                .catch(() => {
                  // TODO: re-register the content scripts, probably the extension was updated
                });
            });
          });
        })
        .catch(() => {
          // do nothing
        });
      break;
    case "get-modify-pages":
      getModifyPages().then((allow) => {
        sendResponse({ allow });
      });
      return true;
    case "save-modify-pages":
      saveModifyPages(message.allow)
        .then(() => {
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((t) => {
              chrome.tabs
                .sendMessage(t.id, {
                  type: "modify-pages-changed",
                  newValue: message.allow,
                })
                .catch(() => {
                  // TODO: re-register the content scripts, probably the extension was updated
                });
            });
          });
        })
        .catch(() => {
          // do nothing
        });
      break;
    // no default
  }

  return undefined;
};

const handleTabUpdated = async (tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    await updateActionMenu(tab.url);
  }
};

const handleTabActivated = async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await updateActionMenu(tab.url);
};

const updateActionMenu = async (url) => {
  if (!url) {
    // no permission granted, enable and uncheck the menu
    actionMenu.update({ enabled: true, checked: false });
    return;
  }
  if (isHostPermissionGrantedByManifest(url)) {
    // permission granted by manifest, disable and check the menu
    actionMenu.update({ enabled: false, checked: true });
  } else if (await isHostPermissionGrantedByUser(url)) {
    // permission granted by user, enable and check the menu
    actionMenu.update({ enabled: true, checked: true });
  }
};

const reloadActiveTab = async () => {
  const queriedTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = queriedTabs.length > 0 ? queriedTabs[0] : null;
  if (activeTab) {
    await chrome.tabs.reload(activeTab.id);
  }
};

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onActivated.addListener(handleTabActivated);
