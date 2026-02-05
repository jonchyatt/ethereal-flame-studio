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
import { observeAndInfer } from './preferenceInference';
import { type PatternType } from './queries/observations';
import { getDb, memoryEntries } from './db';
import { logEvent, getRecentToolInvocations, type ToolInvocationData } from './queries/dailyLogs';
import { trackErrorPattern } from '../resilience/errorTracking';

export type MemoryToolName =
  | 'remember_fact'
  | 'forget_fact'
  | 'list_memories'
  | 'delete_all_memories'
  | 'restore_memory'
  | 'observe_pattern'
  | 'query_audit_log';

/**
 * Execute a memory tool call.
 *
 * @param toolName - The Claude tool name
 * @param input - The tool input parameters from Claude
 * @param sessionId - Optional session ID for audit logging
 * @returns JSON string with result
 */
export async function executeMemoryTool(
  toolName: string,
  input: Record<string, unknown>,
  sessionId?: number
): Promise<string> {
  console.log(`[MemoryToolExecutor] Executing tool: ${toolName}`, input);

  try {
    let result: string;
    switch (toolName) {
      case 'remember_fact':
        result = await handleRememberFact(input);
        break;
      case 'forget_fact':
        result = await handleForgetFact(input);
        break;
      case 'list_memories':
        result = await handleListMemories(input);
        break;
      case 'delete_all_memories':
        result = await handleDeleteAll(input);
        break;
      case 'restore_memory':
        result = await handleRestore(input);
        break;
      case 'observe_pattern':
        result = await handleObservePattern(input);
        break;
      case 'query_audit_log':
        result = await handleQueryAuditLog(input);
        break;
      default:
        result = JSON.stringify({ error: `Unknown memory tool: ${toolName}` });
    }

    // Log successful invocation
    if (sessionId) {
      await logEvent(sessionId, 'tool_invocation', {
        toolName,
        success: true,
        context: summarizeToolContext(toolName, input, result),
      } as ToolInvocationData);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[MemoryToolExecutor] Error executing ${toolName}:`, error);

    // Log failed invocation
    if (sessionId) {
      await logEvent(sessionId, 'tool_invocation', {
        toolName,
        success: false,
        error: errorMessage,
      } as ToolInvocationData);
    }

    // Track error pattern for self-healing (Phase 14)
    trackErrorPattern(error, 'turso', toolName, sessionId).catch(() => {});

    return JSON.stringify({ error: errorMessage });
  }
}

/**
 * Summarize tool context for audit logs (keep logs readable)
 */
function summarizeToolContext(
  toolName: string,
  input: Record<string, unknown>,
  result: string
): string {
  switch (toolName) {
    case 'remember_fact':
      return `Stored: "${(input.content as string)?.slice(0, 50)}..."`;
    case 'forget_fact':
      return input.confirm_ids
        ? `Deleted IDs: ${input.confirm_ids}`
        : `Searching: "${input.query}"`;
    case 'list_memories':
      return 'Listed memories';
    case 'delete_all_memories':
      return input.confirm === 'true' ? 'Deleted all memories' : 'Confirmation required';
    case 'restore_memory':
      return `Restored ID: ${input.id}`;
    case 'observe_pattern':
      return `Pattern: ${input.pattern}`;
    case 'query_audit_log':
      return `Queried audit log (limit: ${input.limit || 10})`;
    default:
      return toolName;
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

/**
 * Handle observe_pattern tool - record behavioral observation
 */
async function handleObservePattern(
  input: Record<string, unknown>
): Promise<string> {
  const pattern = input.pattern as string;
  const patternType = input.pattern_type as PatternType;
  const evidence = input.evidence as string;

  if (!pattern) {
    return JSON.stringify({ error: 'pattern is required' });
  }
  if (!patternType) {
    return JSON.stringify({ error: 'pattern_type is required' });
  }
  if (!evidence) {
    return JSON.stringify({ error: 'evidence is required' });
  }

  const inferred = await observeAndInfer(pattern, patternType, evidence);

  if (inferred) {
    return JSON.stringify({
      success: true,
      inferred: true,
      preference: inferred.content,
      message: `Observation recorded. Threshold reached - stored inferred preference: "${inferred.content}"`,
    });
  }

  return JSON.stringify({
    success: true,
    inferred: false,
    message: `Observation recorded for pattern "${pattern}". Not yet at threshold.`,
  });
}

/**
 * Handle query_audit_log tool - return recent actions
 */
async function handleQueryAuditLog(
  input: Record<string, unknown>
): Promise<string> {
  const limit = Math.min(
    Math.max(1, (input.limit as number) || 10),
    50  // Cap at 50
  );

  const invocations = await getRecentToolInvocations(limit);

  if (invocations.length === 0) {
    return JSON.stringify({
      success: true,
      message: "I haven't taken any actions yet this session.",
      actions: [],
    });
  }

  // Format for natural speech
  const actionList = invocations.map(inv => {
    const status = inv.success ? 'succeeded' : 'failed';
    const time = new Date(inv.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const detail = inv.context || inv.error || inv.toolName;
    return `${time}: ${detail} (${status})`;
  });

  return JSON.stringify({
    success: true,
    message: `Here are my recent ${invocations.length} action(s).`,
    actions: actionList,
    raw: invocations,  // Include raw data for detailed queries
  });
}
