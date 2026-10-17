import { getStorageAdapter } from '@/lib/storage';
import { SAFE_ZONE_PRESETS } from '@/lib/creator/presets';
import { FULL_NAME, assertWholeName, toSrt, type TranscriptLine } from '@/lib/creator/shorts/captions';
import type { PlaylistBatchItemState } from './schema';

/** Sits beside, not inside, creator/packs/ so the pack listing never reads these files as packs. */
export const PACK_CONTENTS_PREFIX = 'creator/pack-contents';

const TITLE_MAX = 100;

export type PatronsPointer = { patronsFile: string | null; patronListHash: string | null; note: string };

export type PackContentsFiles = Record<string, string>;

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function packTitle(item: PlaylistBatchItemState): string {
  const suffix = ` | ${FULL_NAME}`;
  const base = item.title.replace(/\s+/g, ' ').trim() || item.videoId;
  const room = TITLE_MAX - suffix.length;
  const head = base.length > room ? `${base.slice(0, room - 1).trimEnd()}…` : base;
  return assertWholeName(`${head}${suffix}`);
}

/** Pointer only: the patron list itself stays outside the repo and is frozen and hashed elsewhere. */
export function patronsPointerFromEnv(env: NodeJS.ProcessEnv = process.env): PatronsPointer {
  const file = env.WAIA_PATRONS_RENDER_LIST?.trim();
  const hash = env.WAIA_PATRONS_RENDER_LIST_HASH?.trim().toLowerCase();
  if (file && hash && /^[a-f0-9]{64}$/.test(hash)) {
    return { patronsFile: file, patronListHash: hash, note: 'Pass as --patrons-file; the render verifies the hash.' };
  }
  return { patronsFile: null, patronListHash: null, note: 'No frozen patron list configured; render without a patron wall.' };
}

/**
 * Builds the files a person reads or a render script picks up for one approved item.
 * Only facts already on the item go in; anything not known yet is marked pending, never invented.
 */
export function buildPackContents(input: {
  item: PlaylistBatchItemState;
  batchJobId: string;
  packId: string;
  durationSec?: number | null;
  transcript?: TranscriptLine[] | null;
  patrons?: PatronsPointer;
}): PackContentsFiles {
  const { item } = input;
  const title = packTitle(item);

  const recipe = item.recipes.find((r) => r.recipeId === item.currentRecipeId);
  const sourceLines = item.provenance.map((p) =>
    `- ${p.sourceTitle}${p.sourceChannel ? ` (${p.sourceChannel})` : ''}: ${p.rightsBasis}. ${p.sourceUrl}`);
  const description = assertWholeName([
    `${item.title}, from ${FULL_NAME}.`,
    '',
    `Sources and rights:`,
    ...(sourceLines.length > 0 ? sourceLines : ['- pending: no provenance recorded']),
    '',
    recipe ? `Mix recipe: ${recipe.mixRecipeId} (fingerprint ${recipe.mixRecipeFingerprint}).` : 'Mix recipe: pending.',
  ].join('\n'));

  // Real timings only: each source gets a start only when the item's duration is known to split on.
  const duration = input.durationSec && input.durationSec > 0 ? input.durationSec : null;
  const chapters = item.provenance.map((p, i) => ({
    title: p.sourceTitle,
    startSec: duration ? Math.round((duration / item.provenance.length) * i) : null,
  }));
  const timed = chapters.length >= 3 && chapters.every((c) => c.startSec !== null)
    && chapters.every((c, i) => i === 0 || c.startSec! - chapters[i - 1].startSec! >= 10);
  const chaptersTxt = timed
    ? chapters.map((c) => `${mmss(c.startSec!)} ${c.title}`).join('\n')
    : '';

  const zones = SAFE_ZONE_PRESETS['safe-16x9'].safeZones.map((z) => `- ${z.label}: x ${z.x}, y ${z.y}, w ${z.width}, h ${z.height}`);
  const thumbnailBrief = assertWholeName([
    `# Thumbnail brief: ${item.title}`,
    '',
    `Mark: the circular ${FULL_NAME} infinity loop. Joy, appreciation and life; measure the frame against that.`,
    'Frame: a still from the approved render. No faces of the host, no vlog framing, no engagement bait, no outcome claims.',
    'Text: the whole name or the item title only. Never abbreviate the name.',
    'Size: 1280x720, YouTube 16:9 safe zones:',
    ...zones,
    '',
    'Status: brief only; the image is made and chosen at the curation gate.',
  ].join('\n'));

  const files: PackContentsFiles = {
    'title.txt': title,
    'description.txt': description,
    'chapters.txt': chaptersTxt,
    'thumbnail-brief.md': thumbnailBrief,
    'patrons.json': JSON.stringify(input.patrons ?? patronsPointerFromEnv(), null, 2),
  };
  const hasCaptions = !!input.transcript && input.transcript.length > 0;
  if (hasCaptions) files['captions.srt'] = toSrt(input.transcript!);

  files['contents.json'] = JSON.stringify({
    schemaVersion: 1,
    packId: input.packId,
    curation: { batchJobId: input.batchJobId, itemIndex: item.index },
    title,
    chapters: { status: timed ? 'timed' : 'pending-timings', entries: chapters },
    captions: { status: hasCaptions ? 'written' : 'awaiting-transcript', file: hasCaptions ? 'captions.srt' : null },
    thumbnail: { status: 'brief-only', file: 'thumbnail-brief.md' },
    patrons: { file: 'patrons.json' },
    files: Object.keys(files).sort(),
  }, null, 2);
  return files;
}

export function packContentsPrefix(packId: string): string {
  return `${PACK_CONTENTS_PREFIX}/${packId}/`;
}

/** Writes the files under creator/pack-contents/<packId>/; an existing contents.json means it is already done. */
export async function writePackContents(packId: string, files: PackContentsFiles): Promise<{ written: boolean; keys: string[] }> {
  const storage = getStorageAdapter();
  const prefix = packContentsPrefix(packId);
  if (await storage.get(`${prefix}contents.json`)) return { written: false, keys: [] };
  const keys: string[] = [];
  for (const [name, body] of Object.entries(files)) {
    if (name === 'contents.json') continue;
    await storage.put(`${prefix}${name}`, Buffer.from(body, 'utf8'), { contentType: name.endsWith('.json') ? 'application/json' : 'text/plain' });
    keys.push(`${prefix}${name}`);
  }
  // Last, so a half-written folder is retried on the next sweep.
  await storage.put(`${prefix}contents.json`, Buffer.from(files['contents.json'], 'utf8'), { contentType: 'application/json' });
  keys.push(`${prefix}contents.json`);
  return { written: true, keys };
}

export async function readTranscript(assetId: string | undefined): Promise<TranscriptLine[] | null> {
  if (!assetId) return null;
  const buf = await getStorageAdapter().get(`assets/${assetId}/transcript.json`);
  if (!buf) return null;
  try {
    const parsed = JSON.parse(buf.toString('utf8'));
    return Array.isArray(parsed) ? parsed.filter((l) => typeof l?.text === 'string' && l.endSec > l.startSec) : null;
  } catch { return null; }
}
