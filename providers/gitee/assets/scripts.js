document.addEventListener('init-open-buttons-tooltips', () => {
  window.jQuery('.js-open-button').popup({position: 'bottom center'});
});
document.addEventListener('destroy-open-buttons-tooltips', () => {
  window.jQuery('.js-open-button').popup('destroy');
});
