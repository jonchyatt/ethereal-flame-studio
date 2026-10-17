import { SAFE_ZONE_PRESETS } from '@/lib/creator/presets';

export const FULL_NAME = 'What Am I Appreciating Now';

export type TranscriptLine = { startSec: number; endSec: number; text: string };
export type CaptionLine = TranscriptLine;

/** Returns the reasons a text shortens the name; empty when it is fine. */
export function nameProblems(text: string): string[] {
  const problems: string[] = [];
  if (/\bWAIA\b/.test(text)) problems.push('uses the slug WAIA');
  if (/what\s+am\s+i\s+appreciating(?!\s+now)/i.test(text)) problems.push('drops "Now" from the name');
  return problems;
}

/** Throws if text a viewer reads (title, description, platform caption) shortens the name. */
export function assertWholeName(text: string): string {
  const problems = nameProblems(text);
  if (problems.length > 0) throw new Error(`"${text.slice(0, 80)}" ${problems.join(' and ')}; always write ${FULL_NAME}`);
  return text;
}

/** Keeps transcript lines that overlap the cut, shifted so the cut starts at 0 and clipped to its length. */
export function captionsForCut(lines: TranscriptLine[], startSec: number, endSec: number): CaptionLine[] {
  return lines
    .filter((l) => l.text.trim() && l.endSec > startSec && l.startSec < endSec)
    .map((l) => ({
      startSec: Number((Math.max(l.startSec, startSec) - startSec).toFixed(3)),
      endSec: Number((Math.min(l.endSec, endSec) - startSec).toFixed(3)),
      text: l.text.trim().replace(/\s+/g, ' '),
    }))
    .filter((l) => l.endSec > l.startSec);
}

/** Lyric or script text with no timings: sentences are spread across the cut by length. */
export function captionsFromText(text: string, durationSec: number): CaptionLine[] {
  const parts = text.split(/(?<=[.!?])\s+|\n+/).map((p) => p.trim()).filter(Boolean);
  const total = parts.reduce((n, p) => n + p.length, 0);
  if (parts.length === 0 || total === 0) return [];
  let at = 0;
  return parts.map((p) => {
    const span = (p.length / total) * durationSec;
    const line = { startSec: Number(at.toFixed(3)), endSec: Number((at + span).toFixed(3)), text: p };
    at += span;
    return line;
  });
}

function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

export function toSrt(lines: CaptionLine[]): string {
  return lines.map((l, i) => `${i + 1}\n${srtTime(l.startSec)} --> ${srtTime(l.endSec)}\n${l.text}\n`).join('\n');
}

function assTime(sec: number): string {
  const cs = Math.round(sec * 100);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(cs / 360000)}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`;
}

/**
 * The channel lettering for burn-in (scripts/brand/compose.mjs): upright serif, never italic or rotated,
 * cream ink with a dark outline, gold for the word Now. Placed in the 9:16 caption-safe zone.
 */
export function toAss(lines: CaptionLine[], width = 1080, height = 1920): string {
  const caption = SAFE_ZONE_PRESETS['safe-9x16'].safeZones.find((z) => z.label.startsWith('Caption Safe'))!;
  const marginV = Math.round(height * (1 - (caption.y + caption.height)));
  const marginLR = Math.round(width * caption.x);
  const fontSize = Math.round(width * 0.058);
  // ASS colours are &HAABBGGRR: ink #f7f3e6, gold #e6bd77, outline black at 60%.
  const text = (t: string) => t
    .replace(/[{}\\]/g, '')
    .replace(/\bNow\b/g, '{\\c&H77BDE6&}Now{\\c&HE6F3F7&}');
  return [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${width}`, `PlayResY: ${height}`, 'WrapStyle: 0', '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    `Style: Default,Iowan Old Style,${fontSize},&HE6F3F7,&HE6F3F7,&H99000000,&H00000000,-1,0,0,0,100,100,1,0,1,3,0,2,${marginLR},${marginLR},${marginV},1`,
    '', '[Events]', 'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
    ...lines.map((l) => `Dialogue: 0,${assTime(l.startSec)},${assTime(l.endSec)},Default,,0,0,0,,${text(l.text)}`),
    '',
  ].join('\n');
}
