import { NextRequest, NextResponse } from 'next/server';
import { audioPrepJobs } from '@/lib/audio-prep/JobManager';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { EditRecipeSchema } from '@/lib/audio-prep/types';
import { validateRecipe } from '@/lib/audio-prep/recipeValidator';
import { renderRecipe } from '@/lib/audio-prep/audioRenderer';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const assetService = new AudioAssetService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = EditRecipeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }
    const recipe = parsed.data;

    // Validate that the target asset exists before creating any files
    const targetAsset = await assetService.getAsset(recipe.assetId);
    if (!targetAsset) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Target asset ${recipe.assetId} not found` } },
        { status: 404 }
      );
    }

    // Look up source durations for validation and resolve original file paths
    const storage = assetService.getStorage();
    const sourceDurations: Record<string, number> = {};
    const assetPaths: Record<string, string> = {};
    const tempFiles: string[] = []; // Track temp files for cleanup
    const uniqueAssetIds = [...new Set(recipe.clips.map(c => c.sourceAssetId))];

    for (const id of uniqueAssetIds) {
      const asset = await assetService.getAsset(id);
      if (!asset) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Source asset ${id} not found` } },
          { status: 404 }
        );
      }
      sourceDurations[id] = asset.audio.duration;

      // Find original file via storage adapter
      const keys = await storage.list(assetService.getAssetPrefix(id));
      const originalKey = keys.find(k => {
        const filename = k.split('/').pop() || '';
        return filename.startsWith('original');
      });
      if (!originalKey) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Original audio file not found for asset ${id}` } },
          { status: 404 }
        );
      }

      // Download original to temp file for ffmpeg processing
      const data = await storage.get(originalKey);
      if (!data) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Failed to read original audio for asset ${id}` } },
          { status: 404 }
        );
      }
      const ext = path.extname(originalKey) || '.wav';
      const tempPath = path.join(os.tmpdir(), `edit-source-${id}${ext}`);
      await fs.writeFile(tempPath, data);
      assetPaths[id] = tempPath;
      tempFiles.push(tempPath);
    }

    // Validate recipe
    try {
      validateRecipe(recipe, sourceDurations);
    } catch (err) {
      // Cleanup temp files on validation failure
      for (const f of tempFiles) await fs.unlink(f).catch(() => {});
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: err instanceof Error ? err.message : String(err) } },
        { status: 400 }
      );
    }

    const job = audioPrepJobs.create('save', { assetId: recipe.assetId });

    const savePromise = (async () => {
      const signal = audioPrepJobs.getSignal(job.jobId);
      audioPrepJobs.update(job.jobId, { status: 'processing', progress: 10 });

      try {
        // Remove any previous prepared.* files from storage to avoid nondeterministic resolution
        const existingKeys = await storage.list(assetService.getAssetPrefix(recipe.assetId));
        for (const key of existingKeys) {
          const filename = key.split('/').pop() || '';
          if (filename.startsWith('prepared.')) {
            await storage.delete(key);
          }
        }

        const outputExt = recipe.outputFormat === 'aac' ? '.aac' : '.wav';
        // Render to a temp file, then upload to storage
        const tempOutputPath = path.join(os.tmpdir(), `edit-output-${recipe.assetId}${outputExt}`);

        audioPrepJobs.update(job.jobId, { progress: 20 });
        await renderRecipe(recipe, assetPaths, tempOutputPath, {
          twoPassNormalize: recipe.normalize,
          signal,
        });
        audioPrepJobs.update(job.jobId, { progress: 80 });

        // Upload prepared file to storage
        const preparedBuffer = await fs.readFile(tempOutputPath);
        await storage.put(
          `${assetService.getAssetPrefix(recipe.assetId)}prepared${outputExt}`,
          preparedBuffer
        );

        // Save recipe alongside the output via storage
        await storage.put(
          `${assetService.getAssetPrefix(recipe.assetId)}edits.json`,
          Buffer.from(JSON.stringify(recipe, null, 2))
        );

        // Cleanup temp output file
        await fs.unlink(tempOutputPath).catch(() => {});

        audioPrepJobs.complete(job.jobId, {
          assetId: recipe.assetId,
          preparedKey: `${assetService.getAssetPrefix(recipe.assetId)}prepared${outputExt}`,
        });
      } finally {
        // Cleanup temp source files
        for (const f of tempFiles) await fs.unlink(f).catch(() => {});
      }
    })().catch((err) => {
      const current = audioPrepJobs.get(job.jobId);
      if (current && current.status !== 'cancelled') {
        audioPrepJobs.fail(job.jobId, err instanceof Error ? err.message : String(err));
      }
    });

    if (typeof (globalThis as any).waitUntil === 'function') {
      (globalThis as any).waitUntil(savePromise);
    }

    return NextResponse.json({
      success: true,
      data: { jobId: job.jobId, status: job.status },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
