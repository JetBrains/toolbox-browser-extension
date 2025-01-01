import GitLabMetadata from "../GitLabMetadata.js";

export const fetchMetadata = async (isEnterprise = false) => {
  const projectId = await getProjectId();
  const response = await fetch(`${location.origin}/api/v4/projects/${projectId}`);
  const rawMetadata = await response.json();

  return new GitLabMetadata(rawMetadata);
};

const getProjectId = async () => {
  let projectId = extractProjectIdFromPage(document);
  if (projectId) {
    return projectId;
  }

  const { findFile, project } = document.body.dataset;
  // we treat 'project' as a boolean flag saying
  // we are able to get the project repo url
  if (findFile && project) {
    const [repoPath] = findFile.split("/-/find_file/");
    const repoUrl = `${location.origin}${repoPath}`;
    const response = await fetch(repoUrl);
    const htmlString = await response.text();
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(htmlString, "text/html");
    projectId = extractProjectIdFromPage(htmlDocument);
    if (projectId) {
      return projectId;
    }
  }

  throw new Error("Project ID not found in the page");
};

const extractProjectIdFromPage = () => {
  const dataProjectId = document.body.dataset.projectId;
  if (dataProjectId) {
    return dataProjectId;
  }

  const homePanelMetadataElement = document.querySelector(".home-panel-metadata") || {
    children: [],
  };
  const projectIdElement = Array.prototype.find.call(homePanelMetadataElement.children, (c) =>
    c.textContent.includes("Project ID"),
  );

  return projectIdElement ? projectIdElement.textContent.replace("Project ID:", "").trim() : null;
};
