/**
 * Tool Executor for Memory Operations
 *
 * Routes Claude tool_use calls to memory database operations.
 * Handles all memory CRUD:
 * - remember_fact: Store new facts
 * - forget_fact: Find candidates or delete confirmed IDs
 * - list_memories: Categorized memory listing
 * - delete_all_memories: Full wipe (requires confirmation)
 * - restore_memory: Undo soft deletes
 */

import {
  storeMemoryEntry,
  getMemoryEntries,
  getDeletedMemories,
  softDeleteMemoryEntry,
  restoreMemoryEntry,
  findMemoriesMatching,
  getEntriesByCategory,
  type MemoryCategory,
  type MemorySource,
} from './queries/memoryEntries';
import { getDb, memoryEntries } from './db';

export type MemoryToolName =
  | 'remember_fact'
  | 'forget_fact'
  | 'list_memories'
  | 'delete_all_memories'
  | 'restore_memory';

/**
 * Execute a memory tool call.
 *
 * @param toolName - The Claude tool name
 * @param input - The tool input parameters from Claude
 * @returns JSON string with result
 */
export async function executeMemoryTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  console.log(`[MemoryToolExecutor] Executing tool: ${toolName}`, input);

  try {
    switch (toolName) {
      case 'remember_fact':
        return handleRememberFact(input);
      case 'forget_fact':
        return handleForgetFact(input);
      case 'list_memories':
        return handleListMemories(input);
      case 'delete_all_memories':
        return handleDeleteAll(input);
      case 'restore_memory':
        return handleRestore(input);
      default:
        return JSON.stringify({ error: `Unknown memory tool: ${toolName}` });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[MemoryToolExecutor] Error executing ${toolName}:`, error);
    return JSON.stringify({ error: errorMessage });
  }
}

// =============================================================================
// Handler Functions
// =============================================================================

/**
 * Handle remember_fact tool - store a new fact
 */
async function handleRememberFact(
  input: Record<string, unknown>
): Promise<string> {
  const content = input.content as string;
  const category = input.category as string;
  const source = (input.source as string) || 'user_explicit';

  if (!content) {
    return JSON.stringify({ error: 'content is required' });
  }
  if (!category) {
    return JSON.stringify({ error: 'category is required' });
  }

  // Map tool categories to DB categories
  // Tool uses: schedule, preference, person, work, health, other
  // DB uses: preference, fact, pattern
  const categoryMap: Record<string, MemoryCategory> = {
    schedule: 'fact',
    preference: 'preference',
    person: 'fact',
    work: 'fact',
    health: 'fact',
    other: 'fact',
  };
  const dbCategory = categoryMap[category] || 'fact';

  const entry = await storeMemoryEntry(
    content,
    dbCategory,
    source as MemorySource
  );

  return JSON.stringify({
    success: true,
    message: `Remembered: "${content}"`,
    entry: {
      id: entry.id,
      content: entry.content,
      category: entry.category,
      createdAt: entry.createdAt,
    },
  });
}

/**
 * Handle forget_fact tool - find candidates or delete confirmed IDs
 *
 * Two-phase flow:
 * 1. If no confirm_ids: Search and return candidates for user confirmation
 * 2. If confirm_ids: Delete those specific entries
 */
async function handleForgetFact(
  input: Record<string, unknown>
): Promise<string> {
  const query = input.query as string;
  const confirmIdsStr = input.confirm_ids as string | undefined;

  if (!query) {
    return JSON.stringify({ error: 'query is required' });
  }

  // Phase 2: Delete confirmed IDs
  if (confirmIdsStr) {
    const ids = confirmIdsStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (ids.length === 0) {
      return JSON.stringify({ error: 'No valid IDs provided in confirm_ids' });
    }

    const deleted: number[] = [];
    for (const id of ids) {
      const result = await softDeleteMemoryEntry(id);
      if (result) {
        deleted.push(id);
      }
    }

    return JSON.stringify({
      success: true,
      message: `Deleted ${deleted.length} memory(ies).`,
      deletedIds: deleted,
    });
  }

  // Phase 1: Find candidates
  const candidates = await findMemoriesMatching(query);

  if (candidates.length === 0) {
    return JSON.stringify({
      success: true,
      message: `I couldn't find any memories matching "${query}".`,
      candidates: [],
    });
  }

  return JSON.stringify({
    success: true,
    message: `Found ${candidates.length} matching memory(ies). Please confirm which to delete.`,
    candidates: candidates.map((c) => ({
      id: c.id,
      content: c.content,
      category: c.category,
      createdAt: c.createdAt,
    })),
    instruction:
      'To delete, call forget_fact again with confirm_ids set to the IDs you want to delete (comma-separated).',
  });
}

