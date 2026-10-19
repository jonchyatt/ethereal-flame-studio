// Print-ready artwork for the merchandise catalog: the brand marks with every letter outlined (no live text, no font
// dependency), in four ink sets, plus a print-spec sheet per product. Builds files only: no network, no provider, no listing.
// Lettering uses Liberation Serif (SIL OFL 1.1, vendored in ./fonts) because the web marks' Iowan/Sitka/Georgia stack is not
// redistributable; letter shapes therefore differ slightly from the on-screen marks. Hairline rings are dropped: they are
// semi-transparent and thinner than screen-print minimums.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { lemniscatePoints, polylineLength } from '../brand/lemniscate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const loadFont = (f) => { const b = readFileSync(join(here, 'fonts', f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
export const FONTS = { regular: loadFont('LiberationSerif-Regular.ttf'), italic: loadFont('LiberationSerif-Italic.ttf') };

export const NAME = 'What Am I Appreciating Now';

// Ink sets. "light"/"dark" name the garment, matching the web marks: colour-on-light is dark ink on a light garment.
export const INKS = {
  'colour-on-light': { ink: '#1d2233', accent: '#a86f1f', note: 'full colour, for light garments' },
  'colour-on-dark': { ink: '#f7f3e6', accent: '#e6bd77', note: 'full colour, for dark garments' },
  'flat-black': { ink: '#000000', accent: '#000000', note: 'one colour, for light garments and screen print' },
  'flat-white': { ink: '#ffffff', accent: '#ffffff', note: 'one colour, for dark garments and embroidery thread' },
};
export const MARKS = ['circle', 'infinity', 'loop', 'wordmark'];

const f2 = (n) => (Math.round(n * 100) / 100).toString();

// Convert one glyph to path data, mapping each outline point through map(x, y).
function glyphPath(font, ch, size, map) {
  const g = font.charToGlyph(ch);
  const cmds = g.getPath(0, 0, size).commands;
  const pt = (x, y) => map(x, y).map(f2).join(' ');
  return cmds.map((c) => {
    if (c.type === 'Z') return 'Z';
    if (c.type === 'M' || c.type === 'L') return `${c.type}${pt(c.x, c.y)}`;
    if (c.type === 'Q') return `Q${pt(c.x1, c.y1)} ${pt(c.x, c.y)}`;
    return `C${pt(c.x1, c.y1)} ${pt(c.x2, c.y2)} ${pt(c.x, c.y)}`;
  }).join('');
}
const advance = (font, ch, size) => (font.charToGlyph(ch).advanceWidth * size) / font.unitsPerEm;

// runs: [{ text, font, fill }]; returns [{ d, fill }] one entry per run, glyphs placed by `place(centreOffset, advance)`.
function chars(runs) { return runs.flatMap((r) => [...r.text].map((ch) => ({ ch, font: r.font, fill: r.fill }))); }

function pointAt(pts, cum, s) {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
  const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
  return { x, y, theta: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) };
}

// Text along a polyline, stretched to fill (1 - gapFrac) of its length, like SVG textLength with lengthAdjust="spacing".
export function lettersOnPath(pts, runs, size, ls, gapFrac) {
  const cs = chars(runs);
  const advs = cs.map((c) => advance(c.font, c.ch, size));
  const natural = advs.reduce((a, b) => a + b, 0) + ls * (cs.length - 1);
  const target = polylineLength(pts) * (1 - gapFrac);
  const extra = (target - natural) / (cs.length - 1);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let cursor = 0;
  return cs.map((c, i) => {
    const mid = pointAt(pts, cum, cursor + advs[i] / 2);
    const cos = Math.cos(mid.theta), sin = Math.sin(mid.theta), ax = advs[i] / 2;
    const d = glyphPath(c.font, c.ch, size, (x, y) => [mid.x + (x - ax) * cos - y * sin, mid.y + (x - ax) * sin + y * cos]);
    cursor += advs[i] + ls + extra;
    return { d, fill: c.fill };
  });
}

