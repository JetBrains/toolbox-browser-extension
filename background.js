import {
  getProtocol,
  saveProtocol,
  getModifyPages,
  saveModifyPages,
  getLogging,
  saveLogging
} from './api/storage';
import createExtensionMenu from './api/menu';
import logger from './api/consoleLogger';
import {MESSAGES, request, response} from './api/messaging';

const handleInstalled = async () => {
  const allowLogging = await getLogging();
  logger().enable(allowLogging);

  const manifest = chrome.runtime.getManifest();
  const uninstallUrl = `https://www.jetbrains.com/toolbox-app/uninstall/extension/?version=${manifest.version}`;
  chrome.runtime.setUninstallURL(uninstallUrl, () => {
    if (chrome.runtime.lastError) {
      logger().error(`Failed to set uninstall URL: ${chrome.runtime.lastError}`);
    } else {
      logger().info(`Uninstall URL is set to ${uninstallUrl}`);
    }
  });
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
          logger().error(`Failed to set action icon: ${chrome.runtime.lastError}`);
        } else {
          logger().info('Action icon is enabled');
        }
      });
      const {
        project,
        https,
        ssh
      } = message;
      const url = encodeURI(`jetbrains-toolbox-clone-popup.html?project=${project}&https=${https}&ssh=${ssh}`);
      chrome.browserAction.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL(url)
      }, () => {
        if (chrome.runtime.lastError) {
          logger().error(`Failed to set action popup: ${chrome.runtime.lastError}`);
        } else {
          logger().info(`Action popup is enabled and set to ${url}`);
        }
      });
      break;

    case 'disable-page-action':
      chrome.browserAction.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icon-disabled-128.png'}
      }, () => {
        if (chrome.runtime.lastError) {
          logger().error(`Failed to set action icon: ${chrome.runtime.lastError}`);
        } else {
          logger().info('Action icon is disabled');
        }
      });
      chrome.browserAction.setPopup({
        tabId: sender.tab.id,
        popup: chrome.runtime.getURL('jetbrains-toolbox-disabled-popup.html')
      }, () => {
        if (chrome.runtime.lastError) {
          logger().error(`Failed to set action popup: ${chrome.runtime.lastError}`);
        } else {
          logger().info('Action popup is disabled');
        }
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
        sendResponse(response(allow));
      });
      return true;

    case MESSAGES.SAVE_LOGGING:
      const allowLogging = message.value;

      saveLogging(allowLogging).then(() => {
        logger().enable(allowLogging);

        // broadcast the new value to content scripts to toggle the web-logger
        chrome.tabs.query({}, tabs => {
          tabs.forEach(t => {
            chrome.tabs.sendMessage(t.id, request(MESSAGES.TOGGLE_WEB_LOGGER, allowLogging));
          });
        });
      });
      break;

    case MESSAGES.LOG_INFO:
      logger().info(message.value);
      break;

    case MESSAGES.LOG_WARN:
      logger().warn(message.value);
      break;

    case MESSAGES.LOG_ERROR:
      logger().error(message.value);
      break;

    // no default
  }

  return undefined;
};

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);

createExtensionMenu();
