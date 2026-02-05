/**
 * Memory Entries Query Functions
 *
 * CRUD operations for memory_entries table with hash-based deduplication.
 * Facts that help Jarvis do its job (briefings, nudges, check-ins).
 */

import { createHash } from 'crypto';
import { eq, desc, and, isNull, isNotNull, gte } from 'drizzle-orm';
import { db } from '../db';
import { memoryEntries, type MemoryEntry, type NewMemoryEntry } from '../schema';

// Category and source type unions (matches schema comments)
export type MemoryCategory = 'preference' | 'fact' | 'pattern';
export type MemorySource = 'user_explicit' | 'jarvis_inferred';

/**
 * Normalize content for consistent hashing.
 * - Trim whitespace
 * - Lowercase
 * - Collapse multiple spaces
 * - Remove punctuation that doesn't change meaning
 */
export function normalizeContent(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, ''); // Remove trailing punctuation
}

/**
 * Hash normalized content using SHA-256.
 * Returns hex string for storage.
 */
export function hashContent(content: string): string {
  const normalized = normalizeContent(content);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Store a memory entry with deduplication.
 *
 * Uses atomic upsert (INSERT ... ON CONFLICT DO UPDATE) to handle race conditions.
 * If identical content (by hash) exists:
 * - Updates lastAccessed timestamp atomically
 * - Returns existing entry (no duplicate created)
 *
 * If new content:
 * - Creates new entry with hash
 * - Returns new entry
 *
 * @param content - The fact to store
 * @param category - 'preference' | 'fact' | 'pattern'
 * @param source - 'user_explicit' | 'jarvis_inferred'
 * @returns The entry (existing or new)
 */
export async function storeMemoryEntry(
  content: string,
  category: MemoryCategory,
  source: MemorySource
): Promise<MemoryEntry> {
  const contentHash = hashContent(content);
  const now = new Date().toISOString();

  // Atomic upsert: insert new entry or update lastAccessed if contentHash exists
  // This prevents race conditions where concurrent requests could both try to insert
  const result = await db
    .insert(memoryEntries)
    .values({
      content,
      contentHash,
      category,
      source,
      lastAccessed: now,
    })
    .onConflictDoUpdate({
      target: memoryEntries.contentHash,
      set: { lastAccessed: now },
    })
    .returning();

  return result[0];
}

/**
 * Get all memory entries, ordered by lastAccessed (most recent first).
 * By default, excludes soft-deleted entries.
 *
 * @param limit - Maximum entries to return (default 100)
 * @param includeDeleted - Whether to include soft-deleted entries (default false)
 * @returns Array of memory entries
 */
export async function getMemoryEntries(
  limit = 100,
  includeDeleted = false
): Promise<MemoryEntry[]> {
  const query = db
    .select()
    .from(memoryEntries)
    .orderBy(desc(memoryEntries.lastAccessed))
    .limit(limit);

  if (!includeDeleted) {
    return query.where(isNull(memoryEntries.deletedAt));
  }

  return query;
}

/**
 * Update lastAccessed timestamp for an entry.
 * Call this when a fact is used in a briefing/nudge/check-in.
 *
 * @param id - Entry ID
 */
export async function updateLastAccessed(id: number): Promise<void> {
  await db
    .update(memoryEntries)
    .set({ lastAccessed: new Date().toISOString() })
    .where(eq(memoryEntries.id, id));
}

/**
 * Get entries by category.
 * By default, excludes soft-deleted entries.
 *
 * @param category - 'preference' | 'fact' | 'pattern'
 * @param limit - Maximum entries to return (default 50)
 * @param includeDeleted - Whether to include soft-deleted entries (default false)
 * @returns Array of memory entries in category
 */
export async function getEntriesByCategory(
  category: MemoryCategory,
  limit = 50,
  includeDeleted = false
): Promise<MemoryEntry[]> {
  const baseCondition = eq(memoryEntries.category, category);
  const condition = includeDeleted
    ? baseCondition
    : and(baseCondition, isNull(memoryEntries.deletedAt));

  return db
    .select()
    .from(memoryEntries)
    .where(condition)
    .orderBy(desc(memoryEntries.lastAccessed))
    .limit(limit);
}

/**
 * Get entry by ID.
 *
 * @param id - Entry ID
 * @returns Entry or undefined
 */
export async function getMemoryEntryById(id: number): Promise<MemoryEntry | undefined> {
  const results = await db
    .select()
    .from(memoryEntries)
    .where(eq(memoryEntries.id, id))
    .limit(1);

  return results[0];
}

/**
 * Delete a memory entry (hard delete).
 *
 * @param id - Entry ID
 */
export async function deleteMemoryEntry(id: number): Promise<void> {
  await db.delete(memoryEntries).where(eq(memoryEntries.id, id));
}

/**
 * Soft delete a memory entry.
 * Sets deletedAt to current timestamp - entry can be restored within 30 days.
 *
 * @param id - Entry ID
 * @returns The updated entry, or undefined if not found
 */
export async function softDeleteMemoryEntry(id: number): Promise<MemoryEntry | undefined> {
  const now = new Date().toISOString();

  const result = await db
    .update(memoryEntries)
    .set({ deletedAt: now })
    .where(eq(memoryEntries.id, id))
    .returning();

  return result[0];
}

/**
 * Restore a soft-deleted memory entry.
 * Clears the deletedAt timestamp.
 *
 * @param id - Entry ID
 * @returns The restored entry, or undefined if not found
 */
export async function restoreMemoryEntry(id: number): Promise<MemoryEntry | undefined> {
  const result = await db
    .update(memoryEntries)
    .set({ deletedAt: null })
    .where(eq(memoryEntries.id, id))
    .returning();

  return result[0];
}

/**
 * Get recently deleted memories (within last 30 days).
 * Ordered by deletion time (most recently deleted first).
 *
 * @param limit - Maximum entries to return (default 50)
 * @returns Array of soft-deleted memory entries
 */
export async function getDeletedMemories(limit = 50): Promise<MemoryEntry[]> {
  // Calculate cutoff date (30 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffISO = cutoffDate.toISOString();

  return db
    .select()
    .from(memoryEntries)
    .where(
      and(
        isNotNull(memoryEntries.deletedAt),
        gte(memoryEntries.deletedAt, cutoffISO)
      )
    )
    .orderBy(desc(memoryEntries.deletedAt))
    .limit(limit);
}

/**
 * Tokenize text for BM25 scoring.
 * Lowercase, remove punctuation, split on whitespace, filter short tokens.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
}

/**
 * BM25 Okapi score for a single document against a query.
 * Standard ranking function: TF saturation + IDF + length normalization.
 */
function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLen: number,
  docCount: number,
  docFreqs: Map<string, number>,
  k1 = 1.5,
  b = 0.75
): number {
  let score = 0;
  const docLen = docTokens.length;
  const termCounts = new Map<string, number>();
  for (const token of docTokens) {
    termCounts.set(token, (termCounts.get(token) || 0) + 1);
  }
  for (const term of queryTokens) {
    const tf = termCounts.get(term) || 0;
    if (tf === 0) continue;
    const df = docFreqs.get(term) || 1;
    const idf = Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
    score += idf * (numerator / denominator);
  }
  return score;
}

