import {
  PlaylistBatchItemStateSchema,
  WAIA_YOUTUBE_CHANNEL_ID,
} from '@/lib/playlist-batch/schema';
import {
  PublishChannelMismatchError,
  assertAuthenticatedChannel,
  checkPublishGate,
  evaluateCurationGate,
  verifyDraftManifest,
} from '../publishGate';

const approvalId = '11111111-1111-4111-8111-111111111111';
const recipeId = '22222222-2222-4222-8222-222222222222';
const sha = 'a'.repeat(64);
const ref = { batchJobId: 'batch-1', itemIndex: 0 };

function makeItem(overrides: Record<string, unknown> = {}) {
  return PlaylistBatchItemStateSchema.parse({
    index: 0,
    videoId: 'v',
    title: 't',
    url: 'https://example.com/v',
    status: 'approved',
    targetWidth: 1920,
    targetHeight: 1080,
    fps: 30,
    currentApprovalId: approvalId,
    currentRecipeId: recipeId,
    approvals: [{
      approvalId, reviewGeneration: 1, actor: 'op', approvedAt: '2026-10-17T00:00:00.000Z',
      requestHash: sha, idempotencyKey: 'idem-key-1', recipeId,
    }],
    recipes: [{
      recipeId, version: 1, reviewGeneration: 1, lineageId: 'l', brandPackVersion: 'b', experimentId: 'e',
      mixRecipeId: 'm', mixRecipeFingerprint: sha, visualConfig: {},
      outputs: [{ intentId: '33333333-3333-4333-8333-333333333333', outputFormat: 'mp4', fps: 30, engine: 'puppeteer', target: 'local-agent' }],
      approvalId, createdAt: '2026-10-17T00:00:00.000Z',
    }],
    provenance: [{
      provenanceId: '44444444-4444-4444-8444-444444444444', sourceUrl: 'https://example.com/s', sourceId: 's',
      sourceTitle: 'src', rightsBasis: 'public-domain', rightsEvidence: 'pd', attestedBy: 'op',
      attestedAt: '2026-10-17T00:00:00.000Z', approvalId,
    }],
    ...overrides,
  });
}

describe('evaluateCurationGate', () => {
  it('passes an approved item with rights basis and fingerprint', () => {
    const d = evaluateCurationGate(makeItem(), ref);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.evidence.mixRecipeFingerprint).toBe(sha);
      expect(d.evidence.rightsBases).toEqual(['public-domain']);
    }
  });

  it.each(['pending-review', 'rejected', 'requeued', 'ingested'])('refuses state %s', (status) => {
    const d = evaluateCurationGate(makeItem({ status }), ref);
    expect(d.ok).toBe(false);
  });

  it('refuses missing rights basis', () => {
    const d = evaluateCurationGate(makeItem({ provenance: [] }), ref);
    expect(d).toEqual({ ok: false, reason: expect.stringContaining('rights basis') });
  });

  it('refuses missing recipe (no fingerprint)', () => {
    const d = evaluateCurationGate(makeItem({ recipes: [] }), ref);
    expect(d.ok).toBe(false);
  });

  it('refuses a missing item', () => {
    expect(evaluateCurationGate(undefined, ref).ok).toBe(false);
  });
});

describe('checkPublishGate', () => {
  const batchResult = (item: unknown) => ({
    schemaVersion: 1, projectionVersion: 0, playlistUrl: 'https://example.com/p', playlistTitle: 'p',
    status: 'awaiting-review', currentIndex: null,
    summary: { total: 1, pending: 0, pendingReview: 0, approved: 1, active: 0, completed: 0, failed: 0, skipped: 0 },
    items: [item], startedAt: '2026-10-17T00:00:00.000Z',
  });

  it('refuses without a curation reference, without reading the store', async () => {
    const get = jest.fn();
    const d = await checkPublishGate({ get }, null);
    expect(d.ok).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses when the batch is missing', async () => {
    expect((await checkPublishGate({ get: async () => undefined }, ref)).ok).toBe(false);
  });

  it('refuses an unapproved item and passes an approved one', async () => {
    const bad = await checkPublishGate({ get: async () => ({ result: batchResult(makeItem({ status: 'pending-review' })) }) }, ref);
    expect(bad.ok).toBe(false);
    const good = await checkPublishGate({ get: async () => ({ result: batchResult(makeItem()) }) }, ref);
    expect(good.ok).toBe(true);
  });
});

describe('assertAuthenticatedChannel (API path)', () => {
  const client = (ids: string[]) => ({
    channels: { list: jest.fn().mockResolvedValue({ data: { items: ids.map((id) => ({ id })) } }) },
  });

  it('accepts the WAIA channel', async () => {
    await expect(assertAuthenticatedChannel(client([WAIA_YOUTUBE_CHANNEL_ID]))).resolves.toBeUndefined();
  });

  it('aborts on a different channel', async () => {
    await expect(assertAuthenticatedChannel(client(['UCother']))).rejects.toBeInstanceOf(PublishChannelMismatchError);
  });

  it('aborts when no channel is returned or several are', async () => {
    await expect(assertAuthenticatedChannel(client([]))).rejects.toBeInstanceOf(PublishChannelMismatchError);
    await expect(assertAuthenticatedChannel(client([WAIA_YOUTUBE_CHANNEL_ID, 'UCother']))).rejects.toBeInstanceOf(PublishChannelMismatchError);
  });

  it('aborts when the API call itself fails', async () => {
    const failing = { channels: { list: jest.fn().mockRejectedValue(new Error('403')) } };
    await expect(assertAuthenticatedChannel(failing)).rejects.toThrow('403');
  });
});

describe('verifyDraftManifest (no-credentials path)', () => {
  const evidence = { approvalId, rightsBases: ['public-domain'], mixRecipeFingerprint: sha };

  it('passes a complete youtube manifest', () => {
    expect(verifyDraftManifest({ provider: 'youtube', channel: { channelId: WAIA_YOUTUBE_CHANNEL_ID }, curation: evidence }).ok).toBe(true);
  });

  it('refuses a wrong channel id', () => {
    expect(verifyDraftManifest({ provider: 'youtube', channel: { channelId: 'UCother' }, curation: evidence }).ok).toBe(false);
  });

  it('refuses missing curation evidence', () => {
    expect(verifyDraftManifest({ provider: 'youtube', channel: { channelId: WAIA_YOUTUBE_CHANNEL_ID } }).ok).toBe(false);
    expect(verifyDraftManifest({ provider: 'youtube', channel: { channelId: WAIA_YOUTUBE_CHANNEL_ID }, curation: { ...evidence, mixRecipeFingerprint: '' } }).ok).toBe(false);
  });
});
