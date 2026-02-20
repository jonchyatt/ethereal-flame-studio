import { NextRequest, NextResponse } from 'next/server';
import { audioPrepJobs } from '@/lib/audio-prep/JobManager';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { EditRecipeSchema } from '@/lib/audio-prep/types';
import { validateRecipe } from '@/lib/audio-prep/recipeValidator';
import { renderRecipe } from '@/lib/audio-prep/audioRenderer';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

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

    // Check cache: SHA256 of recipe JSON stored in storage adapter
    const storage = assetService.getStorage();
    const recipeHash = crypto.createHash('sha256').update(JSON.stringify(recipe)).digest('hex').slice(0, 16);
    const cachedKey = `${assetService.getAssetPrefix(recipe.assetId)}preview_${recipeHash}.mp3`;

    const cachedExists = await storage.exists(cachedKey);
    if (cachedExists) {
      // Cache hit - create an instantly-completed job
      const cachedJob = audioPrepJobs.create('preview', { recipeHash, cached: true });
      audioPrepJobs.complete(cachedJob.jobId, { previewKey: cachedKey });
      return NextResponse.json({
        success: true,
        data: { jobId: cachedJob.jobId, status: 'complete', cached: true },
      });
    }

    // Look up source durations for validation and resolve original file paths
    const sourceDurations: Record<string, number> = {};
    const assetPaths: Record<string, string> = {};
    const tempFiles: string[] = [];
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
      const tempPath = path.join(os.tmpdir(), `preview-source-${id}${ext}`);
      await fs.writeFile(tempPath, data);
      assetPaths[id] = tempPath;
      tempFiles.push(tempPath);
    }

    // Validate recipe against source durations
    try {
      validateRecipe(recipe, sourceDurations);
    } catch (err) {
      for (const f of tempFiles) await fs.unlink(f).catch(() => {});
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: err instanceof Error ? err.message : String(err) } },
        { status: 400 }
      );
    }

    const job = audioPrepJobs.create('preview', { recipeHash });

    const renderPromise = (async () => {
      const signal = audioPrepJobs.getSignal(job.jobId);
      audioPrepJobs.update(job.jobId, { status: 'processing', progress: 10 });

      try {
        // Render to temp file, then upload to storage
        const tempOutputPath = path.join(os.tmpdir(), `preview-output-${recipe.assetId}-${recipeHash}.mp3`);

        audioPrepJobs.update(job.jobId, { progress: 30 });
        await renderRecipe(recipe, assetPaths, tempOutputPath, { preview: true, signal });
        audioPrepJobs.update(job.jobId, { progress: 90 });

        // Upload preview to storage for caching
        const previewBuffer = await fs.readFile(tempOutputPath);
        await storage.put(cachedKey, previewBuffer, { contentType: 'audio/mpeg' });

        // Cleanup temp output
        await fs.unlink(tempOutputPath).catch(() => {});

        audioPrepJobs.complete(job.jobId, { previewKey: cachedKey });
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
      (globalThis as any).waitUntil(renderPromise);
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
