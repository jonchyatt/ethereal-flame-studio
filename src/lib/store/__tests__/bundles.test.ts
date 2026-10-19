import fs from 'fs';
import path from 'path';
import {
  BUNDLES, validateBundles, getBundle, bundlePriceCents, isOnSale, createGiftDraft, hashGiftCode, newGiftCode, itemLabel, Bundle,
} from '../bundles';
import { BUNDLE_PRICES } from '@/lib/prices/config';

const root = path.resolve(__dirname, '../../../..');
const NOW = new Date('2026-10-17T12:00:00Z');
const fixedRand = (max: number) => 3 % max;

describe('store: gift and bundle catalog', () => {
  it('ships a valid catalog', () => {
    expect(BUNDLES.length).toBeGreaterThan(0);
    expect(validateBundles()).toEqual([]);
  });

  it('every bundle is not yet on sale and prices come only from the price file', () => {
    for (const b of BUNDLES) {
      expect(Object.keys(BUNDLE_PRICES)).toContain(b.id);
      expect(bundlePriceCents(b.id)).toBeNull();
      expect(isOnSale(b.id, { BUNDLES_OPEN: '1' })).toBe(false);
    }
    expect(Object.keys(BUNDLE_PRICES).sort()).toEqual(BUNDLES.map((b) => b.id).sort());
  });

  it('needs both a price and the switch to count as on sale', () => {
    const real = bundlePriceCents;
    expect(real('nope')).toBeNull();
    expect(isOnSale('deeper-sessions-gift', {})).toBe(false);
  });

  it('refuses unknown programs, free tools, thin and repeated bundles', () => {
    const base: Bundle = { id: 'x', title: 'T', summary: 'S', giftable: true, items: [{ type: 'custom-session' }, { type: 'program', id: 'yale-inversion-protocol' }] };
    expect(validateBundles([base])).toEqual([]);
    const bad = (items: Bundle['items']) => validateBundles([{ ...base, items }]).join('|');
    expect(bad([{ type: 'program', id: 'nope' }, { type: 'custom-session' }])).toMatch(/unknown program/);
    expect(bad([{ type: 'program', id: 'peptide-tracker' }, { type: 'custom-session' }])).toMatch(/free tool/);
    expect(bad([{ type: 'custom-session' }])).toMatch(/at least two/);
    expect(bad([{ type: 'program', id: 'yale-inversion-protocol' }, { type: 'program', id: 'yale-inversion-protocol' }])).toMatch(/repeated/);
    expect(validateBundles([base, base]).join('|')).toMatch(/duplicate bundle id/);
    expect(validateBundles([{ ...base, summary: 'WAIA gift' }]).join('|')).toMatch(/short name/);
  });

  it('names no merchandise anywhere in bundles', () => {
    const page = fs.readFileSync(path.join(root, 'src/app/store/bundles/page.tsx'), 'utf8');
    const text = `${JSON.stringify(BUNDLES)} ${page}`;
    expect(text).not.toMatch(/merch|mugs?|t-?shirt|hats?|wordmark/i);
  });

  it('uses the whole name and never the short one in anything a person reads', () => {
    for (const b of BUNDLES) expect(`${b.title} ${b.summary} ${b.items.map(itemLabel).join(' ')}`).not.toMatch(/\bWAIA\b/);
    const page = fs.readFileSync(path.join(root, 'src/app/store/bundles/page.tsx'), 'utf8');
    expect(page).not.toMatch(/\bWAIA\b/);
    expect(page).toContain('<ComingSoon'); // pre-launch state: disabled button + one question
    expect(page).not.toMatch(/<form|<button|<input/);
  });

  it('draws only on things that exist: the free tools are never bundled', () => {
    const text = JSON.stringify(BUNDLES);
    expect(text).not.toMatch(/peptide-tracker|self-help/);
  });
});

describe('store: gift drafts', () => {
  const ok = { bundleId: 'sessions-and-process-gift', recipientName: ' Sam ', message: 'For the loop.', deliverOn: '2026-12-25' };

  it('makes a draft with a one-time code and stores only its hash', () => {
    const r = createGiftDraft(ok, NOW, fixedRand);
    if (!r.ok) throw new Error(r.errors.join());
    expect(r.draft.recipientName).toBe('Sam');
    expect(r.draft.status).toBe('draft');
    expect(r.draft.codeHash).toBe(hashGiftCode(r.code));
    expect(JSON.stringify(r.draft)).not.toContain(r.code);
    expect(r.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(hashGiftCode(r.code.toLowerCase())).toBe(r.draft.codeHash);
  });

  it('stores no contact details field', () => {
    const r = createGiftDraft(ok, NOW);
    if (!r.ok) throw new Error('expected ok');
    expect(Object.keys(r.draft).sort()).toEqual(['bundleId', 'codeHash', 'createdAt', 'deliverOn', 'message', 'recipientName', 'senderName', 'status']);
  });

  it('draws fresh codes', () => {
    expect(newGiftCode()).not.toEqual(newGiftCode());
  });

  it.each([
    ['unknown bundle', { ...ok, bundleId: 'nope' }, /unknown bundle/],
    ['long name', { ...ok, recipientName: 'a'.repeat(61) }, /recipient name/],
    ['long sender', { ...ok, senderName: 'a'.repeat(61) }, /sender name/],
    ['long message', { ...ok, message: 'a'.repeat(501) }, /message is over/],
    ['link in message', { ...ok, message: 'see https://x.test' }, /links/],
    ['past date', { ...ok, deliverOn: '2026-10-16' }, /in the past/],
    ['bad date', { ...ok, deliverOn: '2026-13-45' }, /not a date/],
    ['loose date', { ...ok, deliverOn: 'tomorrow' }, /not a date/],
  ])('rejects %s', (_n, input, re) => {
    const r = createGiftDraft(input, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('|')).toMatch(re);
  });

  it('allows today as the delivery date', () => {
    expect(createGiftDraft({ ...ok, deliverOn: '2026-10-17' }, NOW).ok).toBe(true);
  });

  it('exposes getBundle', () => {
    expect(getBundle('sessions-and-process-gift')?.items).toHaveLength(2);
    expect(getBundle('nope')).toBeNull();
  });
});
