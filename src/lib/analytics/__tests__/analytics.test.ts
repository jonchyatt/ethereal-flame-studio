import { assertReadChannel, parseReport, readChannelMetrics } from '../reader';
import { proposeNextSlate, scoreGroups } from '../rank';
import type { SlateCandidate, VideoMetrics, VideoTag } from '../types';

// SYNTHETIC fixtures: invented numbers and video ids, no real channel data was reachable.
const metrics: VideoMetrics[] = [
  { videoId: 'v1', views: 900, estimatedMinutesWatched: 5400, averageViewDurationSec: 360, averageViewPercentage: 62, subscribersGained: 20 },
  { videoId: 'v2', views: 800, estimatedMinutesWatched: 2400, averageViewDurationSec: 180, averageViewPercentage: 30, subscribersGained: 4 },
  { videoId: 'v3', views: 40, estimatedMinutesWatched: 400, averageViewDurationSec: 600, averageViewPercentage: 90, subscribersGained: 3 },
];
const tags: VideoTag[] = [
  { videoId: 'v1', sourceId: 'james-allen', theme: 'peace', lengthMinutes: 60 },
  { videoId: 'v2', sourceId: 'wattles', theme: 'wealth', lengthMinutes: 60 },
  { videoId: 'v3', sourceId: 'owned', theme: 'peace', lengthMinutes: 30 },
];
const window = { startDate: '2026-09-01', endDate: '2026-09-30' };

describe('scoreGroups', () => {
  it('ranks the stronger source first and flags thin data as not confident', () => {
    const groups = scoreGroups(metrics, tags);
    const src = groups.filter((g) => g.key === 'sourceId');
    expect(src[0].value).toBe('james-allen');
    expect(src.find((g) => g.value === 'owned')!.confident).toBe(false);
    expect(src[src.length - 1].confident).toBe(false);
  });

  it('ignores tags with no reported metrics', () => {
    const groups = scoreGroups(metrics, [...tags, { videoId: 'gone', sourceId: 'ghost', theme: 'x', lengthMinutes: 1 }]);
    expect(groups.some((g) => g.value === 'ghost')).toBe(false);
  });
});

describe('proposeNextSlate', () => {
  const candidates: SlateCandidate[] = [
    { candidateId: 'c-wealth', sourceId: 'wattles', theme: 'wealth', lengthMinutes: 60 },
    { candidateId: 'c-peace', sourceId: 'james-allen', theme: 'peace', lengthMinutes: 60 },
    { candidateId: 'c-new', sourceId: 'new-source', theme: 'new-theme', lengthMinutes: 60 },
  ];

  it('puts the proven pairing first, new ideas at neutral, the weak one last, and is only a proposal', () => {
    const p = proposeNextSlate(metrics, tags, candidates, window);
    expect(p.ranked.map((c) => c.candidateId)).toEqual(['c-peace', 'c-new', 'c-wealth']);
    expect(p.proposal).toBe(true);
    expect(p.decidedBy).toBe('jonathan');
    expect(p.ranked[1].reason).toContain('no data yet');
  });

  it('is deterministic on ties', () => {
    const a = proposeNextSlate([], [], candidates, window).ranked.map((c) => c.candidateId);
    expect(a).toEqual(['c-new', 'c-peace', 'c-wealth']);
  });
});

describe('reader', () => {
  const report = {
    columnHeaders: ['video', 'views', 'estimatedMinutesWatched', 'averageViewDuration', 'averageViewPercentage', 'subscribersGained'].map((name) => ({ name })),
    rows: [['v1', 900, 5400, 360, 62, 20]],
  };
  const respond = (channelIds: string[], calls: string[] = []) =>
    (async (url: string) => {
      calls.push(String(url));
      const body = String(url).includes('/v3/channels') ? { items: channelIds.map((id) => ({ id })) } : report;
      return { ok: true, status: 200, json: async () => body } as Response;
    }) as unknown as typeof fetch;
  const deps = (channelIds: string[], calls?: string[]) => ({ getAccessToken: async () => 'tok', fetchImpl: respond(channelIds, calls) });

  it('parses columns by name, not position', () => {
    const shuffled = { columnHeaders: [{ name: 'views' }, { name: 'video' }, ...report.columnHeaders.slice(2)], rows: [[900, 'v1', 5400, 360, 62, 20]] };
    expect(parseReport(shuffled)).toEqual(parseReport(report));
  });

  it('throws on a missing column', () => {
    expect(() => parseReport({ columnHeaders: [{ name: 'video' }], rows: [] })).toThrow('missing column');
  });

  it('reads the report only after the channel matches', async () => {
    const calls: string[] = [];
    const rows = await readChannelMetrics(window, deps(['UCyq4s4Nei7Q26tu7EIQY7xw'], calls));
    expect(rows[0].videoId).toBe('v1');
    expect(calls[0]).toContain('/v3/channels');
    expect(calls[1]).toContain('ids=channel%3D%3DUCyq4s4Nei7Q26tu7EIQY7xw');
  });

  it('aborts before any report when the credentials are another channel', async () => {
    const calls: string[] = [];
    await expect(readChannelMetrics(window, deps(['UCother'], calls))).rejects.toThrow('does not equal the WAIA channel');
    expect(calls).toHaveLength(1);
  });

  it('aborts when the credentials reach several channels', async () => {
    await expect(assertReadChannel(deps(['UCyq4s4Nei7Q26tu7EIQY7xw', 'UCother']))).rejects.toThrow();
  });
});

describe('metric sources', () => {
  it('grounds every weighted metric in a cited source and uses equal weights', async () => {
    const { METRIC_SOURCES, UNGROUNDED } = await import('../sources');
    const { DEFAULT_WEIGHTS } = await import('../rank');
    for (const k of Object.keys(DEFAULT_WEIGHTS)) {
      expect(METRIC_SOURCES[k as keyof typeof METRIC_SOURCES].sources.every((s) => s.url.startsWith('https://'))).toBe(true);
    }
    expect(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(UNGROUNDED.length).toBeGreaterThan(0);
  });
});
