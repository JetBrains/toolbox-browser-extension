export default class AbstractMetadata {
  _rawMetadata = null;

  constructor(rawMetadata) {
    if (new.target === AbstractMetadata) {
      throw new Error("Cannot instantiate an abstract class directly.");
    }

    this._rawMetadata = rawMetadata;
  }

  get user() {
    throw new Error("Abstract property 'user' must be implemented in derived class.");
  }

  get repository() {
    throw new Error("Abstract property 'repository' must be implemented in derived class.");
  }

  get branch() {
    throw new Error("Abstract property 'branch' must be implemented in derived class.");
  }

  get projectUrl() {
    throw new Error("Abstract property 'projectUrl' must be implemented in derived class.");
  }

  get languagesUrl() {
    throw new Error("Abstract property 'languagesUrl' must be implemented in derived class.");
  }

  get httpsCloneUrl() {
    throw new Error("Abstract property 'httpsCloneUrl' must be implemented in derived class.");
  }

  get sshCloneUrl() {
    throw new Error("Abstract property 'sshCloneUrl' must be implemented in derived class.");
  }
}
