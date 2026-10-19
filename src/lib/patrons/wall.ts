import type { StorageAdapter } from '@/lib/storage';
import { buildPatronsFile, listIntake } from './intake';
import { buildPatronRenderList, hashPatronRenderList, PATRON_RENDER_LIST_VERSION, type PatronRenderList } from './renderList';
import { patronsFileSchema } from './schema';
import { moderatePatron } from './moderation';

/**
 * The public /patrons wall shows a frozen published snapshot, never the live intake list.
 * Jonathan's operator call publishes it from approved intake records; it lives in private
 * storage (`patrons/wall/published.json`), not in this repo. Fail closed: anything that does
 * not verify renders as an empty wall.
 */
export const WALL_KEY = 'patrons/wall/published.json';

export interface PublishedWall {
  publishedAt: string;
  hash: string;
  list: PatronRenderList;
}

export async function publishWallSnapshot(storage: StorageAdapter, now = new Date()): Promise<PublishedWall> {
  const records = await listIntake(storage);
  const list = buildPatronRenderList(buildPatronsFile(records));
  const wall: PublishedWall = { publishedAt: now.toISOString(), hash: hashPatronRenderList(list), list };
  await storage.put(WALL_KEY, Buffer.from(JSON.stringify(wall, null, 2)), { contentType: 'application/json' });
  return wall;
}

/**
 * What the public page may show: the published snapshot, re-checked against moderation and its
 * hash, and minus anyone whose intake record now has a removal request or is no longer approved.
 * An entry with no matching intake record is hidden (its consent cannot be shown to still stand).
 */
export async function readPublicWall(storage: StorageAdapter): Promise<{ publishedAt: string | null; patrons: PatronRenderList['patrons'] }> {
  const empty = { publishedAt: null, patrons: [] };
  const bytes = await storage.get(WALL_KEY);
  if (!bytes) return empty;
  let wall: PublishedWall;
  try {
    wall = JSON.parse(bytes.toString('utf8')) as PublishedWall;
  } catch {
    return empty;
  }
  const list = wall?.list;
  if (!list || list.schemaVersion !== PATRON_RENDER_LIST_VERSION || !Array.isArray(list.patrons)) return empty;
  if (hashPatronRenderList(list) !== wall.hash) return empty;
  const parsed = patronsFileSchema.safeParse(list.patrons.map((p) => ({ ...p, since: '1970-01-01', approved: true })));
  if (!parsed.success) return empty;
  const records = new Map((await listIntake(storage)).map((r) => [r.consentRef, r]));
  const patrons = parsed.data
    .filter((p) => moderatePatron(p).ok)
    .filter((p) => {
      const rec = records.get(p.consentRef);
      return !!rec && rec.status === 'approved' && !rec.removalRequestedAt;
    })
    .map((p) => ({ displayName: p.displayName, ...(p.message ? { message: p.message } : {}), tier: p.tier, consentRef: p.consentRef }));
  return { publishedAt: wall.publishedAt, patrons };
}
