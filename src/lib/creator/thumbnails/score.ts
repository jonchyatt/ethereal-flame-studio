import { SAFE_ZONE_PRESETS } from '@/lib/creator/presets';

/** A small RGB frame, 3 bytes per pixel, row-major. */
export type RgbFrame = { width: number; height: number; data: Uint8Array };

export type FrameScore = {
  /** 0..1, higher is a better thumbnail still. 0 when the frame is rejected. */
  score: number;
  rejected: string | null;
  meanLuma: number;
  contrast: number;
  colorfulness: number;
  /** Share of the frame's brightness that sits in the Primary Subject Zone. */
  subjectShare: number;
  reason: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function subjectZone(presetId: keyof typeof SAFE_ZONE_PRESETS) {
  const zones = SAFE_ZONE_PRESETS[presetId].safeZones;
  return zones.find((z) => /subject|focus/i.test(z.label)) ?? zones[0];
}

/**
 * Scores one still for use as a thumbnail. Pure and cheap, so it can run on 160x90 grabs.
 * Rejects near-black, blown-out and flat frames; otherwise rewards a glow on a dark field
 * (mid-low mean luma), contrast, colour, and brightness gathered in the primary subject zone.
 */
export function scoreFrame(frame: RgbFrame, presetId: keyof typeof SAFE_ZONE_PRESETS = 'safe-16x9'): FrameScore {
  const { width, height, data } = frame;
  const n = width * height;
  if (n === 0 || data.length < n * 3) throw new Error('frame data does not match its size');
  const zone = subjectZone(presetId);
  const x0 = zone.x * width, x1 = (zone.x + zone.width) * width;
  const y0 = zone.y * height, y1 = (zone.y + zone.height) * height;

  let lumaSum = 0, lumaSq = 0, inZone = 0;
  let rgSum = 0, rgSq = 0, ybSum = 0, ybSq = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      lumaSum += l; lumaSq += l * l;
      if (x >= x0 && x < x1 && y >= y0 && y < y1) inZone += l;
      const rg = r - g, yb = 0.5 * (r + g) - b;
      rgSum += rg; rgSq += rg * rg; ybSum += yb; ybSq += yb * yb;
    }
  }
  const meanLuma = lumaSum / n;
  const contrast = Math.sqrt(Math.max(0, lumaSq / n - meanLuma * meanLuma));
  const sd = (sum: number, sq: number) => Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2));
  const mean = (v: number) => Math.abs(v / n);
  // Hasler and Suesstrunk colourfulness, scaled to roughly 0..1.
  const colorfulness = clamp01((Math.hypot(sd(rgSum, rgSq), sd(ybSum, ybSq)) + 0.3 * Math.hypot(mean(rgSum), mean(ybSum))) / 100);
  const subjectShare = lumaSum > 0 ? inZone / lumaSum : 0;
  const base = { meanLuma, contrast, colorfulness, subjectShare };

  const reject = (why: string): FrameScore => ({ ...base, score: 0, rejected: why, reason: `Rejected: ${why}` });
  if (meanLuma < 0.04) return reject('near-black frame');
  if (meanLuma > 0.85) return reject('blown-out frame');
  if (contrast < 0.04) return reject('flat frame, nothing to look at');

  const zoneArea = (zone.width * zone.height);
  const subjectFocus = clamp01((subjectShare - zoneArea) / Math.max(0.01, 0.9 - zoneArea));
  const tone = clamp01(1 - Math.abs(meanLuma - 0.3) / 0.3);
  const score = Number((0.3 * tone + 0.3 * clamp01(contrast / 0.25) + 0.15 * colorfulness + 0.25 * subjectFocus).toFixed(3));
  const parts: string[] = [];
  if (tone > 0.7) parts.push('glow on a dark field');
  if (contrast > 0.15) parts.push('strong contrast');
  if (colorfulness > 0.4) parts.push('rich colour');
  if (subjectFocus > 0.5) parts.push('subject sits in the primary zone');
  return { ...base, score, rejected: null, reason: parts.length ? `Scored frame: ${parts.join(', ')}` : 'Scored frame: serviceable, no standout quality' };
}
