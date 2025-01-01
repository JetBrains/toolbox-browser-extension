export const isHostPermissionGrantedByManifest = (url) => {
  const domainMatch = getDomainMatch(url);
  const manifest = chrome.runtime.getManifest();
  return manifest.host_permissions.includes(domainMatch);
};

export const isHostPermissionGrantedByUser = (url) => {
  const domainMatch = getDomainMatch(url);
  return chrome.permissions.contains({ origins: [domainMatch] });
};

export const requestHostPermission = (url) => {
  const domainMatch = getDomainMatch(url);
  return chrome.permissions.request({ origins: [domainMatch] });
};

export const revokeHostPermission = (url) => {
  const domainMatch = getDomainMatch(url);
  return chrome.permissions.remove({ origins: [domainMatch] });
};

export const registerContentScript = (url) => {
  const domainMatch = getDomainMatch(url);
  const options = {
    id: domainMatch,
    matches: [domainMatch],
    js: [DETECT_PROVIDER_CONTENT_SCRIPT],
  };
  return chrome.scripting.registerContentScripts([options]);
};

export const unregisterContentScript = (url) => {
  const domainMatch = getDomainMatch(url);
  return chrome.scripting.unregisterContentScripts({ ids: [domainMatch] });
};

const getDomain = (url) => {
  const { protocol, hostname } = new URL(url);
  return `${protocol}//${hostname}`;
};

const getDomainMatch = (url) => `${getDomain(url)}/*`;

const DETECT_PROVIDER_CONTENT_SCRIPT = "detectProvider.js";
