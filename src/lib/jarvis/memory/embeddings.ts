/**
 * Vector Embedding Infrastructure for Jarvis Memory
 *
 * Uses OpenAI text-embedding-3-small for semantic search alongside existing BM25.
 * Managed via raw SQL (not Drizzle) — memory_embeddings table with F32_BLOB column.
 *
 * Graceful degradation: all functions return null/empty/skip when OPENAI_API_KEY not set.
 */

import type OpenAI from 'openai';
import { getDb } from './db';
import { getJarvisConfig } from '../config';
import { getMemoryEntries, normalizeContent } from './queries/memoryEntries';
import { sql } from 'drizzle-orm';

// Lazy singleton — prevents build-time failures on Vercel
let _openai: OpenAI | null = null;
let _tableEnsured = false;

function getOpenAIClient(): OpenAI | null {
  if (_openai) return _openai;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Dynamic import at runtime to avoid bundling issues
  const { default: OpenAIClient } = require('openai') as { default: typeof OpenAI };
  _openai = new OpenAIClient({ apiKey });
  return _openai;
}

/**
 * Check if vector search is available (API key set + feature enabled).
 */
export function isVectorSearchAvailable(): boolean {
  const config = getJarvisConfig();
  return config.enableVectorMemory && !!process.env.OPENAI_API_KEY;
}

/**
 * Ensure the memory_embeddings table and vector index exist.
 * Idempotent — uses IF NOT EXISTS. Cached after first successful call.
 */
export async function ensureEmbeddingsTable(): Promise<void> {
  if (_tableEnsured) return;

  const db = getDb();

  await db.run(sql.raw(`
    CREATE TABLE IF NOT EXISTS memory_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_id INTEGER NOT NULL UNIQUE,
      embedding F32_BLOB(1536) NOT NULL
    )
  `));

  await db.run(sql.raw(`
    CREATE INDEX IF NOT EXISTS memory_embeddings_idx
    ON memory_embeddings(libsql_vector_idx(embedding))
  `));

  _tableEnsured = true;
}

/**
 * Generate an embedding for text using OpenAI text-embedding-3-small.
 * Returns null if API key not set, feature disabled, or API error.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!isVectorSearchAvailable()) return null;

  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const normalized = normalizeContent(text);
    if (!normalized) return null;

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: normalized,
    });

    return response.data[0].embedding;
  } catch (err) {
    console.error('[Memory] Embedding generation error:', err);
    return null;
  }
}

/**
 * Store an embedding for a memory entry.
 * Uses INSERT OR REPLACE to handle re-embeds gracefully.
 */
export async function storeEmbedding(memoryId: number, embedding: number[]): Promise<void> {
  await ensureEmbeddingsTable();
  const db = getDb();
  const embeddingJson = JSON.stringify(embedding);

  await db.run(
    sql.raw(`INSERT OR REPLACE INTO memory_embeddings (memory_id, embedding) VALUES (${memoryId}, vector32('${embeddingJson}'))`)
  );
}

/**
 * Delete an embedding for a memory entry.
 */
export async function deleteEmbedding(memoryId: number): Promise<void> {
  if (!_tableEnsured) return; // Table may not exist yet — nothing to delete
  const db = getDb();
  await db.run(sql.raw(`DELETE FROM memory_embeddings WHERE memory_id = ${memoryId}`));
}

/**
 * Generate and store an embedding for a memory entry.
 * Helper used by fire-and-forget patterns in memoryEntries.ts.
 */
export async function generateAndStoreEmbedding(memoryId: number, content: string): Promise<void> {
  await ensureEmbeddingsTable();
  const embedding = await generateEmbedding(content);
  if (embedding) {
    await storeEmbedding(memoryId, embedding);
  }
}

/**
 * Backfill embeddings for memories that don't have them yet.
 * Processes up to 50 at a time to avoid API rate limits.
 * Returns stats for logging.
 */
export async function backfillEmbeddings(): Promise<{ total: number; processed: number; failed: number }> {
  if (!isVectorSearchAvailable()) {
    return { total: 0, processed: 0, failed: 0 };
  }

  await ensureEmbeddingsTable();
  const db = getDb();

  // Get all active memories
  const allEntries = await getMemoryEntries(500);

  // Find which ones lack embeddings
  const existingRows = await db.all(
    sql.raw('SELECT memory_id FROM memory_embeddings')
  ) as Array<{ memory_id: number }>;
  const existingIds = new Set(existingRows.map(r => r.memory_id));

  const missing = allEntries.filter(e => !existingIds.has(e.id));

  if (missing.length === 0) {
    return { total: allEntries.length, processed: 0, failed: 0 };
  }

  // Process up to 50 at a time
  const batch = missing.slice(0, 50);
  let processed = 0;
  let failed = 0;

  for (const entry of batch) {
    try {
      const embedding = await generateEmbedding(entry.content);
      if (embedding) {
        await storeEmbedding(entry.id, embedding);
        processed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`[Memory] Backfill failed for entry ${entry.id}:`, err);
      failed++;
    }
  }

  console.log(`[Memory] Backfill complete: ${processed} embedded, ${failed} failed, ${missing.length - batch.length} remaining`);
  return { total: allEntries.length, processed, failed };
}
