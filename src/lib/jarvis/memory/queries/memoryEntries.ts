/**
 * Memory Entries Query Functions
 *
 * CRUD operations for memory_entries table with hash-based deduplication.
 * Facts that help Jarvis do its job (briefings, nudges, check-ins).
 */

import { createHash } from 'crypto';
import { eq, desc, and } from 'drizzle-orm';
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
 * If identical content (by hash) exists:
 * - Updates lastAccessed timestamp
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

  // Check for existing entry with same hash
  const existing = await db
    .select()
    .from(memoryEntries)
    .where(eq(memoryEntries.contentHash, contentHash))
    .limit(1);

  if (existing.length > 0) {
    // Silent update: just update lastAccessed
    await db
      .update(memoryEntries)
      .set({ lastAccessed: now })
      .where(eq(memoryEntries.id, existing[0].id));

    return { ...existing[0], lastAccessed: now };
  }

  // Create new entry
  const inserted = await db
    .insert(memoryEntries)
    .values({
      content,
      contentHash,
      category,
      source,
      lastAccessed: now,
    })
    .returning();

  return inserted[0];
}

/**
 * Get all memory entries, ordered by lastAccessed (most recent first).
 *
 * @param limit - Maximum entries to return (default 100)
 * @returns Array of memory entries
 */
export async function getMemoryEntries(limit = 100): Promise<MemoryEntry[]> {
  return db
    .select()
    .from(memoryEntries)
    .orderBy(desc(memoryEntries.lastAccessed))
    .limit(limit);
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
 *
 * @param category - 'preference' | 'fact' | 'pattern'
 * @param limit - Maximum entries to return (default 50)
 * @returns Array of memory entries in category
 */
export async function getEntriesByCategory(
  category: MemoryCategory,
  limit = 50
): Promise<MemoryEntry[]> {
  return db
    .select()
    .from(memoryEntries)
    .where(eq(memoryEntries.category, category))
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
 * Delete a memory entry.
 *
 * @param id - Entry ID
 */
export async function deleteMemoryEntry(id: number): Promise<void> {
  await db.delete(memoryEntries).where(eq(memoryEntries.id, id));
}
