import { randomBytes } from 'crypto';
import type { StorageAdapter } from '@/lib/storage';

/**
 * Privacy-first site counters. An event is only what happened and where:
 * a day, a kind (view or notify), a page and an optional item slug. No cookies,
 * no IP, no user agent, no visitor or session id is stored, so nothing can be
 * joined back to a person. Everything goes through the storage adapter (private
 * bucket / local storage), never into this public repo:
 *   counters/events/<day>/<kind>/<page>/<slug|_>/<random>   one empty marker per event
 *   counters/summaries/<weekEnd>.json                        the weekly summary
 * One object per event means two simultaneous visitors can never overwrite
 * each other's count (no read-modify-write).
 */

export const PAGES = ['store', 'programs', 'program', 'merch'] as const;
export const KINDS = ['view', 'notify'] as const;
export type CounterPage = (typeof PAGES)[number];
export type CounterKind = (typeof KINDS)[number];

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const NO_SLUG = '_';

export interface CounterEvent {
  kind: CounterKind;
  page: CounterPage;
  slug?: string;
}

export type ParseResult = { ok: true; event: CounterEvent } | { ok: false };

/** Strict allowlist: anything else is dropped, so free text can never reach storage. */
export function parseEvent(input: unknown): ParseResult {
  if (!input || typeof input !== 'object') return { ok: false };
  const { kind, page, slug } = input as Record<string, unknown>;
  if (!KINDS.includes(kind as CounterKind) || !PAGES.includes(page as CounterPage)) return { ok: false };
  if (slug !== undefined && slug !== null && slug !== '') {
    if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return { ok: false };
  }
  // A "notify me" tap is always about one item.
  if (kind === 'notify' && !slug) return { ok: false };
  return { ok: true, event: { kind: kind as CounterKind, page: page as CounterPage, slug: slug ? (slug as string) : undefined } };
}

/** Respect Do Not Track and Global Privacy Control, and skip obvious crawlers. */
export function shouldCount(headers: Headers): boolean {
  if (headers.get('dnt') === '1' || headers.get('sec-gpc') === '1') return false;
  const ua = (headers.get('user-agent') || '').toLowerCase();
  if (!ua) return false;
  return !/bot|crawl|spider|slurp|headless|preview|facebookexternalhit|lighthouse/.test(ua);
}

export const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const prefixOf = (day: string) => `counters/events/${day}/`;

export async function recordEvent(storage: StorageAdapter, event: CounterEvent, now = new Date()): Promise<void> {
  const key = `${prefixOf(dayOf(now))}${event.kind}/${event.page}/${event.slug ?? NO_SLUG}/${randomBytes(6).toString('hex')}`;
  await storage.put(key, Buffer.from('1'));
}

const KEY_RE = /(\d{4}-\d{2}-\d{2})\/(view|notify)\/([a-z]+)\/([^/]+)\/[0-9a-f]+$/;

export interface Counted extends CounterEvent { day: string }

export async function loadEvents(storage: StorageAdapter, days: string[]): Promise<Counted[]> {
  const out: Counted[] = [];
  for (const day of days) {
    for (const key of await storage.list(prefixOf(day))) {
      const m = KEY_RE.exec(key);
      if (!m || !PAGES.includes(m[3] as CounterPage)) continue;
      out.push({ day: m[1], kind: m[2] as CounterKind, page: m[3] as CounterPage, slug: m[4] === NO_SLUG ? undefined : m[4] });
    }
  }
  return out;
}
