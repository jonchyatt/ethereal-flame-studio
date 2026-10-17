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
});
