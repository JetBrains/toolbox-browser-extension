import {CLONE_PROTOCOLS} from '../constants';

import {info, warn} from './console-logger';

const STORAGE_ITEMS = {
  PROTOCOL: 'protocol',
  MODIFY_PAGES: 'modify-pages',
  LOGGING: 'logging'
};

const DEFAULTS = {
  PROTOCOL: CLONE_PROTOCOLS.HTTPS,
  MODIFY_PAGES: true,
  LOGGING: false
};

const saveToStorage = (key, value) => new Promise(resolve => {
  chrome.storage.local.set({[key]: value}, () => {
    if (chrome.runtime.lastError) {
      warn(
        `Failed to save the new value '${value}' of the '${key}' setting to storage`,
        chrome.runtime.lastError
      );
    } else {
      info(`Saved the '${key}' setting to storage, the new value is '${value}'`);
    }
    resolve();
  });
});

const getFromStorage = (key, defaultValue) => new Promise(resolve => {
  chrome.storage.local.get([key], result => {
    if (chrome.runtime.lastError) {
      warn(
        `Failed to get the '${key}' setting, returning the default value '${defaultValue}'`,
        chrome.runtime.lastError
      );
      resolve(defaultValue);
    } else {
      const value = result[key];
      info(`Extracted the '${key}' setting from storage, the value is '${value}'`);
      resolve(value);
    }
  });
});

export async function getProtocol() {
  return await getFromStorage(STORAGE_ITEMS.PROTOCOL, DEFAULTS.PROTOCOL);
}

export async function saveProtocol(protocol) {
  return await saveToStorage(STORAGE_ITEMS.PROTOCOL, protocol);
}

export async function getModifyPages() {
  return await getFromStorage(STORAGE_ITEMS.MODIFY_PAGES, DEFAULTS.MODIFY_PAGES);
}

export async function saveModifyPages(allow) {
  return await saveToStorage(STORAGE_ITEMS.MODIFY_PAGES, allow);
}

export async function getLogging() {
  return await getFromStorage(STORAGE_ITEMS.LOGGING, DEFAULTS.LOGGING);
}

export async function saveLogging(allow) {
  return await saveToStorage(STORAGE_ITEMS.LOGGING, allow);
}
