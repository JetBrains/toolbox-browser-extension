import AbstractMetadata from "../../repositories/metadata.js";

export default class GitlabMetadata extends AbstractMetadata {
  constructor(metadata) {
    super(metadata);
  }

  get project() {
    return this.rawMetadata.path;
  }

  get branch() {
    return this.rawMetadata.default_branch;
  }

  get languagesUrl() {
    return `${location.origin}/api/v4/projects/${this.rawMetadata.id}/languages`;
  }

  get httpsCloneUrl() {
    return this.rawMetadata.http_url_to_repo;
  }

  get sshCloneUrl() {
    return this.rawMetadata.ssh_url_to_repo;
  }
}
