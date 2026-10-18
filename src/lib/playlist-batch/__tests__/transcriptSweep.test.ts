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
import { ensureTranscriptsForReleaseApproved } from '../transcriptWriter';
import { packContentsPrefix } from '../packContents';

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

const segments = [
  { startSec: 0, endSec: 4, text: 'Mind is the master power.' },
  { startSec: 4, endSec: 8, text: 'That molds and makes.' },
];
const transcribe = jest.fn(async () => ({ text: 'x', language: 'en', durationSeconds: 8, segmentsCount: 2, segments }));

describe('transcripts feed pack contents end to end', () => {
  beforeEach(() => { files.clear(); transcribe.mockClear(); });

  it('awaiting-transcript flips to written once the sweep has run, and non-approved items are left alone', async () => {
    const { store, batchId } = await seed(['pending', 'release-approved']);
    const batch = await store.get(batchId);
    const assetId = (batch!.result as { items: Array<{ assetId?: string }> }).items[1].assetId!;
    files.set(`assets/${assetId}/original.mp3`, Buffer.from('fixture'));
    const prefix = packContentsPrefix(renderPackIdFor(batchId, 1));

    await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(JSON.parse(files.get(`${prefix}contents.json`)!.toString()).captions.status).toBe('awaiting-transcript');

    expect(await ensureTranscriptsForReleaseApproved(store, batchId, transcribe)).toEqual({ written: 1, existing: 0, skipped: 0, failed: 0 });
    await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(JSON.parse(files.get(`${prefix}contents.json`)!.toString()).captions.status).toBe('written');
    expect(files.get(`${prefix}captions.srt`)!.toString()).toContain('That molds and makes.');

    expect(await ensureTranscriptsForReleaseApproved(store, batchId, transcribe)).toMatchObject({ written: 0, existing: 1 });
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  it('a down service leaves the contents honest', async () => {
    const { store, batchId } = await seed(['release-approved']);
    const assetId = ((await store.get(batchId))!.result as { items: Array<{ assetId?: string }> }).items[0].assetId!;
    files.set(`assets/${assetId}/original.mp3`, Buffer.from('fixture'));
    const down = async () => { throw new Error('ECONNREFUSED'); };
    expect(await ensureTranscriptsForReleaseApproved(store, batchId, down)).toMatchObject({ failed: 1, written: 0 });
    expect(files.has(`assets/${assetId}/transcript.json`)).toBe(false);
  });
});
