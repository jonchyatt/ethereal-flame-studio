import type { StorageAdapter } from '@/lib/storage';
import { listMerch } from '../catalog';
import { readCounts, recordTap } from '../notify';

// Nothing is public until a design is approved, so the tap tests use stand-in approved products.
const fake: Record<string, { slug: string; sizes: string[] }> = {
  'circle-shirt': { slug: 'circle-shirt', sizes: ['S', 'M', 'L', 'XL', '2XL'] },
  'circle-mug': { slug: 'circle-mug', sizes: [] },
};
jest.mock('../catalog', () => ({
  ...jest.requireActual('../catalog'),
  getMerch: (slug: string) => fake[slug],
}));

function memoryStorage(): StorageAdapter & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    put: async (k: string, d: Buffer | Uint8Array) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
    list: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)),
  } as unknown as StorageAdapter & { files: Map<string, Buffer> };
}

test('lists nothing until a design is approved: the declined mockups never appear', () => {
  expect(listMerch()).toEqual([]);
  expect(jest.requireActual('../catalog').getMerch('circle-shirt')).toBeUndefined();
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
