import { randomUUID } from 'crypto';
import { createClient, type Client } from '@libsql/client';
import { desc, eq, isNull } from 'drizzle-orm';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { subscribers, type Subscriber } from './schema';

const schema = { subscribers };

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;
let connectedUrl: string | null = null;

function getSubscriberDb(): LibSQLDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  if (db && connectedUrl === url) return db;

  client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  db = drizzle(client, { schema });
  connectedUrl = url;
  return db;
}

/** Lets unit tests change their local libsql database without retaining a prior connection. */
export function resetSubscriberDbForTests(): void {
  client?.close();
  client = null;
  db = null;
  connectedUrl = null;
}

export type NewSubscriber = {
  email: string;
  sourcePage: string;
  userAgent: string | null;
};

/**
 * Inserts once. The unique email index is the authoritative de-duplication
 * check, so concurrent requests also receive the same quiet success response.
 */
export async function saveSubscriber(input: NewSubscriber): Promise<{ created: boolean }> {
  const result = await getSubscriberDb()
    .insert(subscribers)
    .values({
      id: randomUUID(),
      email: input.email,
      sourcePage: input.sourcePage,
      userAgent: input.userAgent,
      optinToken: randomUUID(),
    })
    .onConflictDoNothing({ target: subscribers.email })
    .run();
  return { created: result.rowsAffected > 0 };
}

export async function listSubscribers(): Promise<Subscriber[]> {
  return getSubscriberDb().select().from(subscribers).orderBy(desc(subscribers.createdAt));
}

/** Always safe to call: a stale or unknown token changes nothing. */
export async function unsubscribeByToken(token: string): Promise<void> {
  await getSubscriberDb()
    .update(subscribers)
    .set({ unsubscribedAt: new Date().toISOString() })
    .where(isNull(subscribers.unsubscribedAt) && eq(subscribers.optinToken, token))
    .run();
}
