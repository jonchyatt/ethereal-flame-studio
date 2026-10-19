import { priceFor } from '../prices/config';
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
  /** Proposed benefits, shown as proposals until Jonathan sets the real ladder. */
  benefits: readonly string[];
}

export const TIERS: readonly TierInfo[] = [
  { tier: 'plain', label: 'Plain', letters: 'Soft white letters, steady.', allowsMessage: false, priceCents: priceFor('patron:plain'), benefits: ['Your name or alias on the wall behind the orb', 'Your name on the closing card of flat videos'] },
  { tier: 'glowing', label: 'Glowing', letters: 'Gentle glow, slow breathing, soft halo.', allowsMessage: false, priceCents: priceFor('patron:glowing'), benefits: ['Everything in Plain', 'Letters with a gentle glow and slow breathing'] },
  { tier: 'sparkly', label: 'Sparkly', letters: 'Restrained warm-gold sparkle.', allowsMessage: false, priceCents: priceFor('patron:sparkly'), benefits: ['Everything in Glowing', 'Restrained warm-gold sparkle on your name'] },
  { tier: 'ethereal', label: 'Ethereal', letters: 'Larger letters, slow hue drift, halo, gentle float, plus one moderated message.', allowsMessage: true, priceCents: priceFor('patron:ethereal'), benefits: ['Everything in Sparkly', 'Larger letters with a slow hue drift and gentle float', 'One short message, read by a person before it appears'] },
];

export function tierInfo(tier: PatronTier): TierInfo {
  return TIERS.find((t) => t.tier === tier)!;
}
