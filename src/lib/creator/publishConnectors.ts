import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { getStorageAdapter } from '@/lib/storage';
import type { CreatorPublishJobMetadata } from './jobs';
import { getContentLibraryItemByPackId } from './store';

export type PublishConnectorProvider = 'youtube' | 'tiktok' | 'instagram';
export type PublishConnectorMode = 'api' | 'manual-draft';

export type PublishConnectorResult = {
  provider: PublishConnectorProvider;
  mode: PublishConnectorMode;
  providerStatus: string;
  externalId?: string | null;
  providerUrl?: string | null;
  draftManifestKey?: string | null;
  draftManifestUrl?: string | null;
  scheduledFor?: string | null;
  warnings?: string[];
};

type ConnectorInput = {
  provider: PublishConnectorProvider;
  metadata: CreatorPublishJobMetadata;
  mediaSignedUrl: string;
};

type JsonRecord = Record<string, unknown>;

function parseBool(value: string | undefined, defaultValue = false): boolean {
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function platformEnvSuffix(platform: string): string {
  return platform.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

function coerceDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function readResponseBodySafe(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{ response: Response; data: JsonRecord | null; text: string }> {
  const response = await fetch(url, init);
  const text = await readResponseBodySafe(response);
  let data: JsonRecord | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as JsonRecord;
    } catch {
      data = null;
    }
  }
  return { response, data, text };
}

function buildHashtagString(hashtags: string[]): string {
  const normalized = hashtags
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`));
  return Array.from(new Set(normalized)).join(' ');
}

function buildPublishCaption(metadata: CreatorPublishJobMetadata, maxLength: number): string {
  const hashtags = buildHashtagString(metadata.hashtags || []);
  const lines = [
    metadata.title?.trim() || '',
    metadata.description?.trim() || '',
    metadata.cta?.trim() || '',
    hashtags,
  ].filter(Boolean);
  return truncate(lines.join('\n\n'), maxLength);
}

function buildYoutubeDescription(metadata: CreatorPublishJobMetadata): string {
  const hashtags = buildHashtagString(metadata.hashtags || []);
  const descriptionCore = (metadata.description || '').trim();
  const cta = (metadata.cta || '').trim();
  const lines = [descriptionCore, cta, hashtags].filter(Boolean);
  return truncate(lines.join('\n\n'), 5000);
}

function buildYoutubeTags(metadata: CreatorPublishJobMetadata): string[] {
  const tags = new Set<string>();
  for (const kw of metadata.keywords || []) {
    const v = kw.trim();
    if (v) tags.add(truncate(v, 30));
  }
  for (const hashtag of metadata.hashtags || []) {
    const v = hashtag.replace(/^#+/, '').trim();
    if (v) tags.add(truncate(v, 30));
  }
  return Array.from(tags).slice(0, 50);
}

function youtubePlaylistIdsForPlatform(platform: string): string[] {
  const platformIds = parseCsv(process.env[`YOUTUBE_PUBLISH_PLAYLIST_IDS_${platformEnvSuffix(platform)}`]);
  const genericIds = parseCsv(process.env.YOUTUBE_PUBLISH_PLAYLIST_IDS);
  return Array.from(new Set([...platformIds, ...genericIds]));
}

async function streamFromUrl(url: string): Promise<Readable> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media from signed URL (${response.status})`);
  }
  if (!response.body) {
    throw new Error('Signed URL response did not include a body stream');
  }
  return Readable.fromWeb(response.body as any);
}

async function runFfmpegExtractFrame(
  inputPath: string,
  outputPath: string,
  timestampSec: number,
): Promise<{ ok: boolean; stderrTail?: string }> {
  const args = [
    '-y',
    '-ss', Math.max(0, timestampSec).toFixed(3),
    '-i', inputPath,
    '-frames:v', '1',
    '-q:v', '2',
    outputPath,
  ];

  return new Promise((resolve) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 16_000) stderr = stderr.slice(-12_000);
    });
    child.on('error', () => resolve({ ok: false, stderrTail: stderr.slice(-2000) }));
    child.on('exit', (code) => resolve({ ok: code === 0, stderrTail: stderr.slice(-2000) }));
  });
}

