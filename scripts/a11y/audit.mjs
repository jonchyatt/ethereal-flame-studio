// Accessibility and speed audit for every public page.
// Usage: node scripts/a11y/audit.mjs [--base http://localhost:3000] [--out docs/a11y/receipt.json]
// Needs a running site (npm run dev or npm start) and Chromium (PLAYWRIGHT_BROWSERS_PATH or playwright's own).
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

export const PUBLIC_PAGES = [
  { path: '/waia-front-door.html', name: 'front door' },
  { path: '/waia-store.html', name: 'store' },
  { path: '/programs', name: 'programs' },
  { path: '/programs/yale-inversion-protocol', name: 'program detail' },
  { path: '/store/custom-order', name: 'custom order status' },
  { path: '/patrons/join', name: 'patron join' },
  { path: '/patrons/remove', name: 'patron removal' },
];

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };

async function auditPage(browser, base, page) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const bytes = []; const failed = []; const consoleErrors = [];
  p.on('response', async (r) => {
    let len = Number(r.headers()['content-length'] || 0);
    if (!len) len = (await r.body().catch(() => Buffer.alloc(0))).length;
    bytes.push({ url: r.url(), type: r.request().resourceType(), status: r.status(), len });
    if (r.status() >= 400 && r.url().startsWith(base)) failed.push(`${r.status()} ${r.url().replace(base, '')}`);
  });
  p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  const res = await p.goto(base + page.path, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => ({ err: e.message }));
  if (!res || res.err) { await ctx.close(); return { ...page, error: res?.err ?? 'no response' }; }
  const status = res.status();

  // Scroll so lazy images load, then measure.
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await p.waitForLoadState('networkidle').catch(() => {});

  await p.evaluate(axeSource);
  const axe = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  const violations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));

  const images = await p.evaluate(() => [...document.images].map((i) => ({
    src: i.getAttribute('src'), alt: i.getAttribute('alt'), loaded: i.complete && i.naturalWidth > 0,
    natural: [i.naturalWidth, i.naturalHeight], shown: [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)],
    hasSize: i.hasAttribute('width') && i.hasAttribute('height'), lazy: i.loading === 'lazy',
  })));
  const brokenImages = images.filter((i) => !i.loaded).map((i) => i.src);
  const missingAlt = images.filter((i) => i.alt === null).map((i) => i.src);
  const oversized = images.filter((i) => i.loaded && !/\.svg(\?|$)/.test(i.src) && i.shown[0] > 0 && i.natural[0] > i.shown[0] * 2.2).map((i) => `${i.src} ${i.natural[0]}px shown at ${i.shown[0]}px`);

  // Keyboard walk: every stop must be reachable and show a focus indicator. Cross-origin frames
  // (YouTube embeds) swallow focus; they are counted as "frame" stops and not judged.
  const stops = []; const seen = new Set();
  for (let i = 0; i < 80; i++) {
    await p.keyboard.press('Tab');
    const s = await p.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body || e === document.documentElement) return { tag: 'frame', label: '', ring: true, offscreen: false, key: 'frame' };
      if (e.tagName.toLowerCase() === 'nextjs-portal') return { skip: true };
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
      const label = (e.getAttribute('aria-label') || e.innerText || e.getAttribute('name') || e.id || '').trim().slice(0, 40);
      return { tag: e.tagName.toLowerCase(), label, ring, offscreen: r.width === 0 || r.height === 0, tabindex: e.getAttribute('tabindex'), key: e.tagName + label + Math.round(r.top) };
    });
    if (s.skip) continue;
    if (s.key !== 'frame' && seen.has(s.key)) break;
    seen.add(s.key); stops.push(s);
  }
  const noRing = stops.filter((s) => !s.ring).map((s) => `${s.tag} "${s.label}"`);
  const hidden = stops.filter((s) => s.offscreen).map((s) => `${s.tag} "${s.label}"`);
  const positiveTabindex = stops.filter((s) => s.tabindex && Number(s.tabindex) > 0).length;
  const frameStops = stops.filter((s) => s.tag === 'frame').length;

  // Reflow at 320px: no horizontal scroll.
  await p.setViewportSize({ width: 320, height: 700 });
  const overflowPx = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  const sameOrigin = bytes.filter((b) => b.url.startsWith(base));
  const sum = (t) => sameOrigin.filter((b) => !t || b.type === t).reduce((a, b) => a + b.len, 0);
  await ctx.close();
  return {
    ...page, status, violations, brokenImages, missingAlt, oversized, focusStops: stops.length, frameStops, noRing, hidden, positiveTabindex,
    overflowAt320: overflowPx, failedRequests: failed, consoleErrors: consoleErrors.slice(0, 5),
    weightBytes: { total: sum(), images: sum('image'), script: sum('script') },
  };
}

export async function runAudit(base) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pages = [];
  for (const pg of PUBLIC_PAGES) pages.push(await auditPage(browser, base, pg));
  await browser.close();
  return { base, when: new Date().toISOString(), pages };
}

export function summarize(r) {
  return r.pages.map((p) => ({
    page: p.path, status: p.status, axe: p.violations?.reduce((a, v) => a + v.nodes, 0), axeRules: p.violations?.map((v) => v.id),
    brokenImages: p.brokenImages?.length, missingAlt: p.missingAlt?.length, oversized: p.oversized?.length,
    noFocusRing: p.noRing?.length, overflowAt320: p.overflowAt320, failed: p.failedRequests?.length, imageKB: p.weightBytes ? Math.round(p.weightBytes.images / 1024) : null,
    error: p.error,
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const base = arg('--base', 'http://localhost:3000');
  const out = arg('--out', null);
  const result = await runAudit(base);
  console.table(summarize(result));
  if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(result, null, 2) + '\n'); console.log('wrote', out); }
}
