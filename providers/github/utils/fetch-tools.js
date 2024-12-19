import {
  DEFAULT_LANGUAGE,
  HUNDRED_PERCENT,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOOLS,
  USAGE_THRESHOLD,
} from "../../../constants.js";
import { fetchLanguages } from "./fetch-languages.js";

export const fetchTools = async (metadata) => {
  const usageThresholdPercents = USAGE_THRESHOLD * HUNDRED_PERCENT;
  const supportedLanguages = Object.keys(SUPPORTED_LANGUAGES);

  const languages = await fetchLanguages(metadata);

  const languageFilter = (language) =>
    supportedLanguages.includes(language.name.toLowerCase()) &&
    language.percentage > usageThresholdPercents;

  const selectedToolIds = languages.filter(languageFilter).reduce((toolIds, language) => {
    const languageKey = language.name.toLowerCase();
    SUPPORTED_LANGUAGES[languageKey].forEach((toolId) => {
      toolIds.add(toolId);
    });
    return toolIds;
  }, new Set());

  const normalizedToolIds =
    selectedToolIds.size > 0 ? Array.from(selectedToolIds) : SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

  return normalizedToolIds.sort().map((toolId) => SUPPORTED_TOOLS[toolId]);
};
