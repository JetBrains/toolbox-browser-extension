import m, {MESSAGES} from '../api/messages';

const selectProtocolInput = protocol => {
  const checkedProtocolInput = document.querySelector(`.js-protocol-input[value="${protocol}"]`);
  if (checkedProtocolInput) {
    checkedProtocolInput.checked = true;
  }

  const uncheckedProtocolInput = document.querySelector(`.js-protocol-input:not([value="${protocol}"])`);
  if (uncheckedProtocolInput) {
    const labelClone = document.getElementById('lbl-clone');
    if (labelClone) {
      labelClone.setAttribute('for', uncheckedProtocolInput.id);
    }
  }
};

chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
  selectProtocolInput(data.protocol);
});

chrome.runtime.sendMessage({type: 'get-modify-pages'}, data => {
  const modifyPagesInput = document.getElementById('chk-modify-page');
  modifyPagesInput.checked = data.allow;
});

chrome.runtime.sendMessage(m(MESSAGES.GET_LOGGING), data => {
  const loggingInput = document.getElementById('chk-logging');
  loggingInput.checked = data.allow;
});

document.querySelector('.js-protocol-input-group').addEventListener('change', e => {
  chrome.runtime.sendMessage({type: 'save-protocol', protocol: e.target.value});
});

document.getElementById('chk-modify-page').addEventListener('change', e => {
  chrome.runtime.sendMessage({type: 'save-modify-pages', allow: e.target.checked});
});

document.getElementById('chk-logging').addEventListener('change', e => {
  chrome.runtime.sendMessage(m(MESSAGES.SAVE_LOGGING, e.target.checked));
});

chrome.runtime.onMessage.addListener(message => {
  switch (message.type) {
    case 'protocol-changed':
      selectProtocolInput(message.newValue);
      break;
    // no default
  }
});
