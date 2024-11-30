import { fetchMetadata } from "./utils/fetchMetadata.js";
import { fetchTools } from "./utils/fetchTools.js";
import { initPageAction } from "./utils/initPageAction.js";
import { extendMainPage } from "./utils/extendMainPage.js";
import { endOfWork } from "./utils/end-of-work.js";
import { extendBlobPage } from "./utils/extendBlobPage.js";

export async function toolboxify(isEnterprise = false) {
  const metadata = fetchMetadata(isEnterprise);

  if (!metadata) {
    return;
  }

  const tools = await fetchTools(metadata);
  await initPageAction(metadata, tools);
  extendMainPage(metadata, tools);
  extendBlobPage(metadata, tools);

  endOfWork();
}
