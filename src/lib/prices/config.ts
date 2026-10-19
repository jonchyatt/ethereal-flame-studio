/**
 * The one place a price lives (backlog item 3). Store, programs and patron pages
 * read from here only; no price number appears in page code.
 *
 * Every value is `null` until Jonathan sets it ("not yet on sale"). The options in
 * ./options.ts are proposals for him to pick from and are never read by checkout.
 * Taking money is red 1 and stays his click: setting a price here does not turn
 * live payments on (stripe.ts still refuses live keys).
 */

export const PRICE_KEYS = [
  'patron:plain',
  'patron:glowing',
  'patron:sparkly',
  'patron:ethereal',
  'program:advanced-hypnosis-sessions',
  'program:yale-inversion-protocol',
] as const;

export type PriceKey = (typeof PRICE_KEYS)[number];

/** Price in US cents, or null = not yet on sale. */
export const PRICES: Readonly<Record<PriceKey, number | null>> = {
  'patron:plain': null,
  'patron:glowing': null,
  'patron:sparkly': null,
  'patron:ethereal': null,
  'program:advanced-hypnosis-sessions': null,
  'program:yale-inversion-protocol': null,
};

/**
 * Bundle and gift prices (backlog item 11). Kept apart from PRICES because the ladder
 * options in ./options.ts propose program and patron prices only; bundles have none
 * proposed, so they stay blank until Jonathan sets them. Keyed by bundle id.
 */
export const BUNDLE_PRICES: Readonly<Record<string, number | null>> = {
  'deeper-sessions-gift': null,
  'yale-guided-process-gift': null,
  'loop-worn-and-held': null,
  'custom-session-gift': null,
};

/** Cents for a key, or null when blank, unknown, or not a positive whole number. */
export function priceFor(key: string, prices: Readonly<Record<string, number | null>> = PRICES): number | null {
  const v = prices[key];
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
}

export function formatPrice(cents: number | null): string {
  if (cents === null) return 'Not yet on sale';
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
