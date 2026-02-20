import type { EditRecipe } from './types';

interface FilterComplexResult {
  inputs: string[];
  filterComplex: string;
  outputLabel: string;
}

interface BuildOptions {
  /** Include 1-pass loudnorm in filter graph (preview only). Save uses 2-pass post-render. */
  includeNormalize?: boolean;
}

export function buildFilterComplex(
  recipe: EditRecipe,
  assetPaths: Record<string, string>,
  options?: BuildOptions
): FilterComplexResult {
  // Deduplicate input files
  const uniqueAssetIds = [...new Set(recipe.clips.map((c) => c.sourceAssetId))];
  const inputIndexMap: Record<string, number> = {};
  const inputs: string[] = [];

  for (const assetId of uniqueAssetIds) {
    const filePath = assetPaths[assetId];
    if (!filePath) throw new Error(`Missing path for asset ${assetId}`);
    inputIndexMap[assetId] = inputs.length;
    inputs.push(filePath);
  }

  const filters: string[] = [];
  const clipOutputLabels: string[] = [];

  for (let i = 0; i < recipe.clips.length; i++) {
    const clip = recipe.clips[i];
    const inputIdx = inputIndexMap[clip.sourceAssetId];
    const currentLabel = `[${inputIdx}:a]`;
    const chainParts: string[] = [];

    // Trim
    chainParts.push(`atrim=start=${clip.startTime}:end=${clip.endTime}`);
    chainParts.push(`asetpts=PTS-STARTPTS`);

    // Volume (skip if default 1.0)
    if (clip.volume !== 1) {
      chainParts.push(`volume=${clip.volume}`);
    }

    // Fade in
    if (clip.fadeIn > 0) {
      chainParts.push(`afade=t=in:d=${clip.fadeIn}`);
    }

    // Fade out
    if (clip.fadeOut > 0) {
      const clipDuration = clip.endTime - clip.startTime;
      const fadeStart = clipDuration - clip.fadeOut;
      chainParts.push(`afade=t=out:st=${fadeStart}:d=${clip.fadeOut}`);
    }

    const outputLabel = `[clip${i}]`;
    clipOutputLabels.push(outputLabel);
    filters.push(`${currentLabel}${chainParts.join(',')}${outputLabel}`);
  }

  let finalOutput: string;

  if (recipe.clips.length === 1) {
    finalOutput = clipOutputLabels[0];
  } else {
    // Concat all clips
    const concatInput = clipOutputLabels.join('');
    const concatLabel = '[joined]';
    filters.push(`${concatInput}concat=n=${recipe.clips.length}:v=0:a=1${concatLabel}`);
    finalOutput = concatLabel;
  }

  // Normalize: only add 1-pass loudnorm in filter graph for PREVIEW mode.
  // For SAVE mode, caller runs 2-pass loudnorm AFTER this render (not both).
  // The `includeNormalize` flag is set by the caller to control this.
  if (recipe.normalize && options?.includeNormalize) {
    const normLabel = '[norm]';
    filters.push(`${finalOutput}loudnorm${normLabel}`);
    finalOutput = normLabel;
  }

  // Resample
  const resampleLabel = '[out]';
  filters.push(`${finalOutput}aresample=${recipe.outputSampleRate}${resampleLabel}`);
  finalOutput = resampleLabel;

  return {
    inputs,
    filterComplex: filters.join(';'),
    outputLabel: finalOutput,
  };
}
