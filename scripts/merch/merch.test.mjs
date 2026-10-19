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

test('declined mockups and the unfinished merchandise section are off the public store page', () => {
  const html = readFileSync(join(repoRoot, 'public/waia-store.html'), 'utf8');
  assert.doesNotMatch(html, /brand\/mockups\//);
  assert.doesNotMatch(html, /id="merchandise"/);
});

test('no product is public without an approved design that passes print intake', () => {
  assert.deepEqual(catalog.approvedDesigns, {});
  const bad = { ...catalog, approvedDesigns: { 'circle-shirt': { design: 'docs/merch/print/colour-on-light-circle.svg', preview: 'brand/mockups/circle-shirt.png', approvedOn: '2026-10-19' } } };
  assert.match(validate(bad).join('\n'), /fails print intake/);
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

// --- print-ready artwork (npm run merch:print) ---
import { readdirSync } from 'node:fs';
import { buildAll, checkPrintFiles, productArt, INKS, MARKS } from './print-art.mjs';

const printDir = join(repoRoot, 'docs/merch/print');
const built = buildAll(catalog);

test('print files: four marks in four ink sets plus the star-field disc, and a spec sheet', () => {
  const svgs = Object.keys(built).filter((n) => n.endsWith('.svg'));
  assert.equal(svgs.length, MARKS.length * Object.keys(INKS).length + 1);
  assert.ok(built['SPEC.md']);
});

test('print files are outlined: no live text, no raster, no overlay, no alpha colours', () => {
  assert.deepEqual(checkPrintFiles(built), []);
  assert.deepEqual(checkPrintFiles({ 'bad.svg': '<svg><text>What</text></svg>' }).length, 1);
  assert.equal(checkPrintFiles({ 'bad.svg': '<svg><image href="overlays/WAIANCircle.png"/></svg>' }).length, 1);
});

test('flat inks use exactly one colour; colour inks use ink and accent only', () => {
  for (const mark of MARKS) {
    for (const ink of ['flat-black', 'flat-white']) {
      const colours = new Set([...built[`${ink}-${mark}.svg`].matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]));
      assert.equal(colours.size, 1, `${ink}-${mark}: ${[...colours]}`);
    }
    const colours = new Set([...built[`colour-on-light-${mark}.svg`].matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]));
    assert.deepEqual([...colours].sort(), ['#1d2233', '#a86f1f']);
  }
});

test('lettering stays inside each mark\'s canvas (no clipped letters)', () => {
  for (const mark of MARKS) {
    const svg = built[`colour-on-light-${mark}.svg`];
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
    const g = svg.match(/<g id="lettering">([\s\S]*?)<\/g>/)[1];
    const nums = [...g.matchAll(/d="([^"]+)"/g)].flatMap((m) => m[1].match(/-?\d+\.?\d*/g).map(Number));
    for (let i = 0; i < nums.length; i += 2) {
      assert.ok(nums[i] > -1 && nums[i] < w + 1 && nums[i + 1] > -1 && nums[i + 1] < h + 1, `${mark}: (${nums[i]}, ${nums[i + 1]}) outside ${w}x${h}`);
    }
  }
});

test('products with unconfirmed ownership get no print file and are marked BLOCKED', () => {
  const spiral = catalog.products.filter((p) => p.mark === 'psychedelic-spiral');
  assert.equal(spiral.length, 3);
  for (const p of spiral) assert.equal(productArt(catalog, p).status, 'blocked');
  assert.equal(Object.keys(built).filter((n) => /spiral/.test(n)).length, 0);
  assert.equal((built['SPEC.md'].match(/\| BLOCKED \|/g) || []).length, spiral.length);
});

test('every ready product points at a file that exists; hat star-field falls back to flat white', () => {
  for (const p of catalog.products) {
    const art = productArt(catalog, p);
    if (art.status === 'blocked') continue;
    for (const f of art.files) assert.ok(built[f], `${p.slug}: ${f} not built`);
  }
  const hat = catalog.products.find((p) => p.slug === 'psychedelic-starfield-hat');
  assert.deepEqual(productArt(catalog, hat).files, ['flat-white-circle.svg']);
});

test('committed docs/merch/print is current', () => {
  assert.deepEqual(readdirSync(printDir).sort(), Object.keys(built).sort());
  for (const [name, text] of Object.entries(built)) assert.equal(readFileSync(join(printDir, name), 'utf8'), text, name);
});
