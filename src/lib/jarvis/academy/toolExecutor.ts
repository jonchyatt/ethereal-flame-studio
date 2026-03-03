/**
 * Academy Tool Executor
 *
 * Routes academy tool calls to the GitHub reader and formats
 * results as clear text for Claude to read and teach from.
 */

import { readFile, listDirectory, searchCode, isAcademyConfigured, getConfig, githubFetch } from './githubReader';
import { editFile, commitFiles } from './githubWriter';
import { getProject, getAllProjects } from './projects';
import { upsertAcademyProgress, getProgressByProject } from './queries';
import { getNextSuggested } from './curriculum';
import type { ProjectConfig, CurriculumTopic } from './projects';

/** Reject paths with traversal, query injection, or absolute paths */
function validatePath(filePath: string): string | null {
  if (!filePath || !filePath.trim()) return 'File path cannot be empty.';
  if (filePath.includes('..')) return `Path "${filePath}" contains ".." traversal — rejected.`;
  if (filePath.includes('?') || filePath.includes('#')) return `Path "${filePath}" contains query/fragment characters — rejected.`;
  if (filePath.startsWith('/') || filePath.startsWith('\\')) return `Path "${filePath}" is absolute — use relative paths within the project.`;
  return null; // Valid
}

export async function executeAcademyTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  if (!isAcademyConfigured()) {
    return 'Academy is not configured. Jonathan needs to set GITHUB_TOKEN and GITHUB_OWNER in Vercel environment variables. See: https://github.com/settings/tokens for creating a fine-grained PAT with read-write repo access (Contents: read/write).';
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
          input.line_start ? Number(input.line_start) : undefined,
          input.line_end ? Number(input.line_end) : undefined
        );

      case 'academy_search_code':
        return await handleSearchCode(project, input.query as string);

      case 'academy_list_topics':
        return handleListTopics(project, input.category as string | undefined);

      case 'academy_edit_file':
        return await handleEditFile(project, input);

      case 'academy_update_progress':
        return await handleUpdateProgress(project, input);

      case 'academy_commit_files':
        return await handleCommitFiles(project, input);

      default:
        return `Unknown academy tool: ${toolName}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // SHA conflicts and match failures contain retry instructions for Claude
    if (message.includes('Re-read the file') || message.includes('SHA conflict')) {
      return message;
    }
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

  let result = `## ${project.name} \u2014 /${path}\n\n${dirList}`;

  // Append related topics if the project has curriculum and a specific path was requested
  if (project.curriculum && project.curriculum.length > 0) {
    const relatedTopics = project.curriculum.filter(topic =>
      topic.keyFiles.some(kf => kf.path.startsWith(path))
    );
    if (relatedTopics.length > 0) {
      const topicLines = relatedTopics.map(t => {
        const stars = '\u2605'.repeat(t.difficulty) + '\u2606'.repeat(5 - t.difficulty);
        return `- [${stars}] ${t.name} \u2014 ${t.description.split('.')[0]}`;
      });
      result += `\n\n## Related Topics\nFiles in this directory are covered by these teaching topics:\n${topicLines.join('\n')}`;
    }
  }

  return result;
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

function handleListTopics(
  project: ProjectConfig,
  categoryFilter?: string
): string {
  if (!project.curriculum || project.curriculum.length === 0) {
    return `No structured curriculum available yet for ${project.id}. You can still explore and read code \u2014 use academy_explore_project to start.`;
  }

  // Group topics by category
  const byCategory = new Map<string, CurriculumTopic[]>();
  for (const topic of project.curriculum) {
    if (categoryFilter && topic.category.toLowerCase() !== categoryFilter.toLowerCase()) continue;
    if (!byCategory.has(topic.category)) byCategory.set(topic.category, []);
    byCategory.get(topic.category)!.push(topic);
  }

  if (byCategory.size === 0) {
    const allCategories = [...new Set(project.curriculum.map(t => t.category))];
    return `No topics found in category "${categoryFilter}". Available categories: ${allCategories.join(', ')}`;
  }

  // Build topic name lookup for prerequisite display
  const topicNames = new Map<string, string>();
  for (const t of project.curriculum) topicNames.set(t.id, t.name);

  const sections: string[] = [`# ${project.name} \u2014 Curriculum\n`];

  for (const [category, topics] of byCategory) {
    sections.push(`## ${category}\n`);
    for (const t of topics) {
      const stars = '\u2605'.repeat(t.difficulty) + '\u2606'.repeat(5 - t.difficulty);
      let line = `[${stars}] **${t.name}** \u2014 ${t.description}`;
      if (t.prerequisites.length > 0) {
        const prereqNames = t.prerequisites
          .map(id => topicNames.get(id) || id)
          .join(', ');
        line += `\n  _Requires: ${prereqNames}_`;
      }
      if (t.spotlightTargets && t.spotlightTargets.length > 0) {
        line += `\n  _Spotlight targets: ${t.spotlightTargets.join(', ')}_`;
      }
      sections.push(line);
    }
    sections.push('');
  }

  sections.push('Ask me to teach you any topic, or start with the \u2605\u2606\u2606\u2606\u2606 topics if you\'re new.');

  return sections.join('\n');
}

async function handleEditFile(
  project: ProjectConfig,
  input: Record<string, unknown>
): Promise<string> {
  const filePath = input.file_path as string;
  const pathError = validatePath(filePath);
  if (pathError) return `Error: ${pathError}`;

  const oldContent = input.old_content as string;
  const newContent = input.new_content as string;
  const commitMessage = input.commit_message as string;
  const proposedChange = input.proposed_change as string;

  const fullPath = project.basePath ? `${project.basePath}/${filePath}` : filePath;
  const result = await editFile(project.repo, fullPath, oldContent, newContent, commitMessage);

  return `## Committed: ${result.path}

**Change:** ${proposedChange}
**Commit:** \`${result.commitSha.slice(0, 7)}\` — ${result.message}
**URL:** ${result.commitUrl}

Pushed to master. Auto-deploy in ~30s. Re-read the file with academy_read_files to verify.`;
}

