import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const store = fs.readFileSync(path.join(root, 'public/waia-store.html'), 'utf8');
const door = fs.readFileSync(path.join(root, 'public/waia-front-door.html'), 'utf8');
const section = store.slice(store.indexOf('<section id="free-tools">'), store.indexOf('<section id="shelf">'));

describe('Reset Biology cross-links', () => {
  it('store section links only to resetbiology.com over https, plain links', () => {
    const hrefs = [...section.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(new URL(h).hostname).toBe('resetbiology.com'), expect(h).toMatch(/^https:/);
    expect(section).not.toMatch(/<form|<button|<input|<script|\$\d|checkout|stripe|paypal|price/i);
    expect(section).toMatch(/free/i);
  });

  it('front door links to resetbiology.com', () => {
    expect(door).toContain('href="https://resetbiology.com/"');
  });

  it('the patch for the other site is present and points back here', () => {
    const p = fs.readFileSync(path.join(root, 'docs/reset-biology/resetbiology-crosslinks.patch'), 'utf8');
    expect(p).toContain('https://whatamiappreciatingnow.com/');
    expect(p).not.toMatch(/stripe|checkout|price/i);
  });
});
