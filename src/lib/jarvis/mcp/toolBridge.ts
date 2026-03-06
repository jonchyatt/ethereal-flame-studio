/**
 * Tool Bridge — Maps Jarvis tool definitions to MCP and routes calls to executors
 *
 * Imports all tool definitions from existing modules and creates a unified
 * routing layer. Tool definitions already follow Claude's format which maps
 * 1:1 to MCP tool schema.
 */

import { notionTools, calendarTools, type ToolDefinition } from '../intelligence/tools';
import { memoryTools } from '../intelligence/memoryTools';
import { tutorialTools } from '../tutorial/tutorialTools';
import { academyTools } from '../academy/academyTools';
import { executeNotionTool } from '../notion/toolExecutor';
import { executeMemoryTool } from '../memory/toolExecutor';
import { executeTutorialTool } from '../tutorial/toolExecutor';
import { executeCalendarTool } from '../google/calendarToolExecutor';
import { executeAcademyTool } from '../academy/toolExecutor';
import { academyToolNames } from '../academy/academyTools';

// ---------------------------------------------------------------------------
// Tool name sets for routing (mirrored from chatProcessor.ts)
// ---------------------------------------------------------------------------

const memoryToolNames = new Set([
  'remember_fact',
  'forget_fact',
  'list_memories',
  'delete_all_memories',
  'restore_memory',
  'observe_pattern',
  'query_audit_log',
  'search_memories',
  'consolidate_memories',
]);

const tutorialToolNames = new Set([
  'start_tutorial',
  'teach_topic',
  'continue_tutorial',
  'skip_tutorial_module',
  'get_tutorial_progress',
  'get_quick_reference',
  'get_curriculum_status',
  'start_lesson',
  'complete_lesson',
  'spotlight_element',
  'clear_spotlight',
]);

const calendarToolNames = new Set([
  'query_calendar',
]);

// ---------------------------------------------------------------------------
// All tools combined
// ---------------------------------------------------------------------------

export function getAllToolDefinitions(): ToolDefinition[] {
  return [
    ...notionTools,
    ...calendarTools,
    ...memoryTools,
    ...tutorialTools,
    ...academyTools,
  ];
}

// ---------------------------------------------------------------------------
// Unified tool executor
// ---------------------------------------------------------------------------

/**
 * Execute a tool by name, routing to the correct executor.
 * Uses sessionId 0 for MCP calls (no web session context).
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  sessionId = 0,
): Promise<string> {
  if (tutorialToolNames.has(name)) {
    const result = await executeTutorialTool(name, input);
    return result.content || result.error || 'Tutorial operation completed';
  }

  if (memoryToolNames.has(name)) {
    return executeMemoryTool(name, input, sessionId);
  }

  if (calendarToolNames.has(name)) {
    return executeCalendarTool(name, input);
  }

  if (academyToolNames.has(name)) {
    return executeAcademyTool(name, input);
  }

  // Default: Notion tools
  return executeNotionTool(name, input, sessionId);
}