async function handleCommitFiles(
  project: ProjectConfig,
  input: Record<string, unknown>
): Promise<string> {
  const filesInput = input.files as Array<{ file_path: string; old_content: string; new_content: string }>;
  const commitMessage = input.commit_message as string;
  const proposedChanges = input.proposed_changes as string;

  if (!Array.isArray(filesInput) || filesInput.length === 0) {
    return 'Error: files array is required and must not be empty.';
  }

  // Validate: no duplicate file paths (second replacement would overwrite first)
  const seenPaths = new Set<string>();
  for (const f of filesInput) {
    if (seenPaths.has(f.file_path)) {
      return `Error: "${f.file_path}" appears multiple times in files array. Each file can only be edited once per commit. Combine the changes into a single old_content/new_content pair.`;
    }
    seenPaths.add(f.file_path);
  }

  // Read each file, validate, and apply find-and-replace server-side
  const { owner } = getConfig();
  const files: Array<{ path: string; content: string }> = [];
  for (const f of filesInput) {
    const pathError = validatePath(f.file_path);
    if (pathError) return `Error in ${f.file_path}: ${pathError}`;

    const fullPath = project.basePath ? `${project.basePath}/${f.file_path}` : f.file_path;

    if (!f.old_content || !f.old_content.trim()) {
      return `Error: old_content cannot be empty for ${f.file_path}. Provide the exact text to find and replace.`;
    }

    if (f.old_content === f.new_content) {
      return `Error: old_content and new_content are identical for ${f.file_path}. Nothing to change.`;
    }

    // Read the current file content from GitHub (raw, not the line-numbered readFile)
    const res = await githubFetch(`/repos/${owner}/${project.repo}/contents/${fullPath}`);
    if (!res.ok) {
      if (res.status === 404) return `Error: File not found: ${f.file_path}`;
      return `Error: GitHub API error ${res.status} reading ${f.file_path}`;
    }
    const data = await res.json();
    if (data.type !== 'file') return `Error: ${f.file_path} is a directory`;

    // Guard: GitHub Contents API returns empty content for files >1MB
    if (!data.content && data.size > 0) {
      return `Error: ${f.file_path} is too large (${Math.round(data.size / 1024)}KB). GitHub only returns content for files under 1MB.`;
    }

    const currentContent = Buffer.from(data.content || '', 'base64').toString('utf-8');

    // Validate uniqueness
    const occurrences = currentContent.split(f.old_content).length - 1;
    if (occurrences === 0) {
      throw new Error(
        `old_content not found in ${f.file_path}. The file may have changed since you read it. ` +
        `Re-read the file with academy_read_files to get the current content and try again.`
      );
    }
    if (occurrences > 1) {
      throw new Error(
        `old_content found ${occurrences} times in ${f.file_path}. ` +
        `Provide more surrounding context in old_content to make the match unique.`
      );
    }

    // Apply replacement — function form prevents $ pattern interpretation
    const updatedContent = currentContent.replace(f.old_content, () => f.new_content);
    files.push({ path: fullPath, content: updatedContent });
  }

  const result = await commitFiles(project.repo, files, commitMessage);
  const fileList = result.filesChanged.map(f => `  - ${f}`).join('\n');

  return `## Multi-file Commit Complete

**Changes:** ${proposedChanges}
**Files (${result.filesChanged.length}):**
${fileList}
**Commit:** \`${result.commitSha.slice(0, 7)}\` — ${result.message}
**URL:** ${result.commitUrl}

All files pushed to master atomically. Auto-deploy in ~30s. Re-read each file to verify.`;
}

async function handleUpdateProgress(
  project: ProjectConfig,
  input: Record<string, unknown>
): Promise<string> {
  const topicId = input.topic_id as string;
  const status = input.status as 'explored' | 'completed';
  const notes = input.teaching_notes as string | undefined;

  // Validate topic exists in this project's curriculum
  if (!project.curriculum || project.curriculum.length === 0) {
    return `No curriculum defined for ${project.id}. Progress tracking requires a curriculum — use academy_explore_project to browse the code directly.`;
  }
  const topic = project.curriculum.find(t => t.id === topicId);
  if (!topic) {
    const validIds = project.curriculum.map(t => `"${t.id}"`).join(', ');
    return `Unknown topic "${topicId}" for ${project.id}. Valid topics: ${validIds}`;
  }

  const row = await upsertAcademyProgress(project.id, topicId, {
    status,
    teachingNotes: notes,
    incrementInteraction: true,
  });

  if (status === 'completed') {
    // Suggest next topic for session flow
    let nextTopic: CurriculumTopic | null = null;
    if (project.curriculum) {
      const allProgress = await getProgressByProject(project.id);
      const progressMap: Record<string, { projectId: string; topicId: string; status: string }> = {};
      for (const p of allProgress) {
        progressMap[`${p.projectId}:${p.topicId}`] = { projectId: p.projectId, topicId: p.topicId, status: p.status };
      }
      nextTopic = getNextSuggested(project.id, project.curriculum, progressMap);
    }
    const nextHint = nextTopic
      ? ` Next suggested topic: "${nextTopic.name}" (${nextTopic.category}).`
      : ' All topics in this project completed!';
    return `✓ "${topicId}" marked as completed for ${project.name}. Teaching notes saved.${nextHint}`;
  }
  return `"${topicId}" marked as explored for ${project.name}. Session #${row.interactionCount}.`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
