import { randomUUID } from 'crypto';

const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    stat: async (k: string) => (files.has(k) ? { size: files.get(k)!.length, lastModified: new Date() } : null),
    getSignedUrl: async (k: string) => `https://signed.example/${k}`,
    list: async (p: string) => Array.from(files.keys()).filter((k) => k.startsWith(p)),
  }),
}));
jest.mock('googleapis', () => ({ google: { youtube: jest.fn(), auth: { OAuth2: jest.fn() } } }));

import type { AudioPrepJob, JobStore } from '@/lib/jobs/types';
import { PlaylistBatchItemStateSchema, WAIA_YOUTUBE_CHANNEL_ID } from '@/lib/playlist-batch/schema';
import { ensureRenderPacksForReleaseApproved, renderPackIdFor } from '@/lib/playlist-batch/renderPack';
import { packContentsPrefix } from '@/lib/playlist-batch/packContents';
import { getCreatorRenderPack, listCreatorRenderPacks } from '../store';
import { queueCreatorPackPublishJobs } from '../queue';
import { runPublishPipeline } from '../../../../worker/pipelines/publish';

const iso = '2026-10-17T00:00:00.000Z';
const sha = 'c'.repeat(64);
const approvalId = '11111111-1111-4111-8111-111111111111';
const recipeId = '22222222-2222-4222-8222-222222222222';
const assetId = '55555555-5555-4555-8555-555555555555';

function makeItem(status: string, renderJobId: string) {
  return PlaylistBatchItemStateSchema.parse({
    index: 0, videoId: 'v', title: 'As a Man Thinketh, Chapter One', url: 'https://example.com/v', status,
    assetId, currentApprovalId: approvalId, currentRecipeId: recipeId, reviewGeneration: 1,
    approvals: [{ approvalId, reviewGeneration: 1, actor: 'op', approvedAt: iso, requestHash: sha, idempotencyKey: 'idem-key-1', recipeId }],
    recipes: [{
      recipeId, version: 1, reviewGeneration: 1, lineageId: 'l', brandPackVersion: 'b', experimentId: 'e',
      mixRecipeId: 'm', mixRecipeFingerprint: sha, visualConfig: {},
      outputs: [{ intentId: '33333333-3333-4333-8333-333333333333', outputFormat: 'flat-1080p-landscape', fps: 30, engine: 'puppeteer', target: 'cloud' }],
      approvalId, createdAt: iso,
    }],
    renderIntents: [{
      intentId: '33333333-3333-4333-8333-333333333333', outputFormat: 'flat-1080p-landscape', fps: 30, engine: 'puppeteer',
      target: 'cloud', recipeId, reviewGeneration: 1, status: 'completed', renderJobId, cancellationStatus: 'not-needed', updatedAt: iso,
    }],
    provenance: [{
      provenanceId: '44444444-4444-4444-8444-444444444444', sourceUrl: 'https://archive.org/details/as_a_man_thinketh_mc_librivox',
      sourceId: 's', sourceTitle: 'As a Man Thinketh (LibriVox)', rightsBasis: 'public-domain', rightsEvidence: 'pd',
      attestedBy: 'op', attestedAt: iso, approvalId,
    }],
  });
}

function memoryJobStore(): JobStore {
  const jobs = new Map<string, AudioPrepJob>();
  return {
    create: async (type: string, metadata: Record<string, unknown>) => {
      const job = { jobId: randomUUID(), type, status: 'pending', metadata } as unknown as AudioPrepJob;
      jobs.set(job.jobId, job);
      return job;
    },
    get: async (id: string) => jobs.get(id),
    update: async (id: string, u: Record<string, unknown>) => { Object.assign(jobs.get(id)!, u); },
    complete: async (id: string, result: Record<string, unknown>) => { Object.assign(jobs.get(id)!, { status: 'complete', result }); },
    fail: async (id: string, error: string) => { Object.assign(jobs.get(id)!, { status: 'failed', error }); },
  } as unknown as JobStore;
}

let store: JobStore;
jest.mock('@/lib/jobs', () => ({ getJobStore: () => store }));