// Text on a straight baseline, centred on cx.
export function lettersOnLine(cx, baseline, runs, size, ls) {
  const cs = chars(runs);
  const advs = cs.map((c) => advance(c.font, c.ch, size));
  const total = advs.reduce((a, b) => a + b, 0) + ls * (cs.length - 1);
  let x0 = cx - total / 2;
  return cs.map((c, i) => {
    const x = x0;
    x0 += advs[i] + ls;
    return { d: glyphPath(c.font, c.ch, size, (px, py) => [x + px, baseline + py]), fill: c.fill };
  });
}

const svg = (w, h, body, extraDefs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t">\n` +
  `<title id="t">${NAME}</title>\n${extraDefs}${body}\n</svg>\n`;

// Merge consecutive glyphs of the same fill into one path so a mark is two or three paths, not 26.
const lettering = (glyphs) => {
  const groups = [];
  for (const g of glyphs) {
    const last = groups.at(-1);
    if (last && last.fill === g.fill) last.d += g.d; else groups.push({ ...g });
  }
  return `<g id="lettering">\n${groups.map((g) => `<path fill="${g.fill}" d="${g.d}"/>`).join('\n')}\n</g>`;
};

const runsFor = (t) => [
  { text: 'What Am I Appreciating ', font: FONTS.regular, fill: t.ink },
  { text: 'Now', font: FONTS.italic, fill: t.accent },
];

const arrow = (x, y, deg, s, color) =>
  `<path d="M ${-s} ${f2(-s * 0.7)} L 0 0 L ${-s} ${f2(s * 0.7)}" transform="translate(${f2(x)} ${f2(y)}) rotate(${deg})" fill="none" stroke="${color}" stroke-width="${f2(s * 0.28)}" stroke-linecap="round" stroke-linejoin="round"/>`;

const ring = (c, r, n = 720) => Array.from({ length: n + 1 }, (_, i) => {
  const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
});

function circle(t) {
  const c = 300;
  return svg(600, c * 2, `${lettering(lettersOnPath(ring(c, 205), runsFor(t), 50, 2, 0.035))}\n<circle cx="${c}" cy="${c}" r="14" fill="${t.accent}"/>`);
}

function loop(t) {
  const c = 300, r = 120;
  const a0 = (-80 * Math.PI) / 180, a1 = (250 * Math.PI) / 180;
  const pt = (a) => [c + r * Math.cos(a), c + r * Math.sin(a)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  return svg(600, 600,
    `${lettering(lettersOnPath(ring(c, 232), runsFor(t), 44, 2, 0.04))}\n` +
    `<path d="M ${f2(x0)} ${f2(y0)} A ${r} ${r} 0 1 1 ${f2(x1)} ${f2(y1)}" fill="none" stroke="${t.accent}" stroke-width="12" stroke-linecap="round"/>\n` +
    arrow(x1, y1, f2((a1 * 180) / Math.PI + 90), 26, t.accent));
}

function infinity(t) {
  const pts = lemniscatePoints({ a: 330, cx: 400, cy: 200, n: 960 });
  return svg(800, 400, `${lettering(lettersOnPath(pts, runsFor(t), 34, 2, 0.03))}\n<circle cx="400" cy="200" r="8" fill="${t.accent}"/>`);
}

// Liberation Serif sets wider than the web stack, so the size is solved to keep the name between the return line's ends.
const WORDMARK_SPAN = 920;
function wordmark(t) {
  const runs = runsFor(t);
  const width = (size) => chars(runs).reduce((a, c) => a + advance(c.font, c.ch, size), 0) + (chars(runs).length - 1);
  const size = 92 * WORDMARK_SPAN / width(92);
  return svg(1200, 240,
    `${lettering(lettersOnLine(600, 120, runs, size, 1))}\n` +
    `<path d="M 1060 150 C 1060 225 140 225 140 158" fill="none" stroke="${t.accent}" stroke-width="5" stroke-linecap="round"/>\n` +
    arrow(140, 156, -90, 16, t.accent));
}

const BUILDERS = { circle, infinity, loop, wordmark };
export const markSvg = (mark, inkName) => BUILDERS[mark](INKS[inkName]);
export const markSize = { circle: [600, 600], infinity: [800, 400], loop: [600, 600], wordmark: [1200, 240] };

// The star-field products: the circle mark in dark-garment colours over a disc echoing the studio's star-field presets
// (same gradients as scripts/render-brand-mockups.mjs). Full-colour printing only; not embroiderable.
export function starfieldSvg() {
  const inner = markSvg('circle', 'colour-on-dark').replace(/^<svg[^>]*>\n<title[^>]*>[^\n]*\n/, '').replace(/<\/svg>\n$/, '');
  const defs = `<defs>
<clipPath id="disc"><circle cx="300" cy="300" r="300"/></clipPath>
<radialGradient id="g1" cx="30%" cy="25%" r="35%"><stop offset="0" stop-color="#e8a7ff" stop-opacity=".67"/><stop offset="1" stop-color="#e8a7ff" stop-opacity="0"/></radialGradient>
<radialGradient id="g2" cx="75%" cy="70%" r="40%"><stop offset="0" stop-color="#12967b" stop-opacity=".6"/><stop offset="1" stop-color="#12967b" stop-opacity="0"/></radialGradient>
<radialGradient id="g3" cx="60%" cy="20%" r="45%"><stop offset="0" stop-color="#c14499" stop-opacity=".67"/><stop offset="1" stop-color="#c14499" stop-opacity="0"/></radialGradient>
</defs>\n`;
  const disc = `<g clip-path="url(#disc)"><rect width="600" height="600" fill="#1a1040"/><rect width="600" height="600" fill="url(#g1)"/><rect width="600" height="600" fill="url(#g2)"/><rect width="600" height="600" fill="url(#g3)"/></g>\n`;
  return svg(600, 600, disc + inner, defs);
}

// Typical print areas in inches. Placeholders until a print-on-demand provider is chosen in Wix; confirm against their templates.
export const PRINT_AREAS = {
  shirt: { w: 12, h: 16, place: 'front chest, centred, top edge about 3 in below the collar', embroidery: false },
  hat: { w: 4, h: 2, place: 'front panel, centred', embroidery: true },
  mug: { w: 9, h: 3.75, place: 'wrap print, mark centred on the visible side opposite the handle', embroidery: false },
};
export const DPI = 300;

// Which mark file(s) a product prints, and why one is withheld.
export function productArt(catalog, p) {
  if (p.rights !== 'repo-drawn') return { status: 'blocked', reason: 'artwork ownership not confirmed by Jonathan; no print file is produced' };
  if (p.mark === 'psychedelic-starfield') {
    const area = PRINT_AREAS[p.kind];
    return area.embroidery
      ? { status: 'ready', files: ['flat-white-circle.svg'], note: 'gradients cannot be embroidered; flat white circle mark on a dark cap instead of the star-field disc' }
      : { status: 'ready', files: ['psychedelic-starfield.svg'], note: 'full-colour disc; print on dark garment or dark mug' };
  }
  return { status: 'ready', files: Object.keys(INKS).map((i) => `${i}-${p.mark}.svg`) };
}

// Largest the mark can print inside the area, and the pixel size a rasteriser should use at DPI.
export function fit(mark, kind) {
  const [vw, vh] = mark === 'psychedelic-starfield' ? markSize.circle : markSize[mark];
  const a = PRINT_AREAS[kind];
  const s = Math.min(a.w / vw, a.h / vh);
  const w = vw * s, h = vh * s;
  return { inches: `${f2(w)} x ${f2(h)}`, pixels: `${Math.round(w * DPI)} x ${Math.round(h * DPI)}` };
}

export function buildAll(catalog) {
  const files = {};
  for (const mark of MARKS) for (const ink of Object.keys(INKS)) files[`${ink}-${mark}.svg`] = markSvg(mark, ink);
  files['psychedelic-starfield.svg'] = starfieldSvg();
  files['SPEC.md'] = specSheet(catalog);
  return files;
}

// Fail if any print file still has live text, an embedded or linked raster, or touches the unconfirmed spiral overlay.
export function checkPrintFiles(files) {
  const errors = [];
  for (const [name, text] of Object.entries(files)) {
    if (!name.endsWith('.svg')) continue;
    if (/<text|<tspan|font-family|<image|<foreignObject|overlays\/|WAIANCircle|href="http/i.test(text)) errors.push(`${name}: live text, raster or unconfirmed overlay present`);
    const re = /(?:fill|stroke)="(#[0-9a-fA-F]{3,8}|url\(#\w+\)|none)"/g;
    for (const m of text.matchAll(re)) if (m[1].length === 9) errors.push(`${name}: alpha colour ${m[1]}`);
  }
  return errors;
}

function specSheet(catalog) {
  const rows = catalog.products.map((p) => {
    const art = productArt(catalog, p);
    if (art.status === 'blocked') return `| \`${p.slug}\` | ${p.kind} | none | BLOCKED | ${art.reason} |`;
    const area = PRINT_AREAS[p.kind];
    const f = fit(p.mark, p.kind);
    const files = art.files.length > 2 ? `\`*-${p.mark}.svg\` (4 inks)` : art.files.map((x) => `\`${x}\``).join(', ');
    return `| \`${p.slug}\` | ${p.kind} | ${files} | ready | ${f.inches} in (${f.pixels} px at ${DPI} dpi), ${area.place}${art.note ? `; ${art.note}` : ''} |`;
  });
  return `# Print files and spec sheet

Generated by \`npm run merch:print\`; do not edit by hand. Checked by \`npm run test:merch\`.

Print-area sizes below are typical placeholders (shirt front ${PRINT_AREAS.shirt.w} x ${PRINT_AREAS.shirt.h} in, hat front ${PRINT_AREAS.hat.w} x ${PRINT_AREAS.hat.h} in, mug wrap ${PRINT_AREAS.mug.w} x ${PRINT_AREAS.mug.h} in). Nothing here knows the real provider template; confirm after Jonathan picks a print-on-demand app in his own Wix store.

## Files

Four marks, four ink sets, plus the star-field disc. Backgrounds are transparent except the disc.

| Ink set | Use |
|---|---|
${Object.entries(INKS).map(([k, v]) => `| \`${k}\` | ${v.note} |`).join('\n')}

- All lettering is converted to filled outlines (Liberation Serif, SIL OFL 1.1). No live text, no embedded images, no font needed to open them.
- Arrows and the infinity-loop return line are strokes with round caps; ask the provider whether they want strokes expanded, and expand in Inkscape or Illustrator if so.
- Hairline rings and the faint infinity guide from the web marks are left out: they are semi-transparent and below screen-print minimum line weight.
- Letter shapes are Liberation Serif, not the web marks' Iowan/Sitka/Georgia stack, which cannot be redistributed. Lettering is the same text on the same paths, so the look is close but not identical. This is Jonathan's call; see the second look on the PR.
- PNG rasters at the pixel sizes below are not produced here; any rasteriser (Inkscape, Chromium) turns these SVGs into PNG at that size.

## Products

| Product | Kind | Print file | Status | Size and placement |
|---|---|---|---|---|
${rows.join('\n')}

## Ownership check

The two \`psychedelic-spiral\` products stay BLOCKED. They use \`public/overlays/WAIANCircle.png\`, whose full ownership Jonathan has not confirmed. \`checkPrintFiles\` fails the build if any print file references that overlay or any raster. To unblock, Jonathan confirms ownership; a follow-up then adds a print-resolution file of the overlay. No print file for it is made before then.
`;
}
