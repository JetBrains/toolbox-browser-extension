import { Language, HUNDRED_PERCENT } from "../../../models/index.js";
import GiteeMetadata from "../GiteeMetadata.js";

export const fetchMetadata = (isEnterprise = false) => {
  const extensionElement = document.querySelector(".gitee-project-extension");

  if (extensionElement == null) {
    return null;
  }

  return new GiteeMetadata({
    lang: extractAllLanguages(() => {
      const languagesFromExtension = [];
      const languageName = extractExtensionEntry(extensionElement, ".extension.lang");
      if (languageName) {
        languagesFromExtension.push(new Language(languageName, HUNDRED_PERCENT));
      }
      return languagesFromExtension;
    }),
    https: extractExtensionEntry(extensionElement, ".extension.https"),
    ssh: extractExtensionEntry(extensionElement, ".extension.ssh"),
    repo: extractExtensionEntry(extensionElement, ".extension.repo"),
    name: extractExtensionEntry(extensionElement, ".extension.name"),
    branch: extractExtensionEntry(extensionElement, ".extension.branch"),
  });
};

const defaultFallbackExtractionStrategy = () => "";

const extractAllLanguages = (fallbackExtractionStrategy) => {
  const languages = [];

  document.querySelectorAll(".summary-languages-popup > .row").forEach((rowElement) => {
    const langElement = rowElement.querySelector(".lang");
    const percentageElement = rowElement.querySelector(".percentage");
    if (langElement && percentageElement) {
      const language = langElement.textContent.trim().toLowerCase();
      const normalizedLanguage = language === "html/css" ? "html" : language;
      const percentage = parseFloat(percentageElement.textContent.trim());
      languages.push(
        new Language(normalizedLanguage, isNaN(percentage) ? HUNDRED_PERCENT : percentage),
      );
    }
  });

  return languages.length > 0 ? languages : fallbackExtractionStrategy();
};

const extractExtensionEntry = (
  extensionElement,
  selector,
  fallbackExtractionStrategy = defaultFallbackExtractionStrategy,
) => extensionElement.querySelector(selector)?.textContent?.trim() || fallbackExtractionStrategy();
