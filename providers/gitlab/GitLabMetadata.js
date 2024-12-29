import AbstractMetadata from "../../src/models/AbstractMetadata.js";

export default class GitLabMetadata extends AbstractMetadata {
  constructor(rawMetadata) {
    super(rawMetadata);
  }

  get repository() {
    return this._rawMetadata.path;
  }

  get branch() {
    return this._rawMetadata.default_branch;
  }

  get languagesUrl() {
    return `${location.origin}/api/v4/projects/${this._rawMetadata.id}/languages`;
  }

  get httpsCloneUrl() {
    return this._rawMetadata.http_url_to_repo;
  }

  get sshCloneUrl() {
    return this._rawMetadata.ssh_url_to_repo;
  }
}
