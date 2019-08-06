/** @author Johannes Tegnér <johannes@jitesoft.com> */
import 'whatwg-fetch';

import {
  supportedLanguages,
  supportedTools,
  getToolboxURN,
  USAGE_THRESHOLD,
  DEFAULT_LANGUAGE
} from './common';

const node = document.querySelector('.project-repo-buttons');
const regex = /https:\/\/gitlab.com\/(.+)/;

function selectTools(languages) {
  const overallPoints = Object.keys(languages).
    map(lang => languages[lang]).
    reduce((overall, current) => overall + current, 0);

  const filterLang = lang =>
    supportedLanguages[lang.toLowerCase()] &&
    languages[lang] / overallPoints > USAGE_THRESHOLD;

  const selectedTools = Object.keys(languages).
    filter(filterLang).
    reduce((acc, lang) => {
      acc.push(...supportedLanguages[lang.toLowerCase()]);
      return acc;
    }, []);

  return selectedTools.length > 0 ? Array.from(new Set(selectedTools)) : supportedLanguages[DEFAULT_LANGUAGE];
}

function renderButtons(tools, meta) {
  const group = document.createElement('div');
  group.setAttribute('class', 'd-inline-flex');
  group.setAttribute('style', 'margin-top: 16px;');

  tools.
    sort().
    map(id => supportedTools[id]).
    forEach(tool => {
      const button = document.createElement('a');
      button.setAttribute('href', getToolboxURN(tool.tag, meta.ssh));
      button.setAttribute('class', 'input-group-text btn btn-xs');
      button.setAttribute('aria-label', `Open in ${tool.name}`);
      button.innerHTML =
        `<img alt="${tool.name}" src="${tool.icon}" width="16" height="16" style="vertical-align: text-top;">`;
      group.appendChild(button);
    });

  node.appendChild(group);
}

function getMetaData() {
  let element = null;
  const children = document.querySelector('.home-panel-metadata').children;

  for (let i = children.length; i-- > 0;) {
    // eslint-disable-next-line no-magic-numbers
    if (children[i].innerHTML.indexOf('Project ID') !== -1) {
      element = children[i];
      break;
    }
  }

  if (!element) {
    return null;
  }

  const id = element.innerHTML.replace('Project ID:', '').trim();
  // noinspection JSUnresolvedVariable
  return fetch(`https://gitlab.com/api/v4/projects/${id}`).then(r => r.json()).then(meta => ({
    ssh: meta.ssh_url_to_repo,
    id: meta.id
  }));
}

if (node && regex.test(window.location.href)) {
  getMetaData().
    then(meta => fetch(`https://gitlab.com/api/v4/projects/${meta.id}/languages`).
      then(r => r.json()).
      then(selectTools).
      then(tools => renderButtons(tools, meta))).
    catch(() => { /*Do nothing.*/ });
}

