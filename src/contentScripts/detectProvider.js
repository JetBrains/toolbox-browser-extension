import toolboxifyGithub from "../content/providers/github/toolboxify.js";
import toolboxifyGitlab from "../content/providers/gitlab/toolboxify.js";
import toolboxifyBitbucket from "../content/providers/bitbucket-server.js";

(function detectEnterprise() {
  const nameMeta =
    document.querySelector('meta[property="og:site_name"]') ||
    document.querySelector('meta[name="application-name"]');

  if (nameMeta) {
    switch (nameMeta.content) {
      case "GitHub":
        toolboxifyGithub(true);
        break;
      case "GitLab":
        toolboxifyGitlab(true);
        break;
      case "Bitbucket":
        toolboxifyBitbucket();
        break;
      case "Gitee":
        // toolboxifyGitee(true);
        break;
    }
  }
})();
