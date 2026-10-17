import os from 'os';
import path from 'path';
import { LocalJobStore } from '@/lib/jobs/LocalJobStore';
import { PlaylistBatchMetadataSchema, createInitialPlaylistBatchResult } from '../schema';
import { buildApprovalQueue, QUEUE_MIX_RECIPE_ID } from '../approvalQueue';
import { reviewPlaylistItem } from '../service';
import { resolveMixRecipe } from '../mix-recipes';

const ASSET = '8bb81074-f213-4d8f-8298-e06ecf2a999c';

describe('approval queue', () => {
  let store: LocalJobStore;

  async function seed(opts: { withArtifact: boolean; status?: 'pending-review' | 'pending' }) {
    const metadata = PlaylistBatchMetadataSchema.parse({
      schemaVersion: 1,
      sourceType: 'youtube_playlist',
      playlistUrl: 'https://www.youtube.com/playlist?list=queue-test',
      playlistTitle: 'Queue test',
      rightsAttested: true,
      target: 'cloud',
      outputFormat: 'flat-1080p-landscape',
      fps: 30,
      visualConfig: { mode: 'flame', skyboxPreset: 'meditation', scene: 'Example' },
      continueOnError: true,
      appUrl: 'http://localhost:3000',
      items: [{ index: 0, videoId: 'q1', title: 'Queue item', url: 'https://www.youtube.com/watch?v=q1' }],
    });
    const batch = await store.create('playlist', metadata);
    const result = createInitialPlaylistBatchResult(metadata);
    result.items[0].status = opts.status ?? 'pending-review';
    if (opts.withArtifact) {
      result.items[0].assetId = ASSET;
      result.items[0].inputArtifact = { assetId: ASSET, storageKey: `assets/${ASSET}/original.wav`, sha256: 'b'.repeat(64), sizeBytes: 1024 };
    }
    result.status = 'awaiting-review';
    await store.complete(batch.jobId, result as unknown as Record<string, unknown>);
    return batch.jobId;
  }

  beforeEach(() => {
    store = new LocalJobStore(path.join(os.tmpdir(), `approval-queue-${Date.now()}-${Math.random().toString(36).slice(2)}.db`));
  });

  it('lists pending-review items with server-side recipe, fingerprint and rights', async () => {
    const batchId = await seed({ withArtifact: true });
    const queue = await buildApprovalQueue(store);
    const recipe = resolveMixRecipe(QUEUE_MIX_RECIPE_ID)!;
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      batchId,
      itemIndex: 0,
      approvable: true,
      blockedReason: null,
      mixRecipeId: recipe.recipeId,
      mixRecipeFingerprint: recipe.fingerprint,
      previewUrl: `/api/audio/assets/${ASSET}/stream?variant=original`,
    });
    expect(queue[0].sources.map((s) => s.assetId)).toEqual(recipe.sources.map((s) => s.assetId));
    expect(queue[0].sources.every((s) => s.rightsEvidence.length > 0)).toBe(true);
  });

  it('fails closed when ingest has not recorded the input artifact', async () => {
    await seed({ withArtifact: false });
    const [entry] = await buildApprovalQueue(store);
    expect(entry.approvable).toBe(false);
    expect(entry.blockedReason).toMatch(/asset/i);
  });

  it('omits items that are not awaiting review and drops approved items', async () => {
    await seed({ withArtifact: true, status: 'pending' });
    expect(await buildApprovalQueue(store)).toHaveLength(0);

    const batchId = await seed({ withArtifact: true });
    const [entry] = await buildApprovalQueue(store);
    const recipe = resolveMixRecipe(QUEUE_MIX_RECIPE_ID)!;
    await reviewPlaylistItem({
      store,
      batchId,
      itemIndex: entry.itemIndex,
      actor: 'jon',
      request: {
        action: 'approve',
        idempotencyKey: 'queue-approve-1',
        expectedGeneration: entry.reviewGeneration,
        sourceRights: entry.sources.map((s) => ({ assetId: s.assetId, confirmed: true as const })),
        mixRecipeId: entry.mixRecipeId!,
        mixRecipeFingerprint: entry.mixRecipeFingerprint!,
        brandPackVersion: 'waian-circle-v1',
        experimentId: 'queue-test',
        outputs: [{ outputFormat: 'flat-1080p-landscape', fps: 30, engine: 'puppeteer', target: 'cloud' }],
      },
    });
    expect(recipe.sources.length).toBeGreaterThan(0);
    expect(await buildApprovalQueue(store)).toHaveLength(0);
  });
});
