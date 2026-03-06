/**
 * Academy Tool Definitions
 *
 * Tools that give Jarvis the ability to read, teach, and fix
 * Jonathan's project codebases via GitHub API.
 */

import { ToolDefinition } from '../intelligence/tools';
import { getProjectIds } from './projects';

const projectOptions = () => getProjectIds().join(', ');

export const academyTools: ToolDefinition[] = [
  {
    name: 'academy_explore_project',
    description: 'Get information about one of Jonathan\'s projects \u2014 its purpose, tech stack, architecture, key workflows, and file structure. Call this FIRST when starting to teach about a project. Without a path, returns the project overview plus root directory listing. With a path, returns the directory listing for that subdirectory.',
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: `Project to explore. Options: ${projectOptions()}`,
        },
        path: {
          type: 'string',
          description: 'Directory path within the project to list (e.g., "components", "src/lib/creator"). Omit to see the project overview + root directory.',
        },
      },
      required: ['project'],
    },
  },
  {
    name: 'academy_read_files',
    description: 'Read source code files from one of Jonathan\'s projects. ALWAYS read the actual code before explaining how something works \u2014 never guess about implementation details. Supports line ranges for large files (max 300 lines per read). For large files, read in chunks using line_start and line_end.',
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: `Project to read from. Options: ${projectOptions()}`,
        },
        file_path: {
          type: 'string',
          description: 'File path within the project (e.g., "spread-analyzer.js" or "src/lib/creator/types.ts")',
        },
        line_start: {
          type: 'number',
          description: 'Starting line number (default: 1). Use for reading specific sections of large files.',
        },
        line_end: {
          type: 'number',
          description: 'Ending line number. Max 300 lines per read. If omitted, reads up to 300 lines from line_start.',
        },
      },
      required: ['project', 'file_path'],
    },
  },
  {
    name: 'academy_search_code',
    description: 'Search for function names, variable names, keywords, or code patterns across a project\'s codebase. Returns file paths that contain matches. Use this to find where something is defined or referenced, then use academy_read_files to read the relevant files.',
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: `Project to search. Options: ${projectOptions()}`,
        },
        query: {
          type: 'string',
          description: 'Search query \u2014 function name, variable name, keyword, or code pattern',
        },
      },
      required: ['project', 'query'],
    },
  },
  {
    name: 'academy_list_topics',
    description: 'List available teaching topics for a project, grouped by category with difficulty and prerequisites. Call this when the user asks what you can teach them, or to suggest a learning path. Returns structured curriculum with difficulty indicators and prerequisite chains so the user knows where to start.',
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: `Project to list topics for. Options: ${projectOptions()}`,
        },
        category: {
          type: 'string',
          description: 'Optional: filter to a specific category (e.g., "Screeners", "Core Concepts"). Omit to see all topics.',
        },
      },
      required: ['project'],
    },
  },
  {
    name: 'academy_edit_file',
    description: `Edit a file in one of Jonathan's project repos using surgical find-and-replace, then commit to master.

WORKFLOW — you MUST follow this order:
1. Read the file with academy_read_files
2. Explain the bug/issue to Jonathan
3. Describe what you plan to change
4. Wait for Jonathan to say "fix it" / "do it" / "yes" / "go ahead"
5. Call this tool with the exact old text and new text
6. After success, re-read the file with academy_read_files to verify

COMMIT MESSAGES: Write WHY, not WHAT. Bad: "Fix getPrice". Good: "Fix: getPrice read window.currentUnderlyingPrice directly instead of state-access module, causing stale prices on multi-leg builds"

old_content must match EXACTLY ONE location in the file. If it matches 0 or 2+, the edit fails with guidance.`,
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: `Project to edit. Options: ${projectOptions()}`,
        },
        file_path: {
          type: 'string',
          description: 'File path within the project',
        },
        old_content: {
          type: 'string',
          description: 'The EXACT text to find and replace. Must match exactly one location in the file. Include enough surrounding context to ensure uniqueness.',
        },
        new_content: {
          type: 'string',
          description: 'The replacement text.',
        },
        commit_message: {
          type: 'string',
          description: 'Commit message explaining WHY this change was needed.',
        },
        proposed_change: {
          type: 'string',
          description: 'Brief human-readable summary of what is being changed and why.',
        },
      },
      required: ['project', 'file_path', 'old_content', 'new_content', 'commit_message', 'proposed_change'],
    },
  },
  {
    name: 'academy_update_progress',
    description: `Record teaching progress for a curriculum topic. Call this DURING teaching to track what was covered.

WHEN TO CALL:
- status "explored": When you START discussing a topic (first code file read, first concept explained)
- status "completed": ONLY after the student demonstrates understanding — they can explain the concept back, answer your verification question correctly, or apply the concept to a new example

NEVER mark "completed" just because you finished explaining. The student must show they understood.

teaching_notes should include: (1) what approach you used, (2) what clicked for the student, (3) what was confusing, (4) your confidence in their understanding (high/medium/low).

Example notes: "Used pipeline metaphor to explain data flow. Student immediately grasped 5-source→1-pipeline pattern after seeing data-sources.js routing. Confused briefly by File System Access API but understood after TOS demo analogy. Confidence: high."`,
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: `Project the topic belongs to. Options: ${projectOptions()}`,
        },
        topic_id: {
          type: 'string',
          description: 'Curriculum topic ID (e.g., "pnl-curves", "render-pipeline-overview"). Must be a valid topic from academy_list_topics.',
        },
        status: {
          type: 'string',
          enum: ['explored', 'completed'],
          description: '"explored" = started teaching this topic. "completed" = student demonstrated understanding.',
        },
        teaching_notes: {
          type: 'string',
          description: 'Approach used, what clicked, what confused the student, confidence level. These notes help you teach better in future sessions.',
        },
      },
      required: ['project', 'topic_id', 'status'],
    },
  },
  {
    name: 'academy_commit_files',
    description: `Atomically commit surgical find-and-replace edits across multiple files in one commit. Use when a fix spans multiple files (e.g., renaming a function defined in one file and called in three others).

Each file gets its own old_content/new_content pair — the server reads the full file, applies the replacement, and commits all changes atomically via Git Trees API. You only send the diff snippets, not full file contents.

Use academy_edit_file for single-file edits — it's simpler and has SHA conflict detection.

WORKFLOW:
1. Read all affected files with academy_read_files
2. Search for all call sites with academy_search_code
3. Explain the full change set to Jonathan and get agreement
4. Call this tool with find-and-replace pairs per file
5. Re-read each changed file to verify`,
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: `Project to edit. Options: ${projectOptions()}`,
        },
        files: {
          type: 'array',
          description: 'Array of file edits. Each entry is a surgical find-and-replace for one file.',
          items: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'File path within the project' },
              old_content: { type: 'string', description: 'Exact text to find in this file. Must match exactly once.' },
              new_content: { type: 'string', description: 'Replacement text for this file.' },
            },
            required: ['file_path', 'old_content', 'new_content'],
          },
        },
        commit_message: {
          type: 'string',
          description: 'Commit message explaining WHY this multi-file change was needed.',
        },
        proposed_changes: {
          type: 'string',
          description: 'Human-readable summary of all files being changed and why.',
        },
      },
      required: ['project', 'files', 'commit_message', 'proposed_changes'],
    },
  },
  // ---------------------------------------------------------------------------
  // Phase 28: Visopscreen Live App Integration
  // ---------------------------------------------------------------------------
  {
    name: 'trigger_visopscreen',
    description: `Interact with the live Visopscreen app in Jonathan's browser.

Use this tool to make teaching interactive — highlight the specific UI element you're explaining, or start a guided spotlight lesson that walks Jonathan through a workflow step-by-step.

IMPORTANT: This only works when Jonathan has the Visopscreen app open in his browser AND the tab is listening (it must be the active tab or at minimum loaded). If the message isn't received, tell Jonathan to open the app first.

Actions:
- "startLesson": Start a guided spotlight tutorial. Jonathan sees step-by-step overlays with arrows pointing at the relevant UI elements. The lesson pauses and waits for him to take each action.
- "highlightElement": Highlight a specific UI element with a blue glow for 3 seconds. Great for "see this button here?" moments in conversation.
- "ping": Check if the app is open and the bridge is listening. Use this if you're unsure whether the app is loaded.

When to use:
- "Let me show you where that lives in the app" → highlightElement
- "Want to try the full interactive walkthrough?" → startLesson
- "Is the app open?" → ping
- After explaining a concept: "Try clicking that now" → highlightElement to point at it

Lesson IDs available:
- bwb-trade-setup: Full BWB trade setup workflow (5 steps)
- strategy-wizard: 4-question interview wizard for strategy selection
- pnl-analysis: Reading P&L curves and profit zones
- leap-cycles: LEAP cycle management and DTE comparison
- regime-intelligence: Reading regime signals and gating trades

Spotlight target IDs (for highlightElement):
- find-tab-btn, build-tab-btn, analysis-tab-btn
- bwb-screener, ratio-screener
- regime-display-area, regime-archetype, regime-gate-msg
- data-source-demo, data-source-yahoo, data-source-tos, data-source-schwab
- wizard-open-btn`,
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['startLesson', 'highlightElement', 'ping'],
          description: 'What to do in Visopscreen',
        },
        lessonId: {
          type: 'string',
          enum: ['bwb-trade-setup', 'strategy-wizard', 'pnl-analysis', 'leap-cycles', 'regime-intelligence'],
          description: 'Required when action is startLesson. Which guided tutorial to start.',
        },
        targetId: {
          type: 'string',
          description: 'Required when action is highlightElement. The data-tutorial-id of the element to highlight (e.g., "find-tab-btn", "regime-display-area", "data-source-schwab"). See tool description for full list.',
        },
      },
      required: ['action'],
    },
  },
];

export const academyToolNames = new Set(
  academyTools.map(t => t.name)
);
