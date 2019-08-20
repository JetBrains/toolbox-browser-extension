chrome.runtime.onMessage.addListener((message, sender) => {
  switch (message.type) {
    case 'enable-page-action':
      chrome.browserAction.setIcon({
        tabId: sender.tab.id,
        path: {128: 'icon-128.png'}
      });
      chrome.browserAction.setPopup(
        {
          tabId: sender.tab.id,
          popup: chrome.runtime.getURL('jetbrains-toolbox-popup.html')
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
    // no default
  }
});
