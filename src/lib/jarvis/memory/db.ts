/**
 * Jarvis Memory System - Database Client
 *
 * Singleton pattern prevents connection exhaustion in serverless.
 * Uses @libsql/client for both local (turso dev) and production (Turso cloud).
 *
 * Environment:
 * - Development: DATABASE_URL=http://127.0.0.1:8080 (turso dev)
 * - Production: DATABASE_URL=libsql://jarvis-xxx.turso.io + DATABASE_AUTH_TOKEN
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Validate environment
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL not set. For local dev: http://127.0.0.1:8080 (run turso dev). ' +
    'For production: libsql://jarvis-xxx.turso.io'
  );
}

// Create libsql client (singleton)
const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN, // undefined OK for local dev
});

// Export typed Drizzle instance
export const db = drizzle(client, { schema });

// Re-export schema types for convenience
export * from './schema';
