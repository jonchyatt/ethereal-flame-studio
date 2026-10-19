// Print-spec intake: checks a design file against the print area, resolution, format and colour
// rules for a product kind and rejects anything below spec. Reads file headers only, no image libraries.
// Run: node scripts/merch/print-intake.mjs <shirt|hat|mug> <file> [--size WxH]   (inches; default is the full print area)
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIN_DPI = 300;
export const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Print areas are the typical print-on-demand maxima, not a provider's real template: they stay
 * placeholders until Jonathan picks a provider inside his own Wix store (providerTemplateConfirmed).
 * Hats are embroidered, so they accept vector art only (no pixels to count, no gradients, no fine detail).
 */
export const SPECS = {
  shirt: { label: 'T-shirt front', areaIn: [12, 16], formats: ['svg', 'png'], needsAlpha: true, providerTemplateConfirmed: false },
  hat: { label: 'Hat front panel', areaIn: [4, 1.75], formats: ['svg'], needsAlpha: false, providerTemplateConfirmed: false },
  mug: { label: 'Mug wrap (11 oz)', areaIn: [9, 3.75], formats: ['svg', 'png', 'jpg'], needsAlpha: false, providerTemplateConfirmed: false },
};

const reject = (r, msg) => { r.errors.push(msg); };

function pngFacts(buf, r) {
  if (buf.length < 33 || buf.readUInt32BE(12) !== 0x49484452) return reject(r, 'PNG header is damaged');
  const f = r.facts;
  f.width = buf.readUInt32BE(16); f.height = buf.readUInt32BE(20);
  const depth = buf[24], ctype = buf[25];
  f.hasAlpha = ctype === 4 || ctype === 6;
  f.profile = 'assumed sRGB (none embedded)';
  for (let p = 8; p + 8 <= buf.length;) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8);
    if (type === 'tRNS') f.hasAlpha = true;
    if (type === 'sRGB') f.profile = 'sRGB';
    if (type === 'iCCP') { f.profile = buf.toString('latin1', p + 8, buf.indexOf(0, p + 8)); }
    if (type === 'pHYs' && buf[p + 16] === 1) f.metadataDpi = Math.round(buf.readUInt32BE(p + 8) * 0.0254);
    if (type === 'IDAT') break;
    p += 12 + len;
  }
  if (depth === 16) r.warnings.push('16-bit PNG: most print providers flatten it to 8-bit; export 8-bit');
  if (!/srgb/i.test(f.profile) && !f.profile.startsWith('assumed')) reject(r, `colour profile "${f.profile}" is not sRGB; convert to sRGB before upload`);
  if (f.profile.startsWith('assumed')) r.warnings.push('no colour profile embedded; sRGB is assumed. Embed sRGB so the printer does not guess');
}

function jpegFacts(buf, r) {
  const f = r.facts;
  f.hasAlpha = false; f.profile = 'assumed sRGB (none embedded)';
  let comps = 0;
  for (let p = 2; p + 4 <= buf.length;) {
    if (buf[p] !== 0xff) { p++; continue; }
    const m = buf[p + 1], len = buf.readUInt16BE(p + 2);
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { p += 2; continue; }
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { f.height = buf.readUInt16BE(p + 5); f.width = buf.readUInt16BE(p + 7); comps = buf[p + 9]; }
    if (m === 0xe0 && buf.toString('latin1', p + 4, p + 8) === 'JFIF') {
      const units = buf[p + 11], dx = buf.readUInt16BE(p + 12);
      if (units === 1) f.metadataDpi = dx; else if (units === 2) f.metadataDpi = Math.round(dx * 2.54);
    }
    if (m === 0xe2 && buf.toString('latin1', p + 4, p + 15) === 'ICC_PROFILE') f.profile = 'embedded ICC profile';
    if (m === 0xda) break;
    p += 2 + len;
  }
  if (comps === 4) reject(r, 'CMYK JPEG: convert to sRGB; the print provider converts to its own CMYK');
  if (!f.width) reject(r, 'JPEG header is damaged');
  if (f.profile.startsWith('assumed')) r.warnings.push('no colour profile embedded; sRGB is assumed. Embed sRGB so the printer does not guess');
}

