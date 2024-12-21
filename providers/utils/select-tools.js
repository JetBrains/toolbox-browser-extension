import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, SUPPORTED_TOOLS } from "../../constants.js";

export const selectTools = (languages) => {
  const selectedToolIds = languages.reduce((acc, language) => {
    if (language.isRelevant && SUPPORTED_LANGUAGES.hasOwnProperty(language.normalizedName)) {
      SUPPORTED_LANGUAGES[language.normalizedName].forEach((toolId) => {
        acc.add(toolId);
      });
    }
    return acc;
  }, new Set());

  const normalizedToolIds =
    selectedToolIds.size > 0 ? Array.from(selectedToolIds) : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  return normalizedToolIds.sort().map((toolId) => SUPPORTED_TOOLS[toolId]);
};
