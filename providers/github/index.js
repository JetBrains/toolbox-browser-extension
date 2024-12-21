import { fetchMetadata } from "./utils/fetch-metadata.js";
import { fetchTools } from "./utils/fetch-tools.js";
import { initAction } from "../utils/init-action.js";
import { observeIndexPage } from "./utils/observe-index-page.js";
import { setTestData } from "../utils/set-test-data.js";
import { observeBlobPage } from "./utils/observe-blob-page.js";

export default async function toolboxify(isEnterprise = false) {
  const metadata = fetchMetadata(isEnterprise);

  if (!metadata) {
    throw new Error("Failed to fetch metadata");
  }

  const tools = await fetchTools(metadata);
  await initAction(metadata, tools);
  observeIndexPage(metadata, tools);
  observeBlobPage(metadata, tools);
  setTestData();
}
