import Language, { DEFAULT_LANGUAGE } from "../models/Language.js";
import { SUPPORTED_TOOLS } from "../models/Tool.js";

const TOOLS_BY_LANGUAGE = {
  [DEFAULT_LANGUAGE]: [SUPPORTED_TOOLS.idea],
  kotlin: [SUPPORTED_TOOLS.idea],
  groovy: [SUPPORTED_TOOLS.idea],
  scala: [SUPPORTED_TOOLS.idea],
  javascript: [SUPPORTED_TOOLS.webstorm, SUPPORTED_TOOLS.phpstorm, SUPPORTED_TOOLS.idea],
  coffeescript: [SUPPORTED_TOOLS.webstorm, SUPPORTED_TOOLS.phpstorm, SUPPORTED_TOOLS.idea],
  typescript: [SUPPORTED_TOOLS.webstorm, SUPPORTED_TOOLS.phpstorm, SUPPORTED_TOOLS.idea],
  dart: [SUPPORTED_TOOLS.webstorm, SUPPORTED_TOOLS.phpstorm, SUPPORTED_TOOLS.idea],
  css: [SUPPORTED_TOOLS.webstorm, SUPPORTED_TOOLS.phpstorm, SUPPORTED_TOOLS.idea],
  html: [SUPPORTED_TOOLS.webstorm, SUPPORTED_TOOLS.phpstorm, SUPPORTED_TOOLS.idea],
  go: [SUPPORTED_TOOLS.goland, SUPPORTED_TOOLS.idea],
  php: [SUPPORTED_TOOLS.phpstorm, SUPPORTED_TOOLS.idea],
  python: [SUPPORTED_TOOLS.pycharm, SUPPORTED_TOOLS.idea],
  "jupyter notebook": [SUPPORTED_TOOLS.pycharm, SUPPORTED_TOOLS.idea],
  "c#": [SUPPORTED_TOOLS.rider],
  "f#": [SUPPORTED_TOOLS.rider],
  "c++": [SUPPORTED_TOOLS.clion],
  c: [SUPPORTED_TOOLS.clion],
  ruby: [SUPPORTED_TOOLS.rubymine, SUPPORTED_TOOLS.idea],
  rust: [SUPPORTED_TOOLS.rustrover, SUPPORTED_TOOLS.clion, SUPPORTED_TOOLS.idea],
  puppet: [SUPPORTED_TOOLS.rubymine, SUPPORTED_TOOLS.idea],
  "objective-c": [SUPPORTED_TOOLS.appcode],
  swift: [SUPPORTED_TOOLS.appcode],
};

const getToolsByLanguage = (language) => TOOLS_BY_LANGUAGE[language.standardizedName] ?? [];

export const getToolsForLanguages = (languages) => {
  const selectedToolsSet = languages.reduce((acc, language) => {
    if (language.isRelevant) {
      getToolsByLanguage(language).forEach((tool) => {
        acc.add(tool);
      });
    }
    return acc;
  }, new Set());

  if (selectedToolsSet.size === 0) {
    getToolsByLanguage(Language.Default).forEach((tool) => {
      selectedToolsSet.add(tool);
    });
  }

  return Array.from(selectedToolsSet).sort((a, b) => a.name.localeCompare(b.name));
};
