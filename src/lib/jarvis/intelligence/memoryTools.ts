/**
 * Memory Tool Definitions for Jarvis
 *
 * Claude tools for memory CRUD operations:
 * - remember_fact: Store facts user wants remembered
 * - forget_fact: Find and soft-delete memories (with confirmation)
 * - list_memories: Show what Jarvis remembers
 * - delete_all_memories: Full memory wipe (with confirmation)
 * - restore_memory: Undo a recent deletion
 */

import type { ToolDefinition } from './tools';

/**
 * Memory tool definitions for voice-driven memory management.
 *
 * Enables MEM-02 through MEM-05 requirements:
 * - "Remember I have therapy Thursdays"
 * - "Forget what I said about therapy"
 * - "What do you know about me?"
 * - "Delete all memories"
 */
export const memoryTools: ToolDefinition[] = [
  {
    name: 'remember_fact',
    description:
      "Store a fact that the user wants Jarvis to remember. Use when user says 'remember', 'don't forget', or states a persistent fact about themselves ('I always...', 'Every Thursday I...').",
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The fact to remember, normalized and concise',
        },
        category: {
          type: 'string',
          description: 'The type of fact being stored',
          enum: ['schedule', 'preference', 'person', 'work', 'health', 'other'],
        },
        source: {
          type: 'string',
          description: 'How the fact was learned (defaults to user_explicit)',
          enum: ['user_explicit', 'jarvis_inferred'],
        },
      },
      required: ['content', 'category'],
    },
  },
  {
    name: 'forget_fact',
    description:
      "Find and soft-delete stored memories. Use when user says 'forget', 'don't remember', or wants to remove stored info. ALWAYS confirm matches with user before deleting.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language description of what to forget',
        },
        confirm_ids: {
          type: 'string',
          description:
            'If confirming a previous forget request, comma-separated IDs to delete (e.g., "1,2,3")',
        },
        category: {
          type: 'string',
          description: 'Optional category filter',
          enum: ['schedule', 'preference', 'person', 'work', 'health', 'other'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_memories',
    description:
      "List what Jarvis remembers about the user. Use when user asks 'what do you know', 'what do you remember', or wants to see stored info.",
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category, or "all" for everything',
          enum: [
            'schedule',
            'preference',
            'person',
            'work',
            'health',
            'other',
            'all',
          ],
        },
        include_deleted: {
          type: 'string',
          description: 'Set to "true" to include recently deleted (for undo)',
        },
      },
    },
  },
  {
    name: 'delete_all_memories',
    description:
      'PERMANENTLY delete ALL stored memories. Use ONLY when user explicitly requests full memory wipe AND has confirmed. This is destructive.',
    input_schema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description: 'Must be "true" to execute the deletion',
        },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'restore_memory',
    description:
      "Restore a recently deleted memory. Use when user says 'undo', 'restore', or wants back a deleted item.",
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The memory ID to restore (as string)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'observe_pattern',
    description:
      'Record a behavioral observation when you notice consistent user behavior. Use when user shows a pattern (e.g., always asking for brief responses, preferring bullet points). After 3 observations of the same pattern within 7 days, this becomes an inferred preference.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description:
            'Pattern identifier (e.g., "prefers_brief_responses", "prefers_bullet_points")',
          enum: [
            'prefers_brief_responses',
            'prefers_detailed_responses',
            'prefers_bullet_points',
            'prefers_morning_tasks',
            'prefers_end_of_day_planning',
            'interested_in_productivity',
            'interested_in_health',
            'uses_informal_language',
            'uses_formal_language',
          ],
        },
        pattern_type: {
          type: 'string',
          description: 'Category of the pattern',
          enum: ['communication_style', 'scheduling', 'topic_interest', 'workflow'],
        },
        evidence: {
          type: 'string',
          description: 'What the user said or did that triggered this observation',
        },
      },
      required: ['pattern', 'pattern_type', 'evidence'],
    },
  },
  {
    name: 'query_audit_log',
    description:
      'Retrieve recent actions Jarvis has taken. Use when user asks "what did you do?", "what have you been doing?", or similar. Returns a list of recent tool invocations with timestamps.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of actions to return (default: 10, max: 50)',
        },
      },
    },
  },
];
