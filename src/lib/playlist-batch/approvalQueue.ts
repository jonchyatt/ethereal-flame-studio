import type { JobStore } from '@/lib/jobs/types';
import {
  PlaylistBatchMetadataSchema,
  PlaylistBatchResultSchema,
  type PlaylistRightsBasis,
} from './schema';
import { resolveMixRecipe } from './mix-recipes';

/** The only ratified recipe today; items are always reviewed against the server copy, never a browser-supplied one. */
export const QUEUE_MIX_RECIPE_ID = 'data/waia-mixer-spike/recipe.json@v1';

export type ApprovalQueueSource = {
  assetId: string;
  sourceUrl: string;
  rightsBasis: PlaylistRightsBasis;
  rightsEvidence: string;
  attribution?: string;
};

export type ApprovalQueueEntry = {
  batchId: string;
  playlistTitle: string;
  itemIndex: number;
  title: string;
  url: string;
  reviewGeneration: number;
  assetId: string | null;
  previewUrl: string | null;
  mixRecipeId: string | null;
  mixRecipeFingerprint: string | null;
  sources: ApprovalQueueSource[];
  outputFormat: string;
  fps: 30 | 60;
  target: 'cloud' | 'home' | 'local-agent';
  targetAgentId: string | null;
  /** Fail-closed: false means the screen must not offer Approve, and `blockedReason` says why. */
  approvable: boolean;
  blockedReason: string | null;
};

export async function buildApprovalQueue(store: JobStore, limit = 100): Promise<ApprovalQueueEntry[]> {
  const recipe = resolveMixRecipe(QUEUE_MIX_RECIPE_ID);
  const jobs = await store.list({ type: 'playlist', limit });
  const entries: ApprovalQueueEntry[] = [];

  for (const job of jobs) {
    const metadata = PlaylistBatchMetadataSchema.safeParse(job.metadata);
    const result = PlaylistBatchResultSchema.safeParse(job.result);
    if (!metadata.success || !result.success) continue;

    for (const item of result.data.items) {
      if (item.status !== 'pending-review') continue;
      let blockedReason: string | null = null;
      if (!recipe) blockedReason = 'No ratified mix recipe is available.';
      else if (!item.assetId) blockedReason = 'Ingest has not produced an asset yet.';
      else if (!item.inputArtifact || item.inputArtifact.assetId !== item.assetId) {
        blockedReason = 'Ingest has not recorded the exact input artifact identity.';
      }
      entries.push({
        batchId: job.jobId,
        playlistTitle: metadata.data.playlistTitle,
        itemIndex: item.index,
        title: item.title,
        url: item.url,
        reviewGeneration: item.reviewGeneration,
        assetId: item.assetId ?? null,
        previewUrl: item.assetId ? `/api/audio/assets/${item.assetId}/stream?variant=original` : null,
        mixRecipeId: recipe?.recipeId ?? null,
        mixRecipeFingerprint: recipe?.fingerprint ?? null,
        sources: recipe?.sources ?? [],
        outputFormat: metadata.data.outputFormat,
        fps: metadata.data.fps,
        target: metadata.data.target,
        targetAgentId: metadata.data.targetAgentId ?? null,
        approvable: blockedReason === null,
        blockedReason,
      });
    }
  }
  return entries.sort((a, b) => a.batchId.localeCompare(b.batchId) || a.itemIndex - b.itemIndex);
}
