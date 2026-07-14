import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { LocalJobStore } from '@/lib/jobs/LocalJobStore';
import {
  PlaylistBatchMetadataSchema,
  PlaylistBatchResultSchema,
  createInitialPlaylistBatchResult,
} from '../schema';
import { playlistRenderingInvariantViolations } from '../curation';
import { reconcilePlaylistBatchOutbox } from '../outbox';
import { reviewPlaylistItem, shouldRetryPlaylistItem } from '../service';
import { resolveMixRecipe } from '../mix-recipes';

describe('playlist curation service', () => {
  let store: LocalJobStore;
  let dbPath: string;
  let batchId: string;

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `playlist-service-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    store = new LocalJobStore(dbPath);
    const metadata = PlaylistBatchMetadataSchema.parse({
      schemaVersion: 1,
      sourceType: 'youtube_playlist',
      playlistUrl: 'https://www.youtube.com/playlist?list=waia-service',
      playlistTitle: 'WAIA service test',
      rightsAttested: true,
      target: 'cloud',
      outputFormat: 'flat-1080p-landscape',
      fps: 30,
      visualConfig: { mode: 'flame' },
      continueOnError: true,
      appUrl: 'http://localhost:3000',
      items: [{
        index: 0,
        videoId: 'source-1',
        title: 'A real mix',
        url: 'https://www.youtube.com/watch?v=source-1',
      }],
    });
    const batch = await store.create('playlist', metadata);
    batchId = batch.jobId;
    const result = createInitialPlaylistBatchResult(metadata);
    result.items[0].status = 'pending-review';
    result.items[0].assetId = '8bb81074-f213-4d8f-8298-e06ecf2a999c';
    result.status = 'awaiting-review';
    await store.complete(batchId, result as unknown as Record<string, unknown>);
  });

  afterEach(async () => {
    store.close();
    await fs.unlink(dbPath).catch(() => {});
    await fs.unlink(`${dbPath}-wal`).catch(() => {});
    await fs.unlink(`${dbPath}-shm`).catch(() => {});
  });

  const approval = {
    action: 'approve' as const,
    expectedGeneration: 0,
    idempotencyKey: 'service-approve-001',
    sourceRights: [
      { assetId: 'voice-as-a-man-thinketh', confirmed: true as const },
      { assetId: 'voice-science-of-getting-rich', confirmed: true as const },
      { assetId: 'bed-calm-pill-1', confirmed: true as const },
    ],
    mixRecipeId: 'data/waia-mixer-spike/recipe.json@v1',
    mixRecipeFingerprint: '70c0a2914da7bfd1643c61b780d2230593952a7e4a317fbbc889ea27d6db2f19',
    brandPackVersion: 'waian-circle-v1',
    experimentId: 'waia-phase3-real-mix',
    outputs: [
      { outputFormat: 'flat-1080p-landscape', fps: 30 as const, engine: 'puppeteer' as const, target: 'cloud' as const },
      { outputFormat: '360-mono-4k', fps: 30 as const, engine: 'unity' as const, target: 'home' as const },
    ],
  };

  test('persists M2 evidence and creates one supported child from two intents', async () => {
    const reviewed = await reviewPlaylistItem({ store, batchId, itemIndex: 0, request: approval, actor: 'jon' });
    const item = reviewed.result.items[0];

    expect(item.status).toBe('rendering');
    expect(item.approvals).toHaveLength(1);
    expect(item.provenance).toHaveLength(3);
    expect(item.renderIntents).toHaveLength(2);
    expect(item.renderIntents.find((intent) => intent.engine === 'puppeteer')?.status).toBe('queued');
    expect(item.renderIntents.find((intent) => intent.engine === 'unity')?.status).toBe('blocked');
    expect(playlistRenderingInvariantViolations(reviewed.result)).toEqual([]);
    expect(await store.list({ type: 'render' })).toHaveLength(1);

    await reviewPlaylistItem({ store, batchId, itemIndex: 0, request: approval, actor: 'jon' });
    expect(await store.list({ type: 'render' })).toHaveLength(1);
  });

  test('completed Puppeteer output cannot mark an item complete while Unity is blocked', async () => {
    const reviewed = await reviewPlaylistItem({ store, batchId, itemIndex: 0, request: approval, actor: 'jon' });
    const puppeteer = reviewed.result.items[0].renderIntents.find((intent) => intent.engine === 'puppeteer');
    expect(puppeteer?.renderJobId).toBeDefined();

    await store.complete(puppeteer!.renderJobId!, { videoKey: 'waia/flat-proof.mp4' });
    await reconcilePlaylistBatchOutbox(store, batchId);
    const refreshed = PlaylistBatchResultSchema.parse((await store.get(batchId))?.result);

    expect(refreshed.items[0].renderIntents.find((intent) => intent.engine === 'puppeteer')?.status).toBe('completed');
    expect(refreshed.items[0].renderIntents.find((intent) => intent.engine === 'unity')?.status).toBe('blocked');
    expect(refreshed.items[0].status).toBe('rendering');
    expect(refreshed.status).toBe('rendering');
  });

  test('worker sweep recovers a post-commit/pre-dispatch crash with the same child UUID', async () => {
    const batch = await store.get(batchId);
    const before = PlaylistBatchResultSchema.parse(batch?.result);
    const { applyPlaylistReview } = await import('../curation');
    const transition = applyPlaylistReview(before, approval, {
      batchId,
      itemIndex: 0,
      actor: 'jon',
      now: '2026-07-13T19:00:00.000Z',
      visualConfig: { mode: 'flame' },
      mixRecipe: resolveMixRecipe('data/waia-mixer-spike/recipe.json@v1')!,
    });
    expect(await store.compareAndSetResult(batchId, 0, transition.result as unknown as Record<string, unknown>)).toBe(true);

    const intentId = transition.result.items[0].renderIntents.find((intent) => intent.engine === 'puppeteer')?.intentId;
    await reconcilePlaylistBatchOutbox(store, batchId);
    const children = await store.list({ type: 'render' });
    expect(children).toHaveLength(1);
    expect(children[0].jobId).toBe(intentId);
  });

  test('retry selection never re-ingests curation or render states', () => {
    for (const status of ['pending-review', 'approved', 'rejected', 'requeued', 'rendering', 'qa-pending', 'completed']) {
      expect(shouldRetryPlaylistItem(status, 'incomplete')).toBe(false);
    }
    expect(shouldRetryPlaylistItem('failed', 'failed')).toBe(true);
  });

  test('outbox refuses dispatch when one manifest source loses rights coverage', async () => {
    const batch = await store.get(batchId);
    const before = PlaylistBatchResultSchema.parse(batch?.result);
    const { applyPlaylistReview } = await import('../curation');
    const transition = applyPlaylistReview(before, approval, {
      batchId,
      itemIndex: 0,
      actor: 'jon',
      now: '2026-07-13T19:00:00.000Z',
      visualConfig: { mode: 'flame' },
      mixRecipe: resolveMixRecipe('data/waia-mixer-spike/recipe.json@v1')!,
    });
    transition.result.items[0].provenance.pop();
    expect(await store.compareAndSetResult(batchId, 0, transition.result as unknown as Record<string, unknown>)).toBe(true);

    await expect(reconcilePlaylistBatchOutbox(store, batchId)).rejects.toThrow('source rights coverage');
    expect(await store.list({ type: 'render' })).toHaveLength(0);
  });
});
