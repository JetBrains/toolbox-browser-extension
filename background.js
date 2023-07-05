import {
  getProtocol,
  saveProtocol,
  getModifyPages,
  saveModifyPages,
  getLogging,
  saveLogging
} from './api/storage';
import createExtensionMenu from './api/menu';
import {enableLogger, info, warn, error} from './api/console-logger';
import {MESSAGES, request, response} from './api/messaging';
import {getInstalledTools, getToolboxAppState, TOOLBOX_APP_STATUS} from './api/toolbox-client';

const INSTALL_TOOLBOX_URL = 'https://www.jetbrains.com/toolbox-app';

class ToolsResponse {
  tools;
  errorMessage;

  constructor(tools, errorMessage = null) {
    this.tools = tools;
    this.errorMessage = errorMessage;
  }
}

const setInstallPopup = () => {
  chrome.browserAction.setIcon({
    path: {128: 'icon-disabled-128.png'}
  });
  chrome.browserAction.setPopup({
    popup: chrome.runtime.getURL('jetbrains-toolbox-install-popup.html')
  });
};

const handleInstalled = async () => {
  const allowLogging = await getLogging();
  enableLogger(allowLogging);

  const manifest = chrome.runtime.getManifest();
  const uninstallUrl = `https://www.jetbrains.com/toolbox-app/uninstall/extension/?version=${manifest.version}`;
  chrome.runtime.setUninstallURL(uninstallUrl, () => {
    if (chrome.runtime.lastError) {
      error(`Failed to set uninstall URL: ${chrome.runtime.lastError}`);
    } else {
      info(`Uninstall URL is set to ${uninstallUrl}`);
    }
  });

  const state = await getToolboxAppState();
  switch (state.status) {
    case TOOLBOX_APP_STATUS.NOT_INSTALLED:
      chrome.tabs.create({url: INSTALL_TOOLBOX_URL});
      setInstallPopup();
      error(state.error.message);
      break;
    case TOOLBOX_APP_STATUS.INSTALLED_ERROR:
      warn('Toolbox App is installed, but errored up', state.error);
      break;
    default:
      info('Toolbox App is installed');
      break;
  }
};

// eslint-disable-next-line complexity
const handleMessage = (message, sender, sendResponse) => {
  switch (message.type) {
    case 'enable-page-action':
      chrome.browserAction.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icon-128.png'}
      }, () => {
        if (chrome.runtime.lastError) {
          error(`Failed to set the page action icon: ${chrome.runtime.lastError}`);
        } else {
          info('The page action icon is set to enabled');
        }
      });
      const {
        project,
        https,
        ssh
      } = message;
      const enabledPopupUrl =
        encodeURI(`jetbrains-toolbox-clone-popup.html?project=${project}&https=${https}&ssh=${ssh}`);
      chrome.browserAction.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL(enabledPopupUrl)
      }, () => {
        if (chrome.runtime.lastError) {
          error(`Failed to set the page action popup: ${chrome.runtime.lastError}`);
        } else {
          info(`The page action popup is set to ${enabledPopupUrl}`);
        }
      });
      break;

    case 'disable-page-action':
      chrome.browserAction.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icon-disabled-128.png'}
      }, () => {
        if (chrome.runtime.lastError) {
          error(`Failed to set the page action icon: ${chrome.runtime.lastError}`);
        } else {
          info('The page action is set to disabled');
        }
      });
      const disabledPopupUrl = encodeURI('jetbrains-toolbox-disabled-popup.html');
      chrome.browserAction.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL(disabledPopupUrl)
      }, () => {
        if (chrome.runtime.lastError) {
          error(`Failed to set the page action popup: ${chrome.runtime.lastError}`);
        } else {
          info(`The page action popup is set to ${disabledPopupUrl}`);
        }
      });
      break;

    case 'get-installed-tools':
      getInstalledTools().
        then(tools => {
          info(`Installed tools are: ${tools}`);
          sendResponse(new ToolsResponse(tools, tools.length === 0 ? 'No tools installed' : null));
        }).
        catch(e => {
          error(`Failed to get installed tools: ${e.message}`);
          sendResponse(new ToolsResponse([], e.message));
        });
      return true;

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
        sendResponse(response(allow));
      });
      return true;

    case MESSAGES.SAVE_LOGGING:
      const allowLogging = message.value;

      saveLogging(allowLogging).then(() => {
        enableLogger(allowLogging);

        // broadcast the new value to content scripts to toggle the web-logger
        chrome.tabs.query({}, tabs => {
          tabs.forEach(t => {
            chrome.tabs.sendMessage(t.id, request(MESSAGES.ENABLE_WEB_LOGGER, allowLogging));
          });
        });
      });
      break;

    case MESSAGES.LOG_INFO:
      info(message.value);
      break;

    case MESSAGES.LOG_WARN:
      warn(message.value);
      break;

    case MESSAGES.LOG_ERROR:
      error(message.value);
      break;

    // no default
  }

  return undefined;
};

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);

createExtensionMenu();
