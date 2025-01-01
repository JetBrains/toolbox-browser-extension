import { AbstractMetadata } from "../../models/index.js";

export default class GiteeMetadata extends AbstractMetadata {
  constructor(rawMetadata) {
    super(rawMetadata);
  }

  get project() {
    return this._rawMetadata.name;
  }

  get repository() {
    return this._rawMetadata.repo;
  }

  get branch() {
    return this._rawMetadata.branch;
  }

  get httpsCloneUrl() {
    return this._rawMetadata.https;
  }

  get sshCloneUrl() {
    return this._rawMetadata.ssh;
  }

  get languages() {
    return this._rawMetadata.lang;
  }
}
