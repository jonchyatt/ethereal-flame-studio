import type { JobStore } from '@/lib/jobs/types';
import {
  PlaylistBatchMetadataSchema,
  PlaylistBatchResultSchema,
  type PlaylistBatchResult,
} from './schema';
import {
  applyPlaylistReview,
  PlaylistCurationConflict,
  type PlaylistReviewRequest,
} from './curation';
import { reconcilePlaylistBatchOutbox } from './outbox';
import { resolveMixRecipe } from './mix-recipes';

export async function reviewPlaylistItem(input: {
  store: JobStore;
  batchId: string;
  itemIndex: number;
  request: PlaylistReviewRequest;
  actor: string;
  now?: string;
}): Promise<{ result: PlaylistBatchResult; replayed: boolean }> {
  const batch = await input.store.get(input.batchId);
  if (!batch || batch.type !== 'playlist') {
    throw new PlaylistCurationConflict(`Playlist batch ${input.batchId} not found`);
  }
  const metadata = PlaylistBatchMetadataSchema.parse(batch.metadata);
  const result = PlaylistBatchResultSchema.parse(batch.result);
  const mixRecipe = input.request.action === 'approve'
    ? resolveMixRecipe(input.request.mixRecipeId)
    : resolveMixRecipe('data/waia-mixer-spike/recipe.json@v1');
  if (!mixRecipe) throw new PlaylistCurationConflict('Unknown or unratified mix recipe');
  const transition = applyPlaylistReview(result, input.request, {
    batchId: input.batchId,
    itemIndex: input.itemIndex,
    actor: input.actor,
    now: input.now || new Date().toISOString(),
    visualConfig: metadata.visualConfig,
    mixRecipe,
  });

  if (!transition.replayed) {
    const committed = await input.store.compareAndSetResult(
      input.batchId,
      result.projectionVersion,
      transition.result as unknown as Record<string, unknown>,
      { stage: `waia-${input.request.action}` },
    );
    if (!committed) throw new PlaylistCurationConflict('Review state changed; reload and try again');
  }

  // Best-effort latency path; the worker sweep is the durable relay.
  for (const jobId of transition.cancelJobIds) await input.store.cancel(jobId).catch(() => {});
  await reconcilePlaylistBatchOutbox(input.store, input.batchId);
  const refreshed = await input.store.get(input.batchId);
  return {
    result: PlaylistBatchResultSchema.parse(refreshed?.result),
    replayed: transition.replayed,
  };
}

export function shouldRetryPlaylistItem(status: string, scope: 'failed' | 'incomplete'): boolean {
  if (scope === 'failed') return status === 'failed';
  return ['pending', 'ingesting', 'ingested'].includes(status);
}
