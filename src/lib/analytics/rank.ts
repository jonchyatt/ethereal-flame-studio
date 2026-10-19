import type { GroupKey, GroupScore, SlateCandidate, SlateProposal, VideoMetrics, VideoTag } from './types';

/**
 * The three metrics are grounded in ./sources.ts. No source publishes weights between them, so they are equal
 * (the no-preference default) until real channel numbers justify otherwise; see UNGROUNDED there.
 */
export const DEFAULT_WEIGHTS = { watchTime: 1 / 3, retention: 1 / 3, subscribers: 1 / 3 };
/** Groups with fewer total views than this are listed but flagged not confident. */
export const DEFAULT_MIN_VIEWS = 100;

type Weights = typeof DEFAULT_WEIGHTS;

/** Share of peers this value beats, 0..1 (ties count half); a single video scores 0.5. */
function percentile(value: number, all: number[]): number {
  if (all.length < 2) return 0.5;
  const below = all.filter((v) => v < value).length;
  const equal = all.filter((v) => v === value).length - 1;
  return (below + equal / 2) / (all.length - 1);
}

export function scoreVideos(metrics: VideoMetrics[], weights: Weights = DEFAULT_WEIGHTS): Map<string, number> {
  const minutesPerView = metrics.map((m) => (m.views ? m.estimatedMinutesWatched / m.views : 0));
  const subsPer1k = metrics.map((m) => (m.views ? (m.subscribersGained / m.views) * 1000 : 0));
  const retention = metrics.map((m) => m.averageViewPercentage);
  const out = new Map<string, number>();
  metrics.forEach((m, i) => {
    out.set(
      m.videoId,
      weights.watchTime * percentile(minutesPerView[i], minutesPerView) +
        weights.retention * percentile(retention[i], retention) +
        weights.subscribers * percentile(subsPer1k[i], subsPer1k),
    );
  });
  return out;
}

export function scoreGroups(
  metrics: VideoMetrics[],
  tags: VideoTag[],
  opts: { weights?: Weights; minViews?: number } = {},
): GroupScore[] {
  const scores = scoreVideos(metrics, opts.weights);
  const byId = new Map(metrics.map((m) => [m.videoId, m]));
  const minViews = opts.minViews ?? DEFAULT_MIN_VIEWS;
  const groups: GroupScore[] = [];
  for (const key of ['sourceId', 'theme'] as GroupKey[]) {
    const buckets = new Map<string, string[]>();
    for (const t of tags) {
      if (!byId.has(t.videoId)) continue; // untagged or unreported videos carry no signal
      buckets.set(t[key], [...(buckets.get(t[key]) ?? []), t.videoId]);
    }
    for (const [value, ids] of buckets) {
      const views = ids.reduce((n, id) => n + byId.get(id)!.views, 0);
      // Views-weighted so one tiny outlier cannot lead a group.
      const score = views
        ? ids.reduce((n, id) => n + scores.get(id)! * byId.get(id)!.views, 0) / views
        : 0;
      groups.push({ key, value, videos: ids.length, views, score, confident: views >= minViews });
    }
  }
  return groups.sort((a, b) => Number(b.confident) - Number(a.confident) || b.score - a.score);
}

/**
 * Rank the queued candidates by how their source and theme performed. Unseen groups get a neutral 0.5 so
 * new ideas are not buried; unconfident groups are pulled toward neutral. Output is a proposal only.
 */
export function proposeNextSlate(
  metrics: VideoMetrics[],
  tags: VideoTag[],
  candidates: SlateCandidate[],
  window: { startDate: string; endDate: string },
  opts: { weights?: Weights; minViews?: number } = {},
): SlateProposal {
  const groups = scoreGroups(metrics, tags, opts);
  const lookup = (key: GroupKey, value: string) => groups.find((g) => g.key === key && g.value === value);
  const effective = (g?: GroupScore) => (!g ? 0.5 : g.confident ? g.score : (g.score + 0.5) / 2);
  const describe = (label: string, g?: GroupScore) =>
    !g ? `${label}: no data yet` : `${label}: ${g.score.toFixed(2)} over ${g.views} views${g.confident ? '' : ' (low confidence)'}`;

  const ranked = candidates
    .map((c) => {
      const s = lookup('sourceId', c.sourceId);
      const t = lookup('theme', c.theme);
      return {
        ...c,
        score: (effective(s) + effective(t)) / 2,
        reason: `${describe('source', s)}; ${describe('theme', t)}`,
      };
    })
    .sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));

  return {
    proposal: true,
    decidedBy: 'jonathan',
    generatedFrom: { videos: metrics.length, windowStart: window.startDate, windowEnd: window.endDate },
    ranked,
    groups,
  };
}
