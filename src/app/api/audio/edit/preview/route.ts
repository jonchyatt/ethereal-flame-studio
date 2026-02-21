import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { EditRecipeSchema } from '@/lib/audio-prep/types';
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

    // Validate that the target asset exists before creating a job
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

    const store = getJobStore();

    const cachedExists = await storage.exists(cachedKey);
    if (cachedExists) {
      // Cache hit - create an instantly-completed job via JobStore
      const cachedJob = await store.create('preview', { recipeHash, cached: true });
      await store.complete(cachedJob.jobId, { previewKey: cachedKey });
      return NextResponse.json({
        success: true,
        data: { jobId: cachedJob.jobId, status: 'complete', cached: true },
      });
    }

    // Cache miss - create a pending job for the worker to process
    const job = await store.create('preview', { recipe, recipeHash });

    return NextResponse.json({
      success: true,
      data: { jobId: job.jobId, status: 'pending' },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
