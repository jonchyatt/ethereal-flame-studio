// Writes 640px WebP copies of the store mockups to docs/merch/retired/web/ (retired; declined mockups, not served).
// Kept for the record only: the mockups were declined and nothing on the site shows them.
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'docs/merch/retired';
const out = join(dir, 'web');
mkdirSync(out, { recursive: true });
for (const f of readdirSync(dir).filter((n) => n.endsWith('.png'))) {
  await sharp(join(dir, f)).resize({ width: 640 }).webp({ quality: 80 }).toFile(join(out, f.replace('.png', '.webp')));
}
console.log('done');
