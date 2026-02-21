import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import { AudioAssetService } from '@/lib/audio-prep/AudioAssetService';
import { EditRecipeSchema } from '@/lib/audio-prep/types';

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

    // Create a pending job for the worker to process
    const store = getJobStore();
    const job = await store.create('save', { recipe });

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