async function resolveThumbnailTimestampSec(metadata: CreatorPublishJobMetadata): Promise<number | null> {
  const overrideRaw = process.env.YOUTUBE_PUBLISH_THUMBNAIL_TIMESTAMP_SEC;
  if (overrideRaw && Number.isFinite(Number(overrideRaw))) {
    return Math.max(0, Number(overrideRaw));
  }

  const contentItem = await getContentLibraryItemByPackId(metadata.creatorPackId).catch(() => null);
  if (!contentItem) return null;

  const exact = contentItem.thumbnailPlans.find((plan) => plan.platform === metadata.platform);
  const providerGroup =
    metadata.platform.startsWith('youtube')
      ? contentItem.thumbnailPlans.find((plan) => plan.platform.startsWith('youtube'))
      : metadata.platform.startsWith('instagram')
        ? contentItem.thumbnailPlans.find((plan) => plan.platform.startsWith('instagram'))
        : contentItem.thumbnailPlans.find((plan) => plan.platform === metadata.platform);
  const chosen = exact || providerGroup || contentItem.thumbnailPlans[0];
  if (!chosen) return null;
  if (typeof chosen.selectedTimestampSec === 'number' && Number.isFinite(chosen.selectedTimestampSec)) {
    return Math.max(0, chosen.selectedTimestampSec);
  }
  return chosen.candidates?.[0]?.timestampSec ?? null;
}

