/* Dependency-free signup handler shared by the static WAIA front door and store. */
(() => {
  const thankYou = 'Thanks — you’re on the list.';

  document.querySelectorAll('[data-email-signup]').forEach((container) => {
    const form = container instanceof HTMLFormElement ? container : container.querySelector('form');
    const input = container.querySelector('[data-email-input]');
    const button = container.querySelector('button[type="submit"]');
    const status = container.querySelector('[data-email-status]');
    if (!form || !input || !button || !status) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.textContent = '';
      button.disabled = true;
      const original = button.textContent;
      button.textContent = 'Joining…';
      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: input.value,
            sourcePage: window.location.pathname,
            website: new FormData(form).get('website'),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.ok) {
          status.textContent = result.message || thankYou;
          input.value = '';
        } else {
          status.textContent = result.error || 'We could not save that right now. Please try again shortly.';
        }
      } catch {
        status.textContent = 'We could not save that right now. Please try again shortly.';
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });
  });
})();
