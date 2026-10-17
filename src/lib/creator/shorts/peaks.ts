import { spawn } from 'child_process';
import type { RecutPlan } from '@/lib/creator/types';

export const SHORT_MAX_SEC = 59;
export const SHORT_MIN_SEC = 30;

export type PeakSelectionOptions = {
  hopSec: number;
  /** Target length of each Short; clamped to 30..59 so every cut stays under 60 s. */
  targetSec?: number;
  count?: number;
  /** Minimum quiet gap kept between two chosen spans. */
  minGapSec?: number;
  /** How far a start may move to land on a pause. */
  snapSec?: number;
};

/** Root-mean-square energy per hop. Pure; the decode step lives in decodeMonoSamples. */
export function energyCurve(samples: Float32Array, sampleRate: number, hopSec: number): number[] {
  const hop = Math.max(1, Math.round(sampleRate * hopSec));
  const out: number[] = [];
  for (let i = 0; i < samples.length; i += hop) {
    const end = Math.min(samples.length, i + hop);
    let sum = 0;
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    out.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  return out;
}

/**
 * Picks sustained high-energy spans of 30..59 s, spaced apart, each start snapped to the quietest
 * hop nearby so a cut begins in a pause. Returns RecutPlan segments, all pending Jonathan's review.
 */
export function selectPeakSegments(energy: number[], options: PeakSelectionOptions): RecutPlan['segments'] {
  const hop = options.hopSec;
  const totalSec = energy.length * hop;
  if (energy.length === 0 || totalSec < SHORT_MIN_SEC) return [];
  const targetSec = Math.min(SHORT_MAX_SEC, Math.max(SHORT_MIN_SEC, options.targetSec ?? 45));
  const winHops = Math.max(1, Math.round(Math.min(targetSec, totalSec) / hop));
  const snapHops = Math.round((options.snapSec ?? 3) / hop);
  const gapHops = Math.round((options.minGapSec ?? 20) / hop);
  const count = options.count ?? 3;

  const prefix = [0];
  for (const e of energy) prefix.push(prefix[prefix.length - 1] + e);
  const mean = (from: number, to: number) => (prefix[to] - prefix[from]) / Math.max(1, to - from);

  const lastStart = Math.max(0, energy.length - winHops);
  const scores: number[] = [];
  for (let s = 0; s <= lastStart; s++) scores.push(mean(s, s + winHops));
  const best = Math.max(...scores, 1e-9);

  const taken: Array<[number, number]> = [];
  const segments: RecutPlan['segments'] = [];
  const order = scores.map((score, s) => ({ score, s })).sort((a, b) => b.score - a.score || a.s - b.s);

  for (const { score, s } of order) {
    if (segments.length >= count) break;
    // Snap the start to the quietest hop within reach, then keep the whole window inside the track.
    let start = s;
    for (let c = Math.max(0, s - snapHops); c <= Math.min(lastStart, s + snapHops); c++) {
      if (energy[c] < energy[start]) start = c;
    }
    const end = start + winHops;
    if (taken.some(([a, b]) => start < b + gapHops && end > a - gapHops)) continue;
    taken.push([start, end]);
    segments.push({
      startSec: Number((start * hop).toFixed(2)),
      endSec: Number(Math.min(totalSec, end * hop).toFixed(2)),
      score: Number((score / best).toFixed(3)),
      reason: 'Sustained energy peak, start snapped to a pause',
      reviewStatus: 'pending',
      reviewedAt: null,
      reviewNotes: null,
    });
  }
  return segments.sort((a, b) => a.startSec - b.startSec);
}

/** Decodes any audio or video file to mono float samples with ffmpeg (no new services). */
export function decodeMonoSamples(inputPath: string, sampleRate = 8000): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-v', 'error', '-i', inputPath, '-vn', '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    let stderr = '';
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c) => { stderr += String(c); });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg decode failed (${code}): ${stderr.slice(-500)}`));
      const buf = Buffer.concat(chunks);
      const copy = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - (buf.byteLength % 4));
      resolve(new Float32Array(copy));
    });
  });
}
