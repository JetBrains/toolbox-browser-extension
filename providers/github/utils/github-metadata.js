import AbstractMetadata from "../../../repositories/metadata.js";

export default class GitHubMetadata extends AbstractMetadata {
  constructor(metadata) {
    super(metadata);
  }

  get user() {
    return this.rawMetadata.user;
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
    return `${this.project}.git`;
  }

  get sshCloneUrl() {
    return `git@${this.rawMetadata.host}:${this.user}/${this.project}.git`;
  }
}
