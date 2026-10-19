import type { StorageAdapter } from '@/lib/storage';
import { SURFACES, type Surface } from './episodes';

/**
 * Click counts per episode, per day, per surface. A click records a slug, a day and a surface;
 * never an address, agent, cookie or id. Stored outside the repo through the storage adapter:
 *   analytics/episode-clicks/<slug>/<YYYY-MM-DD>.json
 * Read-modify-write, so two clicks in the same instant can count once: a count is a floor.
 */
export type DayCounts = { slug: string; day: string; total: number; surfaces: Record<Surface, number> };

const KEY_PREFIX = 'analytics/episode-clicks';
const dayKey = (slug: string, day: string) => `${KEY_PREFIX}/${slug}/${day}.json`;

export const utcDay = (now: Date) => now.toISOString().slice(0, 10);

function empty(slug: string, day: string): DayCounts {
  return { slug, day, total: 0, surfaces: { description: 0, endscreen: 0, short: 0, reel: 0 } };
}

async function read(storage: StorageAdapter, slug: string, day: string): Promise<DayCounts> {
  const raw = await storage.get(dayKey(slug, day));
  if (!raw) return empty(slug, day);
  try {
    const parsed = JSON.parse(raw.toString('utf8')) as DayCounts;
    const base = empty(slug, day);
    for (const s of SURFACES) base.surfaces[s] = Number(parsed.surfaces?.[s]) || 0;
    base.total = Number(parsed.total) || 0;
    return base;
  } catch {
    return empty(slug, day);
  }
}

export async function recordClick(storage: StorageAdapter, slug: string, surface: Surface | null, now = new Date()): Promise<void> {
  const day = utcDay(now);
  const counts = await read(storage, slug, day);
  counts.total += 1;
  if (surface) counts.surfaces[surface] += 1;
  await storage.put(dayKey(slug, day), Buffer.from(JSON.stringify(counts)), { contentType: 'application/json' });
}

export type EpisodeSummary = { slug: string; total: number; surfaces: Record<Surface, number>; byDay: Record<string, number> };
export type ClickSummary = { windowStart: string; windowEnd: string; days: number; total: number; episodes: EpisodeSummary[] };

/** Totals for the last `days` days (UTC, inclusive of today), highest first. Reads counts only. */
export async function summarizeClicks(storage: StorageAdapter, slugs: readonly string[], days = 7, now = new Date()): Promise<ClickSummary> {
  const span = Math.min(Math.max(Math.floor(days) || 7, 1), 90);
  const dayList = Array.from({ length: span }, (_, i) => utcDay(new Date(now.getTime() - i * 86_400_000))).reverse();
  const episodes: EpisodeSummary[] = [];
  for (const slug of slugs) {
    const row: EpisodeSummary = { slug, total: 0, surfaces: { description: 0, endscreen: 0, short: 0, reel: 0 }, byDay: {} };
    for (const day of dayList) {
      const c = await read(storage, slug, day);
      if (c.total === 0) continue;
      row.total += c.total;
      row.byDay[day] = c.total;
      for (const s of SURFACES) row.surfaces[s] += c.surfaces[s];
    }
    episodes.push(row);
  }
  episodes.sort((a, b) => b.total - a.total || a.slug.localeCompare(b.slug));
  return { windowStart: dayList[0], windowEnd: dayList[dayList.length - 1], days: span, total: episodes.reduce((n, e) => n + e.total, 0), episodes };
}
