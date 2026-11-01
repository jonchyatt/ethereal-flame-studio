import { google } from 'googleapis';
import { WAIA_YOUTUBE_CHANNEL_ID } from '@/lib/playlist-batch/schema';
import { CreatorPublishJobMetadataSchema, type CreatorPublishJobMetadata } from '../jobs';
import { CRITFAIL_YOUTUBE_CHANNEL_ID, resolvePublishConnectorMode, runPublishConnector } from '../publishConnectors';
import { resolveYoutubeCredentialSlot, youtubeCategoryId, youtubeEnvName, type YoutubeCredentialSlot } from '../youtubeCredentials';

const put = jest.fn();
jest.mock('@/lib/storage', () => ({ getStorageAdapter: () => ({ put }) }));
jest.mock('../store', () => ({ getContentLibraryItemByPackId: jest.fn() }));
jest.mock('googleapis', () => ({ google: { youtube: jest.fn(), auth: { OAuth2: jest.fn() } } }));

const metadata: CreatorPublishJobMetadata = {
  creatorPackId: '55555555-5555-4555-8555-555555555555',
  publishId: '66666666-6666-4666-8666-666666666666',
  platform: 'youtube', provider: 'youtube', mode: 'draft', sourceKind: 'render',
  sourceVariantId: 'v', sourceRenderJobId: 'r', sourceVideoKey: 'k', title: 'Title',
  description: 'Description', hashtags: [], keywords: [],
};
const originalEnv = process.env;
const originalFetch = global.fetch;
const setCredentials = jest.fn();
const getAccessToken = jest.fn();
const list = jest.fn();
const insert = jest.fn();

beforeEach(() => {
  process.env = { ...originalEnv };
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('YOUTUBE_PUBLISH_')) delete process.env[key];
  }
  process.env.YOUTUBE_PUBLISH_DISABLE_THUMBNAIL_UPLOAD = 'true';
  jest.clearAllMocks();
  getAccessToken.mockResolvedValue({ token: 'fresh-fixture-access' });
  (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({ setCredentials, getAccessToken }));
  (google.youtube as jest.Mock).mockReturnValue({ channels: { list }, videos: { insert } });
  insert.mockResolvedValue({ data: { id: 'video-fixture' } });
  global.fetch = jest.fn().mockResolvedValue(new Response('video'));
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = originalFetch;
});

function configure(slot: YoutubeCredentialSlot) {
  for (const suffix of ['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN']) {
    process.env[youtubeEnvName(slot, suffix)] = `${slot}-${suffix}-fixture`;
  }
}

it.each(['primary', 'waia', 'critfail'] as const)('selects %s without borrowing credentials', (slot) => {
  expect(resolveYoutubeCredentialSlot({ channelKey: slot })).toBe(slot);
  configure(slot);
  expect(resolvePublishConnectorMode('youtube', { channelKey: slot })).toBe('api');
});

it('accepts critfail metadata and rejects an unknown slot instead of falling back to primary', () => {
  expect(CreatorPublishJobMetadataSchema.parse({ ...metadata, channelKey: 'critfail' }).channelKey).toBe('critfail');
  expect(() => resolveYoutubeCredentialSlot({ channelKey: 'typo' })).toThrow('Unknown YouTube channelKey');
  expect(resolveYoutubeCredentialSlot({})).toBe('primary');
});

