import type { AudioPrepJob, JobStore } from '@/lib/jobs/types';
import {
  PlaylistBatchMetadataSchema,
  PlaylistBatchResultSchema,
  createPlaylistRenderFingerprint,
  recalcPlaylistBatchSummary,
  type PlaylistBatchItemState,
  type PlaylistBatchMetadata,
  type PlaylistBatchResult,
  type PlaylistRenderIntent,
} from './schema';
import { playlistRenderingInvariantViolations } from './curation';

export type PlaylistOutboxStats = {
  batchesScanned: number;
  renderJobsCreated: number;
  cancellationsConfirmed: number;
  conflicts: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function buildAudioName(item: { title: string; videoId: string }): string {
  const safe = item.title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${safe || item.videoId}.mp3`;
}

function getRenderOutputKey(job: AudioPrepJob | undefined): string | undefined {
  if (!job?.result) return undefined;
  for (const key of ['videoKey', 'r2_key', 'r2Key', 'storageKey']) {
    const value = job.result[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

function toIntentStatus(status: AudioPrepJob['status']): PlaylistRenderIntent['status'] {
  if (status === 'pending') return 'queued';
  if (status === 'processing') return 'processing';
  if (status === 'complete') return 'completed';
  return 'failed';
}

function recipeFor(item: PlaylistBatchItemState) {
  return item.recipes.find((candidate) => candidate.recipeId === item.currentRecipeId);
}

function approvalFor(item: PlaylistBatchItemState) {
  return item.approvals.find((candidate) => candidate.approvalId === item.currentApprovalId);
}

function hasPendingCancellation(item: PlaylistBatchItemState): boolean {
  return item.renderIntents.some((intent) =>
    intent.status === 'superseded' && intent.cancellationStatus === 'pending',
  );
}

function rollUpItem(item: PlaylistBatchItemState): void {
  if (!item.currentRecipeId || !item.currentApprovalId) return;
  const intents = item.renderIntents.filter((intent) => intent.recipeId === item.currentRecipeId);
  if (intents.length === 0) return;

  const supported = intents.filter((intent) => intent.engine === 'puppeteer');
  if (supported.some((intent) => intent.status === 'failed')) {
    item.status = 'failed';
    item.error = 'One or more supported render outputs failed';
    return;
  }
  if (intents.some((intent) => ['pending-dispatch', 'queued', 'processing'].includes(intent.status))) {
    item.status = 'rendering';
    return;
  }
  if (supported.length > 0 && supported.every((intent) => intent.status === 'completed')) {
    // Phase 3's honest rest state: a required Unity child remains blocked until Phase 4.
    item.status = intents.some((intent) => intent.status === 'blocked') ? 'rendering' : 'completed';
  }
}

function rollUpBatch(result: PlaylistBatchResult): void {
  result.summary = recalcPlaylistBatchSummary(result.items);
  if (result.items.some((item) => item.status === 'rendering' || item.status === 'approved')) {
    result.status = 'rendering';
  } else if (result.items.some((item) => item.status === 'pending-review' || item.status === 'requeued')) {
    result.status = 'awaiting-review';
  } else if (result.items.every((item) => ['completed', 'rejected', 'skipped'].includes(item.status))) {
    result.status = 'completed';
  }
}

function renderMetadata(
  batchId: string,
  metadata: PlaylistBatchMetadata,
  item: PlaylistBatchItemState,
  intent: PlaylistRenderIntent,
): Record<string, unknown> {
  const recipe = recipeFor(item);
  const approval = approvalFor(item);
  if (!recipe || !approval || !item.assetId) {
    throw new Error(`Intent ${intent.intentId} is missing approval, recipe, or asset lineage`);
  }
  const appUrl = metadata.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    audioName: buildAudioName(item),
    outputFormat: intent.outputFormat,
    fps: intent.fps,
    visualConfig: recipe.visualConfig,
    callbackUrl: appUrl,
    audioUrl: `${appUrl}/api/audio/assets/${encodeURIComponent(item.assetId)}/stream?variant=original`,
    playlistBatchId: batchId,
    playlistItemIndex: item.index,
    playlistVideoId: item.videoId,
    waitForCompletion: true,
    renderTarget: intent.target,
    targetAgentId: intent.targetAgentId,
    renderEngine: intent.engine,
    playlistRenderIntentId: intent.intentId,
    playlistRecipeId: recipe.recipeId,
    playlistReviewGeneration: intent.reviewGeneration,
    playlistApprovalId: approval.approvalId,
    mixRecipeId: recipe.mixRecipeId,
    mixRecipeFingerprint: recipe.mixRecipeFingerprint,
    playlistRenderFingerprint: createPlaylistRenderFingerprint({
      videoId: item.videoId,
      target: intent.target,
      targetAgentId: intent.targetAgentId,
      outputFormat: intent.outputFormat,
      fps: intent.fps,
      visualConfig: recipe.visualConfig,
      engine: intent.engine,
      mixRecipeFingerprint: recipe.mixRecipeFingerprint,
    }),
  };
}

async function reconcileOneBatch(
  store: JobStore,
  batch: AudioPrepJob,
  stats: PlaylistOutboxStats,
): Promise<void> {
  const metadataParsed = PlaylistBatchMetadataSchema.safeParse(batch.metadata);
  const resultParsed = PlaylistBatchResultSchema.safeParse(batch.result);
  if (!metadataParsed.success || !resultParsed.success) return;

  const metadata = metadataParsed.data;
  const result = resultParsed.data;
  const violations = playlistRenderingInvariantViolations(result);
  if (violations.length > 0) {
    throw new Error(`WAIA render dispatch blocked: ${violations.join('; ')}`);
  }
  const expectedVersion = result.projectionVersion;
  let changed = false;
  const now = nowIso();

  // Durable cancellation outbox: finish cancellation before a newer generation dispatches.
  for (const item of result.items) {
    for (const intent of item.renderIntents) {
      if (intent.status !== 'superseded' || intent.cancellationStatus !== 'pending' || !intent.renderJobId) continue;
      await store.cancel(intent.renderJobId).catch(() => {});
      const child = await store.get(intent.renderJobId);
      if (child && ['cancelled', 'complete', 'failed'].includes(child.status)) {
        intent.cancellationStatus = 'confirmed';
        intent.cancellationConfirmedAt = now;
        intent.updatedAt = now;
        stats.cancellationsConfirmed++;
        changed = true;
      }
    }
  }

  for (const item of result.items) {
    if (hasPendingCancellation(item)) continue;
    for (const intent of item.renderIntents) {
      if (intent.recipeId !== item.currentRecipeId || intent.reviewGeneration !== item.reviewGeneration) continue;
      if (intent.engine !== 'puppeteer' || intent.status !== 'pending-dispatch') continue;

      const child = await store.create(
        'render',
        renderMetadata(batch.jobId, metadata, item, intent),
        { jobId: intent.intentId },
      );
      intent.renderJobId = child.jobId;
      intent.status = toIntentStatus(child.status);
      intent.updatedAt = now;
      stats.renderJobsCreated++;
      changed = true;
    }
  }

  for (const item of result.items) {
    for (const intent of item.renderIntents) {
      if (!intent.renderJobId || intent.status === 'superseded') continue;
      const child = await store.get(intent.renderJobId);
      if (!child) continue;
      const nextStatus = toIntentStatus(child.status);
      const outputVideoKey = getRenderOutputKey(child);
      if (nextStatus !== intent.status || outputVideoKey !== intent.outputVideoKey) {
        intent.status = nextStatus;
        intent.outputVideoKey = outputVideoKey;
        intent.error = child.error;
        intent.updatedAt = now;
        changed = true;
      }
    }
    const priorStatus = item.status;
    rollUpItem(item);
    if (item.status !== priorStatus) changed = true;
  }

  if (!changed) return;
  rollUpBatch(result);
  result.projectionVersion = expectedVersion + 1;
  const committed = await store.compareAndSetResult(batch.jobId, expectedVersion, result as unknown as Record<string, unknown>, {
    stage: result.status === 'rendering' ? 'waia-render-outbox' : 'waia-curation',
  });
  if (!committed) stats.conflicts++;
}

export async function reconcilePlaylistBatchOutbox(
  store: JobStore,
  batchId?: string,
): Promise<PlaylistOutboxStats> {
  const stats: PlaylistOutboxStats = {
    batchesScanned: 0,
    renderJobsCreated: 0,
    cancellationsConfirmed: 0,
    conflicts: 0,
  };
  const batches = batchId
    ? [await store.get(batchId)].filter((job): job is AudioPrepJob => !!job && job.type === 'playlist')
    : await store.list({ type: 'playlist', limit: 100 });

  for (const batch of batches) {
    stats.batchesScanned++;
    await reconcileOneBatch(store, batch, stats);
  }
  return stats;
}
