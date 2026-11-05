import { createHash, randomUUID } from 'crypto';
import { getStorageAdapter } from '@/lib/storage';
import type { Subscriber } from './schema';

/**
 * Subscribers live in the same storage adapter as patrons, merch taps and custom
 * orders (R2 in production), one JSON record per email:
 *   subscribers/by-email/<sha256(email)>.json   the record
 *   subscribers/by-token/<token>.json           { emailKey } for unsubscribe links
 * ponytail: dedup is read-then-write, so two simultaneous first sign-ups for one
 * address can race and the second overwrites the first with an identical record.
 * Harmless for a mailing list; move to a database with a unique index if it grows.
 */
const emailKey = (email: string) => `subscribers/by-email/${createHash('sha256').update(email).digest('hex')}.json`;
const tokenKey = (token: string) => `subscribers/by-token/${token.replace(/[^a-zA-Z0-9-]/g, '')}.json`;
const json = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2));
const putOpts = { contentType: 'application/json' };

export type NewSubscriber = {
  email: string;
  sourcePage: string;
  userAgent: string | null;
};

/** Inserts once; a repeat email changes nothing and reports created: false. */
export async function saveSubscriber(input: NewSubscriber): Promise<{ created: boolean }> {
  const storage = getStorageAdapter();
  const key = emailKey(input.email);
  if (await storage.exists(key)) return { created: false };

  const record: Subscriber = {
    id: randomUUID(),
    email: input.email,
    sourcePage: input.sourcePage,
    createdAt: new Date().toISOString(),
    userAgent: input.userAgent,
    optinToken: randomUUID(),
    unsubscribedAt: null,
  };
  await storage.put(key, json(record), putOpts);
  await storage.put(tokenKey(record.optinToken!), json({ emailKey: key }), putOpts);
  return { created: true };
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const storage = getStorageAdapter();
  const keys = (await storage.list('subscribers/by-email/')).filter((k) => k.endsWith('.json'));
  const rows = await Promise.all(
    keys.map(async (k) => {
      const buf = await storage.get(k.startsWith('subscribers/') ? k : `subscribers/by-email/${k}`);
      return buf ? (JSON.parse(buf.toString('utf8')) as Subscriber) : null;
    }),
  );
  return rows.filter((r): r is Subscriber => r !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Always safe to call: a stale or unknown token changes nothing. */
export async function unsubscribeByToken(token: string): Promise<void> {
  const storage = getStorageAdapter();
  const pointer = await storage.get(tokenKey(token));
  if (!pointer) return;
  const { emailKey: key } = JSON.parse(pointer.toString('utf8')) as { emailKey: string };
  const buf = await storage.get(key);
  if (!buf) return;
  const record = JSON.parse(buf.toString('utf8')) as Subscriber;
  if (record.unsubscribedAt) return;
  await storage.put(key, json({ ...record, unsubscribedAt: new Date().toISOString() }), putOpts);
}
