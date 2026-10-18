import { getStorageAdapter } from '@/lib/storage';
import type { TranscriptLine } from '@/lib/creator/shorts/captions';
import type { TranscriptionResult } from '@/lib/services/whisperClient';
import type { JobStore } from '@/lib/jobs/types';
import { PlaylistBatchResultSchema } from './schema';

export type TranscribeFn = (audio: Buffer, filename: string) => Promise<TranscriptionResult>;

export type TranscriptOutcome =
  | { status: 'written'; key: string; lines: number }
  | { status: 'exists'; key: string }
  | { status: 'no-audio' }
  | { status: 'no-timings' }
  | { status: 'failed'; error: string };

export type TranscriptSweepStats = { written: number; existing: number; skipped: number; failed: number };

export function transcriptKey(assetId: string): string {
  return `assets/${assetId}/transcript.json`;
}

/** Whisper segments to the shape readTranscript and the caption builders read; bad rows are dropped, never repaired. */
export function toTranscriptLines(segments: TranscriptionResult['segments']): TranscriptLine[] {
  return segments
    .map((s) => ({ startSec: Number(s.startSec.toFixed(3)), endSec: Number(s.endSec.toFixed(3)), text: s.text.trim().replace(/\s+/g, ' ') }))
    .filter((l) => l.text && Number.isFinite(l.startSec) && Number.isFinite(l.endSec) && l.startSec >= 0 && l.endSec > l.startSec)
    .sort((a, b) => a.startSec - b.startSec);
}

async function findAudioKey(assetId: string, variant: 'original' | 'prepared'): Promise<string | null> {
  const keys = await getStorageAdapter().list(`assets/${assetId}/`);
  return keys.find((k) => (k.split('/').pop() ?? '').startsWith(variant)) ?? null;
}

/**
 * Writes assets/<assetId>/transcript.json from the asset's audio. An existing transcript is never overwritten
 * (unless force), and nothing is written when the service is down or returns no timed lines, so pack contents
 * keep saying awaiting-transcript instead of carrying invented captions.
 */
export async function writeAssetTranscript(
  assetId: string,
  transcribe: TranscribeFn,
  opts: { variant?: 'original' | 'prepared'; force?: boolean } = {},
): Promise<TranscriptOutcome> {
  const storage = getStorageAdapter();
  const key = transcriptKey(assetId);
  if (!opts.force && await storage.get(key)) return { status: 'exists', key };

  const audioKey = await findAudioKey(assetId, opts.variant ?? 'original');
  if (!audioKey) return { status: 'no-audio' };
  const audio = await storage.get(audioKey);
  if (!audio) return { status: 'no-audio' };

  try {
    const result = await transcribe(audio, audioKey.split('/').pop() ?? 'audio');
    const lines = toTranscriptLines(result.segments);
    if (lines.length === 0) return { status: 'no-timings' };
    await storage.put(key, Buffer.from(JSON.stringify(lines, null, 2), 'utf8'), { contentType: 'application/json' });
    return { status: 'written', key, lines: lines.length };
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : String(e) };
  }
}

/** Transcribes the asset of every release-approved item in one batch; pack contents pick it up on their next sweep. */
export async function ensureTranscriptsForReleaseApproved(
  store: JobStore,
  batchId: string,
  transcribe: TranscribeFn,
): Promise<TranscriptSweepStats> {
  const stats: TranscriptSweepStats = { written: 0, existing: 0, skipped: 0, failed: 0 };
  const batch = await store.get(batchId);
  if (!batch || batch.type !== 'playlist') return stats;
  const parsed = PlaylistBatchResultSchema.safeParse(batch.result);
  if (!parsed.success) return stats;

  const seen = new Set<string>();
  for (const item of parsed.data.items) {
    if (item.status !== 'release-approved' || !item.assetId || seen.has(item.assetId)) continue;
    seen.add(item.assetId);
    const out = await writeAssetTranscript(item.assetId, transcribe);
    if (out.status === 'written') stats.written++;
    else if (out.status === 'exists') stats.existing++;
    else if (out.status === 'failed') stats.failed++;
    else stats.skipped++;
  }
  return stats;
}
