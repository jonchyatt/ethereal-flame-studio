/**
 * Jarvis Memory System - Database Client
 *
 * Singleton pattern prevents connection exhaustion in serverless.
 * Uses @libsql/client for both local (turso dev) and production (Turso cloud).
 *
 * Environment:
 * - Development: DATABASE_URL=http://127.0.0.1:8080 (turso dev)
 * - Production: DATABASE_URL=libsql://jarvis-xxx.turso.io + DATABASE_AUTH_TOKEN
 *
 * NOTE: Lazy initialization to prevent build-time failures on Vercel.
 */

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Lazy singleton
let _client: Client | null = null;
let _db: LibSQLDatabase<typeof schema> | null = null;

/**
 * Get database client - lazy initialization
 */
export function getDb(): LibSQLDatabase<typeof schema> {
  if (_db) {
    return _db;
  }

  const dbUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  console.log('[DB] Initializing with URL:', dbUrl ? `${dbUrl.substring(0, 30)}...` : 'NOT SET');
  console.log('[DB] Auth token:', authToken ? 'SET' : 'NOT SET');

  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL not set. For local dev: http://127.0.0.1:8080 (run turso dev). ' +
      'For production: libsql://jarvis-xxx.turso.io'
    );
  }

  try {
    _client = createClient({
      url: dbUrl,
      authToken: authToken,
    });
    console.log('[DB] Client created successfully');
  } catch (err) {
    console.error('[DB] createClient failed:', err);
    throw err;
  }

  _db = drizzle(_client, { schema });
  return _db;
}

// For backwards compatibility, export db as a getter
// This allows `import { db } from './db'` to work, but lazily
export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Re-export schema types for convenience
export * from './schema';
