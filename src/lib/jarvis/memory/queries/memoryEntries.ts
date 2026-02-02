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
