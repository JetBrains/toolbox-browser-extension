import {
  getProtocol,
  saveProtocol,
  getModifyPages,
  saveModifyPages
} from './api/storage.js';
import {createExtensionMenu} from './api/menu.js';

const handleInstalled = () => {
  const manifest = chrome.runtime.getManifest();
  const uninstallUrl = `https://www.jetbrains.com/toolbox-app/uninstall/extension/?version=${manifest.version}`;
  chrome.runtime.setUninstallURL(uninstallUrl).catch(e => {
    console.error('Failed to set uninstall URL: %s', e.message);
  });

  createExtensionMenu();
};

const handleMessage = (message, sender, sendResponse) => {
  switch (message.type) {
    case 'enable-page-action':
      chrome.action.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icons/icon-128.png'}
      });

      const {
        project,
        https,
        ssh
      } = message;
      const url = encodeURI(`popups/clone.html?project=${project}&https=${https}&ssh=${ssh}`);
      chrome.action.setPopup(
        {
          tabId: sender.tab.id,
          popup: chrome.runtime.getURL(url)
        }
      );
      break;
    case 'disable-page-action':
      chrome.action.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icons/icon-disabled-128.png'}
      });
      chrome.action.setPopup(
        {
          tabId: sender.tab.id,
          popup: chrome.runtime.getURL('popups/disabled.html')
        }
      );
      break;
    case 'get-protocol':
      getProtocol().then(protocol => {
        sendResponse({protocol});
      });
      return true;
    case 'save-protocol':
      saveProtocol(message.protocol).
        then(() => {
          // sync options page if it is open
          chrome.runtime.sendMessage({
            type: 'protocol-changed',
            newValue: message.protocol
          }).catch(() => {
            // do nothing
          });
          chrome.tabs.query({}, tabs => {
            tabs.forEach(t => {
              chrome.tabs.sendMessage(t.id, {
                type: 'protocol-changed',
                newValue: message.protocol
              }).catch(() => {
                // TODO: re-register the content scripts, probably the extension was updated
              });
            });
          });
        }).
        catch(() => {
        // do nothing
        });
      break;
    case 'get-modify-pages':
      getModifyPages().then(allow => {
        sendResponse({allow});
      });
      return true;
    case 'save-modify-pages':
      saveModifyPages(message.allow).
        then(() => {
          chrome.tabs.query({}, tabs => {
            tabs.forEach(t => {
              chrome.tabs.sendMessage(t.id, {
                type: 'modify-pages-changed',
                newValue: message.allow
              }).catch(() => {
                // TODO: re-register the content scripts, probably the extension was updated
              });
            });
          });
        }).
        catch(() => {
          // do nothing
        });
      break;
    // no default
  }

  return undefined;
};

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
