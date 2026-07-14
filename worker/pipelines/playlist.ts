import type { ChildProcess } from 'child_process';
import { createHash } from 'crypto';
import type { AudioPrepJob, JobStore } from '../../src/lib/jobs/types';
import { getStorageAdapter } from '../../src/lib/storage';
import {
  PlaylistBatchMetadataSchema,
  createInitialPlaylistBatchResult,
  recalcPlaylistBatchSummary,
  type PlaylistBatchItemState,
  type PlaylistBatchResult,
} from '../../src/lib/playlist-batch/schema';
import { runIngestPipeline } from './ingest';

function nowIso(): string {
  return new Date().toISOString();
}

function itemByIndex(result: PlaylistBatchResult, index: number): PlaylistBatchItemState {
  const item = result.items.find((candidate) => candidate.index === index);
  if (!item) throw new Error(`Playlist batch result item ${index} missing`);
  return item;
}

async function parentWasCancelled(store: JobStore, parentJobId: string): Promise<boolean> {
  return (await store.get(parentJobId))?.status === 'cancelled';
}

async function persist(
  store: JobStore,
  jobId: string,
  result: PlaylistBatchResult,
  stage: string,
  progress: number,
): Promise<void> {
  result.summary = recalcPlaylistBatchSummary(result.items);
  await store.update(jobId, {
    stage,
    progress: Math.max(0, Math.min(99, progress)),
    result: result as unknown as Record<string, unknown>,
  });
}

/**
 * Phase 3 playlist worker: SOURCE only. It ingests each source and rests at
 * pending-review. Review approval is the sole authority that creates render
 * intents; the durable outbox dispatches only supported Puppeteer children.
 */
export async function runPlaylistPipeline(
  store: JobStore,
  job: AudioPrepJob,
  childRef: { current: ChildProcess | null },
): Promise<void> {
  const metadata = PlaylistBatchMetadataSchema.parse(job.metadata);
  const result = createInitialPlaylistBatchResult(metadata);
  await persist(store, job.jobId, result, 'playlist-ingest-start', 1);

  for (const source of metadata.items) {
    if (await parentWasCancelled(store, job.jobId)) return;
    const item = itemByIndex(result, source.index);
    result.currentIndex = source.index;
    item.startedAt ||= nowIso();
    item.status = 'ingesting';
    item.error = undefined;
    await persist(
      store,
      job.jobId,
      result,
      `ingesting ${source.index + 1}/${metadata.items.length}`,
      Math.round((source.index / metadata.items.length) * 90),
    );

    const ingestJob = await store.create('ingest', {
      sourceType: 'youtube',
      url: source.url,
      rightsAttested: true,
      playlistBatchId: job.jobId,
      playlistItemIndex: source.index,
      playlistVideoId: source.videoId,
    });
    item.ingestJobId = ingestJob.jobId;
    item.ingestStatus = 'processing';
    const processingJob = {
      ...ingestJob,
      status: 'processing' as const,
      stage: 'initializing',
      progress: 0,
      updatedAt: nowIso(),
    };
    await store.update(ingestJob.jobId, { status: 'processing', stage: 'initializing', progress: 0 });

    try {
      await runIngestPipeline(store, processingJob, childRef);
      const completed = await store.get(ingestJob.jobId);
      const assetId = typeof completed?.result?.assetId === 'string' ? completed.result.assetId : undefined;
      if (!completed || completed.status !== 'complete' || !assetId) {
        throw new Error(completed?.error || 'Ingest did not produce an assetId');
      }
      item.ingestStatus = 'complete';
      item.assetId = assetId;
      const storage = getStorageAdapter();
      const keys = await storage.list(`assets/${assetId}/`);
      const storageKey = keys.find((key) => /\/original\.[A-Za-z0-9]+$/i.test(key));
      if (!storageKey) throw new Error('Ingested asset is missing its original storage object');
      const inputBytes = await storage.get(storageKey);
      if (!inputBytes?.length) throw new Error('Ingested asset original storage object is empty or unreadable');
      item.inputArtifact = {
        assetId,
        storageKey,
        sizeBytes: inputBytes.length,
        sha256: createHash('sha256').update(inputBytes).digest('hex'),
      };
      item.status = 'pending-review';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await store.fail(ingestJob.jobId, message).catch(() => {});
      item.ingestStatus = 'failed';
      item.status = 'failed';
      item.error = `Ingest failed: ${message}`;
      item.completedAt = nowIso();
      if (!metadata.continueOnError) {
        await persist(store, job.jobId, result, 'ingest-failed', 0);
        throw error;
      }
    }

    await persist(
      store,
      job.jobId,
      result,
      item.status === 'pending-review'
        ? `pending-review ${source.index + 1}/${metadata.items.length}`
        : `ingest-failed ${source.index + 1}/${metadata.items.length}`,
      Math.round(((source.index + 1) / metadata.items.length) * 99),
    );
  }

  result.currentIndex = null;
  result.summary = recalcPlaylistBatchSummary(result.items);
  result.status = result.summary.pendingReview > 0 ? 'awaiting-review' : 'failed';
  await store.complete(job.jobId, result as unknown as Record<string, unknown>);
}
