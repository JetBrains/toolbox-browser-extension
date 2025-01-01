import { Language } from "../../../models/index.js";
import { getToolsForLanguages } from "../../../utils/index.js";

export const fetchTools = async (metadata) => {
  const languages = await fetchLanguages(metadata);
  return getToolsForLanguages(languages);
};

const fetchLanguages = async (metadata) => {
  try {
    const response = await fetch(metadata.languagesUrl);
    const languagesObject = await response.json();

    const languages = Object.entries(languagesObject).map(
      ([name, percentage]) => new Language(name, percentage),
    );

    if (languages.length === 0) {
      languages.push(Language.Default);
    }

    return languages;
  } catch (error) {
    console.error("Failed to fetch languages", error);
    return [Language.Default];
  }
};
