chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {hostEquals: 'github.com', schemes: ['https']}
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      },
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {hostEquals: 'gitlab.com', schemes: ['https']}
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      },
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {hostEquals: 'bitbucket.org', schemes: ['https']}
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});
