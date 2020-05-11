const APPLICATION_NAME = 'com.jetbrains.toolbox';

const MESSAGE_NAMES = {
  TOOLS: 'tools',
  VERSION: 'version'
};

const sendMessage = name => new Promise((resolve, reject) => {
  chrome.runtime.sendNativeMessage(APPLICATION_NAME, {request: name}, response => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError.message);
    } else {
      resolve(response.data);
    }
  });
});

export const getVersion = () => new Promise((resolve, reject) => {
  sendMessage(MESSAGE_NAMES.VERSION).
    then(result => {
      resolve(result.version);
    }).
    catch(reject);
});

export const getTools = () => new Promise((resolve, reject) => {
  sendMessage(MESSAGE_NAMES.TOOLS).
    then(result => {
      resolve(result.tools);
    }).
    catch(reject);
});
