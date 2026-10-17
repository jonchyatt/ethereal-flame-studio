/**
 * Gift and bundle catalog for whatamiappreciatingnow.com (backlog: gift and bundle catalog).
 *
 * A bundle groups things that already exist in the paid catalog (programs), the
 * merchandise feed (print-on-demand through the Wix store) and the custom session
 * order flow. Bundles never hold prices or program words: prices come from
 * bundle-prices.json (null = not yet on sale), words live in private storage.
 * Nothing here takes money. Going on sale is Jonathan's click.
 */
import { createHash, randomInt } from 'crypto';
import { getProgram, isFreeTool } from '@/lib/entitlements/catalog';
import merch from '../../../scripts/merch/catalog.json';
import prices from './bundle-prices.json';

export type BundleItem =
  | { type: 'program'; id: string }
  | { type: 'merch'; slug: string }
  | { type: 'custom-session' };

export interface Bundle {
  id: string;
  title: string;
  summary: string;
  items: BundleItem[];
  /** Can be given to someone else. */
  giftable: boolean;
}

export const BUNDLES: readonly Bundle[] = [
  {
    id: 'deeper-sessions-gift',
    title: 'Deeper sessions, with a mug to hold the Now',
    summary: 'The advanced hypnosis sessions with the infinity-loop mug: desire, passion, achievement, peace, contrast, new desire, and a cup in the hand while it comes back around.',
    items: [{ type: 'program', id: 'advanced-hypnosis-sessions' }, { type: 'merch', slug: 'psychedelic-starfield-mug' }],
    giftable: true,
  },
  {
    id: 'yale-guided-process-gift',
    title: 'The Yale guided process, with the circle mug',
    summary: 'The guided Yale inversion process paired with the circle mug, where Now closes back into What.',
    items: [{ type: 'program', id: 'yale-inversion-protocol' }, { type: 'merch', slug: 'circle-mug' }],
    giftable: true,
  },
  {
    id: 'loop-worn-and-held',
    title: 'The loop, worn and held',
    summary: 'The infinity-loop T-shirt and mug together, for someone who already lives in the loop.',
    items: [{ type: 'merch', slug: 'infinity-shirt' }, { type: 'merch', slug: 'infinity-mug' }],
    giftable: true,
  },
  {
    id: 'custom-session-gift',
    title: 'A custom session, with the wordmark mug',
    summary: 'A custom hypnosis or VR session made for one person, quoted through the custom order flow, with the wordmark mug.',
    items: [{ type: 'custom-session' }, { type: 'merch', slug: 'wordmark-mug' }],
    giftable: true,
  },
];

type MerchProduct = { slug: string; rights: string };
const merchProducts = merch.products as MerchProduct[];

export function validateBundles(bundles: readonly Bundle[] = BUNDLES): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const b of bundles) {
    if (ids.has(b.id)) errors.push(`duplicate bundle id ${b.id}`);
    ids.add(b.id);
    if (!b.title.trim() || !b.summary.trim()) errors.push(`${b.id}: title and summary are required`);
    if (/\bWAIA\b/.test(`${b.title} ${b.summary}`)) errors.push(`${b.id}: short name in text`);
    if (b.items.length < 2) errors.push(`${b.id}: a bundle needs at least two items`);
    const seen = new Set<string>();
    for (const item of b.items) {
      const key = item.type === 'program' ? `p:${item.id}` : item.type === 'merch' ? `m:${item.slug}` : 'c';
      if (seen.has(key)) errors.push(`${b.id}: repeated item ${key}`);
      seen.add(key);
      if (item.type === 'program') {
        if (isFreeTool(item.id)) errors.push(`${b.id}: free tool ${item.id} is never sold`);
        else if (!getProgram(item.id)) errors.push(`${b.id}: unknown program ${item.id}`);
      } else if (item.type === 'merch') {
        const p = merchProducts.find((m) => m.slug === item.slug);
        if (!p) errors.push(`${b.id}: unknown merchandise ${item.slug}`);
        else if (p.rights !== 'repo-drawn') errors.push(`${b.id}: ${item.slug} has unconfirmed artwork rights`);
      }
    }
    if ((b.items.filter((i) => i.type === 'custom-session').length) > 1) errors.push(`${b.id}: one custom session per bundle`);
  }
  return errors;
}

export function getBundle(id: string): Bundle | null {
  return BUNDLES.find((b) => b.id === id) ?? null;
}

export function bundlePriceCents(id: string): number | null {
  const v = (prices.bundles as Record<string, number | null>)[id];
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
}

/** On sale only with a price set and Jonathan's switch on; otherwise every page says "not yet on sale". */
export function isOnSale(id: string, env: Record<string, string | undefined> = process.env): boolean {
  return bundlePriceCents(id) !== null && env.BUNDLES_OPEN === '1';
}

export function itemLabel(item: BundleItem): string {
  if (item.type === 'program') return getProgram(item.id)?.title ?? item.id;
  if (item.type === 'merch') return merchProducts.find((m) => m.slug === item.slug) ? item.slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : item.slug;
  return 'Custom session (quoted through the custom order flow)';
}

// ---- Gift flow (schema only: no payment, no email or address stored) ----

export interface GiftInput {
  bundleId: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
  /** YYYY-MM-DD, today or later. */
  deliverOn?: string;
}

export interface GiftDraft {
  bundleId: string;
  recipientName: string;
  senderName: string;
  message: string;
  deliverOn: string | null;
  status: 'draft';
  createdAt: string;
  /** SHA-256 of the redeem code; the code itself is shown once and never stored. */
  codeHash: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function hashGiftCode(code: string): string {
  return createHash('sha256').update(code.replace(/-/g, '').toUpperCase()).digest('hex');
}

export function newGiftCode(rand: (max: number) => number = (m) => randomInt(m)): string {
  const chars = Array.from({ length: 12 }, () => CODE_ALPHABET[rand(CODE_ALPHABET.length)]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map((g) => g.join('')).join('-');
}

export function createGiftDraft(
  input: GiftInput,
  now: Date = new Date(),
  rand?: (max: number) => number,
): { ok: true; draft: GiftDraft; code: string } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const bundle = getBundle(input.bundleId);
  if (!bundle) errors.push('unknown bundle');
  else if (!bundle.giftable) errors.push('this bundle cannot be given as a gift');
  const recipientName = (input.recipientName ?? '').trim();
  const senderName = (input.senderName ?? '').trim();
  const message = (input.message ?? '').trim();
  if (recipientName.length > 60) errors.push('recipient name is over 60 characters');
  if (senderName.length > 60) errors.push('sender name is over 60 characters');
  if (message.length > 500) errors.push('message is over 500 characters');
  if (/https?:\/\/|www\./i.test(message)) errors.push('message may not contain links');
  let deliverOn: string | null = null;
  if (input.deliverOn) {
    const d = new Date(`${input.deliverOn}T00:00:00Z`);
    const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deliverOn) || Number.isNaN(d.getTime())) errors.push('delivery date is not a date');
    else if (d < today) errors.push('delivery date is in the past');
    else deliverOn = input.deliverOn;
  }
  if (errors.length) return { ok: false, errors };
  const code = newGiftCode(rand);
  return {
    ok: true,
    code,
    draft: { bundleId: input.bundleId, recipientName, senderName, message, deliverOn, status: 'draft', createdAt: now.toISOString(), codeHash: hashGiftCode(code) },
  };
}

for (const e of validateBundles()) throw new Error(`Bundle catalog: ${e}`);
