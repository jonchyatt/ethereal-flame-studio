import type { RecutPlan } from './types';

type RecutPlanInput = {
  sourceVariantId?: string | null;
  durationSec: number;
  platform: string;
  aspectRatio: string;
  durationCapSec: number;
};

export function createAutoRecutPlan(input: RecutPlanInput): RecutPlan {
  const total = Math.max(1, input.durationSec);
  const cap = Math.max(5, input.durationCapSec);
  const segmentCount = total <= cap ? 1 : Math.min(4, Math.max(2, Math.ceil(total / (cap * 1.8))));

  const segments: RecutPlan['segments'] = [];
  if (segmentCount === 1) {
    segments.push({
      startSec: 0,
      endSec: Number(Math.min(total, cap).toFixed(2)),
      score: 0.7,
      reason: total <= cap ? 'Whole clip fits platform cap' : 'Opening segment for short-form teaser',
    });
  } else {
    const spacing = total / (segmentCount + 1);
    for (let i = 0; i < segmentCount; i++) {
      const center = spacing * (i + 1);
      const half = Math.min(cap / 2, Math.max(4, cap * 0.45));
      const startSec = Math.max(0, center - half);
      const endSec = Math.min(total, startSec + cap);
      const score = Number((0.85 - i * 0.08).toFixed(2));
      segments.push({
        startSec: Number(startSec.toFixed(2)),
        endSec: Number(endSec.toFixed(2)),
        score,
        reason: i === 0 ? 'Hook-first teaser cut' : i === 1 ? 'Mid-sequence energy cut' : 'Alternate recut candidate',
      });
    }
  }

  return {
    sourceVariantId: input.sourceVariantId || null,
    platform: input.platform,
    aspectRatio: input.aspectRatio,
    durationCapSec: cap,
    segments,
  };
}
