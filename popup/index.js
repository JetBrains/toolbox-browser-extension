function createOpenToolAction(tool) {
  const icon = document.createElement('img');
  icon.setAttribute('class', 'tool-action__icon');
  icon.setAttribute('alt', tool.name);
  icon.setAttribute('src', tool.icon);

  const defaultText = document.createElement('span');
  defaultText.setAttribute('class', 'tool-action__text');
  defaultText.textContent = `Open in ${tool.name}`;

  const defaultAction = document.createElement('a');
  defaultAction.setAttribute('class', 'tool-action');
  defaultAction.setAttribute('href', tool.cloneUrl);
  defaultAction.setAttribute('aria-label', defaultText.textContent);

  defaultAction.append(icon);
  defaultAction.append(defaultText);

  setClickHandler(defaultAction);

  const sshText = document.createElement('span');
  sshText.setAttribute('class', 'tool-action__text');
  sshText.textContent = 'using SSH';

  const sshAction = document.createElement('a');
  sshAction.setAttribute('class', 'tool-action');
  sshAction.setAttribute('href', tool.sshUrl);
  sshAction.setAttribute('aria-label', sshText.textContent);

  sshAction.append(sshText);

  setClickHandler(sshAction);

  const actionContainer = document.createElement('div');
  actionContainer.setAttribute('class', 'tool-action-container');

  actionContainer.append(defaultAction);
  actionContainer.append('/');
  actionContainer.append(sshAction);

  return actionContainer;
}

function setClickHandler(action) {
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
}

chrome.tabs.query({active: true, currentWindow: true}, tabs => {
  chrome.tabs.sendMessage(tabs[0].id, {type: 'get-tools'}, tools => {
    if (tools == null) {
      return;
    }

    const fragment = document.createDocumentFragment();
    tools.forEach(tool => {
      fragment.append(createOpenToolAction(tool));
    });
    document.getElementById('tool-action-stub').style.display = 'none';
    document.querySelector('.js-tool-actions').append(fragment);
  });
});
