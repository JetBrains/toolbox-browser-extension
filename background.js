import {getVersion} from './client';
import {getProtocol, saveProtocol} from './common';
import {createExtensionMenu} from './menu';

const INSTALL_TOOLBOX_URL = 'https://www.jetbrains.com/toolbox-app';

const setInstallPopup = () => {
  chrome.browserAction.setIcon({
    path: {128: 'icon-disabled-128.png'}
  });
  chrome.browserAction.setPopup(
    {
      popup: chrome.runtime.getURL('jetbrains-toolbox-install-popup.html')
    }
  );
};

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    getVersion().catch(() => {
      chrome.tabs.create({url: INSTALL_TOOLBOX_URL});
      setInstallPopup();
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      chrome.browserAction.setPopup(
        {
          tabId: sender.tab.id,
          popup: chrome.runtime.getURL(uri)
        }
      );
      break;
    case 'disable-page-action':
      chrome.browserAction.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icon-disabled-128.png'}
      });
      chrome.browserAction.setPopup(
        {
          tabId: sender.tab.id,
          popup: chrome.runtime.getURL('jetbrains-toolbox-disabled-popup.html')
        }
      );
      break;
    case 'install-page-action':
      setInstallPopup();
      break;
    case 'get-protocol':
      getProtocol().then(protocol => {
        sendResponse({protocol});
      });
      return true;
    case 'save-protocol':
      saveProtocol(message.protocol);
      break;
    // no default
  }

  return undefined;
});

createExtensionMenu();
