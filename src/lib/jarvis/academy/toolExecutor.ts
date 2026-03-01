/**
 * Academy Tool Executor
 *
 * Routes academy tool calls to the GitHub reader and formats
 * results as clear text for Claude to read and teach from.
 */

import { readFile, listDirectory, searchCode, isAcademyConfigured } from './githubReader';
import { getProject, getAllProjects } from './projects';
import type { ProjectConfig } from './projects';

export async function executeAcademyTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  if (!isAcademyConfigured()) {
    return 'Academy is not configured. Jonathan needs to set GITHUB_TOKEN and GITHUB_OWNER in Vercel environment variables. See: https://github.com/settings/tokens for creating a fine-grained PAT with read-only repo access.';
  }

  const projectId = input.project as string;
  const project = getProject(projectId);
  if (!project) {
    const available = getAllProjects().map(p => p.id).join(', ');
    return `Unknown project: "${projectId}". Available projects: ${available}`;
  }

  try {
    switch (toolName) {
      case 'academy_explore_project':
        return await handleExploreProject(project, input.path as string | undefined);

      case 'academy_read_files':
        return await handleReadFiles(
          project,
          input.file_path as string,
          input.line_start ? parseInt(input.line_start as string, 10) : undefined,
          input.line_end ? parseInt(input.line_end as string, 10) : undefined
        );

      case 'academy_search_code':
        return await handleSearchCode(project, input.query as string);

      default:
        return `Unknown academy tool: ${toolName}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Academy error: ${message}`;
  }
}

async function handleExploreProject(
  project: ProjectConfig,
  path?: string
): Promise<string> {
  const dirPath = path
    ? (project.basePath ? `${project.basePath}/${path}` : path)
    : (project.basePath || '');

  const entries = await listDirectory(project.repo, dirPath);

  const dirList = entries
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map(e => {
      if (e.type === 'dir') return `  [dir]  ${e.name}/`;
      const sizeStr = e.size ? ` (${formatSize(e.size)})` : '';
      return `  [file] ${e.name}${sizeStr}`;
    })
    .join('\n');

  // If no path specified, include full project overview
  if (!path) {
    return `# ${project.name}

${project.description}

## Tech Stack
${project.techStack}

## Architecture
${project.architecture}

## Key Workflows
${project.workflows}

## Complex Areas (pay attention when teaching these)
${project.complexAreas}

## Root Directory
${dirList}`;
  }

  return `## ${project.name} \u2014 /${path}\n\n${dirList}`;
}

async function handleReadFiles(
  project: ProjectConfig,
  filePath: string,
  lineStart?: number,
  lineEnd?: number
): Promise<string> {
  const fullPath = project.basePath ? `${project.basePath}/${filePath}` : filePath;
  const result = await readFile(project.repo, fullPath, lineStart, lineEnd);

  let header = `## ${result.path} (${result.totalLines} lines total, showing ${result.linesShown})`;
  if (result.truncated) {
    header += `\n> File truncated. Use line_start and line_end to read more sections.`;
  }

  return `${header}\n\n${result.content}`;
}

async function handleSearchCode(
  project: ProjectConfig,
  query: string
): Promise<string> {
  const paths = await searchCode(project.repo, query);

  if (paths.length === 0) {
    return `No results found for "${query}" in ${project.repo}. Try a different search term, or use academy_explore_project to browse the file structure.`;
  }

  const pathList = paths.map(p => `  - ${p}`).join('\n');
  return `Found "${query}" in ${paths.length} file(s):\n${pathList}\n\nUse academy_read_files to read any of these files.`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
