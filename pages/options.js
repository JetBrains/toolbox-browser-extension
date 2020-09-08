const selectProtocolInput = protocol => {
  const protocolInput = document.querySelector(`.js-protocol-input[value="${protocol}"]`);
  if (protocolInput) {
    protocolInput.checked = true;
  }
};

chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
  selectProtocolInput(data.protocol);
});

chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
  const modifyPagesInput = document.querySelector('.js-modify-pages-input');
  modifyPagesInput.checked = data.allow;
});

document.querySelector('.js-protocol-input-group').addEventListener('change', e => {
  chrome.runtime.sendMessage({type: 'save-protocol', protocol: e.target.value});
});

document.querySelector('.js-modify-pages-input').addEventListener('change', e => {
  chrome.runtime.sendMessage({type: 'save-modify-pages', allow: e.target.checked});
});

chrome.runtime.onMessage.addListener(message => {
  switch (message.type) {
    case 'protocol-changed':
      selectProtocolInput(message.newValue);
      break;
    // no default
  }
});
