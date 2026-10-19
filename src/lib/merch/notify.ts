import type { StorageAdapter } from '@/lib/storage';
import { getMerch } from './catalog';

/**
 * "Notify me" tap counter. It only counts: no email, no name, no IP, no cookie is read or stored.
 * One small JSON file per product in private storage: { total, sizes: { M: 3 } }.
 */
export interface NotifyCounts {
  total: number;
  sizes: Record<string, number>;
}

const key = (slug: string) => `merch/notify/${slug}.json`;

export async function readCounts(storage: StorageAdapter, slug: string): Promise<NotifyCounts> {
  const buf = await storage.get(key(slug));
  if (!buf) return { total: 0, sizes: {} };
  const parsed = JSON.parse(buf.toString('utf8')) as NotifyCounts;
  return { total: parsed.total ?? 0, sizes: parsed.sizes ?? {} };
}

export type TapResult = { ok: true; total: number } | { ok: false; status: number; error: string };

/** Unknown products and sizes are rejected, so the counter cannot be filled with free text. */
export async function recordTap(storage: StorageAdapter, input: unknown): Promise<TapResult> {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const extra = Object.keys(body).filter((k) => k !== 'slug' && k !== 'size');
  if (extra.length) return { ok: false, status: 400, error: 'Only a product and a size can be sent' };
  const product = typeof body.slug === 'string' ? getMerch(body.slug) : undefined;
  if (!product) return { ok: false, status: 404, error: 'Unknown product' };
  let size: string | undefined;
  if (body.size !== undefined && body.size !== null && body.size !== '') {
    if (typeof body.size !== 'string' || !product.sizes.includes(body.size)) return { ok: false, status: 400, error: 'Unknown size' };
    size = body.size;
  }
  const counts = await readCounts(storage, product.slug);
  counts.total += 1;
  if (size) counts.sizes[size] = (counts.sizes[size] ?? 0) + 1;
  await storage.put(key(product.slug), Buffer.from(JSON.stringify(counts, null, 2)), { contentType: 'application/json' });
  return { ok: true, total: counts.total };
}
