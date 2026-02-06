/**
 * Database connection and query functions for render metadata.
 * Uses better-sqlite3 for synchronous operations - faster and simpler than async.
 *
 * NOTE: This module is for LOCAL render worker only, not Vercel deployment.
 * The import is dynamic to prevent build failures on serverless platforms.
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { SCHEMA, Render, NewRender, RenderUpdate } from './schema';

// Type for better-sqlite3 Database (dynamic import)
type BetterSqlite3Database = {
  pragma: (sql: string) => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => void;
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
  };
  close: () => void;
};

// Ensure data directory exists (only when actually used)
function ensureDataDir(): string {
  const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  return DATA_DIR;
}

// Initialize database with lazy loading
let _db: BetterSqlite3Database | null = null;

function getDb(): BetterSqlite3Database {
  if (_db) {
    return _db;
  }

  // Dynamic import to avoid build-time failure on serverless
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const DATA_DIR = ensureDataDir();
  const DB_PATH = join(DATA_DIR, 'renders.db');
  const db: BetterSqlite3Database = new Database(DB_PATH);

  // Enable WAL mode for concurrent read safety
  db.pragma('journal_mode = WAL');

  // Run schema migration
  db.exec(SCHEMA);

  console.log('[DB] Initialized at', DB_PATH);
  _db = db;
  return db;
}

/**
 * Generate a UUID for new records.
 */
function generateId(): string {
  // Using crypto.randomUUID if available, fallback to timestamp-based
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Insert a new render record.
 */
export function insertRender(render: NewRender): Render {
  const db = getDb();
  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO renders (id, batch_id, audio_name, audio_path, template, output_format)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    render.batch_id || null,
    render.audio_name,
    render.audio_path,
    render.template,
    render.output_format
  );

  return getRenderById(id)!;
}

/**
 * Update an existing render record.
 */
export function updateRender(id: string, updates: RenderUpdate): void {
  const db = getDb();

  const fields = Object.keys(updates);
  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);

  const stmt = db.prepare(`UPDATE renders SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
}

/**
 * Get a render by ID.
 */
export function getRenderById(id: string): Render | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM renders WHERE id = ?');
  return stmt.get(id) as Render | null;
}

/**
 * Get all renders for a batch.
 */
export function getRendersByBatch(batchId: string): Render[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM renders WHERE batch_id = ? ORDER BY created_at');
  return stmt.all(batchId) as Render[];
}

/**
 * Get renders by status.
 */
export function getRendersByStatus(status: Render['status']): Render[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM renders WHERE status = ? ORDER BY created_at');
  return stmt.all(status) as Render[];
}

/**
 * Get recent renders.
 */
export function getRecentRenders(limit: number = 100): Render[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM renders ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit) as Render[];
}

/**
 * Close database connection (for graceful shutdown).
 */
export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
    console.log('[DB] Connection closed');
  }
}

// Export the database instance for advanced queries
export { getDb as db };

// Re-export types
export type { Render, NewRender, RenderUpdate } from './schema';
