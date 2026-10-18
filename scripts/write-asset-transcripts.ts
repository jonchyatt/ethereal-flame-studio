/**
 * Writes assets/<assetId>/transcript.json for every release-approved item in a playlist batch,
 * using the Whisper service (WHISPER_SERVICE_URL). Real runs are local; tests use fixture audio only.
 *
 *   npm run transcripts:write -- <batchJobId>
 */
import { getJobStore } from '../src/lib/jobs';
import { transcribeBuffer, checkWhisperHealth } from '../src/lib/services/whisperClient';
import { ensureTranscriptsForReleaseApproved } from '../src/lib/playlist-batch/transcriptWriter';
import { ensureRenderPacksForReleaseApproved } from '../src/lib/playlist-batch/renderPack';

async function main(): Promise<void> {
  const batchId = process.argv[2];
  if (!batchId) throw new Error('usage: write-asset-transcripts <batchJobId>');
  if (!(await checkWhisperHealth())) throw new Error('Whisper service is not reachable at WHISPER_SERVICE_URL; nothing written.');
  const store = getJobStore();
  console.log('transcripts', await ensureTranscriptsForReleaseApproved(store, batchId, transcribeBuffer));
  console.log('packs', await ensureRenderPacksForReleaseApproved(store, batchId));
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
