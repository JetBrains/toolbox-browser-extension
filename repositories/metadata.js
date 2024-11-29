export default class AbstractMetadata {
  rawMetadata = null;

  constructor(metadata) {
    if (new.target === AbstractMetadata) {
      throw new Error("Cannot instantiate an abstract class directly.");
    }

    this.rawMetadata = metadata;
  }

  get user() {
    throw new Error("Abstract property 'user' must be implemented in derived class.");
  }

  get project() {
    throw new Error("Abstract property 'project' must be implemented in derived class.");
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
