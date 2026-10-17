import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const html = fs.readFileSync(path.join(root, 'public/waia-store.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/waia-affiliate-shelf.js'), 'utf8');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const shelf = require(path.join(root, 'public/waia-affiliate-shelf.js'));

const good = {
  id: 'x', name: 'Item', merchant: 'Merchant', url: 'https://shop.test/item?ref=abc123',
  blurb: 'As described by the merchant.', affiliate: true, listedBy: 'jonathan',
  listedOn: '2026-10-17', provenance: 'Programme-issued link.',
};

describe('store: health affiliate shelf', () => {
  it('ships empty, so nothing invented is shown', () => {
    expect(shelf.ITEMS).toEqual([]);
    expect(html).toContain('The shelf is being stocked');
  });

  it('puts the disclosure before the items, in the page and matching the script', () => {
    const s = html.slice(html.indexOf('<section id="shelf">'), html.indexOf('<section id="support">'));
    expect(s.indexOf('Disclosure.')).toBeGreaterThan(-1);
    expect(s.indexOf('Disclosure.')).toBeLessThan(s.indexOf('id="shelf-items"'));
    expect(s).toMatch(/affiliate links/);
    expect(s).toMatch(/no extra cost/);
    expect(s).toMatch(/nothing here is medical advice/i);
    expect(s).not.toMatch(/<form|<button|<input|href=/);
    expect(s.replace(/&#39;/g, "'")).toContain(shelf.DISCLOSURE);
  });

  it('accepts a complete item', () => {
    expect(shelf.check(good)).toBeNull();
  });

  it.each([
    ['placeholder id', { url: 'https://shop.test/item?ref={AFFILIATE_ID}' }],
    ['PLACEHOLDER word', { url: 'https://shop.test/item?ref=PLACEHOLDER' }],
    ['angle placeholder', { url: 'https://shop.test/item?ref=<id>' }],
    ['plain http', { url: 'http://shop.test/item' }],
    ['not Jonathan\'s list', { listedBy: 'someone' }],
    ['no provenance', { provenance: ' ' }],
    ['affiliate unset', { affiliate: undefined }],
  ])('refuses %s', (_n, patch) => {
    expect(shelf.check({ ...good, ...patch })).not.toBeNull();
    expect(shelf.shelfItems([{ ...good, ...patch }, good])).toEqual([good]);
  });

  it('script sends and stores nothing', () => {
    expect(js).not.toMatch(/fetch\(|XMLHttpRequest|localStorage|sessionStorage|cookie|sendBeacon|innerHTML/);
  });
});
