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
import { CreatorRenderPackSchema } from '../types';
import { getCreatorRenderPack, saveCreatorRenderPack } from '../store';
import { queueCreatorPackPublishJobs } from '../queue';
import { runPublishPipeline } from '../../../../worker/pipelines/publish';

const iso = '2026-10-17T00:00:00.000Z';
const sha = 'c'.repeat(64);
const approvalId = '11111111-1111-4111-8111-111111111111';
const recipeId = '22222222-2222-4222-8222-222222222222';

function makeItem(status: string) {
  return PlaylistBatchItemStateSchema.parse({
    index: 0, videoId: 'v', title: 't', url: 'https://example.com/v', status,
    targetWidth: 1920, targetHeight: 1080, fps: 30,
    currentApprovalId: approvalId, currentRecipeId: recipeId,
    approvals: [{ approvalId, reviewGeneration: 1, actor: 'op', approvedAt: iso, requestHash: sha, idempotencyKey: 'idem-key-1', recipeId }],
    recipes: [{
      recipeId, version: 1, reviewGeneration: 1, lineageId: 'l', brandPackVersion: 'b', experimentId: 'e',
      mixRecipeId: 'm', mixRecipeFingerprint: sha, visualConfig: {},
      outputs: [{ intentId: '33333333-3333-4333-8333-333333333333', outputFormat: 'mp4', fps: 30, engine: 'puppeteer', target: 'local-agent' }],
      approvalId, createdAt: iso,
    }],
    provenance: [{
      provenanceId: '44444444-4444-4444-8444-444444444444', sourceUrl: 'https://example.com/s', sourceId: 's',
      sourceTitle: 'src', rightsBasis: 'public-domain', rightsEvidence: 'pd', attestedBy: 'op', attestedAt: iso, approvalId,
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
  for (const k of Object.keys(process.env)) if (/^(YOUTUBE|TIKTOK|INSTAGRAM)_PUBLISH_/.test(k)) delete process.env[k];

  const batch = await store.create('playlist', {});
  await store.complete(batch.jobId, {
    schemaVersion: 1, projectionVersion: 0, playlistUrl: 'https://example.com/p', playlistTitle: 'p',
    status: 'awaiting-review', currentIndex: null,
    summary: { total: 1, pending: 0, pendingReview: 0, approved: 1, active: 0, completed: 0, failed: 0, skipped: 0 },
    items: [makeItem(itemStatus)], startedAt: iso,
  });

  const renderJob = await store.create('render', {});
  await store.complete(renderJob.jobId, { videoKey: 'renders/out.mp4' });
  files.set('renders/out.mp4', Buffer.from('video'));

  const pack = CreatorRenderPackSchema.parse({
    packId: randomUUID(), createdAt: iso, updatedAt: iso, status: 'complete',
    source: { audioName: 'mix.wav' },
    variants: [{
      variantId: 'v1', outputFormat: 'flat-1080p-landscape', fps: 30, styleVariant: { id: 's', label: 's' },
      platformTargets: ['youtube'], renderJobId: renderJob.jobId,
    }],
    curation: { batchJobId: batch.jobId, itemIndex: 0 },
  });
  await saveCreatorRenderPack(pack);

  const { queued } = await queueCreatorPackPublishJobs(pack.packId, { queueSyncJob: false });
  expect(queued).toHaveLength(1);
  const publishJob = (await store.get(queued[0].publishJobId))!;
  return { pack, publishJob, queued: queued[0] };
}

describe('manual-draft lane, curated item to publish job', () => {
  const noChild = { current: null };

  it('release-approved item: writes the manual-draft manifest with curation evidence and WAIA channel id', async () => {
    const { pack, publishJob, queued } = await setup('release-approved');
    await runPublishPipeline(store, publishJob, noChild);

    const done = (await store.get(publishJob.jobId))!;
    expect(done.status).toBe('complete');
    const key = `creator/publish-drafts/youtube/${queued.publishId}.json`;
    const manifest = JSON.parse(files.get(key)!.toString());
    expect(manifest.connectorMode).toBe('manual-draft');
    expect(manifest.channel.channelId).toBe(WAIA_YOUTUBE_CHANNEL_ID);
    expect(manifest.curation).toMatchObject({
      approvalId, recipeId, rightsBases: ['public-domain'], mixRecipeFingerprint: sha, itemIndex: 0,
    });
    const after = await getCreatorRenderPack(pack.packId);
    expect(after!.publishTasks[0].draftManifestKey).toBe(key);
  });

  it('pending item: publish is refused, job fails with the gate reason, nothing is written', async () => {
    const { pack, publishJob, queued } = await setup('pending');
    await runPublishPipeline(store, publishJob, noChild);

    const done = (await store.get(publishJob.jobId)) as AudioPrepJob & { error?: string };
    expect(done.status).toBe('failed');
    expect(done.error).toContain('Publish refused by curation gate');
    expect(done.error).toContain('state "pending"');
    expect(files.has(`creator/publish-drafts/youtube/${queued.publishId}.json`)).toBe(false);
    const after = await getCreatorRenderPack(pack.packId);
    expect(after!.publishTasks[0].status).toBe('failed');
  });
});
