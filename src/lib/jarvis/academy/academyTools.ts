/**
 * Academy Tool Definitions
 *
 * Three tools that give Jarvis the ability to read and teach
 * about Jonathan's project codebases via GitHub API.
 */

import { ToolDefinition } from '../intelligence/tools';

export const academyTools: ToolDefinition[] = [
  {
    name: 'academy_explore_project',
    description: 'Get information about one of Jonathan\'s projects \u2014 its purpose, tech stack, architecture, key workflows, and file structure. Call this FIRST when starting to teach about a project. Without a path, returns the project overview plus root directory listing. With a path, returns the directory listing for that subdirectory.',
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project to explore. Options: visopscreen, creator-workflow',
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
          description: 'Project to read from. Options: visopscreen, creator-workflow',
        },
        file_path: {
          type: 'string',
          description: 'File path within the project (e.g., "spread-analyzer.js" or "src/lib/creator/types.ts")',
        },
        line_start: {
          type: 'string',
          description: 'Starting line number (default: 1). Use for reading specific sections of large files.',
        },
        line_end: {
          type: 'string',
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
          description: 'Project to search. Options: visopscreen, creator-workflow',
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
          description: 'Project to edit. Options: visopscreen, creator-workflow',
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
          description: 'Project to edit. Options: visopscreen, creator-workflow',
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
];

export const academyToolNames = new Set(
  academyTools.map(t => t.name)
);