/**
 * Handle list_memories tool - return categorized list
 */
async function handleListMemories(
  input: Record<string, unknown>
): Promise<string> {
  const categoryFilter = (input.category as string) || 'all';
  const includeDeleted = input.include_deleted === 'true';

  let entries;
  if (categoryFilter === 'all') {
    entries = await getMemoryEntries(100, includeDeleted);
  } else {
    // Map tool category to DB category
    const categoryMap: Record<string, MemoryCategory> = {
      schedule: 'fact',
      preference: 'preference',
      person: 'fact',
      work: 'fact',
      health: 'fact',
      other: 'fact',
    };
    const dbCategory = categoryMap[categoryFilter] || 'fact';
    entries = await getEntriesByCategory(dbCategory, 100, includeDeleted);
  }

  // Get deleted if requested
  let deletedEntries: typeof entries = [];
  if (includeDeleted) {
    deletedEntries = await getDeletedMemories(50);
  }

  // Group by category
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const cat = entry.category;
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(entry);
  }

  // Format for response
  const formattedGroups: Record<
    string,
    Array<{ id: number; content: string; createdAt: string }>
  > = {};
  for (const [cat, items] of Object.entries(grouped)) {
    formattedGroups[cat] = items.map((e) => ({
      id: e.id,
      content: e.content,
      createdAt: e.createdAt,
    }));
  }

  return JSON.stringify({
    success: true,
    totalCount: entries.length,
    deletedCount: deletedEntries.length,
    categories: formattedGroups,
    recentlyDeleted: includeDeleted
      ? deletedEntries.map((e) => ({
          id: e.id,
          content: e.content,
          deletedAt: e.deletedAt,
        }))
      : undefined,
  });
}

/**
 * Handle delete_all_memories tool - destructive full wipe
 */
async function handleDeleteAll(
  input: Record<string, unknown>
): Promise<string> {
  const confirm = input.confirm as string;

  if (confirm !== 'true') {
    return JSON.stringify({
      error:
        'This will PERMANENTLY delete ALL memories. Set confirm to "true" to proceed.',
      requiresConfirmation: true,
    });
  }

  // Get count before delete
  const entries = await getMemoryEntries(1000, true);
  const count = entries.length;

  // Hard delete all entries
  const db = getDb();
  await db.delete(memoryEntries);

  return JSON.stringify({
    success: true,
    message: `Permanently deleted ${count} memory(ies). Memory is now empty.`,
    deletedCount: count,
  });
}

/**
 * Handle restore_memory tool - undo a soft delete
 */
async function handleRestore(input: Record<string, unknown>): Promise<string> {
  const idStr = input.id as string;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    return JSON.stringify({ error: 'Valid numeric id is required' });
  }

  const restored = await restoreMemoryEntry(id);

  if (!restored) {
    return JSON.stringify({
      error: `Could not restore memory with ID ${id}. It may not exist or wasn't deleted.`,
    });
  }

  return JSON.stringify({
    success: true,
    message: `Restored memory: "${restored.content}"`,
    entry: {
      id: restored.id,
      content: restored.content,
      category: restored.category,
    },
  });
}
