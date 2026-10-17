/** Small in-memory limiter for the public forms (per process; a speed bump, not a wall). */
const hits = new Map<string, number[]>();

export function allow(key: string, max = 5, windowMs = 60 * 60 * 1000, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientKey(headers: Headers): string {
  return (headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
}
