import { AbstractMetadata } from "../../models/index.js";

export default class GitHubMetadata extends AbstractMetadata {
  constructor(rawMetadata) {
    super(rawMetadata);
  }

  get user() {
    return this._rawMetadata.user;
  }

  get repository() {
    return this._rawMetadata.repo;
  }

  get branch() {
    return this._rawMetadata.branch;
  }

  get projectUrl() {
    return this._rawMetadata.clone_url;
  }

  get languagesUrl() {
    return `${this._rawMetadata.api_url}/languages`;
  }

  get httpsCloneUrl() {
    return `${this.projectUrl}.git`;
  }

  get sshCloneUrl() {
    return `git@${this._rawMetadata.host}:${this.user}/${this.repository}.git`;
  }
}
