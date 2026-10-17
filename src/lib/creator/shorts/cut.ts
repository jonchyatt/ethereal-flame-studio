import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { runFfmpegRecut } from '@/lib/creator/ffmpegRecut';
import { CreatorTargetSchema } from '@/lib/creator/types';
import { assertWholeName, captionsForCut, captionsFromText, FULL_NAME, toAss, toSrt, type CaptionLine, type TranscriptLine } from './captions';
import { decodeMonoSamples, energyCurve, selectPeakSegments, SHORT_MAX_SEC } from './peaks';

export const SHORT_WIDTH = 1080;
export const SHORT_HEIGHT = 1920;

const PlatformsSchema = z.object({
  'youtube-shorts': z.string().min(1).max(500),
  'instagram-reels': z.string().min(1).max(2200),
  tiktok: z.string().min(1).max(2200),
});

/** Rights basis and evidence for one source of the parent mix (HB-6). */
export const ShortRightsSchema = z.object({
  sourceId: z.string().min(1),
  rightsBasis: z.enum(['public-domain', 'cc0', 'licensed', 'permission', 'transformative-remix']),
  rightsEvidence: z.string().min(1).max(2000),
});

/** cut.json: everything a Short needs to be traced to its parent render and passed through the gate. */
export const ShortCutSchema = z.object({
  schemaVersion: z.literal(1),
  parentPackId: z.string().uuid(),
  parentVariantId: z.string().min(1),
  parentRenderJobId: z.string().min(1),
  recipeFingerprint: z.string().min(1),
  engine: z.string().min(1),
  target: CreatorTargetSchema,
  startSec: z.number().min(0),
  endSec: z.number().positive(),
  peakScore: z.number().min(0).max(1),
  rights: z.array(ShortRightsSchema).min(1),
  captions: PlatformsSchema,
  publishMode: z.literal('manual-draft'),
}).refine((c) => c.endSec - c.startSec <= SHORT_MAX_SEC && c.endSec > c.startSec, { message: 'A Short must be under 60 seconds' });
export type ShortCut = z.infer<typeof ShortCutSchema>;

/** One block per platform: its length habit, no engagement bait, the name always whole. */
export function platformCaptions(line: string | null): z.infer<typeof PlatformsSchema> {
  // The guard covers the text we write. The narration line is the speaker's own words, quoted as spoken.
  const lead = line ? `${line.trim().slice(0, 120)}\n\n` : '';
  const tail = {
    'youtube-shorts': assertWholeName(`${FULL_NAME}\n#shorts #appreciation`),
    'instagram-reels': assertWholeName(`${FULL_NAME}\n#appreciation #joy #mindfulness`),
    tiktok: assertWholeName(`${FULL_NAME} #appreciation #joy`),
  };
  return {
    'youtube-shorts': `${lead}${tail['youtube-shorts']}`.slice(0, 500),
    'instagram-reels': `${lead}${tail['instagram-reels']}`,
    tiktok: `${lead}${tail.tiktok}`.slice(-300),
  };
}

export type ProducedShort = {
  index: number;
  startSec: number;
  endSec: number;
  peakScore: number;
  dir: string;
  videoPath: string;
  captions: CaptionLine[];
  platformCaptions: z.infer<typeof PlatformsSchema>;
};

/**
 * Cuts 9:16 Shorts from an approved render at its audio energy peaks and burns the caption lettering in.
 * Writes one folder per cut: short.mp4, short.srt, short.ass, captions.json. cut.json is written by the
 * caller once rights and the parent pack are known (see childPack.ts). Nothing is uploaded.
 */
export async function produceShorts(input: {
  inputPath: string;
  outDir: string;
  sourceWidth: number;
  sourceHeight: number;
  transcript?: TranscriptLine[];
  lyricText?: string;
  count?: number;
  targetSec?: number;
}): Promise<ProducedShort[]> {
  const sampleRate = 8000;
  const hopSec = 1;
  const energy = energyCurve(await decodeMonoSamples(input.inputPath, sampleRate), sampleRate, hopSec);
  const segments = selectPeakSegments(energy, { hopSec, count: input.count, targetSec: input.targetSec });
  const shorts: ProducedShort[] = [];

  for (const [i, seg] of segments.entries()) {
    const lines = input.transcript
      ? captionsForCut(input.transcript, seg.startSec, seg.endSec)
      : input.lyricText ? captionsFromText(input.lyricText, seg.endSec - seg.startSec) : [];
    const dir = path.join(input.outDir, `short-${String(i + 1).padStart(2, '0')}`);
    await mkdir(dir, { recursive: true });
    const assPath = path.join(dir, 'short.ass');
    await writeFile(assPath, toAss(lines, SHORT_WIDTH, SHORT_HEIGHT));
    await writeFile(path.join(dir, 'short.srt'), toSrt(lines));
    const videoPath = path.join(dir, 'short.mp4');
    const run = await runFfmpegRecut({
      inputPath: input.inputPath,
      outputPath: videoPath,
      startSec: seg.startSec,
      endSec: seg.endSec,
      sourceWidth: input.sourceWidth,
      sourceHeight: input.sourceHeight,
      targetWidth: SHORT_WIDTH,
      targetHeight: SHORT_HEIGHT,
      fps: 30,
      subtitlePath: lines.length > 0 ? assPath : undefined,
      preset: 'fast',
    });
    if (!run.success) throw new Error(`Short ${i + 1} failed: ${run.error} ${run.stderrTail ?? ''}`);
    const captions = platformCaptions(lines[0]?.text ?? null);
    await writeFile(path.join(dir, 'captions.json'), JSON.stringify(captions, null, 2));
    shorts.push({ index: i, startSec: seg.startSec, endSec: seg.endSec, peakScore: seg.score, dir, videoPath, captions: lines, platformCaptions: captions });
  }
  return shorts;
}
