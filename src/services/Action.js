import { callToolbox, getToolboxCloneUrl } from "./Toolbox.js";

export const initAction = async (metadata, tools) => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "get-tools":
        sendResponse(tools.map((tool) => tool.toJSON()));
        return true;
      case "perform-action":
        const toolboxAction = getToolboxCloneUrl(message.toolTag, message.cloneUrl);
        callToolbox(toolboxAction);
        break;
      // no default
    }
    return undefined;
  });

  await chrome.runtime.sendMessage({
    type: "enable-page-action",
    project: metadata.repositoryDisplayName,
    https: metadata.httpsCloneUrl,
    ssh: metadata.sshCloneUrl,
  });
};
