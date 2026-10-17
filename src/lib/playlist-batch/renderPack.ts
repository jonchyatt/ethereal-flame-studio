import type { JobStore } from '@/lib/jobs/types';
import { createRenderPack } from '@/lib/creator/renderPack';
import { getCreatorRenderPack } from '@/lib/creator/store';
import { buildPackContents, readTranscript, writePackContents } from './packContents';
import {
  PlaylistBatchResultSchema,
  deterministicUuid,
  type PlaylistBatchItemState,
} from './schema';

export type AutoRenderPackStats = { created: number; existing: number; skipped: number; failed: number };

/** One pack per batch item, ever: the id is derived from the item, so a repeat sweep finds the same pack. */
export function renderPackIdFor(batchJobId: string, itemIndex: number): string {
  return deterministicUuid(`waia-render-pack:${batchJobId}:${itemIndex}`);
}

function audioNameFor(item: PlaylistBatchItemState): string {
  const safe = item.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `${safe || item.videoId}.mp3`;
}

/** Pack contents are best effort and retried by the next sweep; they never block pack creation. */
async function ensureContents(batchId: string, packId: string, item: PlaylistBatchItemState, sourceItems: unknown): Promise<void> {
  try {
    const durationSec = (Array.isArray(sourceItems)
      ? (sourceItems as Array<{ index: number; durationSeconds?: number }>).find((s) => s.index === item.index)?.durationSeconds
      : undefined) ?? null;
    await writePackContents(packId, buildPackContents({
      item, batchJobId: batchId, packId, durationSec, transcript: await readTranscript(item.assetId),
    }));
  } catch { /* retried on the next sweep */ }
}

/**
 * Creates the render pack for every release-approved item that does not have one yet.
 * Pending, rejected and every other state create nothing. Reuses the pack builder behind
 * POST /api/creator/render-packs; publishing still goes through the existing publish gate.
 */
export async function ensureRenderPacksForReleaseApproved(
  store: JobStore,
  batchId: string,
): Promise<AutoRenderPackStats> {
  const stats: AutoRenderPackStats = { created: 0, existing: 0, skipped: 0, failed: 0 };
  const batch = await store.get(batchId);
  if (!batch || batch.type !== 'playlist') return stats;
  const parsed = PlaylistBatchResultSchema.safeParse(batch.result);
  if (!parsed.success) return stats;

  for (const item of parsed.data.items) {
    if (item.status !== 'release-approved') continue;
    const packId = renderPackIdFor(batchId, item.index);
    try {
      if (await getCreatorRenderPack(packId)) {
        await ensureContents(batchId, packId, item, batch.metadata?.items);
        stats.existing++;
        continue;
      }
      const intents = item.renderIntents.filter((intent) =>
        intent.recipeId === item.currentRecipeId
        && intent.reviewGeneration === item.reviewGeneration
        && intent.status === 'completed'
        && !!intent.renderJobId,
      );
      if (intents.length === 0) {
        stats.skipped++;
        continue;
      }
      await createRenderPack({
        source: {
          audioName: audioNameFor(item),
          assetId: item.assetId ?? null,
          sourceUrl: item.url,
        },
        exportPackIds: [],
        variants: intents.map((intent) => ({
          variantId: intent.intentId,
          outputFormat: intent.outputFormat as never,
          fps: intent.fps,
          styleVariant: { id: intent.engine, label: `${intent.engine} render` },
          platformTargets: [intent.outputFormat.includes('portrait') ? 'youtube-shorts' : 'youtube'],
          renderJobId: intent.renderJobId!,
          renderTarget: intent.target,
          targetAgentId: intent.targetAgentId ?? null,
        })),
        target: intents[0].target,
        targetAgentId: intents[0].targetAgentId ?? null,
        metadata: { playlistRecipeId: item.currentRecipeId, playlistApprovalId: item.currentApprovalId },
        curation: { batchJobId: batchId, itemIndex: item.index },
        channelPresetIds: [],
      }, { packId });
      stats.created++;
      await ensureContents(batchId, packId, item, batch.metadata?.items);
    } catch {
      stats.failed++;
    }
  }
  return stats;
}
