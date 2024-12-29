import ideaIcon from "@jetbrains/logos/intellij-idea/intellij-idea.svg";
import appcodeIcon from "@jetbrains/logos/appcode/appcode.svg";
import clionIcon from "@jetbrains/logos/clion/clion.svg";
import pycharmIcon from "@jetbrains/logos/pycharm/pycharm.svg";
import phpstormIcon from "@jetbrains/logos/phpstorm/phpstorm.svg";
import rubymineIcon from "@jetbrains/logos/rubymine/rubymine.svg";
import webstormIcon from "@jetbrains/logos/webstorm/webstorm.svg";
import riderIcon from "@jetbrains/logos/rider/rider.svg";
import golandIcon from "@jetbrains/logos/goland/goland.svg";
import rustroverIcon from "@jetbrains/logos/rustrover/rustrover.svg";

export default class Tool {
  #name;
  #tag;
  #icon;

  constructor(name, tag, icon) {
    this.#name = name;
    this.#tag = tag;
    this.#icon = icon;
  }

  get name() {
    return this.#name;
  }

  get tag() {
    return this.#tag;
  }

  get icon() {
    return this.#icon;
  }

  toJSON() {
    return {
      name: this.name,
      tag: this.tag,
      icon: this.icon,
    };
  }

  static Default = new Tool("IntelliJ IDEA", "idea", ideaIcon);
}

const idea = Tool.Default;
const appcode = new Tool("AppCode", "appcode", appcodeIcon);
const clion = new Tool("CLion", "clion", clionIcon);
const pycharm = new Tool("PyCharm", "pycharm", pycharmIcon);
const phpstorm = new Tool("PhpStorm", "php-storm", phpstormIcon);
const rubymine = new Tool("RubyMine", "rubymine", rubymineIcon);
const webstorm = new Tool("WebStorm", "web-storm", webstormIcon);
const rider = new Tool("Rider", "rd", riderIcon);
const goland = new Tool("GoLand", "goland", golandIcon);
const rustrover = new Tool("RustRover", "rustrover", rustroverIcon);

export const SUPPORTED_TOOLS = {
  idea,
  appcode,
  clion,
  pycharm,
  phpstorm,
  rubymine,
  webstorm,
  rider,
  goland,
  rustrover,
};
