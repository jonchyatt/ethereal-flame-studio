// Generates the What Am I Appreciating Now brand marks into public/brand/.
// Usage: node scripts/generate-brand-marks.mjs
// Naming: "-light" marks are drawn for LIGHT backgrounds (dark ink),
//         "-dark" marks are drawn for DARK backgrounds (light ink).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'brand');
mkdirSync(OUT, { recursive: true });

const NAME = 'What Am I Appreciating Now';
const FONT = "'Iowan Old Style','Sitka Text',Georgia,'Times New Roman',serif";
const THEMES = {
  light: { ink: '#1d2233', accent: '#a86f1f', faint: '#1d223333' },
  dark: { ink: '#f7f3e6', accent: '#e6bd77', faint: '#f7f3e633' },
};

const svg = (w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t">\n` +
  `<title id="t">${title}</title>\n${body}\n</svg>\n`;

// Words on a path: "What" starts the loop, "Now" (accent) ends it where "What" begins.
const loopText = (pathId, len, size, t, gapFrac = 0.035) =>
  `<text font-family="${FONT}" font-size="${size}" fill="${t.ink}" letter-spacing="2">` +
  `<textPath href="#${pathId}" startOffset="0" textLength="${(len * (1 - gapFrac)).toFixed(1)}" lengthAdjust="spacing">` +
  `What Am I Appreciating <tspan fill="${t.accent}" font-style="italic">Now</tspan></textPath></text>`;

// Arrowhead pointing along the tangent at (x,y), angle in degrees.
const arrow = (x, y, deg, s, color) =>
  `<path d="M ${-s} ${-s * 0.7} L 0 0 L ${-s} ${s * 0.7}" transform="translate(${x} ${y}) rotate(${deg})" fill="none" stroke="${color}" stroke-width="${s * 0.28}" stroke-linecap="round" stroke-linejoin="round"/>`;

function circle(t) {
  const r = 205, c = 300, len = 2 * Math.PI * r;
  const path = `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r}`; // clockwise from top
  // seam marker where Now closes into What
  return svg(600, 600, NAME,
    `<circle cx="${c}" cy="${c}" r="${r + 52}" fill="none" stroke="${t.faint}" stroke-width="2"/>\n` +
    `<circle cx="${c}" cy="${c}" r="${r - 52}" fill="none" stroke="${t.faint}" stroke-width="2"/>\n` +
    `<defs><path id="p" d="${path}"/></defs>\n${loopText('p', len, 50, t)}\n` +
    `<circle cx="${c}" cy="${c}" r="14" fill="${t.accent}"/>`);
}

function loop(t) {
  // Outer text ring + inner arrow loop that closes back into its own start.
  const R = 232, c = 300, len = 2 * Math.PI * R;
  const outer = `M ${c} ${c - R} A ${R} ${R} 0 1 1 ${c - 0.01} ${c - R}`;
  const r = 120;
  const a0 = -80 * Math.PI / 180, a1 = 250 * Math.PI / 180; // ~330° sweep, leaves a gap that the arrow bridges
  const pt = (a) => [c + r * Math.cos(a), c + r * Math.sin(a)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  const deg = (a1 * 180) / Math.PI + 90; // tangent direction, clockwise travel
  return svg(600, 600, NAME,
    `<defs><path id="p" d="${outer}"/></defs>\n${loopText('p', len, 44, t, 0.04)}\n` +
    `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${t.accent}" stroke-width="12" stroke-linecap="round"/>\n` +
    arrow(x1, y1, deg, 26, t.accent) +
    `\n<circle cx="${c}" cy="${c}" r="${r - 40}" fill="none" stroke="${t.faint}" stroke-width="2"/>`);
}

function infinity(t) {
  const a = 330, cx = 400, cy = 200, N = 240;
  const pts = [];
  // start at the crossing (t = pi/2) so Now closes back into What at the centre
  for (let i = 0; i <= N; i++) {
    const u = Math.PI / 2 + (i / N) * 2 * Math.PI;
    const d = 1 + Math.sin(u) ** 2;
    pts.push([cx + (a * Math.cos(u)) / d, cy + (a * Math.sin(u) * Math.cos(u)) / d]);
  }
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return svg(800, 400, NAME,
    `<path d="${d}" fill="none" stroke="${t.faint}" stroke-width="2"/>\n` +
    `<defs><path id="p" d="${d}"/></defs>\n${loopText('p', len, 34, t, 0.03)}\n` +
    `<circle cx="${cx}" cy="${cy}" r="8" fill="${t.accent}"/>`);
}

function wordmark(t) {
  // Horizontal name; a thin line returns from Now back to What under the text.
  return svg(1200, 240, NAME,
    `<text x="600" y="120" text-anchor="middle" font-family="${FONT}" font-size="92" fill="${t.ink}" letter-spacing="1">What Am I Appreciating <tspan fill="${t.accent}" font-style="italic">Now</tspan></text>\n` +
    `<path d="M 1060 150 C 1060 225 140 225 140 158" fill="none" stroke="${t.accent}" stroke-width="5" stroke-linecap="round"/>\n` +
    arrow(140, 156, -90, 16, t.accent));
}

const MARKS = { circle, loop, infinity, wordmark };
for (const [name, fn] of Object.entries(MARKS))
  for (const [mode, t] of Object.entries(THEMES)) {
    const file = `what-am-i-appreciating-now-${name}-${mode}.svg`;
    writeFileSync(join(OUT, file), fn(t));
    console.log('wrote', file);
  }
