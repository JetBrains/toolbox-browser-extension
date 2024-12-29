import AbstractMetadata from "../../repositories/metadata.js";

export default class GitHubMetadata extends AbstractMetadata {
  constructor(metadata) {
    super(metadata);
  }

  get project() {
    return this.rawMetadata.repo;
  }

  get branch() {
    return this.rawMetadata.branch;
  }

  get projectUrl() {
    return this.rawMetadata.clone_url;
  }

  get languagesUrl() {
    return `${this.rawMetadata.api_url}/languages`;
  }

  get httpsCloneUrl() {
    return `${this.projectUrl}.git`;
  }

  get sshCloneUrl() {
    return `git@${this.rawMetadata.host}:${this.rawMetadata.user}/${this.project}.git`;
  }
}