/**
 * Find memories matching a natural language query using BM25 ranking.
 * Used for "forget" requests to find the memory the user wants to delete.
 *
 * BM25 provides much better ranking than simple word overlap:
 * - Rare terms score higher (IDF)
 * - Term frequency saturates (diminishing returns for repeated terms)
 * - Document length is normalized (short, focused entries aren't penalized)
 *
 * @param query - Natural language search query
 * @param limit - Maximum matches to return (default 5)
 * @returns Array of matching memory entries, sorted by relevance
 */
export async function findMemoriesMatching(
  query: string,
  limit = 5
): Promise<MemoryEntry[]> {
  const queryTokens = tokenize(normalizeContent(query));

  if (queryTokens.length === 0) {
    return [];
  }

  // Get all active entries
  const allEntries = await getMemoryEntries(500);
  if (allEntries.length === 0) return [];

  // Tokenize all documents and compute corpus stats
  const docTokensList = allEntries.map(entry => tokenize(normalizeContent(entry.content)));
  const docCount = docTokensList.length;
  const avgDocLen = docTokensList.reduce((sum, tokens) => sum + tokens.length, 0) / docCount;

  // Compute document frequencies for each query term
  const docFreqs = new Map<string, number>();
  for (const term of queryTokens) {
    let count = 0;
    for (const docTokens of docTokensList) {
      if (docTokens.includes(term)) count++;
    }
    docFreqs.set(term, count);
  }

  // Score each entry
  const scored = allEntries.map((entry, i) => ({
    entry,
    score: bm25Score(queryTokens, docTokensList[i], avgDocLen, docCount, docFreqs),
  }));

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);
}
