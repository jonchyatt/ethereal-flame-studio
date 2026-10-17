// Renders static merchandise mockups (shirt, mug, hat) of each brand mark into
// public/brand/mockups/. Run `node scripts/generate-brand-marks.mjs` first.
// Usage: node scripts/render-brand-mockups.mjs
// Illustrative previews only; not production print files.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = join(ROOT, 'public', 'brand');
const OUT = join(BRAND, 'mockups');
mkdirSync(OUT, { recursive: true });

const mark = (name, mode) =>
  readFileSync(join(BRAND, `what-am-i-appreciating-now-${name}-${mode}.svg`), 'utf8')
    .replace(/<\?xml[^>]*>/, '').replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%"');
const spiralUrl = 'file://' + join(ROOT, 'public', 'overlays', 'WAIANCircle.png');

// Gradients taken from the StarNest skybox preset colours in src/components/canvas/StarNestSkybox.tsx
// (purple #c14499, darkWorld2 #432f94, crazyFractal2 teal #12967b, purple2 #e8a7ff).
const STARFIELD = `radial-gradient(circle at 30% 25%, #e8a7ffaa, transparent 35%),
  radial-gradient(circle at 75% 70%, #12967b99, transparent 40%),
  radial-gradient(circle at 60% 20%, #c14499aa, transparent 45%), #1a1040`;

const SHIRT = 'M300 120 L190 170 L90 300 L170 350 L230 290 L230 860 L770 860 L770 290 L830 350 L910 300 L810 170 L700 120 Q500 230 300 120Z';
const HAT_DOME = 'M180 560 Q180 260 500 260 Q820 260 820 560Z';

// Wide marks print smaller (ratio w/h); square marks print larger.
const AREA = { circle: 1, loop: 1, infinity: 2, wordmark: 5 };
const box = (m, max) => { const r = AREA[m]; return r < 1.5 ? [max, max] : [max * 1.5, (max * 1.5) / r]; };

function garment(product, fill, printHtml, printKind, m) {
  const shadow = 'filter:drop-shadow(0 20px 28px #0004)';
  if (product === 'shirt') {
    const [w, h] = box(m, printKind === 'art' ? 300 : 340);
    return `<svg viewBox="0 0 1000 1000" width="1000" height="1000" style="position:absolute;inset:0;${shadow}"><path d="${SHIRT}" fill="${fill}"/><path d="M300 120 Q500 230 700 120" fill="none" stroke="#0003" stroke-width="10"/></svg>
      <div style="position:absolute;left:${500 - w / 2}px;top:${430 - h / 2}px;width:${w}px;height:${h}px">${printHtml}</div>`;
  }
  if (product === 'mug') {
    const [w, h] = box(m, 280);
    return `<svg viewBox="0 0 1000 1000" width="1000" height="1000" style="position:absolute;inset:0;${shadow}">
      <path d="M740 340 C920 340 920 700 730 700" fill="none" stroke="${fill}" stroke-width="64" stroke-linecap="round"/>
      <rect x="230" y="250" width="520" height="560" rx="40" fill="${fill}"/>
      <rect x="230" y="250" width="520" height="560" rx="40" fill="url(#g)"/>
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#0000"/><stop offset=".15" stop-color="#fff3"/><stop offset=".3" stop-color="#0000"/><stop offset=".85" stop-color="#0000"/><stop offset="1" stop-color="#0003"/></linearGradient></defs>
      <ellipse cx="490" cy="250" rx="260" ry="26" fill="#0002"/></svg>
      <div style="position:absolute;left:${490 - w / 2}px;top:${530 - h / 2}px;width:${w}px;height:${h}px">${printHtml}</div>`;
  }
  // hat
  const [w, h] = box(m, 220);
  return `<svg viewBox="0 0 1000 1000" width="1000" height="1000" style="position:absolute;inset:0;${shadow}">
    <path d="M150 570 Q500 700 850 570 Q830 520 820 560Z" fill="${fill}" opacity=".85"/>
    <path d="${HAT_DOME}" fill="${fill}"/><path d="M150 575 Q500 520 850 575 Q500 770 150 575Z" fill="${fill}" stroke="#0003" stroke-width="6"/>
    <circle cx="500" cy="262" r="16" fill="#0004"/></svg>
    <div style="position:absolute;left:${500 - w / 2}px;top:${420 - h / 2}px;width:${w}px;height:${h}px">${printHtml}</div>`;
}

const jobs = [];
for (const m of Object.keys(AREA)) {
  jobs.push([`${m}-shirt`, 'shirt', '#2a2f40', mark(m, 'dark'), 'mark', m]);
  jobs.push([`${m}-mug`, 'mug', '#f4f1e8', mark(m, 'light'), 'mark', m]);
}
const art = `<img src="${spiralUrl}" style="width:100%;height:100%;display:block">`;
jobs.push(['psychedelic-spiral-shirt', 'shirt', '#0b0b12', art, 'art', 'circle']);
jobs.push(['psychedelic-spiral-hat', 'hat', '#0b0b12', art, 'art', 'circle']);
jobs.push(['psychedelic-spiral-mug', 'mug', '#0b0b12', art, 'art', 'circle']);
jobs.push(['psychedelic-starfield-shirt', 'shirt', '#1a1040',
  `<div style="width:100%;height:100%;border-radius:50%;background:${STARFIELD}"></div><div style="position:absolute;inset:0">${mark('circle', 'dark')}</div>`, 'art', 'circle']);
jobs.push(['psychedelic-starfield-hat', 'hat', '#1a1040',
  `<div style="width:100%;height:100%;border-radius:50%;background:${STARFIELD}"></div><div style="position:absolute;inset:0">${mark('circle', 'dark')}</div>`, 'art', 'circle']);
jobs.push(['psychedelic-starfield-mug', 'mug', '#1a1040',
  `<div style="width:100%;height:100%;border-radius:50%;background:${STARFIELD}"></div><div style="position:absolute;inset:0">${mark('circle', 'dark')}</div>`, 'art', 'circle']);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
for (const [name, product, fill, print, kind, m] of jobs) {
  await page.setContent(`<body style="margin:0;background:#e9e6dd"><div style="position:relative;width:1000px;height:1000px">${garment(product, fill, print, kind, m)}</div></body>`);
  await page.waitForLoadState('load');
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log('wrote', `mockups/${name}.png`);
}
await browser.close();
