import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queueCreatorPackPublishJobs } from '@/lib/creator/queue';

export const dynamic = 'force-dynamic';

const QueuePublishRequestSchema = z.object({
  mode: z.enum(['draft', 'schedule']).default('draft'),
  scheduledFor: z.string().datetime().nullable().optional(),
  includePlatforms: z.array(z.string().min(1).max(64)).optional(),
  sourceSelection: z.enum(['render', 'recut', 'prefer-recut']).default('prefer-recut'),
  titleVariantIndex: z.number().int().min(0).max(10).default(0),
  overwriteExisting: z.boolean().default(false),
  queueSyncJob: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = QueuePublishRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const result = await queueCreatorPackPublishJobs(id, parsed.data);
    return NextResponse.json({
      success: true,
      data: {
        queuedCount: result.queued.length,
        skippedCount: result.skipped.length,
        queued: result.queued,
        skipped: result.skipped,
        syncJobId: result.syncJobId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

