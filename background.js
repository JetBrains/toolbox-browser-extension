import {
  getProtocol,
  saveProtocol,
  getModifyPages,
  saveModifyPages,
  getLogging,
  saveLogging
} from './api/storage';
import createExtensionMenu from './api/menu';
import ensureLogger from './api/logger';
import {MESSAGES} from './api/messages';

const handleInstalled = () => {
  const manifest = chrome.runtime.getManifest();
  const uninstallUrl = `https://www.jetbrains.com/toolbox-app/uninstall/extension/?version=${manifest.version}`;
  chrome.runtime.setUninstallURL(uninstallUrl, () => {
    // eslint-disable-next-line no-void
    void chrome.runtime.lastError;
  });

  getLogging().then(allowLogging => {
    ensureLogger().enable(allowLogging);
  });
};

// eslint-disable-next-line complexity
const handleMessage = (message, sender, sendResponse) => {
  switch (message.type) {
    case 'enable-page-action':
      chrome.browserAction.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icon-128.png'}
      });
      const {
        project,
        https,
        ssh
      } = message;
      const uri = encodeURI(`jetbrains-toolbox-clone-popup.html?project=${project}&https=${https}&ssh=${ssh}`);
      chrome.browserAction.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL(uri)
      });
      break;

    case 'disable-page-action':
      chrome.browserAction.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icon-disabled-128.png'}
      });
      chrome.browserAction.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL('jetbrains-toolbox-disabled-popup.html')
      });
      break;

    case 'get-protocol':
      getProtocol().then(protocol => {
        sendResponse({protocol});
      });
      return true;

    case 'save-protocol':
      saveProtocol(message.protocol).then(() => {
        // sync options page if it is open
        chrome.runtime.sendMessage({
          type: 'protocol-changed',
          newValue: message.protocol
        });
      });
      break;

    case 'get-modify-pages':
      getModifyPages().then(allow => {
        sendResponse({allow});
      });
      return true;

    case 'save-modify-pages':
      saveModifyPages(message.allow).then(() => {
        chrome.tabs.query({}, tabs => {
          tabs.forEach(t => {
            chrome.tabs.sendMessage(t.id, {
              type: 'modify-pages-changed',
              newValue: message.allow
            });
          });
        });
      });
      break;

    case MESSAGES.GET_LOGGING:
      getLogging().then(allow => {
        sendResponse({allow});
      });
      return true;

    case MESSAGES.SAVE_LOGGING:
      saveLogging(message.value).then(() => {
        // do nothing
      });
      break;

    // no default
  }

  return undefined;
};

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);

createExtensionMenu();
ensureLogger();
