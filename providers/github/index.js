import { fetchMetadata } from "./utils/fetchMetadata.js";
import { fetchTools } from "./utils/fetchTools.js";
import { initAction } from "./utils/initAction.js";
import { observeMainPage } from "./utils/observeMainPage.js";
import { setTestData } from "./utils/set-test-data.js";
import { observeBlobPage } from "./utils/observeBlobPage.js";

export async function toolboxify(isEnterprise = false) {
  const metadata = fetchMetadata(isEnterprise);

  if (!metadata) {
    return;
  }

  const tools = await fetchTools(metadata);
  await initAction(metadata, tools);
  observeMainPage(metadata, tools);
  observeBlobPage(metadata, tools);
  setTestData();
}
