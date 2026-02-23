import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import {
  PlaylistBatchMetadataSchema,
  PlaylistBatchResultSchema,
  createInitialPlaylistBatchResult,
  recalcPlaylistBatchSummary,
} from '@/lib/playlist-batch/schema';

export const dynamic = 'force-dynamic';

function terminalStatus(status: string): boolean {
  return status === 'complete' || status === 'failed' || status === 'cancelled';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getJobStore();
    const batchJob = await store.get(id);

    if (!batchJob || batchJob.type !== 'playlist') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Playlist batch ${id} not found` } },
        { status: 404 },
      );
    }

    const metadataParsed = PlaylistBatchMetadataSchema.safeParse(batchJob.metadata);
    if (!metadataParsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_BATCH', message: metadataParsed.error.message } },
        { status: 500 },
      );
    }
    const metadata = metadataParsed.data;

    const existingResultParsed = PlaylistBatchResultSchema.safeParse(batchJob.result);
    const result = existingResultParsed.success
      ? existingResultParsed.data
      : createInitialPlaylistBatchResult(metadata);

    // Refresh child job statuses so the UI reflects progress even between parent result snapshots.
    await Promise.all(result.items.map(async (item) => {
      if (item.ingestJobId) {
        const ingest = await store.get(item.ingestJobId);
        if (ingest) {
          item.ingestStatus = ingest.status;
          if (ingest.status === 'complete' && typeof ingest.result?.assetId === 'string') {
            item.assetId = ingest.result.assetId;
          }
          if (terminalStatus(ingest.status) && ingest.error && !item.error && ingest.status !== 'complete') {
            item.error = ingest.error;
          }
        }
      }

      if (item.renderJobId) {
        const render = await store.get(item.renderJobId);
        if (render) {
          item.renderStatus = render.status;
          const videoKey =
            (typeof render.result?.videoKey === 'string' && render.result.videoKey) ||
            (typeof render.result?.r2_key === 'string' && render.result.r2_key) ||
            undefined;
          if (videoKey) item.outputVideoKey = videoKey;
          if (terminalStatus(render.status) && render.error && !item.error && render.status !== 'complete') {
            item.error = render.error;
          }
        }
      }
    }));

    result.summary = recalcPlaylistBatchSummary(result.items);
    if (batchJob.status === 'cancelled') result.status = 'cancelled';
    else if (batchJob.status === 'failed') result.status = 'failed';
    else if (batchJob.status === 'complete') result.status = 'completed';

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          id: batchJob.jobId,
          status: batchJob.status,
          progress: batchJob.progress,
          stage: batchJob.stage,
          createdAt: batchJob.createdAt,
          updatedAt: batchJob.updatedAt,
          error: batchJob.error || null,
          metadata,
          result,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getJobStore();
    const batchJob = await store.get(id);
    if (!batchJob || batchJob.type !== 'playlist') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Playlist batch ${id} not found` } },
        { status: 404 },
      );
    }

    await store.cancel(id);

    // Cancel ALL non-terminal child jobs, not just the current item
    const resultParsed = PlaylistBatchResultSchema.safeParse(batchJob.result);
    if (resultParsed.success) {
      for (const item of resultParsed.data.items) {
        if (item.status === 'completed' || item.status === 'failed' || item.status === 'skipped') continue;
        if (item.ingestJobId) {
          await store.cancel(item.ingestJobId).catch(() => {});
        }
        if (item.renderJobId) {
          await store.cancel(item.renderJobId).catch(() => {});
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    );
  }
}

