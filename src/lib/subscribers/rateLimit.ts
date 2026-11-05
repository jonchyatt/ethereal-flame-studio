/**
 * Five signup attempts per IP per hour, per server process. This intentionally
 * mirrors the lightweight patron-form speed bump; the database remains the
 * durable source of truth and the unique email index handles de-duplication.
 */
export const SUBSCRIBE_RATE_LIMIT = 5;
export const SUBSCRIBE_RATE_WINDOW_MS = 60 * 60 * 1000;

const hits = new Map<string, number[]>();

export function subscriberClientKey(headers: Headers): string {
  return (headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
}

export function allowSubscribe(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < SUBSCRIBE_RATE_WINDOW_MS);
  if (recent.length >= SUBSCRIBE_RATE_LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export function clearSubscribeRateLimitForTests(): void {
  hits.clear();
}
