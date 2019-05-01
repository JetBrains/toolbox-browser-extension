import 'whatwg-fetch';

import gh from 'github-url-to-object';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  USAGE_THRESHOLD
} from './common';

const appendNode = document.getElementsByClassName('file-navigation')[0];
const githubInfo = gh(window.location.toString());

function selectTools(langs) {
  const overallPoints = Object.keys(langs).
    map(lang => langs[lang]).
    reduce((overall, current) => overall + current, 0);

  const filterLang = lang =>
    supportedLanguages[lang.toLowerCase()] &&
    langs[lang] / overallPoints > USAGE_THRESHOLD;

  const selectedToolIds = Object.keys(langs).
    filter(filterLang).
    reduce((selected, lang) => [...selected, ...supportedLanguages[lang.toLowerCase()]], []);

  return selectedToolIds.length ? [...new Set(selectedToolIds)] : ['idea'];
}

function renderButtons(tools) {
  const buttonGroup = document.createElement('div');
  const cloneUrl = `git@github.com:${githubInfo.user}/${githubInfo.repo}.git`;

  tools.
    map(toolId => supportedTools[toolId]).
    forEach(tool => {
      const btn = document.createElement('a');
      btn.setAttribute('class', 'btn btn-sm tooltipped tooltipped-s tooltipped-multiline BtnGroup-item');
      btn.setAttribute('href', getToolboxURN(tool.tag, cloneUrl));
      btn.setAttribute('aria-label', `Open in ${tool.name}`);
      btn.innerHTML = `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align: text-top;">`;

      buttonGroup.appendChild(btn);
    });

  buttonGroup.classList.add('BtnGroup');
  buttonGroup.classList.add('float-right');
  appendNode.appendChild(buttonGroup);
}

if (appendNode && githubInfo) {
  const languagesUrl = `${githubInfo.api_url}/languages`;

  fetch(languagesUrl).
    then(response => response.json()).
    then(selectTools).
    then(renderButtons);
}
