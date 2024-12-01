import { CLONE_PROTOCOLS } from "../constants.js";

const STORAGE_ITEMS = {
  PROTOCOL: "protocol",
  MODIFY_PAGES: "modify-pages",
  ACTIVE_TAB_ID: "active-tab-id",
};

const DEFAULTS = {
  PROTOCOL: CLONE_PROTOCOLS.HTTPS,
  MODIFY_PAGES: true,
  ACTIVE_TAB_ID: null,
};

const saveToStorage = async (key, value) => {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (e) {
    console.error("Failed to save %s: %s to storage: %s", key, value, e.message);
  }
};

const getFromStorage = async (key, defaultValue) => {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] ?? defaultValue;
  } catch (e) {
    console.error("Failed to get %s from storage: %s", key, e.message);
    return defaultValue;
  }
};

export const getProtocol = () => getFromStorage(STORAGE_ITEMS.PROTOCOL, DEFAULTS.PROTOCOL);

export const saveProtocol = (protocol) => saveToStorage(STORAGE_ITEMS.PROTOCOL, protocol);

export const getModifyPages = () =>
  getFromStorage(STORAGE_ITEMS.MODIFY_PAGES, DEFAULTS.MODIFY_PAGES);

export const saveModifyPages = (allow) => saveToStorage(STORAGE_ITEMS.MODIFY_PAGES, allow);
