import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobStore } from '@/lib/jobs';
import {
  PlaylistBatchMetadataSchema,
  PlaylistBatchResultSchema,
} from '@/lib/playlist-batch/schema';

export const dynamic = 'force-dynamic';

const RetrySchema = z.object({
  scope: z.enum(['failed', 'incomplete']).default('failed'),
  continueOnError: z.boolean().optional(),
});

function shouldInclude(status: string, scope: 'failed' | 'incomplete'): boolean {
  if (scope === 'failed') return status === 'failed';
  return !['completed', 'skipped'].includes(status);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsedBody = RetrySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsedBody.error.message } },
        { status: 400 },
      );
    }

    const store = getJobStore();
    const batch = await store.get(id);
    if (!batch || batch.type !== 'playlist') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Playlist batch ${id} not found` } },
        { status: 404 },
      );
    }

    const metadataParsed = PlaylistBatchMetadataSchema.safeParse(batch.metadata);
    if (!metadataParsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_BATCH', message: metadataParsed.error.message } },
        { status: 500 },
      );
    }
    const metadata = metadataParsed.data;

    const resultParsed = PlaylistBatchResultSchema.safeParse(batch.result);
    const resultItems = resultParsed.success
      ? resultParsed.data.items
      : metadata.items.map((item) => ({
          index: item.index,
          videoId: item.videoId,
          title: item.title,
          url: item.url,
          status: 'pending' as const,
        }));

    const scope = parsedBody.data.scope;
    const selected = resultItems
      .filter((item) => shouldInclude(item.status, scope))
      .sort((a, b) => a.index - b.index);

    if (selected.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_ITEMS', message: `No ${scope} items to retry/resume` } },
        { status: 400 },
      );
    }

    const originalByVideoId = new Map(metadata.items.map((i) => [i.videoId, i]));
    const newMetadata = {
      ...metadata,
      continueOnError: parsedBody.data.continueOnError ?? metadata.continueOnError,
      items: selected.map((item, newIndex) => {
        const original = originalByVideoId.get(item.videoId);
        return {
          index: newIndex,
          videoId: item.videoId,
          title: original?.title || item.title,
          url: original?.url || item.url,
          durationSeconds: original?.durationSeconds,
        };
      }),
      resumedFromBatchId: id,
      resumeScope: scope,
    };

    const newBatch = await store.create('playlist', newMetadata);
    const position = await store.getQueuePosition(newBatch.jobId);

    return NextResponse.json({
      success: true,
      data: {
        batchId: newBatch.jobId,
        status: newBatch.status,
        position,
        resumedFromBatchId: id,
        itemCount: newMetadata.items.length,
        scope,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

