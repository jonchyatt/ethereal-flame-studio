import type { Brief } from './brief';

/**
 * Quote calculator for custom sessions. Every number is config and ships blank (null), the
 * same rule as the programs catalog: until Jonathan sets a base price there is no estimate,
 * and the operator quotes by hand. The calculator suggests; it never charges or sends a quote.
 */
export interface SessionPricing {
  currency: string;
  /** Base price in cents by kind and length in minutes. null = not set. */
  base: Record<'hypnosis' | 'vr', Partial<Record<number, number | null>>>;
  /** Flat add-ons in cents. null = not set (treated as not applicable, with a note). */
  addOns: { binauralTones: number | null; vrCustomScene: number | null };
}

export const SESSION_PRICING: SessionPricing = {
  currency: 'USD',
  base: {
    hypnosis: { 10: null, 20: null, 30: null, 45: null, 60: null },
    vr: { 10: null, 20: null, 30: null, 45: null, 60: null },
  },
  addOns: { binauralTones: null, vrCustomScene: null },
};

export interface QuoteSuggestion {
  /** null until a base price exists for this kind and length. */
  amountCents: number | null;
  currency: string;
  lines: { label: string; cents: number }[];
  notes: string[];
}

export function suggestQuote(brief: Brief, pricing: SessionPricing = SESSION_PRICING): QuoteSuggestion {
  const lines: { label: string; cents: number }[] = [];
  const notes: string[] = [];
  const base = pricing.base[brief.kind][brief.lengthMinutes];
  if (base == null) {
    return { amountCents: null, currency: pricing.currency, lines, notes: ['No base price is set for this kind and length yet, so quote by hand.'] };
  }
  lines.push({ label: `${brief.kind === 'vr' ? 'VR' : 'Hypnosis'} session, ${brief.lengthMinutes} minutes`, cents: base });
  const addOn = (label: string, cents: number | null) => {
    if (cents == null) notes.push(`${label} is requested but its add-on price is not set; add it by hand.`);
    else lines.push({ label, cents });
  };
  if (brief.music === 'binaural') addOn('Binaural tones', pricing.addOns.binauralTones);
  if (brief.kind === 'vr' && brief.vrScene === 'other') addOn('Custom VR scene', pricing.addOns.vrCustomScene);
  if (brief.kind === 'vr' && brief.vrComfortFlag) notes.push('Comfort flag set: confirm gentle movement with the customer before quoting.');
  return { amountCents: lines.reduce((n, l) => n + l.cents, 0), currency: pricing.currency, lines, notes };
}
