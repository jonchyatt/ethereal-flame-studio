import { z } from 'zod';
import { getStorageAdapter } from '@/lib/storage';

/**
 * Audio for paid programs. The recordings are whatever Jonathan hands over and
 * live in private storage, never in this repo:
 *   programs/<programId>/audio.json          manifest (below)
 *   programs/<programId>/audio/<file>        the audio bytes
 * Bytes are only ever served by the gated route, which checks the entitlement.
 */

export const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'] as const;

export const TrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  title: z.string().min(1).max(120),
  /** File name under programs/<id>/audio/, no path parts. */
  file: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/).refine((f) => !f.includes('..')),
  contentType: z.enum(AUDIO_TYPES),
});
export const AudioManifestSchema = z.object({ tracks: z.array(TrackSchema).max(100) });
export type AudioTrack = z.infer<typeof TrackSchema>;

export async function loadAudioManifest(programId: string): Promise<AudioTrack[]> {
  const buf = await getStorageAdapter().get(`programs/${programId}/audio.json`);
  if (!buf) return [];
  try {
    return AudioManifestSchema.parse(JSON.parse(buf.toString('utf8'))).tracks;
  } catch {
    return []; // a malformed manifest shows nothing rather than guessing
  }
}

export async function loadTrackBytes(programId: string, track: AudioTrack): Promise<Buffer | null> {
  return getStorageAdapter().get(`programs/${programId}/audio/${track.file}`);
}

