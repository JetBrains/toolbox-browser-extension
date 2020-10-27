import ideaIcon from '@jetbrains/logos/intellij-idea/intellij-idea.svg';
import appcodeIcon from '@jetbrains/logos/appcode/appcode.svg';
import clionIcon from '@jetbrains/logos/clion/clion.svg';
import pycharmIcon from '@jetbrains/logos/pycharm/pycharm.svg';
import phpstormIcon from '@jetbrains/logos/phpstorm/phpstorm.svg';
import rubymineIcon from '@jetbrains/logos/rubymine/rubymine.svg';
import webstormIcon from '@jetbrains/logos/webstorm/webstorm.svg';
import riderIcon from '@jetbrains/logos/rider/rider.svg';
import golandIcon from '@jetbrains/logos/goland/goland.svg';

export const DEFAULT_LANGUAGE = 'java';

export const SUPPORTED_LANGUAGES = {
  [DEFAULT_LANGUAGE]: ['idea'],
  kotlin: ['idea'],
  groovy: ['idea'],
  scala: ['idea'],
  javascript: ['webstorm', 'phpstorm', 'idea'],
  coffeescript: ['webstorm', 'phpstorm', 'idea'],
  typescript: ['webstorm', 'phpstorm', 'idea'],
  dart: ['webstorm', 'phpstorm', 'idea'],
  go: ['goland', 'idea'],
  css: ['webstorm', 'phpstorm', 'idea'],
  html: ['webstorm', 'phpstorm', 'idea'],
  python: ['pycharm', 'idea'],
  'jupyter notebook': ['pycharm', 'idea'],
  php: ['phpstorm', 'idea'],
  'c#': ['rider'],
  'f#': ['rider'],
  'c++': ['clion'],
  c: ['clion'],
  ruby: ['rubymine', 'idea'],
  rust: ['clion', 'idea'],
  puppet: ['rubymine', 'idea'],
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
