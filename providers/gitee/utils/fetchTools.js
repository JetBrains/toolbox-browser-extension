import { getToolsForLanguages } from "../../../src/utils/getToolsForLanguages.js";

export const fetchTools = (metadata) => getToolsForLanguages(metadata.languages);
