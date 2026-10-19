// Merchandise catalog -> Wix product-import CSV. Builds a file only: no network, no Wix login, no listing.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFile } from './print-intake.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, '..', '..');
export const loadCatalog = () => JSON.parse(readFileSync(join(here, 'catalog.json'), 'utf8'));

export const COLUMNS = ['handleId', 'fieldType', 'name', 'description', 'productImageUrl', 'collection', 'sku', 'ribbon',
  'price', 'surcharge', 'visible', 'discountMode', 'discountValue', 'inventory', 'weight', 'cost',
  'productOptionName1', 'productOptionType1', 'productOptionDescription1'];

const titleCase = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export function productName(catalog, p) {
  const style = p.mark.startsWith('psychedelic-') ? `Psychedelic ${titleCase(p.mark.slice(12))}` : titleCase(p.mark);
  return `${catalog.brandName} ${catalog.kinds[p.kind].label}, ${style}`;
}

export function productDescription(catalog, p) {
  const m = catalog.marks[p.mark];
  return `${m.means} ${catalog.rights[p.rights]} Print-on-demand through the store; image is an illustrative mockup, not a product photo.`;
}

export function validate(catalog, root = repoRoot) {
  const errors = [];
  const slugs = new Set();
  for (const p of catalog.products) {
    if (slugs.has(p.slug)) errors.push(`duplicate slug ${p.slug}`);
    slugs.add(p.slug);
    if (!catalog.kinds[p.kind]) errors.push(`${p.slug}: unknown kind ${p.kind}`);
    if (!catalog.marks[p.mark]) errors.push(`${p.slug}: unknown mark ${p.mark}`);
    if (!catalog.rights[p.rights]) errors.push(`${p.slug}: missing rights basis`);
    if (!existsSync(join(root, 'public', 'brand', 'mockups', `${p.slug}.png`))) errors.push(`${p.slug}: mockup missing`);
    if (/\bWAIA\b/.test(productName(catalog, p) + productDescription(catalog, p))) errors.push(`${p.slug}: short name in text`);
  }
  // A design is public only if its file passes the print-spec intake (docs/merch/DESIGN-STANDARD.md).
  for (const [slug, d] of Object.entries(catalog.approvedDesigns ?? {})) {
    const p = catalog.products.find((x) => x.slug === slug);
    if (!p) { errors.push(`approved design for unknown product ${slug}`); continue; }
    if (!d.design || !existsSync(join(root, d.design))) { errors.push(`${slug}: approved design file missing`); continue; }
    if (!d.preview || !existsSync(join(root, 'public', d.preview))) errors.push(`${slug}: approved preview missing`);
    if (!d.approvedOn) errors.push(`${slug}: approvedOn date missing`);
    const r = checkFile(p.kind, join(root, d.design));
    if (!r.ok) errors.push(`${slug}: design fails print intake: ${r.errors.join('; ')}`);
  }
  for (const [k, m] of Object.entries(catalog.marks)) {
    if (!existsSync(join(root, 'public', m.file))) errors.push(`mark ${k}: ${m.file} missing`);
  }
  return errors;
}

const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Every row is visible=FALSE and price is blank: pricing and going live are Jonathan's, inside Wix.
export function toWixCsv(catalog) {
  const rows = [];
  for (const p of catalog.products) {
    const k = catalog.kinds[p.kind];
    const base = {
      handleId: p.slug, name: productName(catalog, p), description: productDescription(catalog, p),
      productImageUrl: `${catalog.siteBase}/brand/mockups/${p.slug}.png`, collection: catalog.collection,
      sku: p.slug.toUpperCase(), ribbon: '', price: '', surcharge: '', visible: 'FALSE', discountMode: '', discountValue: '',
      inventory: 'InStock', weight: '', cost: '',
    };
    rows.push({ ...base, fieldType: 'Product',
      productOptionName1: k.sizes.length ? 'Size' : '', productOptionType1: k.sizes.length ? 'DROP_DOWN' : '',
      productOptionDescription1: k.sizes.join(';') });
    for (const s of k.sizes) {
      rows.push({ handleId: p.slug, fieldType: 'Variant', sku: `${p.slug.toUpperCase()}-${s}`, productOptionName1: 'Size',
        productOptionDescription1: s, inventory: 'InStock', price: '', surcharge: '', visible: 'FALSE' });
    }
  }
  return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}
