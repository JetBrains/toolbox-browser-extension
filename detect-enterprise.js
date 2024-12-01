import toolboxifyGithub from "./providers/github/index.js";
import toolboxifyGitlab from "./gitlab.js";
import toolboxifyBitbucket from "./bitbucket-server.js";

(function detectEnterprise() {
  const nameMeta =
    document.querySelector('meta[property="og:site_name"]') ||
    document.querySelector('meta[name="application-name"]');

  if (nameMeta) {
    switch (nameMeta.content) {
      case "GitHub":
        toolboxifyGithub();
        break;
      case "GitLab":
        toolboxifyGitlab();
        break;
      case "Bitbucket":
        toolboxifyBitbucket();
        break;
      case "Gitee":
        // toolboxifyGitee();
        break;
    }
  }
})();
