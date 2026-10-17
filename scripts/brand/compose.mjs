// Sets the five words upright (never rotated) along the infinity loop over any art:
// "What Am I" on the left lobe's top arc, "Appreciating" on the right lobe's top arc,
// gold "Now" at the crossing. Output is an SVG with the art embedded.
// Usage: node scripts/brand/compose.mjs --art <image> [--out brand/composed.svg] [--png] [--ink "#f7f3e6"] [--gold "#e6bd77"]
// --png also rasterises through Playwright Chromium (CHROMIUM_PATH to override) if it is installed.
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { anchors } from './lemniscate.mjs';

const FONT = "'Iowan Old Style','Sitka Text',Georgia,'Times New Roman',serif";
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// Text positions for a canvas. Words sit just above the curve (baseline = curve y - lift).
export function layout({ width = 2048, height = 1024, margin = 0.06 } = {}) {
  const a = (width / 2) * (1 - 2 * margin);
  const an = anchors({ a, cx: width / 2, cy: height / 2 });
  const size = Math.round(width * 0.052);
  const lift = Math.round(size * 0.45);
  return {
    size,
    words: [
      { text: 'What Am I', x: an.left[0], y: an.left[1] - lift, gold: false },
      { text: 'Appreciating', x: an.right[0], y: an.right[1] - lift, gold: false },
      { text: 'Now', x: an.crossing[0], y: an.crossing[1] + size * 0.35, gold: true },
    ],
  };
}

export function composeSvg({ href, width = 2048, height = 1024, ink = '#f7f3e6', gold = '#e6bd77' } = {}) {
  const { size, words } = layout({ width, height });
  const text = words
    .map((w) => `<text x="${w.x.toFixed(1)}" y="${w.y.toFixed(1)}" text-anchor="middle" font-size="${w.gold ? Math.round(size * 1.25) : size}" fill="${w.gold ? gold : ink}"${w.gold ? ' font-style="italic"' : ''} stroke="#00000066" stroke-width="3" paint-order="stroke">${w.text}</text>`)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t">\n<title id="t">What Am I Appreciating Now</title>\n<image href="${href}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>\n<g font-family="${FONT}" font-weight="600" letter-spacing="1">\n${text}\n</g>\n</svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, all) => (v.startsWith('--') ? [...acc, [v.slice(2), v.startsWith('--png') ? true : all[i + 1]]] : acc), []));
  if (!args.art) { console.error('Missing --art <image>'); process.exit(1); }
  const art = resolve(args.art);
  const href = `data:${MIME[extname(art).toLowerCase()] ?? 'image/png'};base64,${readFileSync(art).toString('base64')}`;
  const [w, h] = [+(args.width ?? 2048), +(args.height ?? 1024)];
  const out = resolve(args.out ?? 'brand/composed.svg');
  const svg = composeSvg({ href, width: w, height: h, ink: args.ink, gold: args.gold });
  writeFileSync(out, svg);
  console.log('wrote', out);
  if (args.png) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    const png = out.replace(/\.svg$/, '.png');
    await page.screenshot({ path: png });
    await browser.close();
    console.log('wrote', png);
  }
}
