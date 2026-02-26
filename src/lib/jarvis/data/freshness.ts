export type FreshnessTier = 'live' | 'recent' | 'stale' | 'old' | 'unknown';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export function getFreshness(lastFetched: Date | null): FreshnessTier {
  if (!lastFetched) return 'unknown';

  const age = Date.now() - lastFetched.getTime();

  if (age < 1 * MINUTE) return 'live';
  if (age < 15 * MINUTE) return 'recent';
  if (age < 1 * HOUR) return 'stale';
  if (age < 6 * HOUR) return 'old';
  return 'unknown';
}
