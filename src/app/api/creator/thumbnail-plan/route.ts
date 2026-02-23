import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';
import { getStorageAdapter } from '@/lib/storage';
import { SAFE_ZONE_PRESETS } from '@/lib/creator/presets';
import { createThumbnailPlan } from '@/lib/creator/thumbnail';

export const dynamic = 'force-dynamic';

const ThumbnailPlanRequestSchema = z.object({
  platform: z.string().min(1).max(64),
  safeZonePresetId: z.enum(['safe-16x9', 'safe-9x16', 'safe-1x1']),
  durationSec: z.number().positive().max(60 * 60 * 24).optional(),
  candidateCount: z.number().int().min(4).max(24).optional(),
  renderJobId: z.string().min(1).max(128).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ThumbnailPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    let videoSignedUrl: string | null = null;
    let derivedDuration = parsed.data.durationSec ?? null;

    if (parsed.data.renderJobId) {
      const job = await getJobStore().get(parsed.data.renderJobId);
      if (job && job.type === 'render') {
        const videoKey = (job.result?.videoKey as string | undefined) || null;
        if (videoKey) {
          videoSignedUrl = await getStorageAdapter().getSignedUrl(videoKey, 3600);
        }
        const estimated = (job.metadata.estimatedDurationSec as number | undefined) || undefined;
        if (!derivedDuration && estimated && Number.isFinite(estimated)) {
          derivedDuration = estimated;
        }
      }
    }

    const plan = createThumbnailPlan({
      platform: parsed.data.platform,
      safeZonePresetId: parsed.data.safeZonePresetId,
      durationSec: derivedDuration || 180,
      candidateCount: parsed.data.candidateCount,
      videoSignedUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        plan,
        safeZonePreset: SAFE_ZONE_PRESETS[parsed.data.safeZonePresetId],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
