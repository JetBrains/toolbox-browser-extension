import DomObserver from "../../utils/dom-observer.js";
import { callToolbox, getToolboxNavURN, parseLineNumber } from "../../../api/toolbox.js";

export const observeBlobPage = (metadata, tools) => {
  const domObserver = new DomObserver("#fileHolder");

  domObserver.start((el) => {
    const lastButtonsGroup = el.querySelector(".file-actions > .btn-group:last-child");
    if (lastButtonsGroup) {
      const openButtonsGroup = document.createElement("div");
      openButtonsGroup.classList.add("btn-group");
      openButtonsGroup.dataset.testid = "open-buttons-group";
      openButtonsGroup.setAttribute("role", "group");

      const copyFilePathButton = el.querySelector(
        '.file-header-content button[id^="clipboard-button"]',
      );
      if (copyFilePathButton) {
        try {
          const { text: filePath } = JSON.parse(copyFilePathButton.dataset.clipboardText);
          if (filePath) {
            tools.forEach((tool) => {
              const action = createOpenButton(tool, metadata, filePath);
              openButtonsGroup.appendChild(action);
            });

            lastButtonsGroup.insertAdjacentElement("beforebegin", openButtonsGroup);
          }
        } catch {
          // do nothing
        }
      }
    }
  });
};

const createOpenButton = (tool, metadata, filePath) => {
  const button = document.createElement("button");
  button.setAttribute("class", "btn btn-default btn-md gl-button btn-icon");
  button.setAttribute("type", "button");
  button.setAttribute("aria-label", `Open in ${tool.name}`);
  button.setAttribute("aria-describedby", createTooltip(tool).id);
  button.dataset.filePath = filePath;

  const buttonIcon = document.createElement("img");
  buttonIcon.setAttribute("alt", tool.name);
  buttonIcon.setAttribute("src", tool.icon);
  buttonIcon.setAttribute("class", "gl-button-icon gl-icon s16 gl-fill-current");
  button.appendChild(buttonIcon);

  addOpenButtonEventHandler(button, tool, metadata);
  addHoverEventHandler(button);

  return button;
};

const createTooltip = (tool) => {
  const tooltip = document.createElement("div");
  tooltip.id = `toolbox-tooltip-${tool.tag}`;
  tooltip.role = "tooltip";
  tooltip.tabIndex = -1;
  tooltip.setAttribute("class", "tooltip b-tooltip bs-tooltip-top gl-tooltip fade");
  tooltip.style.position = "absolute";
  tooltip.style.display = "none";
  tooltip.style.willChange = "transform";
  tooltip.style.top = "0";
  tooltip.style.left = "0";
  tooltip.style.transition = "transition: opacity 0.3s ease";

  const arrow = document.createElement("div");
  arrow.classList.add("arrow");
  arrow.style.left = "50%";
  arrow.style.marginLeft = "0";
  arrow.style.marginRight = "0";
  arrow.style.transform = "translateX(-50%)";
  tooltip.appendChild(arrow);

  const innerTooltip = document.createElement("div");
  innerTooltip.classList.add("tooltip-inner");
  innerTooltip.textContent = `Open in ${tool.name}`;
  tooltip.appendChild(innerTooltip);

  document.body.appendChild(tooltip);

  return tooltip;
};

const addOpenButtonEventHandler = (button, tool, metadata) => {
  const mrPageHashPartsCount = 3;

  button.addEventListener("click", (e) => {
    e.preventDefault();

    const filePath = e.currentTarget.dataset.filePath;
    let lineNumber = "";
    if (document.body.dataset.page === "projects:merge_requests:show") {
      const hashParts = location.hash.split("_");
      if (hashParts.length === mrPageHashPartsCount) {
        lineNumber = hashParts.pop();
      }
    } else {
      lineNumber = location.hash.replace("#L", "");
    }

    const parsedLineNumber = parseLineNumber(lineNumber);

    callToolbox(getToolboxNavURN(tool.tag, metadata.project, filePath, parsedLineNumber));
  });
};

const addHoverEventHandler = (button) => {
  button.addEventListener("mouseenter", (event) => {
    const tooltipId = event.target.getAttribute("aria-describedby");
    const tooltip = document.getElementById(tooltipId);

    if (tooltip) {
      const buttonRect = event.target.getBoundingClientRect();
      tooltip.style.display = "block";
      const tooltipRect = tooltip.getBoundingClientRect();
      // eslint-disable-next-line no-magic-numbers
      const centerX = buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2;
      const topY = buttonRect.top - tooltipRect.height;

      tooltip.style.transform = `translate3d(${centerX}px, ${topY}px, 0px)`;
      tooltip.style.transitionDelay = ".4s";
      tooltip.classList.add("show");
    }
  });

  button.addEventListener("mouseleave", (event) => {
    const tooltipId = event.target.getAttribute("aria-describedby");
    const tooltip = document.getElementById(tooltipId);

    if (tooltip) {
      tooltip.style.transitionDelay = "0s";
      tooltip.classList.remove("show");
      tooltip.addEventListener(
        "transitionend",
        () => {
          tooltip.style.display = "none";
        },
        { once: true },
      );
    }
  });
};
