import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const html = fs.readFileSync(path.join(root, 'public/waia-store.html'), 'utf8');
const patron = fs.readFileSync(path.join(root, 'docs/PATRON-WALL.md'), 'utf8');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildEcho } = require(path.join(root, 'public/waia-store-support.js'));

const section = html.slice(html.indexOf('<section id="support">'), html.indexOf('<p class="note">'));

describe('store: Support the channel', () => {
  it('shows every tier price and name from PATRON-WALL.md as a proposal', () => {
    const rows = [...patron.matchAll(/^\| (\$\d+) \| `(\w+)` \|/gm)];
    expect(rows.length).toBe(4);
    for (const [, price, tier] of rows) {
      expect(section).toContain(`${price} a month, proposed`);
      expect(section.toLowerCase()).toContain(`<h3>${tier}</h3>`);
    }
    expect(section).toMatch(/proposals only/i);
  });

  it('has no payment links, checkout, or data-sending form', () => {
    expect(section).not.toMatch(/href=|checkout|stripe|paypal|patreon\.com|wix/i);
    const form = section.match(/<form[^>]*>/)![0];
    expect(form).not.toMatch(/method="post"/i);
    expect(form).toContain('action="#custom-work"');
    expect(section).not.toMatch(/type="(email|tel|password)"|name="(name|email|phone)"/i);
    const js = fs.readFileSync(path.join(root, 'public/waia-store-support.js'), 'utf8');
    expect(js).not.toMatch(/XMLHttpRequest|localStorage|sessionStorage|cookie|sendBeacon/);
    // The only network call is the custom-order intake, which takes no payment.
    expect([...js.matchAll(/fetch\(\s*'([^']+)'/g)].map((m) => m[1])).toEqual(['/api/custom-orders']);
  });

  it('never shortens the channel name in the section', () => {
    expect(section).not.toMatch(/\bWAIA\b/);
    expect(section).toContain('What Am I Appreciating Now');
  });

  it('echoes a valid request and says coming soon', () => {
    expect(buildEcho({ kind: 'vr', details: '  a quiet forest  ' })).toEqual({
      ok: true, kind: 'Custom VR session', details: 'a quiet forest', contact: '',
    });
    expect(fs.readFileSync(path.join(root, "public/waia-store-support.js"), "utf8")).toMatch(/Coming soon/);
  });

  it('rejects missing kind or details and caps length', () => {
    expect(buildEcho({ kind: 'x', details: 'a' }).ok).toBe(false);
    expect(buildEcho({ kind: 'hypnosis', details: '   ' }).ok).toBe(false);
    expect(buildEcho({ kind: 'hypnosis', details: 'a'.repeat(5000) }).details).toHaveLength(1000);
  });
});
