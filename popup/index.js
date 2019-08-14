function createOpenToolAction(tool) {
  const icon = document.createElement('img');
  icon.setAttribute('class', 'tool-action__icon');
  icon.setAttribute('alt', tool.name);
  icon.setAttribute('src', tool.icon);

  const text = document.createElement('span');
  text.setAttribute('class', 'tool-action__text');
  text.textContent = `Open in ${tool.name}`;

  const action = document.createElement('a');
  action.setAttribute('class', 'tool-action');
  action.setAttribute('href', tool.cloneUrl);
  action.setAttribute('aria-label', text.textContent);

  action.appendChild(icon);
  action.appendChild(text);

  action.addEventListener('click', e => {
    e.preventDefault();

    chrome.tabs.executeScript({
      code: `
        (function () {
          var action = document.createElement('a');
          action.style.position = 'absolute';
          action.style.left = '-9999em';
          action.href = '${e.currentTarget.href}';
          document.body.appendChild(action);
          action.click();
          document.body.removeChild(action);
        })();`
    });
  });
  return action;
}

chrome.tabs.query({active: true, currentWindow: true}, tabs => {
  chrome.tabs.sendMessage(tabs[0].id, {type: 'get-tools'}, tools => {
    if (tools == null) {
      return;
    }

    const fragment = document.createDocumentFragment();
    tools.forEach(tool => {
      fragment.appendChild(createOpenToolAction(tool));
    });
    document.getElementById('tool-action-stub').style.display = 'none';
    document.querySelector('.js-tool-actions').appendChild(fragment);
  });
});
