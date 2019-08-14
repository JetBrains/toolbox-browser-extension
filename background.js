chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'enable-page-action') {
    chrome.pageAction.show(sender.tab.id);
  }
});
