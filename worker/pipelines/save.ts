/**
 * Save pipeline — renders an edit recipe as high-quality output with
 * optional 2-pass loudnorm normalization.
 *
 * Downloads source assets to temp files, validates the recipe,
 * renders via ffmpeg filter_complex, uploads the result, and
 * saves the recipe JSON alongside the prepared file.
 */

import type { ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import type { JobStore, AudioPrepJob } from '../../src/lib/jobs/types';
import type { EditRecipe } from '../../src/lib/audio-prep/types';
import { getStorageAdapter } from '../../src/lib/storage';
import { AudioAssetService } from '../../src/lib/audio-prep/AudioAssetService';
import { renderRecipe } from '../../src/lib/audio-prep/audioRenderer';
import { validateRecipe } from '../../src/lib/audio-prep/recipeValidator';
import { probeAudio } from '../../src/lib/audio-prep/ffprobe';

// ---------------------------------------------------------------------------
// Pipeline entry point
// ---------------------------------------------------------------------------

/**
 * Run the save pipeline for a single job.
 *
 * Reads `job.metadata.recipe`, downloads sources, renders with
 * 2-pass loudnorm (if recipe.normalize is true), uploads the
 * prepared file and recipe JSON to storage.
 */
export async function runSavePipeline(
  store: JobStore,
  job: AudioPrepJob,
  _childRef: { current: ChildProcess | null },
): Promise<void> {
  const storage = getStorageAdapter();
  const assetService = new AudioAssetService({}, storage);
  const recipe = job.metadata.recipe as EditRecipe;

  // -- Download source assets to temp files ---------------------------------

  await store.update(job.jobId, { stage: 'downloading', progress: 5 });

  const tmpDir = path.join(os.tmpdir(), `save-${job.jobId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    const uniqueAssetIds = [...new Set(recipe.clips.map((c) => c.sourceAssetId))];
    const assetPaths: Record<string, string> = {};
    const sourceDurations: Record<string, number> = {};

    for (const assetId of uniqueAssetIds) {
      // Find the original audio file in storage
      const keys = await storage.list(`assets/${assetId}/`);
      const originalKey = keys.find((k) => {
        const filename = k.split('/').pop() || '';
        return filename.startsWith('original.');
      });

      if (!originalKey) {
        throw new Error(`Original audio not found for asset ${assetId}`);
      }

      const data = await storage.get(originalKey);
      if (!data) {
        throw new Error(`Failed to read original audio for asset ${assetId}`);
      }

      const ext = path.extname(originalKey) || '.wav';
      const tempPath = path.join(tmpDir, `${assetId}${ext}`);
      await fs.writeFile(tempPath, data);
      assetPaths[assetId] = tempPath;

      // Probe for duration (needed by validateRecipe)
      const info = await probeAudio(tempPath);
      sourceDurations[assetId] = info.duration;
    }

    await store.update(job.jobId, { stage: 'downloading', progress: 15 });

    // -- Validate recipe against source durations -----------------------------

    validateRecipe(recipe, sourceDurations);

    // -- Remove previous prepared files from storage --------------------------

    const existingKeys = await storage.list(`assets/${recipe.assetId}/`);
    for (const key of existingKeys) {
      const filename = key.split('/').pop() || '';
      if (filename.startsWith('prepared.')) {
        await storage.delete(key);
      }
    }

    // -- Render ---------------------------------------------------------------

    await store.update(job.jobId, { stage: 'rendering', progress: 20 });

    const outputExt = recipe.outputFormat === 'aac' ? '.m4a' : `.${recipe.outputFormat}`;
    const outputPath = path.join(tmpDir, `prepared${outputExt}`);

    await renderRecipe(recipe, assetPaths, outputPath, {
      twoPassNormalize: recipe.normalize,
    });

    await store.update(job.jobId, { stage: 'uploading', progress: 80 });

    // -- Upload prepared file to storage --------------------------------------

    const preparedKey = `assets/${recipe.assetId}/prepared${outputExt}`;
    const outputBuffer = await fs.readFile(outputPath);
    const contentType = outputExt === '.wav'
      ? 'audio/wav'
      : outputExt === '.m4a'
        ? 'audio/mp4'
        : 'audio/mpeg';

    await storage.put(preparedKey, outputBuffer, { contentType });

    // -- Save recipe JSON alongside the prepared file -------------------------

    const editsKey = `assets/${recipe.assetId}/edits.json`;
    await storage.put(editsKey, Buffer.from(JSON.stringify(recipe, null, 2)));

    await store.update(job.jobId, { stage: 'finalizing', progress: 95 });

    // -- Complete -------------------------------------------------------------

    await store.complete(job.jobId, {
      assetId: recipe.assetId,
      preparedKey,
    });
  } finally {
    // Cleanup temp directory
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
