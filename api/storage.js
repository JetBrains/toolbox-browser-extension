import {CLONE_PROTOCOLS} from '../constants';

const STORAGE_KEYS = {
  PROTOCOL: 'protocol',
  MODIFY_PAGES: 'modify-pages'
};

const DEFAULTS = {
  PROTOCOL: CLONE_PROTOCOLS.HTTPS,
  MODIFY_PAGES: true
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

const handleStorageChanged = (changes, areaName) => {
  if (STORAGE_KEYS.MODIFY_PAGES in changes && areaName === 'local') {
    const {newValue} = changes[STORAGE_KEYS.MODIFY_PAGES];

    chrome.tabs.query({currentWindow: true}, tabs => {
      tabs.forEach(t => {
        chrome.tabs.sendMessage(t.id, {
          type: 'modify-pages-changed',
          newValue
        });
      });
    });
  }
};

export function getProtocol() {
  return new Promise(resolve => {
    getFromStorage(STORAGE_KEYS.PROTOCOL).
      then(protocol => {
        resolve(protocol || DEFAULTS.PROTOCOL);
      }).
      catch(() => {
        resolve(DEFAULTS.PROTOCOL);
      });
  });
}

export function saveProtocol(protocol) {
  return new Promise(resolve => {
    saveToStorage(STORAGE_KEYS.PROTOCOL, protocol).
      then(resolve).
      catch(() => {
        resolve();
      });
  });
}

export function getModifyPages() {
  return new Promise(resolve => {
    getFromStorage(STORAGE_KEYS.MODIFY_PAGES).
      then(allow => {
        resolve(allow == null ? DEFAULTS.MODIFY_PAGES : allow);
      }).
      catch(() => {
        resolve(DEFAULTS.MODIFY_PAGES);
      });
  });
}

export function saveModifyPages(allow) {
  return new Promise(resolve => {
    saveToStorage(STORAGE_KEYS.MODIFY_PAGES, allow).
      then(resolve).
      catch(() => {
        resolve();
      });
  });
}

if (chrome.storage.onChanged.hasListener(handleStorageChanged)) {
  chrome.storage.onChanged.removeListener(handleStorageChanged);
}
chrome.storage.onChanged.addListener(handleStorageChanged);
