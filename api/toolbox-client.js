import androidStudioIcon from '@jetbrains/logos/android-studio/android-studio.svg';
import aquaIcon from '@jetbrains/logos/aqua/aqua.svg';
import appcodeIcon from '@jetbrains/logos/appcode/appcode.svg';
import appcodeEapIcon from '@jetbrains/logos/appcode/appcode-eap.svg';
import clionIcon from '@jetbrains/logos/clion/clion.svg';
import clionEapIcon from '@jetbrains/logos/clion/clion-eap.svg';
import datagripIcon from '@jetbrains/logos/datagrip/datagrip.svg';
import datagripEapIcon from '@jetbrains/logos/datagrip/datagrip-eap.svg';
import dataspellIcon from '@jetbrains/logos/dataspell/dataspell.svg';
import fleetIcon from '@jetbrains/logos/fleet/fleet.svg';
import gatewayIcon from '@jetbrains/logos/gateway/gateway.svg';
import golandIcon from '@jetbrains/logos/goland/goland.svg';
import golandEapIcon from '@jetbrains/logos/goland/goland-eap.svg';
import ideaIcon from '@jetbrains/logos/intellij-idea/intellij-idea.svg';
import ideaEapIcon from '@jetbrains/logos/intellij-idea/intellij-idea-eap.svg';
import fallbackIcon from '@jetbrains/logos/jetbrains/jetbrains-grayscale.svg';
import phpstormIcon from '@jetbrains/logos/phpstorm/phpstorm.svg';
import phpstormEapIcon from '@jetbrains/logos/phpstorm/phpstorm-eap.svg';
import pycharmIcon from '@jetbrains/logos/pycharm/pycharm.svg';
import pycharmEapIcon from '@jetbrains/logos/pycharm/pycharm-eap.svg';
import riderIcon from '@jetbrains/logos/rider/rider.svg';
import riderEapIcon from '@jetbrains/logos/rider/rider-eap.svg';
import rubymineIcon from '@jetbrains/logos/rubymine/rubymine.svg';
import rubymineEapIcon from '@jetbrains/logos/rubymine/rubymine-eap.svg';
import webstormIcon from '@jetbrains/logos/webstorm/webstorm.svg';
import webstormEapIcon from '@jetbrains/logos/webstorm/webstorm-eap.svg';

const APPLICATION_NAME = 'com.jetbrains.toolbox';

const MESSAGES = {
  GET_CAPABILITIES: 'get-capabilities',
  GET_INSTALLED_TOOLS: 'get-installed-tools'
};

class ApplicationIcon {
  icon;
  eapIcon;

  constructor(icon, eapIcon = null) {
    this.icon = icon;
    this.eapIcon = eapIcon;
  }

  getIcon(isEap) {
    return (isEap && this.eapIcon) ? this.eapIcon : this.icon;
  }
}

// tag to icon
const DEFAULT_ICONS = {
  studio: new ApplicationIcon(androidStudioIcon),
  appcode: new ApplicationIcon(appcodeIcon, appcodeEapIcon),
  aqua: new ApplicationIcon(aquaIcon),
  clion: new ApplicationIcon(clionIcon, clionEapIcon),
  dataspell: new ApplicationIcon(dataspellIcon),
  dbe: new ApplicationIcon(datagripIcon, datagripEapIcon),
  fleet: new ApplicationIcon(fleetIcon),
  jetbrainsGateway: new ApplicationIcon(gatewayIcon),
  goland: new ApplicationIcon(golandIcon, golandEapIcon),
  idea: new ApplicationIcon(ideaIcon, ideaEapIcon),
  'php-storm': new ApplicationIcon(phpstormIcon, phpstormEapIcon),
  phpstorm: new ApplicationIcon(phpstormIcon, phpstormEapIcon),
  pycharm: new ApplicationIcon(pycharmIcon, pycharmEapIcon),
  rd: new ApplicationIcon(riderIcon, riderEapIcon),
  rider: new ApplicationIcon(riderIcon, riderEapIcon),
  rubymine: new ApplicationIcon(rubymineIcon, rubymineEapIcon),
  'web-storm': new ApplicationIcon(webstormIcon, webstormEapIcon),
  webstorm: new ApplicationIcon(webstormIcon, webstormEapIcon)
};

export const RESPONSE_STATUS = {
  OK: 'ok',
  ERROR: 'error'
};

export const TOOLBOX_APP_STATUS = {
  INSTALLED: 'installed',
  INSTALLED_ERROR: 'installed-error',
  NOT_INSTALLED: 'not-installed'
};

export class ToolboxAppState {
  status;
  error;

  constructor(status, error = null) {
    this.status = status;
    this.error = error;
  }
}

class Request {
  method;
  arguments;
  id;

  constructor(message, args = {}) {
    this.method = message;
    this.arguments = args;
    this.id = Request.requestId();
  }

  static requestId() {
    return crypto.randomUUID();
  }
}

const sendNativeMessage = request => new Promise((resolve, reject) => {
  chrome.runtime.sendNativeMessage(APPLICATION_NAME, request, response => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError);
    } else if (response.status === RESPONSE_STATUS.OK) {
      resolve(response.result);
    } else {
      reject(response.error);
    }
  });
});

const getDefaultIcon = (tag, isEap) => {
  if (DEFAULT_ICONS.hasOwnProperty(tag)) {
    const icons = DEFAULT_ICONS[tag];
    return icons.getIcon(isEap);
  } else {
    return fallbackIcon;
  }
};

export const getCapabilities = () => sendNativeMessage(new Request(MESSAGES.GET_CAPABILITIES));

export const getInstalledTools = async () => {
  const result = await sendNativeMessage(new Request(MESSAGES.GET_INSTALLED_TOOLS));
  return result.tools.map(tool => ({
    ...tool,
    defaultIcon: getDefaultIcon(tool.tag, tool.isEap)
  }));
};

export const getToolboxAppState = async () => {
  try {
    const response = await getCapabilities();
    if (response.status === RESPONSE_STATUS.OK) {
      return new ToolboxAppState(TOOLBOX_APP_STATUS.INSTALLED);
    } else {
      return new ToolboxAppState(TOOLBOX_APP_STATUS.INSTALLED_ERROR, response.error);
    }
  } catch (e) {
    return new ToolboxAppState(TOOLBOX_APP_STATUS.NOT_INSTALLED, e);
  }
};
