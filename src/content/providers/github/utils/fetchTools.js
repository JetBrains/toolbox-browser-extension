import { Language, HUNDRED_PERCENT } from "../../../models/index.js";
import { getToolsForLanguages } from "../../../utils/index.js";

export const fetchTools = async (metadata) => {
  const languages = await fetchLanguages(metadata);
  return getToolsForLanguages(languages);
};

const fetchLanguages = async (metadata) => {
  try {
    const response = await fetch(metadata.languagesUrl);
    if (validateHttpResponse(response)) {
      const languagesObject = await parseHttpResponse(response);
      const totalBytes = Object.values(languagesObject).reduce((total, bytes) => total + bytes, 0);

      return Object.entries(languagesObject).map(
        ([name, bytes]) => new Language(name, (bytes / totalBytes) * HUNDRED_PERCENT),
      );
    } else {
      return extractLanguagesFromPage(metadata);
    }
  } catch (error) {
    return extractLanguagesFromPage(metadata);
  }
};

const validateHttpResponse = (response) =>
  response.status >= MIN_VALID_HTTP_STATUS && response.status <= MAX_VALID_HTTP_STATUS;

const parseHttpResponse = async (response) => {
  const result = await response.json();
  if (Object.keys(result).length > 0) {
    return result;
  } else {
    throw new Error("Empty HTTP response");
  }
};

const extractLanguagesFromPage = async (metadata) => {
  const defaultLanguages = [Language.Default];

  try {
    // TBX-4762: private repos don't let use API, load root page and scrape languages off it
    const response = await fetch(metadata.projectUrl);
    const htmlString = await response.text();
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(htmlString, "text/html");

    const languageElements = htmlDocument.querySelectorAll(".repository-lang-stats-numbers .lang");

    if (languageElements.length === 0) {
      // Check for new UI as of 24.06.20
      const newLanguageElements = htmlDocument.querySelectorAll(
        '[data-ga-click="Repository, language stats search click, location:repo overview"]',
      );

      if (newLanguageElements.length > 0) {
        const allLanguages = Array.from(newLanguageElements).map((el) => {
          const langEl = el.querySelector("span");
          const percentEl = langEl.nextElementSibling;

          return new Language(
            langEl.textContent.trim(),
            percentEl ? parseFloat(percentEl.textContent.trim()) : HUNDRED_PERCENT,
          );
        });

        return allLanguages.length > 0 ? allLanguages : defaultLanguages;
      } else {
        return defaultLanguages;
      }
    } else {
      const allLanguages = Array.from(languageElements).map((el) => {
        const percentEl = el.nextElementSibling;

        return new Language(
          el.textContent.trim(),
          percentEl ? parseFloat(percentEl.textContent.trim()) : HUNDRED_PERCENT,
        );
      });

      return allLanguages.length > 0 ? allLanguages : defaultLanguages;
    }
  } catch (error) {
    return defaultLanguages;
  }
};

const MIN_VALID_HTTP_STATUS = 200;
const MAX_VALID_HTTP_STATUS = 299;
