// node scripts/merch/build.mjs  -> docs/merch/wix-products.csv
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog, validate, toWixCsv, repoRoot } from './merch.mjs';

const catalog = loadCatalog();
const errors = validate(catalog);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const out = join(repoRoot, 'docs', 'merch', 'wix-products.csv');
writeFileSync(out, toWixCsv(catalog));
console.log(`wrote ${out} (${catalog.products.length} products)`);
