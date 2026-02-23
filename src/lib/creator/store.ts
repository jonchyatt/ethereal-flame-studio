import { getStorageAdapter } from '@/lib/storage';
import type { ContentLibraryItem, CreatorRenderPack } from './types';
import { ContentLibraryItemSchema, CreatorRenderPackSchema } from './types';

const PACKS_PREFIX = 'creator/packs';
const LIBRARY_PREFIX = 'creator/library';

function jsonKey(prefix: string, id: string): string {
  return `${prefix}/${id}.json`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const storage = getStorageAdapter();
  const buf = await storage.get(key);
  if (!buf) return null;
  return JSON.parse(buf.toString('utf8')) as T;
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const storage = getStorageAdapter();
  await storage.put(key, Buffer.from(JSON.stringify(value, null, 2)), {
    contentType: 'application/json',
  });
}

export async function saveCreatorRenderPack(pack: CreatorRenderPack): Promise<void> {
  const parsed = CreatorRenderPackSchema.parse(pack);
  await writeJson(jsonKey(PACKS_PREFIX, parsed.packId), parsed);
}

export async function updateCreatorRenderPack(
  packId: string,
  updater: (current: CreatorRenderPack) => CreatorRenderPack | Promise<CreatorRenderPack>,
): Promise<CreatorRenderPack> {
  const current = await getCreatorRenderPack(packId);
  if (!current) {
    throw new Error(`Creator render pack not found: ${packId}`);
  }
  const next = await updater(current);
  await saveCreatorRenderPack(next);
  return next;
}

export async function getCreatorRenderPack(packId: string): Promise<CreatorRenderPack | null> {
  const raw = await readJson<unknown>(jsonKey(PACKS_PREFIX, packId));
  if (!raw) return null;
  return CreatorRenderPackSchema.parse(raw);
}

export async function listCreatorRenderPacks(limit = 200): Promise<CreatorRenderPack[]> {
  const storage = getStorageAdapter();
  const keys = (await storage.list(`${PACKS_PREFIX}/`))
    .filter((k) => k.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);
  const items = await Promise.all(keys.map((key) => readJson<unknown>(key)));
  return items
    .filter((x): x is unknown => !!x)
    .map((x) => CreatorRenderPackSchema.parse(x));
}

export async function saveContentLibraryItem(item: ContentLibraryItem): Promise<void> {
  const parsed = ContentLibraryItemSchema.parse(item);
  await writeJson(jsonKey(LIBRARY_PREFIX, parsed.itemId), parsed);
}

export async function updateContentLibraryItem(
  itemId: string,
  updater: (current: ContentLibraryItem) => ContentLibraryItem | Promise<ContentLibraryItem>,
): Promise<ContentLibraryItem> {
  const current = await getContentLibraryItem(itemId);
  if (!current) {
    throw new Error(`Content library item not found: ${itemId}`);
  }
  const next = await updater(current);
  await saveContentLibraryItem(next);
  return next;
}

export async function getContentLibraryItem(itemId: string): Promise<ContentLibraryItem | null> {
  const raw = await readJson<unknown>(jsonKey(LIBRARY_PREFIX, itemId));
  if (!raw) return null;
  return ContentLibraryItemSchema.parse(raw);
}

export async function listContentLibraryItems(limit = 500): Promise<ContentLibraryItem[]> {
  const storage = getStorageAdapter();
  const keys = (await storage.list(`${LIBRARY_PREFIX}/`))
    .filter((k) => k.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);
  const items = await Promise.all(keys.map((key) => readJson<unknown>(key)));
  return items
    .filter((x): x is unknown => !!x)
    .map((x) => ContentLibraryItemSchema.parse(x));
}

export async function getContentLibraryItemByPackId(packId: string): Promise<ContentLibraryItem | null> {
  const items = await listContentLibraryItems(1000);
  return items.find((item) => item.packId === packId) || null;
}
