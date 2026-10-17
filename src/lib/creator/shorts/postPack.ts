import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { assertWholeName, FULL_NAME } from './captions';
import type { ShortCut } from './cut';

export const SHORT_PLATFORMS = ['youtube-shorts', 'instagram-reels', 'tiktok'] as const;
export type ShortPlatform = (typeof SHORT_PLATFORMS)[number];

/** Per-platform habits. Hashtags stay few and descriptive; none of them asks the viewer to do anything. */
const PLATFORM_SPEC: Record<ShortPlatform, { titleMax: number; captionMax: number; hashtags: string[]; slug: string }> = {
  'youtube-shorts': { titleMax: 100, captionMax: 500, hashtags: ['#shorts', '#appreciation'], slug: 'yt-shorts' },
  'instagram-reels': { titleMax: 0, captionMax: 2200, hashtags: ['#appreciation', '#joy', '#mindfulness'], slug: 'reels' },
  tiktok: { titleMax: 0, captionMax: 2200, hashtags: ['#appreciation', '#joy'], slug: 'tiktok' },
};

/** Phrases that ask for engagement (HB-8: no engagement bait). Checked on every caption we write. */
const BAIT = [
  /\blike (and|&) subscribe\b/i, /\bsubscribe\b/i, /\bfollow (me|us|for|the)\b/i, /\bcomment (below|your|if)\b/i,
  /\bshare (this|with)\b/i, /\btag (a|someone|your)\b/i, /\blink in (my )?bio\b/i, /\bdon'?t forget to\b/i,
  /\bturn on notifications\b/i, /\bsmash\b/i, /\bwait for it\b/i, /\bpart \d\b/i,
];

export function baitProblems(text: string): string[] {
  return BAIT.filter((re) => re.test(text)).map((re) => `engagement bait: ${re.source}`);
}

export function assertNoBait(text: string): string {
  const problems = baitProblems(text);
  if (problems.length > 0) throw new Error(`"${text.slice(0, 80)}" has ${problems.join('; ')}`);
  return text;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'short';
}

/** One plain line crediting the sources and the rights basis of each, carried into every caption file. */
export function rightsLine(cut: ShortCut): string {
  const parts = cut.rights.map((r) => `${r.sourceId} (${r.rightsBasis})`);
  return `Sources: ${parts.join('; ')}.`;
}

/** The ready-to-paste text for one platform. The spoken line is quoted as spoken; the rest is ours. */
export function captionFor(cut: ShortCut, platform: ShortPlatform): { title: string | null; caption: string } {
  const spec = PLATFORM_SPEC[platform];
  const base = cut.captions[platform];
  const [firstLine = ''] = base.split('\n\n');
  const quoted = base.includes('\n\n') ? firstLine.trim() : '';
  const hashtags = spec.hashtags.join(' ');
  const written = assertNoBait(assertWholeName(`${FULL_NAME}\n${rightsLine(cut)}\n${hashtags}`));
  const body = quoted ? `${quoted}\n\n${written}` : written;
  // Trim the quoted line first so the name, sources and hashtags are never cut off.
  const room = spec.captionMax - written.length - 2;
  const caption = quoted && body.length > spec.captionMax
    ? `${quoted.slice(0, Math.max(0, room - 1)).trimEnd()}…\n\n${written}`
    : body;
  if (caption.length > spec.captionMax) throw new Error(`${platform} caption is ${caption.length} characters, over ${spec.captionMax}`);
  const title = spec.titleMax
    ? assertWholeName((quoted ? `${quoted.slice(0, spec.titleMax - FULL_NAME.length - 3).trimEnd()} | ${FULL_NAME}` : FULL_NAME).slice(0, spec.titleMax))
    : null;
  return { title, caption };
}

export type PostPackEntry = { platform: ShortPlatform; video: string; captionFile: string; title: string | null; sha256: string };

/**
 * Lays out one produced Short as a folder ready to post by hand: a folder per platform holding the mp4 under a
 * platform-specific name and a caption .txt beside it, plus rights.json and manifest.json. Nothing is uploaded
 * and nothing is posted; posting stays Jonathan's.
 */
export async function writePostPack(input: {
  shortDir: string;
  cut: ShortCut;
  /** Base name for the files, usually the parent audio name. */
  stem: string;
  index: number;
  outDir: string;
}): Promise<{ dir: string; entries: PostPackEntry[] }> {
  const { cut } = input;
  const name = `${slugify(input.stem)}-short-${String(input.index + 1).padStart(2, '0')}`;
  const dir = path.join(input.outDir, name);
  await mkdir(dir, { recursive: true });
  const videoSrc = path.join(input.shortDir, 'short.mp4');
  const sha256 = createHash('sha256').update(await readFile(videoSrc)).digest('hex');

  const entries: PostPackEntry[] = [];
  for (const platform of SHORT_PLATFORMS) {
    const spec = PLATFORM_SPEC[platform];
    const pdir = path.join(dir, platform);
    await mkdir(pdir, { recursive: true });
    const base = `${name}-${spec.slug}`;
    const { title, caption } = captionFor(cut, platform);
    await copyFile(videoSrc, path.join(pdir, `${base}.mp4`));
    await writeFile(path.join(pdir, `${base}.txt`), `${title ? `${title}\n\n` : ''}${caption}\n`);
    entries.push({ platform, video: `${platform}/${base}.mp4`, captionFile: `${platform}/${base}.txt`, title, sha256 });
  }
  await writeFile(path.join(dir, 'rights.json'), JSON.stringify({ parentPackId: cut.parentPackId, recipeFingerprint: cut.recipeFingerprint, rights: cut.rights }, null, 2));
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify({
    schemaVersion: 1,
    name,
    parentPackId: cut.parentPackId,
    startSec: cut.startSec,
    endSec: cut.endSec,
    publishMode: cut.publishMode,
    postedBy: 'Jonathan, by hand',
    entries,
  }, null, 2));
  return { dir, entries };
}
