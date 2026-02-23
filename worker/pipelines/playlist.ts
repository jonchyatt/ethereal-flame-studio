import type { ChildProcess } from 'child_process';
import type { JobStore, AudioPrepJob } from '../../src/lib/jobs/types';
import { getLeaseStore } from '../../src/lib/leases';
import type { LeaseRecord } from '../../src/lib/leases';
import {
  PlaylistBatchMetadataSchema,
  createInitialPlaylistBatchResult,
  recalcPlaylistBatchSummary,
  createPlaylistRenderFingerprint,
  type PlaylistBatchItemState,
  type PlaylistBatchMetadata,
  type PlaylistBatchResult,
} from '../../src/lib/playlist-batch/schema';
import { runIngestPipeline } from './ingest';
import { runRenderPipeline } from './render';
import { waitForRenderCompletion } from './render-wait';

function nowIso(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveAppUrl(metadata: PlaylistBatchMetadata): string {
  const url =
    metadata.appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!url) {
    console.warn('[playlist] No appUrl, NEXT_PUBLIC_APP_URL, or VERCEL_URL set — falling back to http://localhost:3000');
    return 'http://localhost:3000';
  }
  return url;
}

function toVisualConfig(metadata: PlaylistBatchMetadata): Record<string, unknown> {
  return metadata.visualConfig || {};
}

