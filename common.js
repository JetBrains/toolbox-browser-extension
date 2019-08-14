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
    name: 'IDEA',
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
    name: 'Project Rider',
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

export function getToolboxURN(tool, cloneUrl) {
  return `jetbrains://${tool}/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;
}

(function enablePageActionIIFE() {
  chrome.runtime.sendMessage({type: 'enable-page-action'});
}());
