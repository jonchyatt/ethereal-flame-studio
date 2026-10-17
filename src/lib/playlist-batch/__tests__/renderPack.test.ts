import { randomUUID } from 'crypto';

const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (key: string, data: Buffer) => { files.set(key, data); },
    get: async (key: string) => files.get(key) ?? null,
    list: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)),
  }),
}));

import os from 'os';
import path from 'path';
import { LocalJobStore } from '@/lib/jobs/LocalJobStore';
import { listCreatorRenderPacks } from '@/lib/creator/store';
import { createInitialPlaylistBatchResult, PlaylistBatchMetadataSchema } from '../schema';
import { reconcilePlaylistBatchOutbox } from '../outbox';
import { ensureRenderPacksForReleaseApproved, renderPackIdFor } from '../renderPack';

const iso = '2026-10-17T00:00:00.000Z';

async function seed(statuses: string[]) {
  const store = new LocalJobStore(path.join(os.tmpdir(), `rp-${Date.now()}-${Math.random().toString(36).slice(2)}.db`));
  const metadata = PlaylistBatchMetadataSchema.parse({
    schemaVersion: 1, sourceType: 'youtube_playlist', playlistUrl: 'https://example.com/p',
    playlistTitle: 'Synthetic', rightsAttested: true, target: 'cloud',
    outputFormat: 'flat-1080p-landscape', fps: 30,
    visualConfig: { mode: 'flame', skyboxPreset: 'meditation', scene: 'Example' },
    continueOnError: true, appUrl: 'http://localhost:3000',
    items: statuses.map((_, index) => ({
      index, videoId: `v${index}`, title: `Synthetic ${index}`, url: `https://example.com/watch?v=v${index}`,
    })),
  });
  const batch = await store.create('playlist', metadata);
  const result = createInitialPlaylistBatchResult(metadata);
  const recipeId = randomUUID();
  const approvalId = randomUUID();
  statuses.forEach((status, i) => {
    const item = result.items[i];
    item.status = status as never;
    if (status !== 'release-approved') return;
    item.assetId = randomUUID();
    item.currentRecipeId = recipeId;
    item.currentApprovalId = approvalId;
    item.renderIntents.push({
      intentId: randomUUID(), outputFormat: 'flat-1080p-landscape', fps: 30, engine: 'puppeteer',
      target: 'cloud', coreHash: 'a'.repeat(64), variantFingerprint: 'b'.repeat(64), approvalId,
      recipeId, reviewGeneration: 0, status: 'completed', renderJobId: randomUUID(),
      cancellationStatus: 'not-needed', updatedAt: iso,
    } as never);
  });
  await store.complete(batch.jobId, result as unknown as Record<string, unknown>);
  return { store, batchId: batch.jobId };
}

describe('auto render pack from release-approved items', () => {
  beforeEach(() => files.clear());

  it('creates exactly one pack carrying curation for a release-approved item', async () => {
    const { store, batchId } = await seed(['release-approved']);
    const stats = await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(stats).toMatchObject({ created: 1, failed: 0 });
    const packs = await listCreatorRenderPacks();
    expect(packs).toHaveLength(1);
    expect(packs[0].packId).toBe(renderPackIdFor(batchId, 0));
    expect(packs[0].curation).toEqual({ batchJobId: batchId, itemIndex: 0 });
  });

  it('is idempotent across repeated sweeps and the outbox reconcile', async () => {
    const { store, batchId } = await seed(['release-approved']);
    await ensureRenderPacksForReleaseApproved(store, batchId);
    const again = await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(again).toMatchObject({ created: 0, existing: 1 });
    await reconcilePlaylistBatchOutbox(store, batchId);
    expect(await listCreatorRenderPacks()).toHaveLength(1);
  });

  it('creates nothing for pending, pending-review, approved or rejected items', async () => {
    const { store, batchId } = await seed(['pending', 'pending-review', 'approved', 'rejected']);
    const stats = await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(stats).toEqual({ created: 0, existing: 0, skipped: 0, failed: 0 });
    expect(await listCreatorRenderPacks()).toHaveLength(0);
  });

  it('only packs the release-approved item in a mixed batch', async () => {
    const { store, batchId } = await seed(['rejected', 'release-approved', 'pending']);
    await ensureRenderPacksForReleaseApproved(store, batchId);
    const packs = await listCreatorRenderPacks();
    expect(packs.map((p) => p.curation?.itemIndex)).toEqual([1]);
  });
});
