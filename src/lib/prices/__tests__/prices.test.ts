import { PRICES, PRICE_KEYS, formatPrice, priceFor } from '../config';
import { PRICE_OPTIONS } from '../options';
import { PROGRAMS } from '../../entitlements/catalog';
import { TIERS } from '../../patrons/tiers';

describe('price config', () => {
  it('ships blank so nothing is on sale', () => {
    expect(PRICE_KEYS.every((k) => PRICES[k] === null)).toBe(true);
    expect(PROGRAMS.every((p) => p.priceCents === null)).toBe(true);
    expect(TIERS.every((t) => t.priceCents === null)).toBe(true);
  });
  it('treats unknown, zero, negative and fractional values as blank', () => {
    expect(priceFor('nope', {})).toBeNull();
    expect(priceFor('a', { a: 0 })).toBeNull();
    expect(priceFor('a', { a: -5 })).toBeNull();
    expect(priceFor('a', { a: 5.5 })).toBeNull();
    expect(priceFor('a', { a: 500 })).toBe(500);
  });
  it('formats cents', () => {
    expect(formatPrice(null)).toBe('Not yet on sale');
    expect(formatPrice(500)).toBe('$5');
    expect(formatPrice(1250)).toBe('$12.50');
  });
  it('covers every key in every option, with the patron ladder rising', () => {
    expect(PRICE_OPTIONS[0].prices['patron:plain']).toBe(500);
    expect(PRICE_OPTIONS[0].prices['patron:ethereal']).toBe(3500);
    for (const o of PRICE_OPTIONS) {
      for (const k of PRICE_KEYS) expect(Number.isInteger(o.prices[k])).toBe(true);
      const l = ['plain', 'glowing', 'sparkly', 'ethereal'].map((t) => o.prices[`patron:${t}` as never] as number);
      expect([...l].sort((a, b) => a - b)).toEqual(l);
    }
  });
  it('every price key maps to a real tier or program', () => {
    for (const k of PRICE_KEYS) {
      const [kind, id] = k.split(':');
      expect(kind === 'patron' ? TIERS.some((t) => t.tier === id) : PROGRAMS.some((p) => p.id === id)).toBe(true);
    }
  });
});
