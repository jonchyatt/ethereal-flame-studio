import { WAIA_YOUTUBE_CHANNEL_ID } from '@/lib/playlist-batch/schema';
import { PublishChannelMismatchError } from '@/lib/creator/publishGate';
import type { VideoMetrics } from './types';

const DATA_API = 'https://www.googleapis.com/youtube/v3/channels';
const ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2/reports';

const METRICS = ['views', 'estimatedMinutesWatched', 'averageViewDuration', 'averageViewPercentage', 'subscribersGained'] as const;

export type ReaderDeps = {
  /** Supplied by the local runner; this module never performs or stores OAuth. */
  getAccessToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
};

async function getJson(url: string, deps: ReaderDeps): Promise<any> {
  const f = deps.fetchImpl ?? fetch;
  const res = await f(url, { headers: { Authorization: `Bearer ${await deps.getAccessToken()}` } });
  if (!res.ok) throw new Error(`YouTube read failed: ${res.status} ${url.split('?')[0]}`);
  return res.json();
}

/** HB-10 for the read path: the credentials must act as exactly the WAIA channel before any report is requested. */
export async function assertReadChannel(deps: ReaderDeps): Promise<void> {
  const body = await getJson(`${DATA_API}?part=id&mine=true`, deps);
  const ids: string[] = (body.items ?? []).map((c: { id?: string }) => c.id ?? '');
  if (ids.length !== 1 || ids[0] !== WAIA_YOUTUBE_CHANNEL_ID) {
    throw new PublishChannelMismatchError(ids.length === 1 ? ids[0] : ids.join(',') || null);
  }
}

export function parseReport(body: { columnHeaders?: Array<{ name: string }>; rows?: unknown[][] }): VideoMetrics[] {
  const names = (body.columnHeaders ?? []).map((h) => h.name);
  const col = (n: string) => {
    const i = names.indexOf(n);
    if (i < 0) throw new Error(`analytics report is missing column ${n}`);
    return i;
  };
  const idx = { video: col('video'), ...Object.fromEntries(METRICS.map((m) => [m, col(m)])) } as Record<string, number>;
  return (body.rows ?? []).map((r) => ({
    videoId: String(r[idx.video]),
    views: Number(r[idx.views]),
    estimatedMinutesWatched: Number(r[idx.estimatedMinutesWatched]),
    averageViewDurationSec: Number(r[idx.averageViewDuration]),
    averageViewPercentage: Number(r[idx.averageViewPercentage]),
    subscribersGained: Number(r[idx.subscribersGained]),
  }));
}

/** Per-video totals for the window, channel-asserted first. Dates are YYYY-MM-DD. */
export async function readChannelMetrics(
  window: { startDate: string; endDate: string },
  deps: ReaderDeps,
): Promise<VideoMetrics[]> {
  await assertReadChannel(deps);
  const q = new URLSearchParams({
    ids: `channel==${WAIA_YOUTUBE_CHANNEL_ID}`,
    startDate: window.startDate,
    endDate: window.endDate,
    metrics: METRICS.join(','),
    dimensions: 'video',
    sort: '-estimatedMinutesWatched',
    maxResults: '200',
  });
  return parseReport(await getJson(`${ANALYTICS_API}?${q}`, deps));
}
