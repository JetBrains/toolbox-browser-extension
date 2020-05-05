import toolboxifyGithub from './github';
import toolboxifyGitlab from './gitlab';
import toolboxifyBitbucket from './bitbucket-server';
import toolboxifyGitea from './gitea';

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
    } else if (siteName.includes('Gitea')) {
      toolboxifyGitea();
    }
  }
}());
