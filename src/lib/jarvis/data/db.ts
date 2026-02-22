/**
 * Jarvis Life OS Data - Database Client
 *
 * Reuses the same Turso/libsql connection as the memory system.
 * Both memory and data schemas share the same SQLite database.
 *
 * Phase M1: Local Canonical Data Model
 */

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as dataSchema from './schema';
import * as memorySchema from '../memory/schema';

// Combined schema for both memory and data tables
const combinedSchema = { ...memorySchema, ...dataSchema };

// Lazy singleton
let _client: Client | null = null;
let _db: LibSQLDatabase<typeof combinedSchema> | null = null;

/**
 * Get database client with both memory and data schemas
 */
export function getDataDb(): LibSQLDatabase<typeof combinedSchema> {
  if (_db) return _db;

  const dbUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }

  _client = createClient({ url: dbUrl, authToken });
  _db = drizzle(_client, { schema: combinedSchema });
  return _db;
}
