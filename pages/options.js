chrome.runtime.sendMessage({type: 'get-protocol'}, data => {
  const protocolInput = document.querySelector(`.js-protocol-input[value="${data.protocol}"]`);
  protocolInput.checked = true;
});

document.querySelector('.js-protocol-input-group').addEventListener('change', e => {
  chrome.runtime.sendMessage({type: 'save-protocol', protocol: e.target.value});
});
