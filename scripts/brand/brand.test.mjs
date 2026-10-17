// Run: node --test scripts/brand/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { lemniscatePoints, lemniscatePoint, polylineLength, anchors } from './lemniscate.mjs';
import { renderGuide } from './guide.mjs';
import { layout, composeSvg } from './compose.mjs';
import { buildRequest, parseResponse, generate, loadPrompt, TEXT_FREE } from './generate.mjs';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('lemniscate starts and ends at the crossing and spans +/- a', () => {
  const pts = lemniscatePoints({ a: 300, cx: 400, cy: 200 });
  near(pts[0][0], 400); near(pts[0][1], 200);
  near(pts.at(-1)[0], 400, 1e-6); near(pts.at(-1)[1], 200, 1e-6);
  near(lemniscatePoint(0, 300, 400, 200)[0], 400 + 300);
});

test('lemniscate is symmetric about both axes and crosses only at the centre', () => {
  const pts = lemniscatePoints({ a: 300, cx: 0, cy: 0, n: 2000 });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  near(Math.max(...xs), 300, 0.5); near(Math.min(...xs), -300, 0.5);
  near(Math.max(...ys), -Math.min(...ys), 0.5);
  near(Math.max(...ys), 300 * Math.SQRT2 / 4, 0.5);
  assert.ok(polylineLength(pts) > 4 * 300 && polylineLength(pts) < 6 * 300);
  const nearCentre = pts.filter((p) => Math.hypot(p[0], p[1]) < 3).length;
  assert.ok(nearCentre >= 2, 'passes the centre');
});

test('anchors: left/right mirror each other above the crossing', () => {
  const an = anchors({ a: 300, cx: 400, cy: 200 });
  near(an.left[0] + an.right[0], 800, 1e-6);
  near(an.left[1], an.right[1]);
  assert.ok(an.left[1] < 200 && an.right[0] > 400 && an.left[0] < 400);
  near(200 - an.right[1], 300 * Math.SQRT2 / 4, 0.1);
});

test('guide PNG is valid grayscale, with ink on the curve and black elsewhere', () => {
  const w = 512, h = 256;
  const png = renderGuide({ width: w, height: h, stroke: 6 });
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), w); assert.equal(png.readUInt32BE(20), h);
  assert.equal(png[25], 0); // grayscale
  const idatLen = png.readUInt32BE(33);
  const raw = inflateSync(png.subarray(41, 41 + idatLen));
  const px = (x, y) => raw[y * (w + 1) + 1 + x];
  assert.ok(px(w / 2, h / 2) > 200, 'crossing is lit');
  assert.equal(px(2, 2), 0);
  assert.equal(px(w / 2, 4), 0);
});

test('compose places left and right words on mirrored top arcs and Now at the crossing', () => {
  const { words } = layout({ width: 2048, height: 1024 });
  const [l, r, n] = words;
  assert.deepEqual(words.map((x) => x.text), ['What Am I', 'Appreciating', 'Now']);
  near(l.x + r.x, 2048, 1e-6); near(l.y, r.y);
  near(n.x, 1024); assert.ok(n.gold && !l.gold && !r.gold);
  assert.ok(l.y < 512 && r.y < 512);
  const svg = composeSvg({ href: 'data:image/png;base64,AA==' });
  assert.ok(!svg.includes('rotate') && !svg.includes('textPath'), 'words stay upright');
  assert.equal((svg.match(/<text /g) ?? []).length, 3);
});

test('buildRequest sends prompt with text-free rule and both reference images', () => {
  const req = buildRequest({ prompt: 'p', images: [{ mimeType: 'image/png', data: Buffer.from('ab') }, { mimeType: 'image/png', data: Buffer.from('cd') }] });
  const parts = req.contents[0].parts;
  assert.ok(parts[0].text.includes(TEXT_FREE));
  assert.equal(parts.length, 3);
  assert.equal(parts[1].inlineData.data, Buffer.from('ab').toString('base64'));
  assert.deepEqual(req.generationConfig.responseModalities, ['IMAGE']);
});

test('parseResponse extracts images and surfaces refusals', () => {
  const ok = parseResponse({ candidates: [{ content: { parts: [{ text: 'x' }, { inlineData: { mimeType: 'image/png', data: 'AAEC' } }] } }] });
  assert.deepEqual([...ok[0].data], [0, 1, 2]);
  assert.throws(() => parseResponse({ promptFeedback: { blockReason: 'SAFETY' } }), /SAFETY/);
});

test('generate uses the key header and model URL, with no network', async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AA==' } }] } }] }) }; };
  const out = await generate({ prompt: 'p', images: [], apiKey: 'k', fetchImpl });
  assert.equal(out.length, 1);
  assert.match(seen.url, /models\/gemini-3-pro-image:generateContent$/);
  assert.equal(seen.init.headers['x-goog-api-key'], 'k');
  await assert.rejects(generate({ prompt: 'p', fetchImpl }), /GEMINI_API_KEY/);
});

test('prompt library has the four prompts and each asks for room for lettering or print', () => {
  for (const name of ['vortex-ribbon', 'carved-wood-relief', 'icon', 'shirt-print']) assert.ok(loadPrompt(name).includes('guide'), name);
  assert.equal(readdirSync(new URL('../../brand/prompts', import.meta.url)).length, 4);
});
