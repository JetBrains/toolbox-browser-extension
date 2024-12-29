export default class ActionMenu {
  #created = false;

  create(onCheckedChanged) {
    if (this.#created) {
      return;
    }

    this.#created = true;

    chrome.contextMenus.create({
      id: MENU_ITEM_ID,
      type: chrome.contextMenus.ItemType.CHECKBOX,
      title: DEFAULT_TITLE,
      enabled: false,
      checked: false,
      contexts: [chrome.contextMenus.ContextType.ACTION],
      documentUrlPatterns: ["http://*/*", "https://*/*"],
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === MENU_ITEM_ID) {
        onCheckedChanged(info.checked, tab.url);
      }
    });
  }

  update(updateProperties) {
    if (!this.#created) {
      return;
    }

    return chrome.contextMenus.update(MENU_ITEM_ID, updateProperties);
  }
}

const MENU_ITEM_ID = "jetbrains-toolbox-toggle-domain";
const DEFAULT_TITLE = "Enable on this domain";
