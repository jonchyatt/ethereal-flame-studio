const put = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({ put, getSignedUrl: async () => 'https://signed.example/m' }),
}));
jest.mock('../store', () => ({ getContentLibraryItemByPackId: jest.fn() }));
jest.mock('googleapis', () => ({ google: { youtube: jest.fn(), auth: { OAuth2: jest.fn() } } }));

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

describe('missing YouTube credentials', () => {
  beforeEach(() => {
    put.mockClear();
    for (const k of Object.keys(process.env)) if (k.startsWith('YOUTUBE_PUBLISH_')) delete process.env[k];
  });

  it('rejects instead of reporting a manifest as an uploaded draft', async () => {
    await expect(runPublishConnector({ provider: 'youtube', metadata, mediaSignedUrl: 'https://m', curation }))
      .rejects.toThrow('YOUTUBE_PUBLISH_CLIENT_ID');
    expect(put).not.toHaveBeenCalled();
  });

  it('refuses to write a manifest that fails the checks', async () => {
    await expect(
      runPublishConnector({ provider: 'youtube', metadata, mediaSignedUrl: 'https://m' }),
    ).rejects.toThrow('YOUTUBE_PUBLISH_CLIENT_ID');
    expect(put).not.toHaveBeenCalled();
  });
});

describe('review-first privacy (never public)', () => {
  it('maps every configured value to private or unlisted', () => {
    const { resolveYoutubePrivacy } = require('../publishConnectors');
    expect(resolveYoutubePrivacy('public')).toBe('private');
    expect(resolveYoutubePrivacy(undefined)).toBe('private');
    expect(resolveYoutubePrivacy('Unlisted')).toBe('unlisted');
  });
  it('pins TikTok to SELF_ONLY', () => {
    const { TIKTOK_REVIEW_PRIVACY_LEVEL } = require('../publishConnectors');
    expect(TIKTOK_REVIEW_PRIVACY_LEVEL).toBe('SELF_ONLY');
  });
});
