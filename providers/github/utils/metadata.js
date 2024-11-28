import gh from "github-url-to-object";

export const fetchMetadata = (isEnterprise = false) =>
  gh(window.location.toString(), { enterprise: isEnterprise });

export const getHttpsCloneUrl = (metadata) => `${metadata.clone_url}.git`;

export const getSshCloneUrl = (metadata) =>
  `git@${metadata.host}:${metadata.user}/${metadata.repo}.git`;
