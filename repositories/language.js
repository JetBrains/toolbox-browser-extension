import { DEFAULT_LANGUAGE, HUNDRED_PERCENT, USAGE_THRESHOLD_PERCENT } from "../constants.js";

export default class Language {
  #name;
  #percentage;

  constructor(name, percentage) {
    this.#name = name;
    this.#percentage = percentage;
  }

  get name() {
    return this.#name;
  }

  get percentage() {
    return this.#percentage;
  }

  get normalizedName() {
    return this.name.toLowerCase();
  }

  get isRelevant() {
    return this.percentage > USAGE_THRESHOLD_PERCENT;
  }

  static Default = new Language(DEFAULT_LANGUAGE, HUNDRED_PERCENT);
}
