/**
 * Tutorial Tools for Claude
 *
 * Tool definitions that allow Claude to manage the tutorial system.
 */

import { ToolDefinition } from '../intelligence/tools';

/**
 * Tutorial tool definitions
 */
export const tutorialTools: ToolDefinition[] = [
  {
    name: 'start_tutorial',
    description: 'Start the Jarvis tutorial. Use when user wants to learn how to use Jarvis, says "start tutorial", "help me get started", "I\'m new", or "show me how this works".',
    input_schema: {
      type: 'object',
      properties: {
        module_id: {
          type: 'string',
          description: 'Specific module to start (optional). Options: welcome, navigation, life-areas, goals, brain-dump, processing, daily-rhythm, voice-commands, bills, habits, memory, overwhelm, advanced'
        },
        force_restart: {
          type: 'string',
          description: 'Whether to restart a completed module',
          enum: ['true', 'false']
        }
      }
    }
  },
  {
    name: 'teach_topic',
    description: 'Teach user about a specific Jarvis topic. Use when user says "teach me about X", "how do I X", "explain X", or asks about a specific feature.',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to teach (e.g., "life areas", "bills", "habits", "memory", "tasks")'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'continue_tutorial',
    description: 'Continue to the next section or module in the tutorial. Use when user says "continue", "next", "go on", or wants to proceed with the tutorial.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'skip_tutorial_module',
    description: 'Skip the current tutorial module. Use when user says "skip", "skip this", or wants to move past current module.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_tutorial_progress',
    description: 'Get the user\'s tutorial progress. Use when user asks "where am I in the tutorial", "what have I learned", or wants to see their progress.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_quick_reference',
    description: 'Get the Jarvis quick reference card. Use when user says "cheat sheet", "quick reference", "commands list", or "what can you do".',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Tutorial tool result type
 */
export interface TutorialToolResult {
  success: boolean;
  content?: string;
  module?: {
    id: string;
    title: string;
  };
  progress?: {
    completedModules: string[];
    currentModule?: string;
    percentComplete: number;
  };
  error?: string;
}
