// Run: npm run test:merch
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog, validate, toWixCsv, productName, COLUMNS, repoRoot } from './merch.mjs';

const catalog = loadCatalog();

test('catalog validates: every product has a mockup, a known mark, a rights basis', () => {
  assert.deepEqual(validate(catalog), []);
});

test('covers shirts, hats and mugs, each slug unique', () => {
  const kinds = new Set(catalog.products.map((p) => p.kind));
  assert.deepEqual([...kinds].sort(), ['hat', 'mug', 'shirt']);
  assert.equal(new Set(catalog.products.map((p) => p.slug)).size, catalog.products.length);
});

test('every product is on the store page as a mockup', () => {
  const html = readFileSync(join(repoRoot, 'public/waia-store.html'), 'utf8');
  const onPage = catalog.products.filter((p) => html.includes(`mockups/${p.slug}.png`));
  assert.ok(onPage.length >= 12, `store page shows ${onPage.length}`);
});

test('names use the whole brand name, never WAIA', () => {
  for (const p of catalog.products) assert.match(productName(catalog, p), /^What Am I Appreciating Now /);
  assert.doesNotMatch(toWixCsv(catalog), /\bWAIA\b/);
});

// Minimal CSV reader for the quoting toWixCsv emits.
function parse(csv) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) { if (c === '"' && csv[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  return rows;
}

test('CSV has Wix columns, one Product row per item, Variant rows per shirt size', () => {
  const rows = parse(toWixCsv(catalog));
  assert.deepEqual(rows[0], COLUMNS);
  assert.ok(rows.every((r) => r.length === COLUMNS.length));
  const type = COLUMNS.indexOf('fieldType');
  const products = rows.slice(1).filter((r) => r[type] === 'Product');
  const variants = rows.slice(1).filter((r) => r[type] === 'Variant');
  assert.equal(products.length, catalog.products.length);
  const shirts = catalog.products.filter((p) => p.kind === 'shirt').length;
  assert.equal(variants.length, shirts * catalog.kinds.shirt.sizes.length);
});

test('nothing goes live and no price is invented: visible FALSE, price blank', () => {
  const rows = parse(toWixCsv(catalog)).slice(1);
  const v = COLUMNS.indexOf('visible'), pr = COLUMNS.indexOf('price');
  assert.ok(rows.every((r) => r[v] === 'FALSE' && r[pr] === ''));
});

test('image URLs point at the site mockups; no credentials or tokens in the feed', () => {
  const csv = toWixCsv(catalog);
  assert.match(csv, /https:\/\/www\.whatamiappreciatingnow\.com\/brand\/mockups\/circle-shirt\.png/);
  assert.doesNotMatch(csv, /token|secret|password|api[_-]?key|@/i);
});

test('committed docs/merch/wix-products.csv is current', () => {
  assert.equal(readFileSync(join(repoRoot, 'docs/merch/wix-products.csv'), 'utf8'), toWixCsv(catalog));
});

test('products with unconfirmed artwork rights are flagged in their description', () => {
  const rows = parse(toWixCsv(catalog)).slice(1).filter((r) => r[1] === 'Product');
  for (const p of catalog.products.filter((x) => x.rights === 'overlay-unconfirmed')) {
    const r = rows.find((x) => x[0] === p.slug);
    assert.match(r[COLUMNS.indexOf('description')], /confirm full ownership before print/);
  }
});
