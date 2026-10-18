import type { StorageAdapter } from '@/lib/storage';
import { dayOf, loadEvents, type CounterPage } from './model';

/** Same floor the channel ranking uses: a rate on fewer views is shown, never trusted. */
export const CONFIDENCE_VIEWS = 100;

export interface ItemSignal {
  page: CounterPage;
  slug: string;
  views: number;
  notifyTaps: number;
  /** notify taps per view; null when there were no views. */
  notifyRate: number | null;
  confident: boolean;
}

export interface WeeklySummary {
  /** Always true: what to do with these numbers is Jonathan's call (HB-4). */
  proposal: true;
  startDay: string;
  endDay: string;
  viewsByPage: Record<string, number>;
  notifyTaps: number;
  items: ItemSignal[];
  /** Per-day total views, oldest first. */
  dailyViews: { day: string; views: number }[];
}

/** The seven UTC days ending on (and including) `endDay`, oldest first. */
export function weekDays(endDay: string): string[] {
  const end = new Date(`${endDay}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => dayOf(new Date(end.getTime() - (6 - i) * 86_400_000)));
}

export async function summarizeWeek(storage: StorageAdapter, endDay: string = dayOf(new Date())): Promise<WeeklySummary> {
  const days = weekDays(endDay);
  const events = await loadEvents(storage, days);

  const viewsByPage: Record<string, number> = {};
  const daily = new Map(days.map((d) => [d, 0]));
  const items = new Map<string, ItemSignal>();
  let notifyTaps = 0;

  for (const e of events) {
    if (e.kind === 'view') {
      viewsByPage[e.page] = (viewsByPage[e.page] ?? 0) + 1;
      daily.set(e.day, (daily.get(e.day) ?? 0) + 1);
    } else notifyTaps++;
    if (!e.slug) continue;
    const id = `${e.page}/${e.slug}`;
    const row = items.get(id) ?? { page: e.page, slug: e.slug, views: 0, notifyTaps: 0, notifyRate: null, confident: false };
    if (e.kind === 'view') row.views++; else row.notifyTaps++;
    items.set(id, row);
  }

  const rows = [...items.values()].map((r) => ({
    ...r,
    notifyRate: r.views ? r.notifyTaps / r.views : null,
    confident: r.views >= CONFIDENCE_VIEWS,
  }));
  rows.sort((a, b) => b.views - a.views || a.slug.localeCompare(b.slug));

  return {
    proposal: true,
    startDay: days[0],
    endDay: days[6],
    viewsByPage,
    notifyTaps,
    items: rows,
    dailyViews: days.map((day) => ({ day, views: daily.get(day) ?? 0 })),
  };
}

export async function saveWeeklySummary(storage: StorageAdapter, summary: WeeklySummary): Promise<string> {
  const key = `counters/summaries/${summary.endDay}.json`;
  await storage.put(key, Buffer.from(JSON.stringify(summary, null, 2)));
  return key;
}

/** What the next-slate ranking reads: interest in a program or item, by slug, with its confidence. */
export function interestBySlug(summary: WeeklySummary): Record<string, ItemSignal> {
  return Object.fromEntries(summary.items.map((r) => [`${r.page}/${r.slug}`, r]));
}
