const create = jest.fn();
const get = jest.fn();
const saveCreatorRenderPack = jest.fn().mockResolvedValue(undefined);
const getCreatorRenderPack = jest.fn();

jest.mock('@/lib/jobs', () => ({ getJobStore: () => ({ create, get }) }));
jest.mock('../store', () => ({
  getCreatorRenderPack: (...a: unknown[]) => getCreatorRenderPack(...a),
  saveCreatorRenderPack: (...a: unknown[]) => saveCreatorRenderPack(...a),
  getContentLibraryItem: jest.fn(),
  saveContentLibraryItem: jest.fn(),
}));

import { queueCreatorPackPublishJobs } from '../queue';

const now = new Date().toISOString();
function makePack(curation?: { batchJobId: string; itemIndex: number }) {
  return {
    packId: '55555555-5555-4555-8555-555555555555',
    createdAt: now, updatedAt: now, status: 'complete',
    source: { audioName: 'mix.wav' },
    exportPackIds: [], recutExecutions: [], publishTasks: [], publishDrafts: [],
    variants: [{ variantId: 'v1', renderJobId: 'rj1', outputFormat: 'flat-1080p-landscape', fps: 30, styleVariant: { id: 's', label: 's' }, platformTargets: ['youtube'] }],
    target: 'cloud', metadata: {},
    ...(curation ? { curation } : {}),
  };
}

describe('queueCreatorPackPublishJobs curation', () => {
  beforeEach(() => {
    create.mockReset().mockImplementation(async (_t: string, m: unknown) => ({ jobId: 'pj1', metadata: m }));
    get.mockReset().mockResolvedValue({ status: 'complete', result: { videoKey: 'k' } });
    saveCreatorRenderPack.mockClear();
  });

  it('copies pack.curation into the publish job metadata', async () => {
    getCreatorRenderPack.mockResolvedValue(makePack({ batchJobId: 'b1', itemIndex: 2 }));
    await queueCreatorPackPublishJobs('p', { queueSyncJob: false });
    const call = create.mock.calls.find((c) => c[0] === 'publish')!;
    expect(call[1].curation).toEqual({ batchJobId: 'b1', itemIndex: 2 });
  });

  it('still queues a pack without curation, with curation null', async () => {
    getCreatorRenderPack.mockResolvedValue(makePack());
    const r = await queueCreatorPackPublishJobs('p', { queueSyncJob: false });
    expect(r.queued).toHaveLength(1);
    expect(create.mock.calls.find((c) => c[0] === 'publish')![1].curation).toBeNull();
  });

  it.each(['primary', 'waia', 'critfail'] as const)('preserves the %s channel in job metadata and stored tasks', async (channelKey) => {
    getCreatorRenderPack.mockResolvedValue(makePack());
    const result = await queueCreatorPackPublishJobs('p', { channelKey, queueSyncJob: false });

    expect(create.mock.calls.find((call) => call[0] === 'publish')![1].channelKey).toBe(channelKey);
    expect(result.pack.publishTasks[0].channelKey).toBe(channelKey);
    expect(saveCreatorRenderPack.mock.calls[0][0].publishTasks[0].channelKey).toBe(channelKey);
  });

  it.each(['primary', 'waia', 'critfail'] as const)('skips the same source already queued for %s', async (channelKey) => {
    getCreatorRenderPack.mockResolvedValue(makePack());
    const first = await queueCreatorPackPublishJobs('p', { channelKey, queueSyncJob: false });
    getCreatorRenderPack.mockResolvedValue(first.pack);

    const second = await queueCreatorPackPublishJobs('p', { channelKey, queueSyncJob: false });

    expect(second.queued).toHaveLength(0);
    expect(second.skipped).toEqual([expect.objectContaining({ reason: 'duplicate-publish-task' })]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('queues the same source separately for WAIA and Crit Fail', async () => {
    getCreatorRenderPack.mockResolvedValue(makePack());
    const first = await queueCreatorPackPublishJobs('p', { channelKey: 'waia', queueSyncJob: false });
    getCreatorRenderPack.mockResolvedValue(first.pack);

    const second = await queueCreatorPackPublishJobs('p', { channelKey: 'critfail', queueSyncJob: false });

    expect(second.queued).toHaveLength(1);
    expect(second.skipped).toHaveLength(0);
    expect(second.pack.publishTasks.map((task) => task.channelKey)).toEqual(['waia', 'critfail']);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('separates YouTube channels without duplicating other providers in a multi-platform pack', async () => {
    const pack = makePack();
    pack.variants[0].platformTargets = ['youtube', 'tiktok', 'instagram-reels'];
    getCreatorRenderPack.mockResolvedValue(pack);
    const first = await queueCreatorPackPublishJobs('p', { channelKey: 'waia', queueSyncJob: false });
    getCreatorRenderPack.mockResolvedValue(first.pack);

    const second = await queueCreatorPackPublishJobs('p', { channelKey: 'critfail', queueSyncJob: false });

    expect(second.queued).toEqual([expect.objectContaining({ platform: 'youtube' })]);
    expect(second.skipped).toEqual([
      expect.objectContaining({ platform: 'tiktok', reason: 'duplicate-publish-task' }),
      expect.objectContaining({ platform: 'instagram-reels', reason: 'duplicate-publish-task' }),
    ]);
    expect(second.pack.publishTasks.map(({ platform, channelKey }) => [platform, channelKey])).toEqual([
      ['youtube', 'waia'],
      ['tiktok', 'primary'],
      ['instagram-reels', 'primary'],
      ['youtube', 'critfail'],
    ]);
    expect(create.mock.calls.filter((call) => call[0] === 'publish').map((call) => [call[1].provider, call[1].channelKey])).toEqual([
      ['youtube', 'waia'],
      ['tiktok', 'primary'],
      ['instagram', 'primary'],
      ['youtube', 'critfail'],
    ]);
  });

  it('treats legacy tasks without channelKey as primary while allowing another channel', async () => {
    getCreatorRenderPack.mockResolvedValue(makePack());
    const first = await queueCreatorPackPublishJobs('p', { queueSyncJob: false });
    expect(first.pack.publishTasks[0].channelKey).toBe('primary');
    delete first.pack.publishTasks[0].channelKey;
    getCreatorRenderPack.mockResolvedValue(first.pack);

    const primary = await queueCreatorPackPublishJobs('p', { channelKey: 'primary', queueSyncJob: false });
    const waia = await queueCreatorPackPublishJobs('p', { channelKey: 'waia', queueSyncJob: false });

    expect(primary.queued).toHaveLength(0);
    expect(primary.skipped).toEqual([expect.objectContaining({ reason: 'duplicate-publish-task' })]);
    expect(waia.queued).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
