import type { PriceKey } from './config';

/**
 * Price ladders offered to Jonathan as proposals (backlog item 3). A is the
 * $5/$10/$20/$35 ladder from docs/PATRON-WALL.md. Nothing here is read by checkout
 * or any public page except the "not yet on sale" comparison preview.
 * Subscription prices are per month; the Yale protocol is a one-time price.
 */
export interface PriceOption {
  id: 'A' | 'B' | 'C';
  name: string;
  idea: string;
  prices: Readonly<Record<PriceKey, number>>;
}

export const PRICE_OPTIONS: readonly PriceOption[] = [
  {
    id: 'A',
    name: 'The proposal',
    idea: 'The $5 / $10 / $20 / $35 ladder already in the patron wall doc.',
    prices: {
      'patron:plain': 500,
      'patron:glowing': 1000,
      'patron:sparkly': 2000,
      'patron:ethereal': 3500,
      'program:advanced-hypnosis-sessions': 1500,
      'program:yale-inversion-protocol': 4900,
    },
  },
  {
    id: 'B',
    name: 'Gentle',
    idea: 'Lower steps so joining feels light; leans on volume.',
    prices: {
      'patron:plain': 300,
      'patron:glowing': 700,
      'patron:sparkly': 1200,
      'patron:ethereal': 2500,
      'program:advanced-hypnosis-sessions': 900,
      'program:yale-inversion-protocol': 2900,
    },
  },
  {
    id: 'C',
    name: 'Generous',
    idea: 'Higher steps for fewer, more committed supporters.',
    prices: {
      'patron:plain': 700,
      'patron:glowing': 1500,
      'patron:sparkly': 3000,
      'patron:ethereal': 5000,
      'program:advanced-hypnosis-sessions': 2500,
      'program:yale-inversion-protocol': 7900,
    },
  },
];
