// Writes an exact lemniscate (infinity) guide PNG: black ground, white antialiased stroke.
// Used as a reference image for generate.mjs so the model keeps the loop's true shape.
// Usage: node scripts/brand/guide.mjs [--out brand/guide.png] [--width 1920] [--height 1080] [--stroke 14]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitA, lemniscatePoints } from './lemniscate.mjs';
import { encodePng } from './png.mjs';

// Rasterise the curve: coverage = clamp(halfStroke + 0.5 - distance to polyline).
export function renderGuide({ width = 1920, height = 1080, stroke = 14, margin = 0.06 } = {}) {
  const a = fitA(width, height, margin);
  const pts = lemniscatePoints({ a, cx: width / 2, cy: height / 2, n: 720 });
  const half = stroke / 2;
  const pad = Math.ceil(half + 2);
  const px = new Uint8Array(width * height); // distance-coverage max, grayscale
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    const xa = Math.max(0, Math.floor(Math.min(x0, x1)) - pad), xb = Math.min(width - 1, Math.ceil(Math.max(x0, x1)) + pad);
    const ya = Math.max(0, Math.floor(Math.min(y0, y1)) - pad), yb = Math.min(height - 1, Math.ceil(Math.max(y0, y1)) + pad);
    for (let y = ya; y <= yb; y++)
      for (let x = xa; x <= xb; x++) {
        const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / l2));
        const d = Math.hypot(x + 0.5 - (x0 + t * dx), y + 0.5 - (y0 + t * dy));
        const v = Math.round(255 * Math.max(0, Math.min(1, half + 0.5 - d)));
        if (v > px[y * width + x]) px[y * width + x] = v;
      }
  }
  return encodePng(width, height, 1, px);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, all) => (v.startsWith('--') ? [...acc, [v.slice(2), all[i + 1]]] : acc), []));
  const out = resolve(args.out ?? 'brand/guide.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderGuide({ width: +(args.width ?? 1920), height: +(args.height ?? 1080), stroke: +(args.stroke ?? 14) }));
  console.log('wrote', out);
}
