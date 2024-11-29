import {
  DEFAULT_LANGUAGE,
  HUNDRED_PERCENT,
  MAX_VALID_HTTP_STATUS,
  MIN_VALID_HTTP_STATUS,
} from "../../../constants.js";
import Language from "../../../repositories/language.js";

export const fetchLanguages = async (metadata) => {
  try {
    const response = await fetch(metadata.languagesUrl);
    const checkedResponse = validateHttpResponse(response);
    const parsedResponse = await parseHttpResponse(checkedResponse);
    return normalizeLanguages(parsedResponse);
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

const normalizeLanguages = (parsedResponse) => {
  const totalBytes = Object.values(parsedResponse).reduce((total, bytes) => total + bytes, 0);

  return Object.entries(parsedResponse).map(
    ([name, bytes]) => new Language(name, (bytes / totalBytes) * HUNDRED_PERCENT),
  );
};

const extractLanguagesFromPage = async (metadata) => {
  const defaultLanguageSet = new Language(DEFAULT_LANGUAGE, HUNDRED_PERCENT);

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

        return allLanguages.length > 0 ? allLanguages : defaultLanguageSet;
      } else {
        return defaultLanguageSet;
      }
    } else {
      const allLanguages = Array.from(languageElements).map((el) => {
        const percentEl = el.nextElementSibling;

        return new Language(
          el.textContent.trim(),
          percentEl ? parseFloat(percentEl.textContent.trim()) : HUNDRED_PERCENT,
        );
      });

      return allLanguages.length > 0 ? allLanguages : defaultLanguageSet;
    }
  } catch (error) {
    return defaultLanguageSet;
  }
};
