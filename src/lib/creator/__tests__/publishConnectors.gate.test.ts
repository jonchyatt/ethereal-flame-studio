const put = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({ put, getSignedUrl: async () => 'https://signed.example/m' }),
}));
jest.mock('../store', () => ({ getContentLibraryItemByPackId: jest.fn() }));
jest.mock('googleapis', () => ({ google: { youtube: jest.fn(), auth: { OAuth2: jest.fn() } } }));

import { WAIA_YOUTUBE_CHANNEL_ID } from '@/lib/playlist-batch/schema';
import { runPublishConnector } from '../publishConnectors';

const sha = 'b'.repeat(64);
const metadata = {
  creatorPackId: '55555555-5555-4555-8555-555555555555',
  publishId: '66666666-6666-4666-8666-666666666666',
  platform: 'youtube-long', provider: 'youtube', mode: 'draft', sourceKind: 'render',
  sourceVariantId: 'v', sourceRenderJobId: 'r', sourceVideoKey: 'k', title: 't', description: 'd',
  hashtags: [], keywords: [],
} as never;
const curation = {
  batchJobId: 'b', itemIndex: 0, approvalId: '77777777-7777-4777-8777-777777777777',
  recipeId: '88888888-8888-4888-8888-888888888888', rightsBases: ['public-domain'], mixRecipeFingerprint: sha,
};

describe('manual-draft path (no credentials)', () => {
  beforeEach(() => {
    put.mockClear();
    for (const k of Object.keys(process.env)) if (k.startsWith('YOUTUBE_PUBLISH_')) delete process.env[k];
  });

  it('writes the manifest with channel id and curation evidence', async () => {
    const result = await runPublishConnector({ provider: 'youtube', metadata, mediaSignedUrl: 'https://m', curation });
    expect(result.mode).toBe('manual-draft');
    const written = JSON.parse((put.mock.calls[0][1] as Buffer).toString());
    expect(written.channel.channelId).toBe(WAIA_YOUTUBE_CHANNEL_ID);
    expect(written.curation.mixRecipeFingerprint).toBe(sha);
  });

  it('refuses to write a manifest that fails the checks', async () => {
    await expect(
      runPublishConnector({ provider: 'youtube', metadata, mediaSignedUrl: 'https://m' }),
    ).rejects.toThrow(/Publish gate refused/);
    expect(put).not.toHaveBeenCalled();
  });
});
