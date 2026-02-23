import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queueCreatorPackRecutJobs } from '@/lib/creator/queue';

export const dynamic = 'force-dynamic';

const QueueRecutRequestSchema = z.object({
  mode: z.enum(['top', 'all']).default('top'),
  maxPerPlan: z.number().int().min(1).max(20).default(1),
  includePlatforms: z.array(z.string().min(1).max(64)).optional(),
  reviewFilter: z.enum(['all', 'accepted-only', 'accepted-or-unreviewed']).default('accepted-or-unreviewed'),
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
    const parsed = QueueRecutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const result = await queueCreatorPackRecutJobs(id, parsed.data);
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
