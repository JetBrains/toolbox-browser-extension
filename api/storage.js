import {CLONE_PROTOCOLS} from '../constants';

const STORAGE_KEYS = {
  PROTOCOL: 'protocol'
};

function saveToStorage(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[key]: value}, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve();
      }
    });
  });
}

function getFromStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(result[key]);
      }
    });
  });
}

export function getProtocol() {
  return new Promise(resolve => {
    getFromStorage(STORAGE_KEYS.PROTOCOL).
      then(protocol => {
        resolve(protocol || CLONE_PROTOCOLS.HTTPS);
      }).
      catch(() => {
        resolve(CLONE_PROTOCOLS.HTTPS);
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