function buildAudioName(item: { title: string; videoId: string }): string {
  const safe = item.title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${safe || item.videoId}.mp3`;
}

async function setInlineProcessing(store: JobStore, job: AudioPrepJob): Promise<AudioPrepJob> {
  await store.update(job.jobId, {
    status: 'processing',
    stage: 'initializing',
    progress: 0,
  });
  return {
    ...job,
    status: 'processing',
    stage: 'initializing',
    progress: 0,
    updatedAt: nowIso(),
  };
}

async function ensureParentNotCancelled(store: JobStore, parentJobId: string): Promise<void> {
  const parent = await store.get(parentJobId);
  if (parent?.status === 'cancelled') {
    throw new Error('Playlist batch cancelled');
  }
}

function itemByIndex(result: PlaylistBatchResult, index: number): PlaylistBatchItemState {
  const item = result.items[index];
  if (!item) {
    throw new Error(`Playlist batch result item ${index} missing`);
  }
  return item;
}

async function persistBatchProgress(
  store: JobStore,
  parentJobId: string,
  result: PlaylistBatchResult,
  stage: string,
  progress: number,
): Promise<void> {
  result.summary = recalcPlaylistBatchSummary(result.items);
  await store.update(parentJobId, {
    stage,
    progress: Math.max(0, Math.min(99, progress)),
    result: result as unknown as Record<string, unknown>,
  });
}

function progressForStep(index: number, total: number, phase: 'ingest' | 'render' | 'done'): number {
  if (total <= 0) return 0;
  const itemBase = (index / total) * 100;
  const itemSpan = 100 / total;
  if (phase === 'ingest') return Math.round(itemBase + itemSpan * 0.25);
  if (phase === 'render') return Math.round(itemBase + itemSpan * 0.7);
  return Math.round(((index + 1) / total) * 100);
}

function getRenderOutputKey(job: AudioPrepJob | undefined): string | undefined {
  if (!job?.result) return undefined;
  const keys = ['videoKey', 'r2_key', 'r2Key', 'storageKey'];
  for (const key of keys) {
    const value = job.result[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

function buildTargetLeaseKey(metadata: PlaylistBatchMetadata): string {
  if (metadata.target === 'local-agent') {
    return `render-target:local-agent:${metadata.targetAgentId || 'any'}`;
  }
  return `render-target:${metadata.target}`;
}

async function acquireTargetLease(
  parentStore: JobStore,
  parentJobId: string,
  metadata: PlaylistBatchMetadata,
  itemIndex: number,
  totalItems: number,
): Promise<LeaseRecord> {
  const leaseStore = getLeaseStore();
  const leaseKey = buildTargetLeaseKey(metadata);
  const ttlMs = Number(process.env.PLAYLIST_TARGET_LOCK_TTL_MS) || 60_000;
  const waitMs = Number(process.env.PLAYLIST_TARGET_LOCK_POLL_MS) || 3000;

  while (true) {
    await ensureParentNotCancelled(parentStore, parentJobId);

    const acquired = await leaseStore.acquire(leaseKey, parentJobId, ttlMs, {
      metadata: {
        batchJobId: parentJobId,
        itemIndex,
        totalItems,
        target: metadata.target,
        targetAgentId: metadata.targetAgentId || null,
      },
    });
    if (acquired.acquired && acquired.lease) {
      return acquired.lease;
    }

    await parentStore.update(parentJobId, {
      stage: `waiting-target-lock ${itemIndex + 1}/${totalItems}`,
    });
    await sleep(waitMs);
  }
}

type DedupMatch = {
  renderJobId: string;
  outputVideoKey?: string;
};

async function buildDedupeIndex(store: JobStore): Promise<Map<string, DedupMatch>> {
  const allRenderJobs = await store.list({ type: 'render' });
  const index = new Map<string, DedupMatch>();

  for (const renderJob of allRenderJobs) {
    if (renderJob.status !== 'complete') continue;
    const fp = (renderJob.metadata?.playlistRenderFingerprint as string | undefined);
    if (!fp) continue;

    const outputVideoKey = getRenderOutputKey(renderJob);
    if (!index.has(fp)) {
      index.set(fp, {
        renderJobId: renderJob.jobId,
        outputVideoKey,
      });
    }
  }

  return index;
}

/**
 * Playlist pipeline -- sequentially ingests YouTube playlist entries and
 * dispatches render jobs one-by-one, waiting for each render callback to
 * complete before moving to the next item.
 */
export async function runPlaylistPipeline(
  store: JobStore,
  job: AudioPrepJob,
  childRef: { current: ChildProcess | null },
): Promise<void> {
  const parsed = PlaylistBatchMetadataSchema.safeParse(job.metadata);
  if (!parsed.success) {
    throw new Error(`Invalid playlist batch metadata: ${parsed.error.message}`);
  }
  const metadata = parsed.data;
  const appUrl = deriveAppUrl(metadata);
  const leaseStore = getLeaseStore();
  const targetLockTtlMs = Number(process.env.PLAYLIST_TARGET_LOCK_TTL_MS) || 60_000;

  let result = createInitialPlaylistBatchResult(metadata);
  await persistBatchProgress(store, job.jobId, result, 'playlist-start', 1);

  for (const sourceItem of metadata.items) {
    await ensureParentNotCancelled(store, job.jobId);

    const idx = sourceItem.index;
    result.currentIndex = idx;
    const item = itemByIndex(result, idx);
    if (!item.startedAt) item.startedAt = nowIso();
    item.status = 'ingesting';
    item.error = undefined;

    const renderFingerprint = createPlaylistRenderFingerprint({
      videoId: sourceItem.videoId,
      target: metadata.target,
      targetAgentId: metadata.targetAgentId,
      outputFormat: metadata.outputFormat,
      fps: metadata.fps,
      visualConfig: metadata.visualConfig,
    });

    // Rebuild dedup index each item to catch concurrent batch completions
    const dedupeIndex = await buildDedupeIndex(store);
    const deduped = dedupeIndex.get(renderFingerprint);
    if (deduped) {
      item.status = 'skipped';
      item.renderJobId = deduped.renderJobId;
      item.outputVideoKey = deduped.outputVideoKey;
      item.completedAt = nowIso();
      await persistBatchProgress(
        store,
        job.jobId,
        result,
        `deduped ${idx + 1}/${metadata.items.length}`,
        progressForStep(idx, metadata.items.length, 'done'),
      );
      continue;
    }

    await persistBatchProgress(
      store,
      job.jobId,
      result,
      `ingesting ${idx + 1}/${metadata.items.length}`,
      progressForStep(idx, metadata.items.length, 'ingest'),
    );

    // -- Inline ingest -----------------------------------------------------
    const ingestJob = await store.create('ingest', {
      sourceType: 'youtube',
      url: sourceItem.url,
      rightsAttested: true,
      playlistBatchId: job.jobId,
      playlistItemIndex: idx,
      playlistVideoId: sourceItem.videoId,
    });
    item.ingestJobId = ingestJob.jobId;
    item.ingestStatus = 'processing';
    const ingestProcessingJob = await setInlineProcessing(store, ingestJob);

    try {
      await runIngestPipeline(store, ingestProcessingJob, childRef);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await store.fail(ingestJob.jobId, message);
      } catch {
        // Ignore secondary failure
      }
      item.ingestStatus = 'failed';
      item.status = 'failed';
      item.error = `Ingest failed: ${message}`;
      item.completedAt = nowIso();
      await persistBatchProgress(
        store,
        job.jobId,
        result,
        `ingest-failed ${idx + 1}/${metadata.items.length}`,
        progressForStep(idx, metadata.items.length, 'ingest'),
      );
      if (!metadata.continueOnError) {
        throw new Error(`Playlist item ${idx + 1} ingest failed: ${message}`);
      }
      continue;
    }

    const ingestFinal = await store.get(ingestJob.jobId);
    item.ingestStatus = ingestFinal?.status;
    const assetId = typeof ingestFinal?.result?.assetId === 'string' ? ingestFinal.result.assetId : undefined;
    if (!ingestFinal || ingestFinal.status !== 'complete' || !assetId) {
      const message = ingestFinal?.error || 'Ingest did not produce an assetId';
      item.status = 'failed';
      item.error = `Ingest failed: ${message}`;
      item.completedAt = nowIso();
      await persistBatchProgress(
        store,
        job.jobId,
        result,
        `ingest-invalid ${idx + 1}/${metadata.items.length}`,
        progressForStep(idx, metadata.items.length, 'ingest'),
      );
      if (!metadata.continueOnError) {
        throw new Error(`Playlist item ${idx + 1} ingest invalid result: ${message}`);
      }
      continue;
    }

    item.assetId = assetId;
    item.status = 'ingested';
    await persistBatchProgress(
      store,
      job.jobId,
      result,
      `ingested ${idx + 1}/${metadata.items.length}`,
      progressForStep(idx, metadata.items.length, 'ingest'),
    );

    // -- Inline render dispatch + strict wait ------------------------------
    let targetLease: LeaseRecord | null = null;
    try {
      targetLease = await acquireTargetLease(store, job.jobId, metadata, idx, metadata.items.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      item.status = 'failed';
      item.error = `Target lock failed: ${message}`;
      item.completedAt = nowIso();
      await persistBatchProgress(
        store,
        job.jobId,
        result,
        `target-lock-failed ${idx + 1}/${metadata.items.length}`,
        progressForStep(idx, metadata.items.length, 'render'),
      );
      if (!metadata.continueOnError) throw err;
      continue;
    }

    const renderJob = await store.create('render', {
      audioName: buildAudioName(sourceItem),
      outputFormat: metadata.outputFormat,
      fps: metadata.fps,
      visualConfig: toVisualConfig(metadata),
      callbackUrl: appUrl,
      audioUrl: `${appUrl}/api/audio/assets/${encodeURIComponent(assetId)}/stream?variant=original`,
      playlistBatchId: job.jobId,
      playlistItemIndex: idx,
      playlistVideoId: sourceItem.videoId,
      waitForCompletion: true,
      renderTarget: metadata.target,
      targetAgentId: metadata.targetAgentId,
      playlistRenderFingerprint: renderFingerprint,
    });
    item.renderJobId = renderJob.jobId;
    item.renderStatus = 'processing';
    item.status = 'rendering';
    await persistBatchProgress(
      store,
      job.jobId,
      result,
      `rendering ${idx + 1}/${metadata.items.length}`,
      progressForStep(idx, metadata.items.length, 'render'),
    );

    const renderProcessingJob = await setInlineProcessing(store, renderJob);

    try {
      await runRenderPipeline(store, renderProcessingJob, childRef);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await store.fail(renderJob.jobId, message);
      } catch {
        // Ignore secondary failure
      }
      item.renderStatus = 'failed';
      item.status = 'failed';
      item.error = `Render dispatch failed: ${message}`;
      item.completedAt = nowIso();
      await persistBatchProgress(
        store,
        job.jobId,
        result,
        `render-dispatch-failed ${idx + 1}/${metadata.items.length}`,
        progressForStep(idx, metadata.items.length, 'render'),
      );
      if (targetLease) {
        await leaseStore.release(targetLease.leaseKey, targetLease.token).catch(() => {});
        targetLease = null;
      }
      if (!metadata.continueOnError) {
        throw new Error(`Playlist item ${idx + 1} render dispatch failed: ${message}`);
      }
      continue;
    }

    let renderFinal: AudioPrepJob;
    try {
      renderFinal = await waitForRenderCompletion(store, renderJob.jobId, {
        heartbeatJobId: renderJob.jobId,
        onPoll: async () => {
          await ensureParentNotCancelled(store, job.jobId);
          if (targetLease) {
            const renewed = await leaseStore.renew(targetLease.leaseKey, targetLease.token, targetLockTtlMs);
            if (!renewed) {
              throw new Error(`Lost target lock ${targetLease.leaseKey} while waiting for render completion`);
            }
          }
        },
      });
    } finally {
      if (targetLease) {
        await leaseStore.release(targetLease.leaseKey, targetLease.token).catch(() => {});
        targetLease = null;
      }
    }

    item.renderStatus = renderFinal.status;
    if (renderFinal.status === 'complete') {
      item.status = 'completed';
      item.outputVideoKey = getRenderOutputKey(renderFinal);
      item.completedAt = nowIso();
    } else {
      item.status = 'failed';
      item.error = renderFinal.error || `Render ${renderFinal.status}`;
      item.completedAt = nowIso();
      if (!metadata.continueOnError) {
        await persistBatchProgress(
          store,
          job.jobId,
          result,
          `render-failed ${idx + 1}/${metadata.items.length}`,
          progressForStep(idx, metadata.items.length, 'render'),
        );
        throw new Error(`Playlist item ${idx + 1} render failed: ${item.error}`);
      }
    }

    await persistBatchProgress(
      store,
      job.jobId,
      result,
      `item-complete ${idx + 1}/${metadata.items.length}`,
      progressForStep(idx, metadata.items.length, 'done'),
    );
  }

  result.currentIndex = null;
  result.summary = recalcPlaylistBatchSummary(result.items);
  result.status = 'completed';
  result.completedAt = nowIso();

  await store.complete(job.jobId, result as unknown as Record<string, unknown>);
}
