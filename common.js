import ideaIcon from '@jetbrains/logos/intellij-idea/intellij-idea.svg';
import appcodeIcon from '@jetbrains/logos/appcode/appcode.svg';
import clionIcon from '@jetbrains/logos/clion/clion.svg';
import pycharmIcon from '@jetbrains/logos/pycharm/pycharm.svg';
import phpstormIcon from '@jetbrains/logos/phpstorm/phpstorm.svg';
import rubymineIcon from '@jetbrains/logos/rubymine/rubymine.svg';
import webstormIcon from '@jetbrains/logos/webstorm/webstorm.svg';
import riderIcon from '@jetbrains/logos/rider/rider.svg';
import golandIcon from '@jetbrains/logos/goland/goland.svg';

import studioIcon from './studio.svg';

export const DEFAULT_LANGUAGE = 'java';

export const SUPPORTED_LANGUAGES = {
  [DEFAULT_LANGUAGE]: ['idea', 'studio'],
  kotlin: ['idea', 'studio'],
  groovy: ['idea', 'studio'],
  scala: ['idea', 'studio'],
  javascript: ['webstorm', 'phpstorm', 'idea', 'studio'],
  coffeescript: ['webstorm', 'phpstorm', 'idea', 'studio'],
  typescript: ['webstorm', 'phpstorm', 'idea', 'studio'],
  dart: ['webstorm', 'phpstorm', 'idea', 'studio'],
  go: ['goland', 'idea', 'studio'],
  css: ['webstorm', 'phpstorm', 'idea', 'studio'],
  html: ['webstorm', 'phpstorm', 'idea', 'studio'],
  python: ['pycharm', 'idea', 'studio'],
  php: ['phpstorm', 'idea', 'studio'],
  'c#': ['rider', 'studio'],
  'f#': ['rider'],
  'c++': ['clion', 'studio'],
  c: ['clion', 'studio'],
  ruby: ['rubymine', 'idea', 'studio'],
  rust: ['clion', 'idea', 'studio'],
  puppet: ['rubymine', 'idea', 'studio'],
  'objective-c': ['appcode'],
  swift: ['appcode']
};

export const SUPPORTED_TOOLS = {
  idea: {
    name: 'IntelliJ IDEA',
    tag: 'idea',
    icon: chrome.runtime.getURL(ideaIcon)
  },
  appcode: {
    name: 'AppCode',
    tag: 'appcode',
    icon: chrome.runtime.getURL(appcodeIcon)
  },
  clion: {
    name: 'CLion',
    tag: 'clion',
    icon: chrome.runtime.getURL(clionIcon)
  },
  pycharm: {
    name: 'PyCharm',
    tag: 'pycharm',
    icon: chrome.runtime.getURL(pycharmIcon)
  },
  phpstorm: {
    name: 'PhpStorm',
    tag: 'php-storm',
    icon: chrome.runtime.getURL(phpstormIcon)
  },
  rubymine: {
    name: 'RubyMine',
    tag: 'rubymine',
    icon: chrome.runtime.getURL(rubymineIcon)
  },
  webstorm: {
    name: 'WebStorm',
    tag: 'web-storm',
    icon: chrome.runtime.getURL(webstormIcon)
  },
  rider: {
    name: 'Rider',
    tag: 'rd',
    icon: chrome.runtime.getURL(riderIcon)
  },
  goland: {
    name: 'GoLand',
    tag: 'goland',
    icon: chrome.runtime.getURL(golandIcon)
  },
  studio: {
    name: 'Android Studio',
    tag: 'studio',
    icon: chrome.runtime.getURL(studioIcon)
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

const convertNumberToIndex = number => number - 1;

export function getToolboxURN(toolTag, cloneUrl) {
  return `jetbrains://${toolTag}/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;
}

export function getToolboxNavURN(toolTag, project, filePath, lineNumber = null) {
  const lineIndex = convertNumberToIndex(lineNumber == null ? 1 : lineNumber);
  const columnIndex = convertNumberToIndex(1);
  return `jetbrains://${toolTag}/navigate/reference?project=${project}&path=${filePath}:${lineIndex}:${columnIndex}`;
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
