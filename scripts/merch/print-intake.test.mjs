// Run: npm run test:merch
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDesign, SPECS } from './print-intake.mjs';
import { repoRoot } from './merch.mjs';

function png(w, h, { colorType = 6, depth = 8, chunks = [] } = {}) {
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = depth; ihdr[9] = colorType;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), ...chunks.map(([t, d]) => chunk(t, d)), chunk('IDAT', Buffer.alloc(4)), chunk('IEND', Buffer.alloc(0))]);
}
const srgb = ['sRGB', Buffer.from([0])];
const outlined = '<svg viewBox="0 0 3600 4800"><path fill="#1d2233" d="M0 0L10 10"/></svg>';

test('a 300 dpi transparent sRGB shirt PNG is accepted', () => {
  const r = checkDesign('shirt', 'a.png', png(3600, 4800, { chunks: [srgb] }));
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  assert.equal(r.facts.effectiveDpi, 300);
});

test('below 300 dpi is rejected with the pixel size that is needed', () => {
  const r = checkDesign('shirt', 'a.png', png(1800, 2400, { chunks: [srgb] }));
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /150 dpi.*3600 x 4800 px/);
});

test('a smaller placement lowers the pixels needed', () => {
  assert.equal(checkDesign('shirt', 'a.png', png(1800, 1800, { chunks: [srgb] }), { size: [6, 6] }).ok, true);
  assert.equal(checkDesign('shirt', 'a.png', png(1800, 1800, { chunks: [srgb] }), { size: [13, 13] }).ok, false);
});

test('a shirt PNG without transparency, with wrong proportions or a non-sRGB profile is rejected', () => {
  assert.match(checkDesign('shirt', 'a.png', png(3600, 4800, { colorType: 2, chunks: [srgb] })).errors.join(), /transparen/);
  assert.match(checkDesign('shirt', 'a.png', png(3600, 3600, { chunks: [srgb] })).errors.join(), /proportions/);
  const icc = Buffer.concat([Buffer.from('AdobeRGB\0\0'), Buffer.alloc(4)]);
  assert.match(checkDesign('shirt', 'a.png', png(3600, 4800, { chunks: [['iCCP', icc]] })).errors.join(), /not sRGB/);
});

test('missing profile passes with a warning, not silently', () => {
  const r = checkDesign('shirt', 'a.png', png(3600, 4800));
  assert.equal(r.ok, true);
  assert.match(r.warnings.join(), /sRGB is assumed/);
});

test('wrong formats are rejected: JPEG on a shirt, any raster on a hat', () => {
  assert.match(checkDesign('shirt', 'a.jpg', Buffer.alloc(10)).errors[0], /accepts svg, png only/);
  assert.match(checkDesign('hat', 'a.png', png(1200, 525, { chunks: [srgb] })).errors[0], /embroidery/);
});

test('SVG must be outlined paths: live text, embedded rasters and filters are rejected', () => {
  assert.equal(checkDesign('shirt', 'a.svg', Buffer.from(outlined)).ok, true);
  assert.match(checkDesign('shirt', 'a.svg', Buffer.from('<svg viewBox="0 0 3600 4800"><text>Now</text></svg>')).errors.join(), /live text/);
  assert.match(checkDesign('shirt', 'a.svg', Buffer.from('<svg viewBox="0 0 3600 4800"><image href="data:image/png;base64,AA"/></svg>')).errors.join(), /raster/);
  assert.match(checkDesign('shirt', 'a.svg', Buffer.from('<svg viewBox="0 0 3600 4800"><filter id="f"/></svg>')).errors.join(), /filters/);
  assert.match(checkDesign('shirt', 'a.svg', Buffer.from('<svg><path d="M0 0"/></svg>')).errors.join(), /viewBox/);
});

test('embroidery rejects gradients; mug accepts JPEG at 300 dpi but rejects CMYK', () => {
  assert.match(checkDesign('hat', 'a.svg', Buffer.from('<svg viewBox="0 0 400 175"><linearGradient id="g"/></svg>')).errors.join(), /gradients/);
  const jpeg = (comps, w, h) => { const sof = Buffer.alloc(19); sof[0] = 0xff; sof[1] = 0xc0; sof.writeUInt16BE(17, 2); sof[4] = 8; sof.writeUInt16BE(h, 5); sof.writeUInt16BE(w, 7); sof[9] = comps; return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, Buffer.from([0xff, 0xda, 0, 2])]); };
  assert.equal(checkDesign('mug', 'a.jpg', jpeg(3, 2700, 1125)).ok, true);
  assert.match(checkDesign('mug', 'a.jpg', jpeg(4, 2700, 1125)).errors.join(), /CMYK/);
});

test('the existing outlined brand marks pass as vector files; unknown kinds are rejected', () => {
  const buf = readFileSync(join(repoRoot, 'docs/merch/print/colour-on-light-wordmark.svg'));
  assert.equal(checkDesign('mug', 'w.svg', buf, { size: [9, 1.8] }).ok, true);
  assert.match(checkDesign('poster', 'a.svg', buf).errors[0], /unknown product kind/);
  assert.deepEqual(Object.keys(SPECS), ['shirt', 'hat', 'mug']);
});
