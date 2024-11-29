import { fetchMetadata } from "./utils/fetchMetadata.js";
import { fetchTools } from "./utils/fetchTools.js";
import { initPageAction } from "./utils/initPageAction.js";
import { extendMainPage } from "./utils/extendMainPage.js";

export async function toolboxify(isEnterprise = false) {
  const metadata = fetchMetadata(isEnterprise);

  if (!metadata) {
    return;
  }

  const tools = await fetchTools(metadata);

  initPageAction(metadata, tools);

  extendMainPage(metadata, tools);
}
