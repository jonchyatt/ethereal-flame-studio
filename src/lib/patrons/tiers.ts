import type { PatronTier } from './schema';

/**
 * Tier ladder shown on the signup page. Proposals only (docs/PATRON-WALL.md):
 * prices are config, `priceCents: null` means "not yet on sale". Taking money is
 * red 1 and stays Jonathan's click, so no checkout is wired to these.
 */
export interface TierInfo {
  tier: PatronTier;
  label: string;
  letters: string;
  allowsMessage: boolean;
  priceCents: number | null;
}

export const TIERS: readonly TierInfo[] = [
  { tier: 'plain', label: 'Plain', letters: 'Soft white letters, steady.', allowsMessage: false, priceCents: null },
  { tier: 'glowing', label: 'Glowing', letters: 'Gentle glow, slow breathing, soft halo.', allowsMessage: false, priceCents: null },
  { tier: 'sparkly', label: 'Sparkly', letters: 'Restrained warm-gold sparkle.', allowsMessage: false, priceCents: null },
  { tier: 'ethereal', label: 'Ethereal', letters: 'Larger letters, slow hue drift, halo, gentle float, plus one moderated message.', allowsMessage: true, priceCents: null },
];

export function tierInfo(tier: PatronTier): TierInfo {
  return TIERS.find((t) => t.tier === tier)!;
}
