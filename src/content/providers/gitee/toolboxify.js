import { fetchMetadata, fetchTools, observeIndexPage, observeBlobPage } from "./utils/index.js";
import { initAction } from "../../services/index.js";
import { setPageTestId } from "../../utils/index.js";

export default async function toolboxify(isEnterprise = false) {
  const metadata = fetchMetadata(isEnterprise);

  if (!metadata) {
    throw new Error("Failed to fetch metadata.");
  }

  const tools = fetchTools(metadata);
  await initAction(metadata, tools);
  observeIndexPage(metadata, tools);
  observeBlobPage(metadata, tools);
  setPageTestId();
}
