/* Privacy-first counters: one anonymous beacon per page view and per "notify me" tap.
   No cookies, no storage, no ids. Skipped when the visitor sends Do Not Track or
   Global Privacy Control. Page and item come from <body data-waia-page data-waia-slug>;
   any element with data-waia-notify="<item-slug>" counts a tap. */
(function (root) {
  var ENDPOINT = '/api/counters';

  function optedOut(nav) {
    nav = nav || (typeof navigator !== 'undefined' ? navigator : {});
    return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
  }

  function send(kind, page, slug) {
    if (optedOut() || typeof fetch === 'undefined') return;
    var body = { kind: kind, page: page };
    if (slug) body.slug = slug;
    try {
      fetch(ENDPOINT, {
        method: 'POST', credentials: 'omit', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }).catch(function () {});
    } catch (e) { /* never break the page */ }
  }

  root.WaiaCounters = { send: send, optedOut: optedOut, ENDPOINT: ENDPOINT };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WaiaCounters;
  if (typeof document === 'undefined') return;

  var data = document.body ? document.body.dataset : {};
  if (data.waiaPage) send('view', data.waiaPage, data.waiaSlug);
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-waia-notify]') : null;
    if (el) send('notify', data.waiaPage || 'merch', el.getAttribute('data-waia-notify'));
  });
})(typeof window !== 'undefined' ? window : globalThis);
