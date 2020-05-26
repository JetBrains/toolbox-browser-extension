import {
  getVersion,
  getTools,
  cloneInTool, navigateInTool
} from './clients/toolbox';
import {
  getProtocol,
  saveProtocol
} from './clients/storage';
import {createExtensionMenu} from './clients/menu';
import {RUNTIME_MESSAGES} from './constants';

const INSTALL_TOOLBOX_URL = 'https://www.jetbrains.com/toolbox-app';

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    getVersion().catch(() => {
      chrome.tabs.create({url: INSTALL_TOOLBOX_URL});
    });
  }
});

// eslint-disable-next-line complexity, consistent-return
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case RUNTIME_MESSAGES.ENABLE_PAGE_ACTION:
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
    case RUNTIME_MESSAGES.DISABLE_PAGE_ACTION:
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
    case RUNTIME_MESSAGES.GET_PROTOCOL:
      getProtocol().then(protocol => {
        sendResponse({protocol});
      });
      return true;
    case RUNTIME_MESSAGES.SAVE_PROTOCOL:
      saveProtocol(message.protocol);
      break;
    case RUNTIME_MESSAGES.GET_TOOLS:
      getTools().
        then(tools => {
          sendResponse({tools});
        }).
        catch(error => {
          sendResponse({error});
        });
      return true;
    case RUNTIME_MESSAGES.CLONE_IN_TOOL:
      cloneInTool(message.toolType, message.cloneURL);
      break;
    case RUNTIME_MESSAGES.NAVIGATE_IN_TOOL:
      navigateInTool(message.toolType, message.project, message.filePath, message.lineNumber);
      break;
    // no default
  }
});

createExtensionMenu();
