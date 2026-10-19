import type { StorageAdapter } from '@/lib/storage';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getMerch, listMerch } from '../catalog';
import { readCounts, recordTap } from '../notify';

function memoryStorage(): StorageAdapter & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    put: async (k: string, d: Buffer | Uint8Array) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)),
  } as unknown as StorageAdapter & { files: Map<string, Buffer> };
}

test('lists only repo-drawn products, each with a mockup on disk and no price', () => {
  const items = listMerch();
  expect(items.length).toBeGreaterThan(0);
  expect(items.find((p) => p.slug.startsWith('psychedelic-spiral'))).toBeUndefined();
  for (const p of items) {
    expect(existsSync(join(process.cwd(), 'public', p.image))).toBe(true);
    expect(JSON.stringify(p)).not.toMatch(/price|\$\d|WAIA/);
    expect(p.name).toMatch(/^What Am I Appreciating Now /);
  }
  expect(getMerch('circle-shirt')?.sizes).toEqual(['S', 'M', 'L', 'XL', '2XL']);
  expect(getMerch('circle-mug')?.sizes).toEqual([]);
  expect(getMerch('nope')).toBeUndefined();
});

test('a tap adds to the product and size counts and stores nothing else', async () => {
  const s = memoryStorage();
  expect(await recordTap(s, { slug: 'circle-shirt', size: 'M' })).toEqual({ ok: true, total: 1 });
  expect(await recordTap(s, { slug: 'circle-shirt', size: 'M' })).toEqual({ ok: true, total: 2 });
  expect(await recordTap(s, { slug: 'circle-shirt' })).toEqual({ ok: true, total: 3 });
  expect(await readCounts(s, 'circle-shirt')).toEqual({ total: 3, sizes: { M: 2 } });
  expect([...s.files.keys()]).toEqual(['merch/notify/circle-shirt.json']);
});

test('unknown products, held-back products, bad sizes and extra fields are rejected without writing', async () => {
  const s = memoryStorage();
  expect((await recordTap(s, { slug: 'nope' })).ok).toBe(false);
  expect((await recordTap(s, { slug: 'psychedelic-spiral-shirt' })).ok).toBe(false);
  expect((await recordTap(s, { slug: 'circle-shirt', size: 'XXL' })).ok).toBe(false);
  expect((await recordTap(s, { slug: 'circle-mug', size: 'M' })).ok).toBe(false);
  expect((await recordTap(s, { slug: 'circle-shirt', email: 'a@b.co' })).ok).toBe(false);
  expect((await recordTap(s, null)).ok).toBe(false);
  expect(s.files.size).toBe(0);
});