it.each(['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN'])('names missing Crit Fail %s even with primary credentials', async (suffix) => {
  configure('primary');
  configure('critfail');
  delete process.env[youtubeEnvName('critfail', suffix)];
  process.env.PUBLISH_CONNECTOR_FALLBACK_ON_API_ERROR = 'true';
  await expect(runPublishConnector({ provider: 'youtube', metadata: { ...metadata, channelKey: 'critfail' }, mediaSignedUrl: 'https://media.example/video' }))
    .rejects.toThrow(youtubeEnvName('critfail', suffix));
  expect(put).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('reports every absent WAIA variable; whitespace is missing', () => {
  process.env.YOUTUBE_PUBLISH_WAIA_CLIENT_ID = '  ';
  expect(() => resolvePublishConnectorMode('youtube', { channelKey: 'waia' }))
    .toThrow('YOUTUBE_PUBLISH_WAIA_CLIENT_ID, YOUTUBE_PUBLISH_WAIA_CLIENT_SECRET, YOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN');
});

it('supports access-token-only slots, but a partial refresh configuration fails loudly', () => {
  process.env.YOUTUBE_PUBLISH_CRITFAIL_ACCESS_TOKEN = 'access-fixture';
  expect(resolvePublishConnectorMode('youtube', { channelKey: 'critfail' })).toBe('api');
  process.env.YOUTUBE_PUBLISH_CRITFAIL_REFRESH_TOKEN = 'refresh-fixture';
  expect(() => resolvePublishConnectorMode('youtube', { channelKey: 'critfail' })).toThrow('YOUTUBE_PUBLISH_CRITFAIL_CLIENT_ID');
});

it.each([
  ['waia', WAIA_YOUTUBE_CHANNEL_ID, '22'],
  ['critfail', CRITFAIL_YOUTUBE_CHANNEL_ID, '23'],
] as const)('uploads %s privately with its own credentials and category after checking the channel', async (slot, channelId, categoryId) => {
  configure(slot);
  configure('primary');
  process.env.YOUTUBE_PUBLISH_DEFAULT_CATEGORY_ID = '10';
  process.env.YOUTUBE_PUBLISH_DEFAULT_PRIVACY = 'public';
  list.mockResolvedValue({ data: { items: [{ id: channelId }] } });
  const result = await runPublishConnector({ provider: 'youtube', metadata: { ...metadata, channelKey: slot }, mediaSignedUrl: 'https://media.example/video' });
  expect(result.mode).toBe('api');
  expect(google.auth.OAuth2).toHaveBeenCalledWith(`${slot}-CLIENT_ID-fixture`, `${slot}-CLIENT_SECRET-fixture`, undefined);
  expect(setCredentials).toHaveBeenCalledWith({ refresh_token: `${slot}-REFRESH_TOKEN-fixture` });
  expect(list).toHaveBeenCalledWith({ part: ['id'], mine: true });
  expect(list.mock.invocationCallOrder[0]).toBeLessThan((global.fetch as jest.Mock).mock.invocationCallOrder[0]);
  expect(insert.mock.calls[0][0].requestBody).toMatchObject({ snippet: { categoryId }, status: { privacyStatus: 'private' } });
});

it('supports the WAIA category override without leaking it to Crit Fail', () => {
  process.env.YOUTUBE_PUBLISH_WAIA_DEFAULT_CATEGORY_ID = '26';
  expect(youtubeCategoryId('waia')).toBe('26');
  expect(youtubeCategoryId('critfail')).toBe('23');
});

it.each(['waia', 'critfail'] as const)('refuses scheduled publication for %s before API activity', async (slot) => {
  configure(slot);
  await expect(runPublishConnector({
    provider: 'youtube',
    metadata: { ...metadata, channelKey: slot, mode: 'schedule', scheduledFor: '2030-01-01T00:00:00Z' },
    mediaSignedUrl: 'https://media.example/video',
  })).rejects.toThrow('accepts private drafts only');
  expect(google.auth.OAuth2).not.toHaveBeenCalled();
  expect(list).not.toHaveBeenCalled();
  expect(insert).not.toHaveBeenCalled();
});

it('rejects a wrong-channel token before fetching media even with API fallback enabled', async () => {
  configure('critfail');
  process.env.PUBLISH_CONNECTOR_FALLBACK_ON_API_ERROR = 'true';
  list.mockResolvedValue({ data: { items: [{ id: WAIA_YOUTUBE_CHANNEL_ID }] } });
  await expect(runPublishConnector({ provider: 'youtube', metadata: { ...metadata, channelKey: 'critfail' }, mediaSignedUrl: 'https://media.example/video' }))
    .rejects.toThrow(CRITFAIL_YOUTUBE_CHANNEL_ID);
  expect(global.fetch).not.toHaveBeenCalled();
  expect(insert).not.toHaveBeenCalled();
  expect(put).not.toHaveBeenCalled();
});

it('keeps token-refresh failure details out of errors and refuses manifest fallback', async () => {
  configure('critfail');
  getAccessToken.mockRejectedValue(new Error('secret-fixture-must-not-appear'));
  await expect(runPublishConnector({ provider: 'youtube', metadata: { ...metadata, channelKey: 'critfail' }, mediaSignedUrl: 'https://media.example/video' }))
    .rejects.toThrow(/^YouTube OAuth token refresh failed; check YOUTUBE_PUBLISH_CRITFAIL_REFRESH_TOKEN, YOUTUBE_PUBLISH_CRITFAIL_CLIENT_ID, YOUTUBE_PUBLISH_CRITFAIL_CLIENT_SECRET$/);
  expect(insert).not.toHaveBeenCalled();
  expect(put).not.toHaveBeenCalled();
});
