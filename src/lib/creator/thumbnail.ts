import { SAFE_ZONE_PRESETS } from './presets';
import type { ThumbnailPlan } from './types';

type PlanInput = {
  platform: string;
  safeZonePresetId: keyof typeof SAFE_ZONE_PRESETS;
  durationSec: number;
  candidateCount?: number;
  videoSignedUrl?: string | null;
};

export function createThumbnailPlan(input: PlanInput): ThumbnailPlan {
  const safePreset = SAFE_ZONE_PRESETS[input.safeZonePresetId];
  const durationSec = Math.max(1, input.durationSec);
  const candidateCount = Math.max(4, Math.min(12, input.candidateCount || 6));
  const candidates: ThumbnailPlan['candidates'] = [];

  // Heuristic spacing with center bias. This is a useful default until frame-scoring is added.
  const points = Array.from({ length: candidateCount }, (_, i) => {
    const t = (i + 1) / (candidateCount + 1);
    return durationSec * t;
  });
  const center = durationSec * 0.5;

  for (const timestampSec of points) {
    const normalizedDistance = Math.min(1, Math.abs(timestampSec - center) / Math.max(durationSec * 0.5, 1));
    const score = Number((1 - normalizedDistance * 0.55).toFixed(3));
    const reason =
      timestampSec < durationSec * 0.2
        ? 'Early hook frame candidate'
        : timestampSec > durationSec * 0.8
          ? 'Late payoff frame candidate'
          : 'Mid-sequence balanced frame candidate';
    candidates.push({ timestampSec: Number(timestampSec.toFixed(2)), score, reason });
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    platform: input.platform,
    aspectRatio: safePreset.aspectRatio,
    safeZonePresetId: safePreset.id,
    safeZones: safePreset.safeZones.map((zone) => ({ ...zone })),
    candidates,
    selectedTimestampSec: candidates[0]?.timestampSec ?? 0,
    videoSignedUrl: input.videoSignedUrl || null,
  };
}
