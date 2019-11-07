const storageArea = chrome.storage.local;

export function saveToStorage(key, value) {
  return new Promise((resolve, reject) => {
    storageArea.set({[key]: value}, () => {
      if (chrome.runtime.lastError) {
        reject();
      } else {
        resolve();
      }
    });
  });
}

export function getFromStorage(key) {
  return new Promise((resolve, reject) => {
    storageArea.get(key, result => {
      if (chrome.runtime.lastError) {
        reject();
      } else if (Array.isArray(key)) {
        resolve(result);
      } else {
        resolve(result[key]);
      }
    });
  });
}

export function removeFromStorage(key) {
  return new Promise((resolve, reject) => {
    storageArea.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject();
      } else {
        resolve();
      }
    });
  });
}
