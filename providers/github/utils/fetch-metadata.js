import gh from "github-url-to-object";
import GitHubMetadata from "../github-metadata.js";

export const fetchMetadata = (isEnterprise = false) => {
  const rawMetadata = gh(window.location.toString(), { enterprise: isEnterprise });
  return rawMetadata ? new GitHubMetadata(rawMetadata) : null;
};
