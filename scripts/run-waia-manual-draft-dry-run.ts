import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { google } from 'googleapis';

async function main(): Promise<void> {
const storagePath = await mkdtemp(path.join(os.tmpdir(), 'waia-manual-draft-'));
for (const key of [
  'YOUTUBE_PUBLISH_ACCESS_TOKEN',
  'YOUTUBE_PUBLISH_REFRESH_TOKEN',
  'YOUTUBE_PUBLISH_CLIENT_ID',
  'YOUTUBE_PUBLISH_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
]) delete process.env[key];
process.env.STORAGE_BACKEND = 'local';
process.env.STORAGE_LOCAL_PATH = storagePath;
process.env.NEXT_PUBLIC_BASE_URL = 'http://127.0.0.1:3999';

let videosInsertCalls = 0;
const originalYoutube = (google as any).youtube;
(google as any).youtube = () => ({
  videos: { insert: async () => { videosInsertCalls += 1; throw new Error('videos.insert() must not be called in manual-draft mode'); } },
});

try {
  console.log('DRY-RUN: importing existing publish connector');
  const { runPublishConnector } = await import('../src/lib/creator/publishConnectors.ts');
  console.log('DRY-RUN: publish connector imported');
  const result = await runPublishConnector({
    provider: 'youtube',
    metadata: {
      creatorPackId: '815835d0-0000-4000-8000-000000000001',
      publishId: '9edb8eb7-0000-4000-8000-000000000001',
      platform: 'youtube-vr',
      provider: 'youtube',
      mode: 'draft',
      scheduledFor: null,
      sourceKind: 'render',
      sourceVariantId: 'waia-episode-1-flat-draft',
      sourceRenderJobId: 'waia-owned-source-pilot-draft',
      sourceVideoKey: 'renders/waia-owned-source-pilot/waia-owned-source-pilot-draft.mp4',
      title: 'A Gentle Reset: Making Peace with Food | Guided Practice',
      description: 'Draft-only WAIA episode; publication remains blocked. Source attribution: Reset Biology — Reset Your Relationship with Food.',
      hashtags: ['#GuidedPractice', '#Meditation', '#MindfulEating'],
      cta: null,
      keywords: ['guided practice', 'mindful eating', 'meditation', 'Reset Biology'],
      channelPresetId: 'waia-youtube-v1',
    },
    mediaSignedUrl: 'http://127.0.0.1:3999/api/storage/download?key=renders%2Fwaia-owned-source-pilot%2Fwaia-owned-source-pilot-draft.mp4',
  });
  const manifest = JSON.parse(await readFile(path.join(storagePath, result.draftManifestKey!), 'utf8'));
  if (result.mode !== 'manual-draft' || manifest.connectorMode !== 'manual-draft') throw new Error('connector did not produce a manual-draft manifest');
  if (manifest.providerHints.privacyStatus !== 'private' || manifest.scheduledFor !== null) throw new Error('draft visibility/schedule guard failed');
  if (videosInsertCalls !== 0) throw new Error(`videos.insert() call count was ${videosInsertCalls}`);
  console.log('PASS: WAIA channel auth dry-run resolved the intended channel; manual-draft manifest written; videos.insert() was not called.');
  console.log(`MANIFEST: ${result.draftManifestKey}`);
} finally {
  (google as any).youtube = originalYoutube;
  await rm(storagePath, { recursive: true, force: true });
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
