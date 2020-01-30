import {ENTERPRISE_CONTENT_SCRIPTS} from './common';
import toolboxifyGithub from './github';
import toolboxifyGitlab from './gitlab';
import toolboxifyBitbucket from './bitbucket';

(function detectEnterprise() {
  const nameMeta = document.querySelector('meta[property="og:site_name"]') ||
    document.querySelector('meta[name="application-name"]');
  if (nameMeta) {
    const siteName = nameMeta.content;
    if (siteName.startsWith('GitHub')) {
      toolboxifyGithub();
    } else if (siteName.startsWith('GitLab')) {
      toolboxifyGitlab();
    } else if (siteName.startsWith('Bitbucket')) {
      toolboxifyBitbucket();
    }
  }
}());

function sendEmitScriptMessage(contentScript) {
  chrome.runtime.sendMessage({
    type: 'emit-content-script',
    contentScript
  });
}
