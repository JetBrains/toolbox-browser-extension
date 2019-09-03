export const DEFAULT_LANGUAGE = 'java';

export const supportedLanguages = {
  [DEFAULT_LANGUAGE]: ['idea'],
  kotlin: ['idea'],
  groovy: ['idea'],
  scala: ['idea'],
  javascript: ['webstorm', 'phpstorm', 'idea'],
  coffeescript: ['webstorm', 'phpstorm', 'idea'],
  typescript: ['webstorm', 'phpstorm', 'idea'],
  dart: ['webstorm', 'phpstorm', 'idea'],
  go: ['goland'],
  css: ['webstorm', 'phpstorm', 'idea'],
  html: ['webstorm', 'phpstorm', 'idea'],
  python: ['pycharm', 'idea'],
  php: ['phpstorm', 'idea'],
  'c#': ['rider'],
  'c++': ['clion'],
  c: ['clion'],
  ruby: ['rubymine', 'idea'],
  puppet: ['rubymine', 'idea'],
  'objective-c': ['appcode'],
  swift: ['appcode']
};

export const supportedTools = {
  idea: {
    name: 'IntelliJ IDEA',
    tag: 'idea',
    icon: chrome.extension.getURL(require('@jetbrains/logos/intellij-idea/intellij-idea.svg'))
  },
  appcode: {
    name: 'AppCode',
    tag: 'appcode',
    icon: chrome.extension.getURL(require('@jetbrains/logos/appcode/appcode.svg'))
  },
  clion: {
    name: 'CLion',
    tag: 'clion',
    icon: chrome.extension.getURL(require('@jetbrains/logos/clion/clion.svg'))
  },
  pycharm: {
    name: 'PyCharm',
    tag: 'pycharm',
    icon: chrome.extension.getURL(require('@jetbrains/logos/pycharm/pycharm.svg'))
  },
  phpstorm: {
    name: 'PhpStorm',
    tag: 'php-storm',
    icon: chrome.extension.getURL(require('@jetbrains/logos/phpstorm/phpstorm.svg'))
  },
  rubymine: {
    name: 'RubyMine',
    tag: 'rubymine',
    icon: chrome.extension.getURL(require('@jetbrains/logos/rubymine/rubymine.svg'))
  },
  webstorm: {
    name: 'WebStorm',
    tag: 'web-storm',
    icon: chrome.extension.getURL(require('@jetbrains/logos/webstorm/webstorm.svg'))
  },
  rider: {
    name: 'Rider',
    tag: 'rd',
    icon: chrome.extension.getURL(require('@jetbrains/logos/rider/rider.svg'))
  },
  goland: {
    name: 'GoLand',
    tag: 'goland',
    icon: chrome.extension.getURL(require('@jetbrains/logos/goland/goland.svg'))
  }
};

export const USAGE_THRESHOLD = 0.05;
export const HUNDRED_PERCENT = 100;
export const MAX_DECIMALS = 2;
export const MIN_VALID_HTTP_STATUS = 200;
export const MAX_VALID_HTTP_STATUS = 299;
export const DEFAULT_LANGUAGE_SET = {[DEFAULT_LANGUAGE]: HUNDRED_PERCENT};

export const CLONE_PROTOCOLS = {
  HTTPS: 'HTTPS',
  SSH: 'SSH'
};

export function getToolboxURN(toolTag, cloneUrl) {
  return `jetbrains://${toolTag}/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;
}

export function getToolboxNavURN(toolTag, project, filePath, lineNumber = null) {
  let openFileUrl = `jetbrains://${toolTag}/navigate/reference?project=${project}&path=${filePath}`;
  if (lineNumber != null) {
    openFileUrl = `${openFileUrl}:${lineNumber}`;
  }
  return openFileUrl;
}

export function callToolbox(action) {
  const fakeAction = document.createElement('a');
  fakeAction.style.position = 'absolute';
  fakeAction.style.left = '-9999em';
  fakeAction.href = action;
  document.body.appendChild(fakeAction);
  fakeAction.click();
  document.body.removeChild(fakeAction);
}

export function getProtocol() {
  return new Promise(resolve => {
    chrome.storage.local.get(['protocol'], result => {
      resolve(result.protocol || CLONE_PROTOCOLS.HTTPS);
    });
  });
}

export function saveProtocol(value) {
  return new Promise(resolve => {
    chrome.storage.local.set({protocol: value}, () => {
      resolve();
    });
  });
}
