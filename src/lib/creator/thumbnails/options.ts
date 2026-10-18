import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { SAFE_ZONE_PRESETS } from '@/lib/creator/presets';
import { createThumbnailPlan } from '@/lib/creator/thumbnail';
import type { ThumbnailPlan } from '@/lib/creator/types';
import { grabRgbFrame, probeDurationSec, writeContactSheet, writeStill } from './frames';
import { scoreFrame, type FrameScore } from './score';
import { titleSoulProblems } from './soul';

export type ScoredFrame = { timestampSec: number; frame: FrameScore };

export type ThumbnailOptionsResult = {
  plan: ThumbnailPlan;
  /** Everything sampled, best first; rejected frames are kept so the receipt shows why. */
  sampled: ScoredFrame[];
  /** The few distinct options Jonathan picks from. No pick is made here (HB-4). */
  options: Array<ScoredFrame & { file: string }>;
  titleProblems: string[];
  outDir: string;
};

/** Picks the best frames that are at least minGapSec apart, so options are not near-duplicates. */
export function pickDistinct(sampled: ScoredFrame[], count: number, minGapSec: number): ScoredFrame[] {
  const picked: ScoredFrame[] = [];
  for (const s of [...sampled].sort((a, b) => b.frame.score - a.frame.score || a.timestampSec - b.timestampSec)) {
    if (s.frame.rejected) continue;
    if (picked.some((p) => Math.abs(p.timestampSec - s.timestampSec) < minGapSec)) continue;
    picked.push(s);
    if (picked.length >= count) break;
  }
  return picked.sort((a, b) => a.timestampSec - b.timestampSec);
}

/** Turns scored samples into a plan whose candidates carry real frame scores instead of even spacing. */
export function planFromScores(base: ThumbnailPlan, sampled: ScoredFrame[], options: ScoredFrame[]): ThumbnailPlan {
  const pickedAt = new Set(options.map((o) => o.timestampSec));
  const candidates = sampled
    .filter((s) => !s.frame.rejected)
    .map((s) => ({ timestampSec: Number(s.timestampSec.toFixed(2)), score: s.frame.score, reason: pickedAt.has(s.timestampSec) ? `Option: ${s.frame.reason}` : s.frame.reason }))
    .sort((a, b) => b.score - a.score);
  return { ...base, candidates: candidates.length ? candidates : base.candidates, selectedTimestampSec: null };
}

export async function buildThumbnailOptions(input: {
  videoPath: string;
  outDir: string;
  title?: string;
  samples?: number;
  optionCount?: number;
  safeZonePresetId?: keyof typeof SAFE_ZONE_PRESETS;
}): Promise<ThumbnailOptionsResult> {
  const presetId = input.safeZonePresetId ?? 'safe-16x9';
  const durationSec = await probeDurationSec(input.videoPath);
  const samples = Math.max(8, Math.min(60, input.samples ?? 24));
  const optionCount = Math.max(2, Math.min(5, input.optionCount ?? 3));
  const sampled: ScoredFrame[] = [];
  for (let i = 0; i < samples; i++) {
    // Stay off the very first and last frames, which are usually fades.
    const t = Number((durationSec * (0.03 + (0.94 * i) / Math.max(1, samples - 1))).toFixed(2));
    const frame = scoreFrame(await grabRgbFrame(input.videoPath, t), presetId);
    sampled.push({ timestampSec: t, frame });
  }
  const chosen = pickDistinct(sampled, optionCount, durationSec / (optionCount * 2));
  const base = createThumbnailPlan({ platform: 'youtube', safeZonePresetId: presetId, durationSec });
  const plan = planFromScores(base, sampled, chosen);

  await mkdir(input.outDir, { recursive: true });
  const options: ThumbnailOptionsResult['options'] = [];
  for (const [i, o] of chosen.entries()) {
    const file = `option-${String.fromCharCode(97 + i)}-${o.timestampSec.toFixed(1)}s.png`;
    await writeStill(input.videoPath, o.timestampSec, path.join(input.outDir, file));
    options.push({ ...o, file });
  }
  if (options.length > 1) await writeContactSheet(options.map((o) => path.join(input.outDir, o.file)), path.join(input.outDir, 'contact-sheet.png'));
  const titleProblems = input.title ? titleSoulProblems(input.title) : [];
  const result: ThumbnailOptionsResult = { plan, sampled: [...sampled].sort((a, b) => b.frame.score - a.frame.score), options, titleProblems, outDir: input.outDir };
  await writeFile(path.join(input.outDir, 'options.json'), JSON.stringify({
    status: 'options-only; Jonathan picks (HB-4), nothing is selected or published',
    video: path.basename(input.videoPath),
    durationSec,
    title: input.title ?? null,
    titleProblems,
    options: options.map((o) => ({ file: o.file, timestampSec: o.timestampSec, score: o.frame.score, reason: o.frame.reason })),
    sampled: result.sampled.map((s) => ({ timestampSec: s.timestampSec, score: s.frame.score, rejected: s.frame.rejected })),
  }, null, 2));
  return result;
}
