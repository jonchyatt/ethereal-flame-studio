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
];

export const academyToolNames = new Set(
  academyTools.map(t => t.name)
);
