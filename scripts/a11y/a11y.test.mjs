// Static checks for the public pages. No server or browser needed; the live audit is scripts/a11y/audit.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ratio, over } from './contrast.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STATIC_PAGES = ['public/waia-front-door.html', 'public/waia-store.html'];
const read = (p) => readFileSync(join(root, p), 'utf8');

for (const page of STATIC_PAGES) {
  const html = read(page);

  test(`${page}: language, title, viewport and one h1`, () => {
    assert.match(html, /<html lang="en"/);
    assert.match(html, /<title>[^<]*What Am I Appreciating Now/);
    assert.match(html, /name="viewport"/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  });

  test(`${page}: every local image exists, has alt text and a reserved size`, () => {
    const markup = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
    const imgs = [...markup.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    for (const tag of imgs) {
      const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
      assert.ok(src, `img without src: ${tag}`);
      if (/^https?:/.test(src)) continue;
      assert.ok(!src.startsWith('/public/'), `${src}: Next serves public/ at the site root, not under /public`);
      assert.ok(existsSync(join(root, 'public', src)), `${src} is missing from public/`);
      assert.match(tag, /\salt="[^"]*"/, `${src} has no alt`);
      assert.match(tag, /\swidth="\d+"/, `${src} has no width`);
      assert.match(tag, /\sheight="\d+"/, `${src} has no height`);
    }
  });

  test(`${page}: srcset images exist`, () => {
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      const src = m[1].split(/\s+/)[0];
      assert.ok(existsSync(join(root, 'public', src)), `${src} is missing`);
    }
  });

  test(`${page}: iframes carry a title`, () => {
    for (const m of html.matchAll(/<iframe\b[^>]*>/g)) assert.match(m[0], /\stitle="[^"]+"/);
  });
}

test('front door: decorative letter strings and arrows are hidden from screen readers', () => {
  const html = read('public/waia-front-door.html');
  assert.match(html, /aria-hidden="true">WAIANWAIANWAIAN</);
  assert.match(html, /aria-hidden="true">↓ enter the collection ↓</);
  assert.match(html, /<footer aria-hidden="true">/);
});

test('front door: the spiral stops drawing when off-screen', () => {
  assert.match(read('public/waia-front-door.html'), /IntersectionObserver/);
});

test('store mockups: a small WebP copy exists for every PNG, and is lighter', () => {
  const dir = join(root, 'public/brand/mockups');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.png'))) {
    const web = join(dir, 'web', f.replace('.png', '.webp'));
    assert.ok(existsSync(web), `${f} has no web copy`);
    assert.ok(readFileSync(web).length < readFileSync(join(dir, f)).length, `${f} web copy is not lighter`);
    assert.ok(readFileSync(web).length < 60_000, `${f} web copy over 60 KB`);
  }
});

test('contrast: store and front-door text tokens reach 4.5:1, form borders 3:1', () => {
  const tokens = { ink: '#e6e2d3', inkDim: '#9b9788', gold: '#cf9d4f', goldBright: '#e6bd77' };
  for (const bg of ['#0a0d17', '#131829', '#05060c']) {
    for (const [name, fg] of Object.entries(tokens)) assert.ok(ratio(fg, bg) >= 4.5, `${name} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
  }
  assert.ok(ratio('#05060c', '#cf9d4f') >= 4.5, 'dark text on gold chip');
  // Store form field border against the field fill and the card behind it.
  assert.ok(ratio('#8b8878', '#05060c') >= 3 && ratio('#8b8878', '#131829') >= 3);
  // App pages: field border against page and field fill, dimmed text, error text.
  assert.ok(ratio('#8c8c9e', '#0b0b14') >= 3 && ratio('#8c8c9e', '#14142a') >= 3);
  assert.ok(ratio(over('#eeeeee', '#0b0b14', 0.7), '#0b0b14') >= 4.5);
  assert.ok(ratio('#ff9a9a', '#0b0b14') >= 4.5);
});

test('app pages: every public page sets a title that carries the whole name', () => {
  const files = [
    'src/app/programs/page.tsx', 'src/app/programs/[id]/page.tsx', 'src/app/store/custom-order/layout.tsx',
    'src/app/patrons/join/page.tsx', 'src/app/patrons/remove/layout.tsx',
  ];
  for (const f of files) assert.match(read(f), /What Am I Appreciating Now/, f);
});

test('app pages: form field borders are not the near-invisible #333', () => {
  for (const f of ['src/app/patrons/join/JoinForm.tsx', 'src/app/patrons/remove/page.tsx', 'src/app/store/custom-order/page.tsx']) {
    const src = read(f);
    assert.match(src, /#8c8c9e/, f);
  }
});
