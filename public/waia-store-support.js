/* Support the channel: custom-work intake for /store.
   Stores nothing, sends nothing, takes no payment. It only shows the request back. */
(function (root) {
  var KINDS = { hypnosis: 'Custom hypnosis session', vr: 'Custom VR session' };
  var MAX = 1000;

  function buildEcho(input) {
    var kind = KINDS[input && input.kind];
    var details = String((input && input.details) || '').trim().slice(0, MAX);
    if (!kind) return { ok: false, error: 'Choose a hypnosis or VR session.' };
    if (!details) return { ok: false, error: 'Describe what you would like, in a few words.' };
    return { ok: true, kind: kind, details: details };
  }

  root.WaiaSupport = { buildEcho: buildEcho, KINDS: KINDS, MAX: MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WaiaSupport;

  if (typeof document === 'undefined') return;
  var form = document.getElementById('intake-form');
  if (!form) return;
  var out = document.getElementById('intake-echo');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = buildEcho({ kind: form.elements.kind.value, details: form.elements.details.value });
    out.textContent = '';
    var h = document.createElement('h3');
    var p = document.createElement('p');
    var note = document.createElement('p');
    if (!r.ok) {
      h.textContent = 'Not yet';
      p.textContent = r.error;
    } else {
      h.textContent = 'Your request, shown back';
      p.textContent = r.kind + ': ' + r.details;
      note.textContent = 'Coming soon. This request was not saved or sent anywhere, and nothing has been charged. Keep a copy if you want it.';
    }
    out.appendChild(h); out.appendChild(p); out.appendChild(note);
    out.hidden = false;
  });
})(typeof window !== 'undefined' ? window : globalThis);
