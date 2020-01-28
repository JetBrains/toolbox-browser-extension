import {ENTERPRISE_CONTENT_SCRIPTS} from './common';

(function detectEnterprise() {
  const nameMeta = document.querySelector('meta[property="og:site_name"]') ||
    document.querySelector('meta[name="application-name"]');
  if (nameMeta) {
    const siteName = nameMeta.content;
    if (siteName.startsWith('GitHub')) {
      sendEmitScriptMessage(ENTERPRISE_CONTENT_SCRIPTS.GITHUB);
    } else if (siteName.startsWith('GitLab')) {
      sendEmitScriptMessage(ENTERPRISE_CONTENT_SCRIPTS.GITLAB);
    } else if (siteName.startsWith('Bitbucket')) {
      sendEmitScriptMessage(ENTERPRISE_CONTENT_SCRIPTS.BITBUCKET_STASH);
    }
  }
}());

function sendEmitScriptMessage(contentScript) {
  chrome.runtime.sendMessage({
    type: 'emit-content-script',
    contentScript
  });
}