async function maybeGenerateYoutubeThumbnail(
  input: ConnectorInput,
): Promise<{ buffer: Buffer | null; mimeType: string; warnings: string[]; timestampSec: number | null }> {
  if (parseBool(process.env.YOUTUBE_PUBLISH_DISABLE_THUMBNAIL_UPLOAD, false)) {
    return { buffer: null, mimeType: 'image/jpeg', warnings: [], timestampSec: null };
  }

  const timestampSec = await resolveThumbnailTimestampSec(input.metadata);
  if (timestampSec == null) {
    return {
      buffer: null,
      mimeType: 'image/jpeg',
      warnings: ['No thumbnail plan timestamp found for this creator pack; skipping YouTube thumbnail upload.'],
      timestampSec: null,
    };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-thumb-'));
  const outPath = path.join(tmpDir, 'thumbnail.jpg');
  try {
    const ffmpeg = await runFfmpegExtractFrame(input.mediaSignedUrl, outPath, timestampSec);
    if (!ffmpeg.ok) {
      return {
        buffer: null,
        mimeType: 'image/jpeg',
        warnings: ['ffmpeg thumbnail extraction failed; skipping thumbnail upload.'],
        timestampSec,
      };
    }
    const buf = await fs.readFile(outPath);
    return { buffer: buf, mimeType: 'image/jpeg', warnings: [], timestampSec };
  } catch (error) {
    return {
      buffer: null,
      mimeType: 'image/jpeg',
      warnings: [`Unable to generate YouTube thumbnail frame automatically: ${error instanceof Error ? error.message : String(error)}`],
      timestampSec,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function hasYoutubeApiCreds(): boolean {
  const access = !!process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN;
  const refresh = !!(process.env.YOUTUBE_PUBLISH_REFRESH_TOKEN && process.env.YOUTUBE_PUBLISH_CLIENT_ID && process.env.YOUTUBE_PUBLISH_CLIENT_SECRET);
  return access || refresh;
}

function hasTiktokApiCreds(): boolean {
  return !!process.env.TIKTOK_PUBLISH_ACCESS_TOKEN;
}

function hasInstagramApiCreds(): boolean {
  return !!(process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN && process.env.INSTAGRAM_GRAPH_USER_ID);
}

function resolveMode(provider: PublishConnectorProvider): PublishConnectorMode {
  switch (provider) {
    case 'youtube':
      return hasYoutubeApiCreds() ? 'api' : 'manual-draft';
    case 'tiktok':
      return hasTiktokApiCreds() ? 'api' : 'manual-draft';
    case 'instagram':
      return hasInstagramApiCreds() ? 'api' : 'manual-draft';
    default:
      return 'manual-draft';
  }
}

async function writeDraftManifest(input: ConnectorInput, warnings: string[] = []): Promise<PublishConnectorResult> {
  const storage = getStorageAdapter();
  const manifestKey = `creator/publish-drafts/${input.provider}/${input.metadata.publishId}.json`;
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    provider: input.provider,
    connectorMode: 'manual-draft',
    publishId: input.metadata.publishId,
    creatorPackId: input.metadata.creatorPackId,
    platform: input.metadata.platform,
    mode: input.metadata.mode,
    scheduledFor: input.metadata.scheduledFor || null,
    source: {
      kind: input.metadata.sourceKind,
      variantId: input.metadata.sourceVariantId,
      renderJobId: input.metadata.sourceRenderJobId,
      recutJobId: input.metadata.sourceRecutJobId || null,
      videoKey: input.metadata.sourceVideoKey,
      signedUrl: input.mediaSignedUrl,
    },
    metadata: {
      title: input.metadata.title,
      description: input.metadata.description,
      hashtags: input.metadata.hashtags,
      cta: input.metadata.cta || null,
      keywords: input.metadata.keywords,
      channelPresetId: input.metadata.channelPresetId || null,
    },
    providerHints:
      input.provider === 'youtube'
        ? {
            categoryId: process.env.YOUTUBE_PUBLISH_DEFAULT_CATEGORY_ID || '10',
            privacyStatus: process.env.YOUTUBE_PUBLISH_DEFAULT_PRIVACY || 'private',
            madeForKids: parseBool(process.env.YOUTUBE_PUBLISH_MADE_FOR_KIDS, false),
            playlistIds: youtubePlaylistIdsForPlatform(input.metadata.platform),
          }
        : input.provider === 'instagram'
          ? {
              mediaType: input.metadata.platform === 'instagram-feed' ? 'VIDEO' : 'REELS',
              publishLater: input.metadata.mode === 'schedule',
            }
          : {
              postPrivacy: process.env.TIKTOK_PUBLISH_PRIVACY_LEVEL || 'PUBLIC_TO_EVERYONE',
              allowComment: !parseBool(process.env.TIKTOK_PUBLISH_DISABLE_COMMENT, false),
              scheduleRequested: input.metadata.mode === 'schedule',
            },
  };

  await storage.put(manifestKey, Buffer.from(JSON.stringify(payload, null, 2)), {
    contentType: 'application/json',
  });
  const manifestUrl = await storage.getSignedUrl(manifestKey, 3600);

  return {
    provider: input.provider,
    mode: 'manual-draft',
    providerStatus: input.metadata.mode === 'schedule' ? 'scheduled-manual-draft' : 'draft-manual',
    draftManifestKey: manifestKey,
    draftManifestUrl: manifestUrl,
    scheduledFor: input.metadata.scheduledFor || null,
    warnings,
  };
}

async function buildYoutubeAuthClient() {
  const clientId = process.env.YOUTUBE_PUBLISH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.YOUTUBE_PUBLISH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.YOUTUBE_PUBLISH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const refreshToken = process.env.YOUTUBE_PUBLISH_REFRESH_TOKEN;
  const accessToken = process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN;
  if (!refreshToken && !accessToken) {
    throw new Error('YouTube publish API credentials are not configured');
  }

  if (refreshToken) {
    // Set refresh token first, then force a fresh access token
    oauth2.setCredentials({ refresh_token: refreshToken });
    try {
      const { token } = await oauth2.getAccessToken();
      if (!token) {
        throw new Error('OAuth2 getAccessToken returned no token');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`YouTube OAuth token refresh failed — check YOUTUBE_PUBLISH_REFRESH_TOKEN and client credentials: ${msg}`);
    }
  } else if (accessToken) {
    // Static access token only — will fail when it expires
    oauth2.setCredentials({ access_token: accessToken });
    console.warn('[publishConnectors] Using static YOUTUBE_PUBLISH_ACCESS_TOKEN without refresh token — this will expire.');
  }
  return oauth2;
}

async function publishYoutubeApi(input: ConnectorInput): Promise<PublishConnectorResult> {
  if (!hasYoutubeApiCreds()) {
    return writeDraftManifest(input, ['YouTube API credentials are not fully configured; using manual draft manifest.']);
  }

  const warnings: string[] = [];
  const auth = await buildYoutubeAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const title = truncate((input.metadata.title || '').trim() || 'Untitled', 100);
  const description = buildYoutubeDescription(input.metadata);
  const tags = buildYoutubeTags(input.metadata);
  const requestedSchedule = coerceDateTime(input.metadata.scheduledFor || null);
  const scheduleMode = input.metadata.mode === 'schedule' && !!requestedSchedule;
  const privacyDefault = (process.env.YOUTUBE_PUBLISH_DEFAULT_PRIVACY || 'private').toLowerCase();
  const privacyStatus = scheduleMode
    ? 'private'
    : (['private', 'unlisted', 'public'].includes(privacyDefault) ? privacyDefault : 'private');

  if (input.metadata.mode === 'schedule' && !requestedSchedule) {
    warnings.push('Scheduled publish requested without a valid scheduledFor datetime; uploaded as draft/private.');
  }

  const categoryId = process.env.YOUTUBE_PUBLISH_DEFAULT_CATEGORY_ID || '10';
  const defaultLanguage = process.env.YOUTUBE_PUBLISH_DEFAULT_LANGUAGE;
  const notifySubscribers = parseBool(process.env.YOUTUBE_PUBLISH_NOTIFY_SUBSCRIBERS, false);
  const madeForKids = parseBool(process.env.YOUTUBE_PUBLISH_MADE_FOR_KIDS, false);
  const license = process.env.YOUTUBE_PUBLISH_LICENSE;

  const mediaBody = await streamFromUrl(input.mediaSignedUrl);

  const insertResponse = await youtube.videos.insert({
    part: ['snippet', 'status'],
    notifySubscribers,
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId,
        defaultLanguage,
      },
      status: {
        privacyStatus,
        publishAt: scheduleMode ? requestedSchedule! : undefined,
        selfDeclaredMadeForKids: madeForKids,
        license,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: mediaBody,
    },
    uploadType: 'resumable',
  } as any);

  const videoId = insertResponse.data.id;
  if (!videoId) {
    throw new Error('YouTube upload completed without returning a video id');
  }

  const playlistIds = youtubePlaylistIdsForPlatform(input.metadata.platform);
  for (const playlistId of playlistIds) {
    try {
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        },
      });
    } catch (error) {
      warnings.push(`Playlist insert failed (${playlistId}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const thumb = await maybeGenerateYoutubeThumbnail(input);
  warnings.push(...thumb.warnings);
  if (thumb.buffer) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: thumb.mimeType,
          body: Readable.from(thumb.buffer),
        },
      } as any);
    } catch (error) {
      warnings.push(`Thumbnail upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    provider: 'youtube',
    mode: 'api',
    providerStatus: scheduleMode ? 'scheduled' : 'uploaded',
    externalId: videoId,
    providerUrl: `https://www.youtube.com/watch?v=${videoId}`,
    scheduledFor: scheduleMode ? requestedSchedule : null,
    warnings: warnings.length ? warnings : undefined,
  };
}

function tiktokApiBase(): string {
  return (process.env.TIKTOK_PUBLISH_API_BASE || 'https://open.tiktokapis.com').replace(/\/+$/, '');
}

async function publishTiktokApi(input: ConnectorInput): Promise<PublishConnectorResult> {
  if (!hasTiktokApiCreds()) {
    return writeDraftManifest(input, ['TikTok publish access token missing; using manual draft manifest.']);
  }

  const accessToken = process.env.TIKTOK_PUBLISH_ACCESS_TOKEN!;
  const scheduleIso = coerceDateTime(input.metadata.scheduledFor || null);
  const scheduleEpoch = scheduleIso ? Math.floor(new Date(scheduleIso).getTime() / 1000) : null;
  const warnings: string[] = [];
  if (input.metadata.mode === 'schedule' && !scheduleEpoch) {
    warnings.push('Scheduled publish requested without a valid scheduledFor datetime; attempting immediate draft/post init.');
  }

  const privacyLevel =
    process.env.TIKTOK_PUBLISH_PRIVACY_LEVEL ||
    (input.metadata.mode === 'draft' ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE');

  const body: JsonRecord = {
    post_info: {
      title: buildPublishCaption(input.metadata, 2200),
      privacy_level: privacyLevel,
      disable_duet: parseBool(process.env.TIKTOK_PUBLISH_DISABLE_DUET, false),
      disable_comment: parseBool(process.env.TIKTOK_PUBLISH_DISABLE_COMMENT, false),
      disable_stitch: parseBool(process.env.TIKTOK_PUBLISH_DISABLE_STITCH, false),
      ...(input.metadata.mode === 'schedule' && scheduleEpoch ? { schedule_time: scheduleEpoch } : {}),
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: input.mediaSignedUrl,
    },
  };

  const { response, data, text } = await fetchJson(`${tiktokApiBase()}/v2/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`TikTok publish init failed (${response.status}): ${text || 'Unknown error'}`);
  }

  const tiktokError = data?.error as JsonRecord | undefined;
  if (tiktokError && (tiktokError.code || tiktokError.message)) {
    throw new Error(`TikTok publish init error: ${String(tiktokError.code || '')} ${String(tiktokError.message || '')}`.trim());
  }

  const publishId = String(((data?.data as JsonRecord | undefined)?.publish_id || '')).trim();
  if (!publishId) {
    warnings.push('TikTok publish init succeeded but did not return publish_id');
  }

  return {
    provider: 'tiktok',
    mode: 'api',
    providerStatus: input.metadata.mode === 'schedule' ? 'scheduled-init' : 'publish-init',
    externalId: publishId || null,
    scheduledFor: input.metadata.mode === 'schedule' ? scheduleIso : null,
    warnings: warnings.length ? warnings : undefined,
  };
}

function instagramGraphBase(): string {
  return (process.env.INSTAGRAM_GRAPH_API_BASE || 'https://graph.facebook.com/v21.0').replace(/\/+$/, '');
}

function instagramMediaType(platform: CreatorPublishJobMetadata['platform']): 'REELS' | 'VIDEO' {
  return platform === 'instagram-feed' ? 'VIDEO' : 'REELS';
}

async function pollInstagramContainer(
  creationId: string,
  accessToken: string,
): Promise<{ statusCode: string | null; status: string | null; errorMessage: string | null }> {
  const base = instagramGraphBase();
  const timeoutMs = Math.max(15_000, Number(process.env.INSTAGRAM_GRAPH_POLL_TIMEOUT_MS || 180_000));
  const intervalMs = Math.max(2_000, Number(process.env.INSTAGRAM_GRAPH_POLL_INTERVAL_MS || 5_000));
  const deadline = Date.now() + timeoutMs;

  let lastStatusCode: string | null = null;
  let lastStatus: string | null = null;
  let lastError: string | null = null;

  while (Date.now() < deadline) {
    const params = new URLSearchParams({
      fields: 'status_code,status,error_message',
      access_token: accessToken,
    });
    const { response, data, text } = await fetchJson(`${base}/${encodeURIComponent(creationId)}?${params.toString()}`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(`Instagram container status check failed (${response.status}): ${text || 'Unknown error'}`);
    }

    lastStatusCode = typeof data?.status_code === 'string' ? data.status_code : null;
    lastStatus = typeof data?.status === 'string' ? data.status : null;
    lastError = typeof data?.error_message === 'string' ? data.error_message : null;

    const normalized = (lastStatusCode || '').toUpperCase();
    if (normalized === 'FINISHED' || normalized === 'PUBLISHED') {
      return { statusCode: lastStatusCode, status: lastStatus, errorMessage: lastError };
    }
    if (normalized === 'ERROR' || normalized === 'EXPIRED') {
      throw new Error(`Instagram media container failed (${lastStatusCode}): ${lastError || 'unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { statusCode: lastStatusCode, status: lastStatus, errorMessage: lastError };
}

async function publishInstagramApi(input: ConnectorInput): Promise<PublishConnectorResult> {
  if (!hasInstagramApiCreds()) {
    return writeDraftManifest(input, ['Instagram Graph token/user id missing; using manual draft manifest.']);
  }

  const accessToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN!;
  const igUserId = process.env.INSTAGRAM_GRAPH_USER_ID!;
  const base = instagramGraphBase();

  if (input.metadata.mode === 'schedule' && !parseBool(process.env.INSTAGRAM_GRAPH_ENABLE_SCHEDULE, false)) {
    return writeDraftManifest(input, [
      'Instagram Graph scheduling is not enabled in this environment. Set INSTAGRAM_GRAPH_ENABLE_SCHEDULE=true after validating your account/app supports scheduled publishing.',
    ]);
  }

  const caption = buildPublishCaption(input.metadata, 2200);
  const mediaType = instagramMediaType(input.metadata.platform);
  const createParams = new URLSearchParams({
    access_token: accessToken,
    video_url: input.mediaSignedUrl,
    caption,
    media_type: mediaType,
  });

  if (mediaType === 'REELS') {
    createParams.set('share_to_feed', parseBool(process.env.INSTAGRAM_GRAPH_REELS_SHARE_TO_FEED, true) ? 'true' : 'false');
  }

  const scheduleIso = coerceDateTime(input.metadata.scheduledFor || null);
  if (input.metadata.mode === 'schedule' && scheduleIso) {
    createParams.set('published', 'false');
    createParams.set('scheduled_publish_time', String(Math.floor(new Date(scheduleIso).getTime() / 1000)));
  }

  const create = await fetchJson(`${base}/${encodeURIComponent(igUserId)}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: createParams.toString(),
  });
  if (!create.response.ok) {
    throw new Error(`Instagram media container create failed (${create.response.status}): ${create.text || 'Unknown error'}`);
  }
  const creationId = String((create.data?.id || '')).trim();
  if (!creationId) {
    throw new Error('Instagram media container create did not return an id');
  }

  const warnings: string[] = [];
  const status = await pollInstagramContainer(creationId, accessToken);
  if (status.errorMessage) {
    warnings.push(status.errorMessage);
  }

  if (input.metadata.mode === 'schedule' && scheduleIso) {
    return {
      provider: 'instagram',
      mode: 'api',
      providerStatus: 'scheduled-container',
      externalId: creationId,
      scheduledFor: scheduleIso,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  const publishParams = new URLSearchParams({
    access_token: accessToken,
    creation_id: creationId,
  });
  const publish = await fetchJson(`${base}/${encodeURIComponent(igUserId)}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: publishParams.toString(),
  });
  if (!publish.response.ok) {
    throw new Error(`Instagram media publish failed (${publish.response.status}): ${publish.text || 'Unknown error'}`);
  }

  const mediaId = String((publish.data?.id || '')).trim();
  let permalink: string | null = null;
  if (mediaId) {
    const permalinkParams = new URLSearchParams({
      fields: 'permalink',
      access_token: accessToken,
    });
    const permalinkRes = await fetchJson(`${base}/${encodeURIComponent(mediaId)}?${permalinkParams.toString()}`, { method: 'GET' });
    if (permalinkRes.response.ok && typeof permalinkRes.data?.permalink === 'string') {
      permalink = permalinkRes.data.permalink;
    } else if (!permalinkRes.response.ok) {
      warnings.push(`Unable to fetch Instagram permalink (${permalinkRes.response.status})`);
    }
  }

  return {
    provider: 'instagram',
    mode: 'api',
    providerStatus: 'published',
    externalId: mediaId || creationId,
    providerUrl: permalink,
    warnings: warnings.length ? warnings : undefined,
  };
}

async function withFallbackOnApiError(
  input: ConnectorInput,
  providerLabel: string,
  fn: () => Promise<PublishConnectorResult>,
): Promise<PublishConnectorResult> {
  try {
    return await fn();
  } catch (error) {
    if (parseBool(process.env.PUBLISH_CONNECTOR_FALLBACK_ON_API_ERROR, false)) {
      return writeDraftManifest(input, [
        `${providerLabel} API publish failed and automatic fallback is enabled: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
    throw error;
  }
}

export async function runPublishConnector(input: ConnectorInput): Promise<PublishConnectorResult> {
  const mode = resolveMode(input.provider);
  if (mode === 'manual-draft') {
    return writeDraftManifest(input);
  }

  switch (input.provider) {
    case 'youtube':
      return withFallbackOnApiError(input, 'YouTube', () => publishYoutubeApi(input));
    case 'tiktok':
      return withFallbackOnApiError(input, 'TikTok', () => publishTiktokApi(input));
    case 'instagram':
      return withFallbackOnApiError(input, 'Instagram', () => publishInstagramApi(input));
    default:
      return writeDraftManifest(input, ['Unknown provider, generated manual draft manifest']);
  }
}
