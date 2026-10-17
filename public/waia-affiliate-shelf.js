/* Health affiliate shelf for /store.
   Renders only items that are on Jonathan's list AND carry a real link AND a provenance note.
   Stores nothing, sends nothing, takes no payment: each item is an outbound link to the merchant. */
(function (root) {
  var DISCLOSURE = 'Some links on this shelf are affiliate links. If you buy through one, What Am I Appreciating Now may earn a commission at no extra cost to you. We list an item only because it is on Jonathan\'s own list, and a commission never changes what we say about it. Nothing here is medical advice, and none of it is meant to diagnose, treat or cure anything; talk to a qualified professional about your health.';

  // Add items here once Jonathan hands over his list and an affiliate programme has approved him.
  // Shape and rules: docs/AFFILIATE-SHELF.md. Never invent a link, an affiliate ID or a product claim.
  var ITEMS = [];

  var REQUIRED = ['id', 'name', 'merchant', 'url', 'blurb', 'listedBy', 'listedOn', 'provenance'];

  function check(item) {
    if (!item || typeof item !== 'object') return 'not an object';
    for (var i = 0; i < REQUIRED.length; i++) {
      var v = item[REQUIRED[i]];
      if (typeof v !== 'string' || !v.trim()) return 'missing ' + REQUIRED[i];
    }
    if (item.listedBy !== 'jonathan') return 'not on Jonathan\'s list';
    if (item.affiliate !== true && item.affiliate !== false) return 'affiliate must be true or false';
    if (!/^https:\/\/[^\s/]+\.[^\s/]+/.test(item.url)) return 'url must be https';
    if (/placeholder|your[-_ ]?(id|tag)|\{[^}]*\}|<[^>]*>|example\.com/i.test(item.url)) return 'url is a placeholder';
    return null;
  }

  function shelfItems(items) {
    var ok = [];
    (items || []).forEach(function (it) { if (!check(it)) ok.push(it); });
    return ok;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(container, items) {
    var list = shelfItems(items);
    container.textContent = '';
    if (!list.length) {
      container.appendChild(el('p', 'fine', 'The shelf is being stocked. Nothing is listed yet.'));
      return list;
    }
    var grid = el('div', 'grid');
    list.forEach(function (it) {
      var card = el('article', 'card');
      var body = el('div', 'card-body');
      body.appendChild(el('span', 'state', it.affiliate ? 'Affiliate link' : 'Outbound link'));
      body.appendChild(el('h3', null, it.name));
      body.appendChild(el('div', 'tag', 'From ' + it.merchant));
      body.appendChild(el('p', null, it.blurb));
      var a = el('a', null, 'View at ' + it.merchant);
      a.href = it.url;
      a.rel = (it.affiliate ? 'sponsored ' : '') + 'noopener noreferrer';
      a.target = '_blank';
      var p = el('p');
      p.appendChild(a);
      body.appendChild(p);
      var r = el('p', 'rights');
      r.appendChild(el('strong', null, 'Provenance. '));
      r.appendChild(document.createTextNode(it.provenance + ' Listed by ' + it.listedBy + ' on ' + it.listedOn + '.'));
      body.appendChild(r);
      card.appendChild(body);
      grid.appendChild(card);
    });
    container.appendChild(grid);
    return list;
  }

  root.WaiaShelf = { check: check, shelfItems: shelfItems, render: render, ITEMS: ITEMS, DISCLOSURE: DISCLOSURE };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WaiaShelf;

  if (typeof document === 'undefined') return;
  var mount = document.getElementById('shelf-items');
  if (mount) render(mount, ITEMS);
})(typeof window !== 'undefined' ? window : globalThis);
