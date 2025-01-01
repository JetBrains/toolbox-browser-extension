import { getToolsForLanguages } from "../../../utils/index.js";

export const fetchTools = (metadata) => getToolsForLanguages(metadata.languages);
