(function () {
  var form = document.querySelector('.contact-form');
  if (!form) return;

  var status = document.getElementById('contact-status');
  var button = form.querySelector('button[type="submit"]');

  function setStatus(message, state) {
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.dataset.state = state;
  }

  form.addEventListener('submit', function (event) {
    var honey = form.querySelector('[name="_honey"]');
    if (honey && String(honey.value || '').trim()) {
      event.preventDefault();
      form.reset();
      setStatus('Message sent.', 'ok');
      return;
    }

    if (button) button.disabled = true;
    setStatus('Sending…', 'pending');
  });
})();
