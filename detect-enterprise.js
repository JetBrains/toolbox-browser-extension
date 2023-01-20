import toolboxifyGithub from './github';
import toolboxifyGitlab from './gitlab';
import toolboxifyBitbucket from './bitbucket-server';
import {MESSAGES, request} from './api/messaging';

(function detectEnterprise() {
  const nameMeta = document.querySelector('meta[property="og:site_name"]') ||
    document.querySelector('meta[name="application-name"]');

  if (nameMeta) {
    const siteName = nameMeta.content;
    if (siteName.startsWith('GitHub')) {
      chrome.runtime.sendMessage(request(MESSAGES.LOG_INFO, 'Detected enterprise version of GitHub'));
      toolboxifyGithub();
    } else if (siteName.startsWith('GitLab')) {
      chrome.runtime.sendMessage(request(MESSAGES.LOG_INFO, 'Detected enterprise version of GitLab'));
      toolboxifyGitlab();
    } else if (siteName.startsWith('Bitbucket')) {
      chrome.runtime.sendMessage(request(MESSAGES.LOG_INFO, 'Detected enterprise version of Bitbucket'));
      toolboxifyBitbucket();
    } else {
      chrome.runtime.sendMessage(request(MESSAGES.LOG_WARN, `Detected unknown enterprise version: '${siteName}'`));
    }
  } else {
    chrome.runtime.sendMessage(request(MESSAGES.LOG_INFO, 'Enterprise version is not detected'));
  }
}());
