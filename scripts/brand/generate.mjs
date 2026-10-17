// Generates candidate brand art with Gemini image models from the prompt library in brand/prompts/*.md.
// References: the channel logo and the lemniscate guide. Art is text-free; type is added later by compose.mjs.
// Key comes from GEMINI_API_KEY in the environment and is never written anywhere.
// Usage: node scripts/brand/generate.mjs --prompt vortex-ribbon [--n 4] [--model gemini-3-pro-image] [--dry-run]
// Candidates land in brand/candidates/<prompt>/ with a .json recipe beside each image (rights/provenance, HB-6).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderGuide } from './guide.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_MODEL = 'gemini-3-pro-image';
// The API accepts 16:9 and 21:9 for wide art, not 2:1.
export const DEFAULT_ASPECT = '16:9';
export const LOGO = 'public/overlays/WAIANCircle.png';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
// Appended to every prompt so no model draws letters; compose.mjs sets the real type.
export const TEXT_FREE = 'Text-free artwork: no letters, words, numbers, logos or watermarks anywhere in the image.';

export function loadPrompt(name, dir = join(ROOT, 'brand', 'prompts')) {
  const file = join(dir, `${name}.md`);
  if (!existsSync(file)) throw new Error(`No prompt "${name}" in ${dir}`);
  return readFileSync(file, 'utf8').replace(/^# .*\n/, '').trim();
}

export function buildRequest({ prompt, images = [], aspectRatio = DEFAULT_ASPECT }) {
  const parts = [{ text: `${prompt}\n\n${TEXT_FREE}` }];
  for (const img of images) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data.toString('base64') } });
  return { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } } };
}

// Returns [{ mimeType, data: Buffer }]; throws with the API's own message when no image came back.
export function parseResponse(json) {
  const parts = (json.candidates ?? []).flatMap((c) => c.content?.parts ?? []);
  const out = parts.filter((p) => p.inlineData?.data).map((p) => ({ mimeType: p.inlineData.mimeType ?? 'image/png', data: Buffer.from(p.inlineData.data, 'base64') }));
  if (!out.length) {
    const why = json.error?.message ?? json.promptFeedback?.blockReason ?? parts.map((p) => p.text).filter(Boolean).join(' ') ?? 'no image returned';
    throw new Error(`Gemini returned no image: ${why || 'unknown reason'}`);
  }
  return out;
}

export async function generate({ prompt, images, model = DEFAULT_MODEL, apiKey, fetchImpl = fetch, aspectRatio }) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const res = await fetchImpl(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(buildRequest({ prompt, images, aspectRatio })),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${json.error?.message ?? 'request failed'}`);
  return parseResponse(json);
}

function refImage(path) {
  return { mimeType: MIME[extname(path).toLowerCase()] ?? 'image/png', data: readFileSync(path) };
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, all) => (v.startsWith('--') ? [...acc, [v.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []));
  if (!args.prompt || args.prompt === true) throw new Error('Missing --prompt <name> (see brand/prompts/)');
  const model = args.model && args.model !== true ? args.model : process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const n = +(args.n ?? 1);
  const prompt = loadPrompt(args.prompt);
  const logoPath = join(ROOT, LOGO);
  const guidePath = join(ROOT, 'brand', 'guide.png');
  if (!existsSync(guidePath)) { mkdirSync(dirname(guidePath), { recursive: true }); writeFileSync(guidePath, renderGuide()); }
  const images = [refImage(logoPath), refImage(guidePath)];
  if (args['dry-run']) {
    const req = buildRequest({ prompt, images });
    req.contents[0].parts.forEach((p) => { if (p.inlineData) p.inlineData.data = `<${p.inlineData.data.length} base64 chars>`; });
    console.log(JSON.stringify({ model, n, request: req }, null, 2));
    return;
  }
  const outDir = join(ROOT, 'brand', 'candidates', args.prompt);
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let k = 0;
  for (let i = 0; i < n; i++) {
    for (const img of await generate({ prompt, images, model, apiKey: process.env.GEMINI_API_KEY })) {
      const base = join(outDir, `${stamp}-${++k}`);
      writeFileSync(`${base}.png`, img.data);
      writeFileSync(`${base}.json`, JSON.stringify({
        model, prompt: args.prompt, promptSha256: createHash('sha256').update(prompt).digest('hex'),
        references: [LOGO, 'brand/guide.png'], generatedAt: new Date().toISOString(),
        rights: 'Generated from the channel logo and a geometric guide; owner confirms basis before print.',
      }, null, 2));
      console.log('wrote', base + '.png');
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
