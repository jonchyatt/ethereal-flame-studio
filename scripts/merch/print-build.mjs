// node scripts/merch/print-build.mjs  -> docs/merch/print/*.svg and SPEC.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog, validate, repoRoot } from './merch.mjs';
import { buildAll, checkPrintFiles } from './print-art.mjs';

const catalog = loadCatalog();
const errors = [...validate(catalog)];
const files = buildAll(catalog);
errors.push(...checkPrintFiles(files));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const dir = join(repoRoot, 'docs', 'merch', 'print');
mkdirSync(dir, { recursive: true });
for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
console.log(`wrote ${Object.keys(files).length} files to ${dir}`);
