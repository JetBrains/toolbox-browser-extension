import { fetchMetadata } from "./utils/fetchMetadata.js";
import { fetchTools } from "./utils/fetchTools.js";
import { initAction } from "../../src/services/Action.js";
import { observeIndexPage } from "./utils/observeIndexPage.js";
import { observeBlobPage } from "./utils/observeBlobPage.js";
import { setPageTestId } from "../../src/utils/setPageTestId.js";

export default async function toolboxify(isEnterprise = false) {
  const metadata = fetchMetadata();

  if (!metadata) {
    throw new Error("Failed to fetch metadata.");
  }

  const tools = fetchTools(metadata);
  await initAction(metadata, tools);
  observeIndexPage(metadata, tools);
  observeBlobPage(metadata, tools);
  setPageTestId();
}
