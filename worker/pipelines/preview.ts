/**
 * Preview pipeline — renders an edit recipe as a 128k MP3 preview.
 *
 * Checks storage cache first (keyed by recipe hash). On cache miss,
 * downloads source assets to temp files, validates the recipe,
 * renders via ffmpeg filter_complex, and uploads the result.
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
 * Run the preview pipeline for a single job.
 *
 * Reads `job.metadata.recipe` and `job.metadata.recipeHash`, checks
 * storage for a cached preview, and renders via ffmpeg if needed.
 */
export async function runPreviewPipeline(
  store: JobStore,
  job: AudioPrepJob,
  _childRef: { current: ChildProcess | null },
): Promise<void> {
  const storage = getStorageAdapter();
  const assetService = new AudioAssetService({}, storage);
  const recipe = job.metadata.recipe as EditRecipe;
  const recipeHash = job.metadata.recipeHash as string;

  // -- Cache check ----------------------------------------------------------

  const cachedKey = `assets/${recipe.assetId}/preview_${recipeHash}.mp3`;
  const cachedExists = await storage.exists(cachedKey);

  if (cachedExists) {
    // Cache hit: complete immediately
    await store.complete(job.jobId, { previewKey: cachedKey });
    return;
  }

  // -- Download source assets to temp files ---------------------------------

  await store.update(job.jobId, { stage: 'downloading', progress: 10 });

  const tmpDir = path.join(os.tmpdir(), `preview-${job.jobId}`);
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

    await store.update(job.jobId, { stage: 'downloading', progress: 25 });

    // -- Validate recipe against source durations -----------------------------

    validateRecipe(recipe, sourceDurations);

    // -- Render ---------------------------------------------------------------

    await store.update(job.jobId, { stage: 'rendering', progress: 30 });

    const outputPath = path.join(tmpDir, 'preview.mp3');
    await renderRecipe(recipe, assetPaths, outputPath, { preview: true });

    await store.update(job.jobId, { stage: 'uploading', progress: 90 });

    // -- Upload to storage ----------------------------------------------------

    const outputBuffer = await fs.readFile(outputPath);
    await storage.put(cachedKey, outputBuffer, { contentType: 'audio/mpeg' });

    // -- Complete -------------------------------------------------------------

    await store.complete(job.jobId, { previewKey: cachedKey });
  } finally {
    // Cleanup temp directory
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
