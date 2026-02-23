import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queueCreatorPackSyncJob } from '@/lib/creator/queue';
import { syncCreatorRenderPackStatus } from '@/lib/creator/sync';

export const dynamic = 'force-dynamic';

const SyncRequestSchema = z.object({
  mode: z.enum(['immediate', 'job']).default('immediate'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    if (parsed.data.mode === 'job') {
      const job = await queueCreatorPackSyncJob(id, 'api');
      return NextResponse.json({ success: true, data: { syncJobId: job.jobId, mode: 'job' } });
    }

    const synced = await syncCreatorRenderPackStatus(id);
    return NextResponse.json({ success: true, data: { mode: 'immediate', pack: synced.pack, live: synced.summary } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

