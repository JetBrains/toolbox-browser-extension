import { callToolbox, getToolboxURN } from "../../../api/toolbox.js";

export const initPageAction = async (metadata, tools) => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "get-tools":
        sendResponse(tools);
        return true;
      case "perform-action":
        const toolboxAction = getToolboxURN(message.toolTag, message.cloneUrl);
        callToolbox(toolboxAction);
        break;
      // no default
    }
    return undefined;
  });

  await chrome.runtime.sendMessage({
    type: "enable-page-action",
    project: metadata.project,
    https: metadata.httpsCloneUrl,
    ssh: metadata.sshCloneUrl,
  });
};
