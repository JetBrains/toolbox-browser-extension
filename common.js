/* eslint-disable import/no-commonjs,max-len */
/* globals chrome require */

export const supportedLanguages = {
  Java: ['idea'],
  Kotlin: ['idea'],
  Groovy: ['idea'],
  Scala: ['idea'],
  JavaScript: ['webstorm', 'idea'],
  CoffeeScript: ['webstorm', 'idea'],
  TypeScript: ['webstorm', 'idea'],
  Dart: ['webstorm', 'idea'],
  Go: ['goland'],
  CSS: ['webstorm', 'idea'],
  HTML: ['webstorm', 'idea'],
  Python: ['pycharm', 'idea'],
  PHP: ['phpstorm', 'idea'],
  'C#': ['rider'],
  'C++': ['clion'],
  C: ['clion'],
  Ruby: ['rubymine', 'idea'],
  Puppet: ['rubymine', 'idea'],
  'Objective-C': ['appcode'],
  Swift: ['appcode']
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
    icon: chrome.extension.getURL(require('@jetbrains/logos/gogland/gogland.svg'))
  }
};

export const USAGE_THRESHOLD = 0.05;

export function getToolboxURN(tool, cloneUrl) {
  return `jetbrains://${tool}/checkout/git?checkout.repo=${cloneUrl}&idea.required.plugins.id=Git4Idea`;
}

