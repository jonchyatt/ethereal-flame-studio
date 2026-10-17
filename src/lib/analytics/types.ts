export type VideoMetrics = {
  videoId: string;
  views: number;
  estimatedMinutesWatched: number;
  averageViewDurationSec: number;
  averageViewPercentage: number;
  subscribersGained: number;
};

/** What we made, joined to a video by id: the handles the next slate is ranked by. */
export type VideoTag = {
  videoId: string;
  sourceId: string;
  theme: string;
  lengthMinutes: number;
};

export type SlateCandidate = {
  candidateId: string;
  sourceId: string;
  theme: string;
  lengthMinutes: number;
};

export type GroupKey = 'sourceId' | 'theme';

export type GroupScore = {
  key: GroupKey;
  value: string;
  videos: number;
  views: number;
  score: number;
  /** false when the group has fewer views than the confidence floor; shown, never trusted. */
  confident: boolean;
};

export type SlateProposal = {
  /** Always true: cadence, titles and which episodes are Jonathan's call (HB-4). */
  proposal: true;
  decidedBy: 'jonathan';
  generatedFrom: { videos: number; windowStart: string; windowEnd: string };
  ranked: Array<SlateCandidate & { score: number; reason: string }>;
  groups: GroupScore[];
};