async function setup(itemStatus: string) {
  files.clear();
  store = memoryJobStore();
  for (const k of Object.keys(process.env)) if (/^(YOUTUBE|TIKTOK|INSTAGRAM)_PUBLISH_|^WAIA_PATRONS_/.test(k)) delete process.env[k];

  const renderJob = await store.create('render', {});
  await store.complete(renderJob.jobId, { videoKey: 'renders/out.mp4' });
  files.set('renders/out.mp4', Buffer.from('video'));
  files.set(`assets/${assetId}/transcript.json`, Buffer.from(JSON.stringify([
    { startSec: 0, endSec: 4, text: 'Mind is the master power.' },
    { startSec: 4, endSec: 8, text: 'That molds and makes.' },
  ])));

  const batch = await store.create('playlist', {
    items: [{ index: 0, videoId: 'v', title: 't', url: 'https://example.com/v', durationSeconds: 300 }],
  });
  await store.complete(batch.jobId, {
    schemaVersion: 1, projectionVersion: 0, playlistUrl: 'https://example.com/p', playlistTitle: 'p',
    status: 'awaiting-review', currentIndex: null,
    summary: { total: 1, pending: 0, pendingReview: 0, approved: 1, active: 0, completed: 0, failed: 0, skipped: 0 },
    items: [makeItem(itemStatus, renderJob.jobId)], startedAt: iso,
  });
  return batch.jobId;
}

describe('approved item to render pack contents to manual-draft publish', () => {
  const noChild = { current: null };

  it('release-approved: pack plus contents folder, then the gate still passes and the manifest is written', async () => {
    const batchId = await setup('release-approved');
    const stats = await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(stats).toMatchObject({ created: 1, failed: 0 });

    const packId = renderPackIdFor(batchId, 0);
    const prefix = packContentsPrefix(packId);
    const read = (name: string) => files.get(`${prefix}${name}`)!.toString();

    expect(read('title.txt')).toBe('As a Man Thinketh, Chapter One | What Am I Appreciating Now');
    expect(read('description.txt')).toContain('As a Man Thinketh (LibriVox)');
    expect(read('description.txt')).toContain('public-domain');
    expect(read('description.txt')).not.toMatch(/\bWAIA\b/);
    expect(read('captions.srt')).toContain('00:00:04,000 --> 00:00:08,000');
    expect(read('thumbnail-brief.md')).toContain('What Am I Appreciating Now');
    expect(JSON.parse(read('patrons.json'))).toMatchObject({ patronsFile: null, patronListHash: null });
    const contents = JSON.parse(read('contents.json'));
    expect(contents).toMatchObject({ packId, curation: { batchJobId: batchId, itemIndex: 0 }, captions: { status: 'written' } });
    expect(contents.chapters.status).toBe('pending-timings');

    // pack folder does not disturb the pack listing
    expect(await listCreatorRenderPacks()).toHaveLength(1);

    // idempotent: a second sweep rewrites nothing
    const before = files.get(`${prefix}title.txt`);
    await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(files.get(`${prefix}title.txt`)).toBe(before);

    // the publish gate is untouched: the queued draft passes and writes a manifest
    const { queued } = await queueCreatorPackPublishJobs(packId, { queueSyncJob: false });
    expect(queued).toHaveLength(1);
    await runPublishPipeline(store, (await store.get(queued[0].publishJobId))!, noChild);
    const manifest = JSON.parse(files.get(`creator/publish-drafts/youtube/${queued[0].publishId}.json`)!.toString());
    expect(manifest.connectorMode).toBe('manual-draft');
    expect(manifest.channel.channelId).toBe(WAIA_YOUTUBE_CHANNEL_ID);
    expect(manifest.curation).toMatchObject({ approvalId, recipeId, itemIndex: 0 });
    expect((await getCreatorRenderPack(packId))!.curation).toEqual({ batchJobId: batchId, itemIndex: 0 });
  });

  it('pending item: no pack and no contents folder', async () => {
    const batchId = await setup('pending');
    await ensureRenderPacksForReleaseApproved(store, batchId);
    expect(await listCreatorRenderPacks()).toHaveLength(0);
    expect([...files.keys()].some((k) => k.startsWith('creator/pack-contents/'))).toBe(false);
  });

  it('without a transcript the caption file is not invented', async () => {
    const batchId = await setup('release-approved');
    files.delete(`assets/${assetId}/transcript.json`);
    await ensureRenderPacksForReleaseApproved(store, batchId);
    const prefix = packContentsPrefix(renderPackIdFor(batchId, 0));
    expect(files.has(`${prefix}captions.srt`)).toBe(false);
    expect(JSON.parse(files.get(`${prefix}contents.json`)!.toString()).captions.status).toBe('awaiting-transcript');
  });
});
