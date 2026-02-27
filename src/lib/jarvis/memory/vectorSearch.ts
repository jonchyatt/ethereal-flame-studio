/**
 * Vector Search + Dual Retrieval for Jarvis Memory
 *
 * Combines BM25 keyword search with vector semantic search using
 * Reciprocal Rank Fusion (RRF) for best-of-both-worlds retrieval.
 *
 * Graceful degradation: falls back to BM25-only when vector search unavailable.
 */

import { sql } from 'drizzle-orm';
import { getDb } from './db';
import {
  ensureEmbeddingsTable,
  generateEmbedding,
  isVectorSearchAvailable,
  backfillEmbeddings,
} from './embeddings';
import {
  bm25FindMemories,
  getMemoryEntryById,
} from './queries/memoryEntries';
import type { MemoryEntry } from './schema';

/**
 * Search memory embeddings using vector similarity.
 * Returns memory IDs with distance scores (lower = more similar).
 */
export async function vectorSearch(
  query: string,
  limit = 10
): Promise<Array<{ memoryId: number; distance: number }>> {
  if (!isVectorSearchAvailable()) return [];

  try {
    await ensureEmbeddingsTable();

    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return [];

    const db = getDb();
    const embeddingJson = JSON.stringify(queryEmbedding);

    const results = await db.all(
      sql.raw(
        `SELECT memory_id, distance FROM vector_top_k('memory_embeddings_idx', vector32('${embeddingJson}'), ${limit}) JOIN memory_embeddings ON memory_embeddings.rowid = id`
      )
    ) as Array<{ memory_id: number; distance: number }>;

    return results.map(r => ({
      memoryId: r.memory_id,
      distance: r.distance,
    }));
  } catch (err) {
    console.error('[Memory] Vector search error:', err);
    return [];
  }
}

/**
 * Dual search: BM25 + vector with Reciprocal Rank Fusion.
 *
 * Runs both retrieval methods in parallel, merges results using RRF,
 * and returns the top entries ranked by fused score.
 *
 * Falls back to BM25-only when vector search is unavailable or returns empty.
 */
export async function dualSearch(
  query: string,
  limit = 5
): Promise<MemoryEntry[]> {
  const fetchLimit = limit * 2;

  // Run both searches in parallel
  const [bm25Results, vectorResults] = await Promise.all([
    bm25FindMemories(query, fetchLimit),
    vectorSearch(query, fetchLimit),
  ]);

  // If vector search returned nothing, use BM25-only
  if (vectorResults.length === 0) {
    return bm25Results.slice(0, limit);
  }

  // Reciprocal Rank Fusion (k = 60, standard constant)
  const k = 60;
  const fusedScores = new Map<number, number>();

  // Score BM25 results (already ranked by relevance)
  for (let rank = 0; rank < bm25Results.length; rank++) {
    const id = bm25Results[rank].id;
    const score = 1 / (k + rank + 1);
    fusedScores.set(id, (fusedScores.get(id) || 0) + score);
  }

  // Score vector results (already ranked by distance)
  for (let rank = 0; rank < vectorResults.length; rank++) {
    const id = vectorResults[rank].memoryId;
    const score = 1 / (k + rank + 1);
    fusedScores.set(id, (fusedScores.get(id) || 0) + score);
  }

  // Sort by fused score descending
  const ranked = Array.from(fusedScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  // Fetch full MemoryEntry for each result
  // First check if we already have them from BM25 results
  const bm25Map = new Map(bm25Results.map(e => [e.id, e]));
  const entries: MemoryEntry[] = [];

  for (const [id] of ranked) {
    const cached = bm25Map.get(id);
    if (cached) {
      entries.push(cached);
    } else {
      // Fetch from DB (vector-only results not in BM25 set)
      const entry = await getMemoryEntryById(id);
      if (entry && !entry.deletedAt) {
        entries.push(entry);
      }
    }
  }

  // Trigger lazy backfill if vector search returned fewer results than expected
  if (vectorResults.length < Math.min(fetchLimit, 3)) {
    backfillEmbeddings().catch(err =>
      console.error('[Memory] Background backfill failed:', err)
    );
  }

  return entries;
}
