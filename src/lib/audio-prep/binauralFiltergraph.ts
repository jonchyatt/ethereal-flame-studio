import { z } from 'zod';

// ---------------------------------------------------------------------------
// Binaural mix recipe — audio-only schema (Phase 2 mixer spike, waia-curation-pipeline).
//
// Deliberately NOT EditRecipeSchema (types.ts) — that schema is single-assetId,
// single-track-concat only (see filterComplexBuilder.ts) and doesn't fit
// multi-source layered mixing. This is a new, sibling schema.
//
// Deliberately does NOT include engine/target/render fields (HB-7 boundary) —
// those belong on a separate render-receipt record, not the reproducible
// audio mix recipe. See data/waia-curation-pipeline/ render-receipt files.
// ---------------------------------------------------------------------------

export const ChannelRoutingSchema = z.object({
  /** Linear gain (0-2, same range as existing Clip.volume) applied when this source is summed into the LEFT output. */
  left: z.number().min(0).max(2),
  /** Linear gain (0-2) applied when this source is summed into the RIGHT output. */
  right: z.number().min(0).max(2),
});

export type ChannelRouting = z.infer<typeof ChannelRoutingSchema>;

export const MixSourceSchema = z.object({
  assetId: z.string(),
  sourceUrl: z.string(),
  rightsBasis: z.string(),
  /** Seconds this source's start is delayed into the final mix timeline (adelay), NOT a trim of the source itself. */
  offsetSec: z.number().min(0),
  /** Overall level for this source, in dB, applied before the L/R split. */
  levelDb: z.number(),
  /** Deliberate L vs R weighting — the mechanism that makes L and R carry genuinely different content. */
  channelRouting: ChannelRoutingSchema,
});

export type MixSource = z.infer<typeof MixSourceSchema>;

export const MusicBedSchema = z.object({
  assetId: z.string(),
  sourceUrl: z.string(),
  rightsBasis: z.string(),
  levelDb: z.number(),
  attribution: z.string().optional(),
});

export type MusicBed = z.infer<typeof MusicBedSchema>;

export const BinauralMixRecipeSchema = z.object({
  version: z.literal(1),
  sources: z.array(MixSourceSchema).min(2), // spike proves 2+ sources
  musicBed: MusicBedSchema,
  mixDescription: z.string(),
  outputPath: z.string(),
});

export type BinauralMixRecipe = z.infer<typeof BinauralMixRecipeSchema>;

// ---------------------------------------------------------------------------
// Pure compiler: recipe -> ffmpeg filter_complex string. No I/O, no side effects.
// ---------------------------------------------------------------------------

export interface BinauralFiltergraphResult {
  /** Ordered input file paths — pass to ffmpeg as `-i` args in this exact order. */
  inputs: string[];
  filterComplex: string;
  outputLabel: string;
}

export interface BinauralFiltergraphOptions {
  outputSampleRate?: number;
}

const dbToLinear = (db: number): number => Math.pow(10, db / 20);

export function buildBinauralFiltergraph(
  recipe: BinauralMixRecipe,
  assetPaths: Record<string, string>,
  options?: BinauralFiltergraphOptions
): BinauralFiltergraphResult {
  const sampleRate = options?.outputSampleRate ?? 44100;

  const inputs: string[] = [];
  const filters: string[] = [];
  const leftBranches: string[] = [];
  const rightBranches: string[] = [];

  const addBranch = (
    idx: number,
    assetId: string,
    levelDb: number,
    offsetSec: number,
    routing: ChannelRouting
  ): void => {
    const filePath = assetPaths[assetId];
    if (!filePath) throw new Error(`Missing path for asset ${assetId}`);
    const inputIdx = inputs.length;
    inputs.push(filePath);

    const gain = dbToLinear(levelDb);
    const delayMs = Math.max(0, Math.round(offsetSec * 1000));

    // aformat=stereo first so mono AND stereo sources both land on a deterministic
    // 2-channel layout before the downmix — pan=mono|c0=0.5*c0+0.5*c1 would error
    // on a genuinely mono input (no c1) without this normalization step.
    const chain = ['aformat=channel_layouts=stereo', 'pan=mono|c0=0.5*c0+0.5*c1', `volume=${gain}`];
    if (delayMs > 0) chain.push(`adelay=${delayMs}:all=1`);

    const monoLabel = `[m${idx}]`;
    filters.push(`[${inputIdx}:a]${chain.join(',')}${monoLabel}`);

    const preL = `[p${idx}l]`;
    const preR = `[p${idx}r]`;
    filters.push(`${monoLabel}asplit=2${preL}${preR}`);

    const lLabel = `[l${idx}]`;
    const rLabel = `[r${idx}]`;
    filters.push(`${preL}volume=${routing.left}${lLabel}`);
    filters.push(`${preR}volume=${routing.right}${rLabel}`);

    leftBranches.push(lLabel);
    rightBranches.push(rLabel);
  };

  recipe.sources.forEach((src, i) => {
    addBranch(i, src.assetId, src.levelDb, src.offsetSec, src.channelRouting);
  });

  // Music bed: centered (equal L/R per the locked recipe schema — no channelRouting
  // field on musicBed), no stagger offset (underlies the whole mix from t=0).
  addBranch(recipe.sources.length, recipe.musicBed.assetId, recipe.musicBed.levelDb, 0, {
    left: 1,
    right: 1,
  });

  // Explicit per-branch weights (all 1 — the real weighting already happened via the
  // volume= gains above) + normalize=0, so ffmpeg does NOT auto-divide by input count
  // (amix hygiene, CW finding #8) — clipping is guarded downstream via alimiter.
  const flatWeights = (branches: string[]) => branches.map(() => '1').join(' ');

  filters.push(
    `${leftBranches.join('')}amix=inputs=${leftBranches.length}:weights=${flatWeights(
      leftBranches
    )}:normalize=0[Lsum]`
  );
  filters.push(
    `${rightBranches.join('')}amix=inputs=${rightBranches.length}:weights=${flatWeights(
      rightBranches
    )}:normalize=0[Rsum]`
  );

  // join (not amerge) so the two independently-summed mono tracks land explicitly
  // as FL/FR of one real stereo stream — L and R are genuinely different signals,
  // not a panned copy of one mono source.
  filters.push('[Lsum][Rsum]join=inputs=2:channel_layout=stereo:map=0.0-FL|1.0-FR[joined]');

  // Guard against clipping from the non-normalized amix sums, then pin the exact
  // output format so the same recipe always produces the same byte layout.
  filters.push('[joined]alimiter=limit=0.98[limited]');
  filters.push(`[limited]aformat=sample_fmts=s16:sample_rates=${sampleRate}:channel_layouts=stereo[out]`);

  return {
    inputs,
    filterComplex: filters.join(';'),
    outputLabel: '[out]',
  };
}
