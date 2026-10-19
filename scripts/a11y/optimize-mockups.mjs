// Writes 640px WebP copies of the store mockups to public/brand/mockups/web/.
// The 1000px PNGs stay put: the Wix product feed points at them. The store page uses these for display.
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'public/brand/mockups';
const out = join(dir, 'web');
mkdirSync(out, { recursive: true });
for (const f of readdirSync(dir).filter((n) => n.endsWith('.png'))) {
  await sharp(join(dir, f)).resize({ width: 640 }).webp({ quality: 80 }).toFile(join(out, f.replace('.png', '.webp')));
}
console.log('done');
