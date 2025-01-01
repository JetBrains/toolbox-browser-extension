export const DEFAULT_LANGUAGE = "java";
export const USAGE_THRESHOLD_PERCENT = 5;
export const HUNDRED_PERCENT = 100;

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

  get standardizedName() {
    return this.name.toLowerCase();
  }

  get isRelevant() {
    return this.percentage > USAGE_THRESHOLD_PERCENT;
  }

  static Default = new Language(DEFAULT_LANGUAGE, HUNDRED_PERCENT);
}

// TODO: obsolete, only used by Bitbucket
export const SUPPORTED_LANGUAGES = {
  [DEFAULT_LANGUAGE]: ["idea"],
  kotlin: ["idea"],
  groovy: ["idea"],
  scala: ["idea"],
  javascript: ["webstorm", "phpstorm", "idea"],
  coffeescript: ["webstorm", "phpstorm", "idea"],
  typescript: ["webstorm", "phpstorm", "idea"],
  dart: ["webstorm", "phpstorm", "idea"],
  go: ["goland", "idea"],
  css: ["webstorm", "phpstorm", "idea"],
  html: ["webstorm", "phpstorm", "idea"],
  python: ["pycharm", "idea"],
  "jupyter notebook": ["pycharm", "idea"],
  php: ["phpstorm", "idea"],
  "c#": ["rider"],
  "f#": ["rider"],
  "c++": ["clion"],
  c: ["clion"],
  ruby: ["rubymine", "idea"],
  rust: ["rustrover", "clion", "idea"],
  puppet: ["rubymine", "idea"],
  "objective-c": ["appcode"],
  swift: ["appcode"],
};
