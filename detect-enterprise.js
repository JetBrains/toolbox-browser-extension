import toolboxifyGithub from "./providers/github/index.js";
import toolboxifyGitlab from "./gitlab.js";
import toolboxifyBitbucket from "./bitbucket-server.js";

(function detectEnterprise() {
  const nameMeta =
    document.querySelector('meta[property="og:site_name"]') ||
    document.querySelector('meta[name="application-name"]');
  if (nameMeta) {
    const siteName = nameMeta.content;
    if (siteName.startsWith("GitHub")) {
      toolboxifyGithub();
    } else if (siteName.startsWith("GitLab")) {
      toolboxifyGitlab();
    } else if (siteName.startsWith("Bitbucket")) {
      toolboxifyBitbucket();
    }
  }
})();