function svgFacts(text, kind, r) {
  const f = r.facts;
  f.vector = true;
  const vb = text.match(/viewBox="\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*"/);
  if (vb) { f.width = +vb[1]; f.height = +vb[2]; }
  else reject(r, 'SVG has no viewBox, so its proportions cannot be checked');
  if (/<text[\s>]/i.test(text)) reject(r, 'SVG has live text; convert every letter to outlines so no font is needed');
  if (/<image[\s>]/i.test(text) || /data:image\//i.test(text)) reject(r, 'SVG embeds a raster image; a vector file must be pure paths (send a PNG at print resolution instead)');
  if (/<(?:filter|mask|foreignObject)[\s>]/i.test(text)) reject(r, 'SVG uses filters, masks or foreignObject, which print providers rasterise unpredictably; flatten them');
  if (kind === 'hat') {
    if (/<(?:linear|radial)Gradient[\s>]/i.test(text)) reject(r, 'embroidery cannot reproduce gradients; use flat colours');
    if ([...text.matchAll(/(?:fill|stroke)="(#[0-9a-f]{3,8}|rgb[^"]*)"/gi)].length && new Set([...text.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase())).size > 6) reject(r, 'embroidery supports about six thread colours; this file uses more');
  }
  if (/(?:fill|stroke)-opacity|opacity="0?\.\d/i.test(text)) r.warnings.push('semi-transparent shapes found; they print as halftones or vanish in one-colour processes');
  if (/stroke-width="0?\.\d*"/i.test(text)) r.warnings.push('very thin strokes found; screen print needs at least about 0.25 pt lines');
}

/** @param {string} kind shirt|hat|mug  @param {string} name file name (extension decides format)  @param {Buffer} buf  @param {{size?: [number, number]}} [opts] intended print size in inches */
export function checkDesign(kind, name, buf, opts = {}) {
  const r = { ok: false, kind, file: name, errors: [], warnings: [], facts: { bytes: buf.length } };
  const spec = SPECS[kind];
  if (!spec) { reject(r, `unknown product kind "${kind}" (use ${Object.keys(SPECS).join(', ')})`); return r; }
  let ext = extname(name).slice(1).toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';
  r.facts.format = ext;
  if (!spec.formats.includes(ext)) reject(r, `${spec.label} accepts ${spec.formats.join(', ')} only, not ${ext || 'this file type'}${kind === 'hat' ? ' (embroidery is digitised from vector art)' : ''}`);
  if (buf.length > MAX_BYTES) reject(r, `file is ${(buf.length / 1048576).toFixed(1)} MB; providers cap uploads near 25 MB`);
  if (r.errors.length) return r;

  if (ext === 'png') {
    if (buf.toString('latin1', 1, 4) !== 'PNG') reject(r, 'file says PNG but is not one'); else pngFacts(buf, r);
  } else if (ext === 'jpg') {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) reject(r, 'file says JPEG but is not one'); else jpegFacts(buf, r);
  } else svgFacts(buf.toString('utf8'), kind, r);
  if (r.errors.length) return r;

  const [aw, ah] = spec.areaIn;
  const [sw, sh] = opts.size ?? [aw, ah];
  if (sw > aw + 1e-9 || sh > ah + 1e-9) reject(r, `intended size ${sw} x ${sh} in is larger than the ${aw} x ${ah} in print area`);
  const f = r.facts;
  f.printSizeIn = [sw, sh];
  const ratio = f.width / f.height;
  if (Math.abs(ratio - sw / sh) / (sw / sh) > 0.02) reject(r, `proportions ${f.width} x ${f.height} do not match the ${sw} x ${sh} in placement; the design would be stretched or padded`);
  if (!f.vector) {
    f.effectiveDpi = Math.round(Math.min(f.width / sw, f.height / sh));
    if (f.effectiveDpi < MIN_DPI) reject(r, `${f.width} x ${f.height} px prints at ${f.effectiveDpi} dpi on ${sw} x ${sh} in; need ${MIN_DPI} dpi, which is ${Math.ceil(sw * MIN_DPI)} x ${Math.ceil(sh * MIN_DPI)} px`);
    if (f.metadataDpi && f.metadataDpi < 72) r.warnings.push(`file metadata says ${f.metadataDpi} dpi; harmless, the pixel count is what is checked`);
    if (spec.needsAlpha && !f.hasAlpha) reject(r, 'no transparency: a shirt print needs a transparent background or it prints a solid rectangle');
  }
  r.ok = r.errors.length === 0;
  return r;
}

export function checkFile(kind, path, opts) { return checkDesign(kind, path, readFileSync(path), opts); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [kind, file, flag, dims] = process.argv.slice(2);
  if (!kind || !file) { console.error('usage: print-intake.mjs <shirt|hat|mug> <file> [--size WxH]'); process.exit(2); }
  const size = flag === '--size' && dims ? dims.split('x').map(Number) : undefined;
  statSync(file);
  const r = checkFile(kind, file, { size });
  console.log(JSON.stringify(r, null, 2));
  console.log(r.ok ? 'ACCEPTED' : 'REJECTED');
  process.exit(r.ok ? 0 : 1);
}
