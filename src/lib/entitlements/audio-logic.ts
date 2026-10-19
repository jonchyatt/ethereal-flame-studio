/** Pure audio helpers, free of storage imports so the client player can use them. */

export type ByteRange = { start: number; end: number } | 'unsatisfiable' | null;

/** Single-range `bytes=a-b`, `bytes=a-`, `bytes=-n`. Null = no/ignored header. */
export function parseRange(header: string | null | undefined, size: number): ByteRange {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  if (size === 0) return 'unsatisfiable';
  let start: number;
  let end: number;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0) return 'unsatisfiable';
    start = Math.max(size - n, 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

// --- player logic kept pure so it can be tested without a browser ----------

export const SLEEP_OPTIONS_MIN = [10, 20, 30, 45, 60] as const;
export const FADE_SECONDS = 20;

/** Volume multiplier 0..1 for a sleep timer ending at `endsAt` (ms epoch). */
export function sleepVolume(nowMs: number, endsAt: number): number {
  const left = (endsAt - nowMs) / 1000;
  if (left <= 0) return 0;
  if (left >= FADE_SECONDS) return 1;
  return left / FADE_SECONDS;
}

export interface ResumePoint { trackId: string; seconds: number }

/** Don't resume into the first 5 s or the last 10 s: start over instead. */
export function resumeSeconds(saved: ResumePoint | null, trackId: string, duration: number): number {
  if (!saved || saved.trackId !== trackId || !Number.isFinite(saved.seconds)) return 0;
  if (saved.seconds < 5) return 0;
  if (Number.isFinite(duration) && duration > 0 && saved.seconds > duration - 10) return 0;
  return saved.seconds;
}

export function parseResume(raw: string | null): ResumePoint | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.trackId === 'string' && typeof v?.seconds === 'number' && v.seconds >= 0) {
      return { trackId: v.trackId, seconds: v.seconds };
    }
  } catch { /* ignore */ }
  return null;
}

/** A short quiet WAV (mono 8 kHz 16-bit, soft 220 Hz tone) for fixtures and local previews. */
export function fixtureWav(seconds = 3): Buffer {
  const rate = 8000;
  const n = rate * seconds;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 1500), 44 + i * 2);
  return buf;
}
