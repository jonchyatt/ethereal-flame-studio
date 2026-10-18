/* Support the channel: custom-work intake for /store.
   Sends the request to /api/custom-orders when intake is open, and takes no payment.
   While intake is closed (the API answers 503) it only shows the request back. */
(function (root) {
  var KINDS = { hypnosis: 'Custom hypnosis session', vr: 'Custom VR session' };
  var MAX = 1000;

  function buildEcho(input) {
    var kind = KINDS[input && input.kind];
    var details = String((input && input.details) || '').trim().slice(0, MAX);
    if (!kind) return { ok: false, error: 'Choose a hypnosis or VR session.' };
    if (!details) return { ok: false, error: 'Describe what you would like, in a few words.' };
    return { ok: true, kind: kind, details: details, contact: String((input && input.contact) || '').trim().slice(0, 200) };
  }

  root.WaiaSupport = { buildEcho: buildEcho, KINDS: KINDS, MAX: MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WaiaSupport;

  if (typeof document === 'undefined') return;
  var form = document.getElementById('intake-form');
  if (!form) return;
  var out = document.getElementById('intake-echo');
  function show(heading, lines, link) {
    out.textContent = '';
    var h = document.createElement('h3');
    h.textContent = heading;
    out.appendChild(h);
    lines.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; out.appendChild(p); });
    if (link) {
      var a = document.createElement('a');
      a.href = link; a.textContent = 'Check on your request';
      out.appendChild(a);
    }
    out.hidden = false;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = buildEcho({ kind: form.elements.kind.value, details: form.elements.details.value, contact: form.elements.contact.value });
    if (!r.ok) { show('Not yet', [r.error]); return; }
    var preview = function () {
      show('Your request, shown back', [r.kind + ': ' + r.details,
        'Coming soon. Requests are not open yet, so this was not saved or sent anywhere, and nothing has been charged. Keep a copy if you want it.']);
    };
    fetch('/api/custom-orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: form.elements.kind.value, details: r.details, contact: r.contact, website: form.elements.website.value }),
    }).then(function (res) {
      if (res.status === 503) { preview(); return null; }
      return res.json().then(function (j) { return { ok: res.ok, body: j }; });
    }).then(function (res) {
      if (!res) return;
      if (!res.ok) { show('Not yet', [res.body.error || 'That did not go through. Please try again.']); return; }
      form.reset();
      show('Request received', [r.kind + ': ' + r.details,
        'Keep this reference to check on your request: ' + res.body.reference,
        'Nothing has been charged. You will see a quote there when one is ready, and you can accept or decline it.'],
        '/store/custom-order#ref=' + encodeURIComponent(res.body.reference));
    }).catch(function () { show('Not yet', ['That did not go through. Please try again.']); });
  });
})(typeof window !== 'undefined' ? window : globalThis);
