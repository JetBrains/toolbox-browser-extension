import {CLONE_PROTOCOLS} from '../constants.js';

const STORAGE_ITEMS = {
  PROTOCOL: 'protocol',
  MODIFY_PAGES: 'modify-pages',
  ACTIVE_TAB_ID: 'active-tab-id'
};

const DEFAULTS = {
  PROTOCOL: CLONE_PROTOCOLS.HTTPS,
  MODIFY_PAGES: true,
  ACTIVE_TAB_ID: null
};

const saveToStorage = (key, value) => new Promise((resolve, reject) => {
  chrome.storage.local.set({[key]: value}, () => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError.message);
    } else {
      resolve();
    }
  });
});

const getFromStorage = key => new Promise((resolve, reject) => {
  chrome.storage.local.get([key], result => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError.message);
    } else {
      resolve(result[key]);
    }
  });
});

export function getProtocol() {
  return new Promise(resolve => {
    getFromStorage(STORAGE_ITEMS.PROTOCOL).
      then(protocol => {
        resolve(protocol ?? DEFAULTS.PROTOCOL);
      }).
      catch(() => {
        resolve(DEFAULTS.PROTOCOL);
      });
  });
}

export function saveProtocol(protocol) {
  return new Promise(resolve => {
    saveToStorage(STORAGE_ITEMS.PROTOCOL, protocol).
      then(resolve).
      catch(() => {
        resolve();
      });
  });
}

export function getModifyPages() {
  return new Promise(resolve => {
    getFromStorage(STORAGE_ITEMS.MODIFY_PAGES).
      then(allow => {
        resolve(allow ?? DEFAULTS.MODIFY_PAGES);
      }).
      catch(() => {
        resolve(DEFAULTS.MODIFY_PAGES);
      });
  });
}

export function saveModifyPages(allow) {
  return new Promise(resolve => {
    saveToStorage(STORAGE_ITEMS.MODIFY_PAGES, allow).
      then(resolve).
      catch(() => {
        resolve();
      });
  });
}

export function getActiveTabId() {
  return new Promise(resolve => {
    getFromStorage(STORAGE_ITEMS.ACTIVE_TAB_ID).
      then(activeTabId => {
        resolve(activeTabId ?? DEFAULTS.ACTIVE_TAB_ID);
      }).
      catch(() => {
        resolve(DEFAULTS.ACTIVE_TAB_ID);
      });
  });
}

export function setActiveTabId(tabId) {
  return new Promise(resolve => {
    saveToStorage(STORAGE_ITEMS.ACTIVE_TAB_ID, tabId ?? DEFAULTS.ACTIVE_TAB_ID).
      then(resolve).
      catch(() => {
        resolve();
      });
  });
}
