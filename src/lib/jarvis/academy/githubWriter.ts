/**
 * GitHub Write Operations for Academy
 *
 * Gives Jarvis the ability to edit files and commit changes
 * to Jonathan's project repos via GitHub API.
 *
 * Two approaches:
 * - editFile: Single-file edit via Contents API (surgical find-and-replace)
 * - commitFiles: Multi-file atomic commit via Git Trees API
 */

import { getConfig, githubFetch, invalidateCacheForFile } from './githubReader';

const GITHUB_API = 'https://api.github.com';

/** Parse GitHub API error responses into actionable messages for Claude */
async function parseGitHubError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = body.message || '';

    // Rate limiting
    if (res.status === 403 && msg.toLowerCase().includes('rate limit')) {
      return `Rate limit exceeded (403). Wait a few minutes before retrying.`;
    }
    // Auth issues
    if (res.status === 401) {
      return `Authentication failed (401). The GitHub PAT may be invalid or expired. Check GITHUB_TOKEN in Vercel env vars.`;
    }
    if (res.status === 403) {
      return `Permission denied (403): ${msg}. The GitHub PAT may lack write permissions — it needs Contents: read/write.`;
    }
    // Validation errors
    if (res.status === 422) {
      return `Validation error (422): ${msg}. The request was understood but rejected by GitHub.`;
    }
    // Server errors
    if (res.status >= 500) {
      return `GitHub server error (${res.status}): ${msg}. Try again in a moment.`;
    }
    return `HTTP ${res.status}: ${msg || 'Unknown error'}`;
  } catch {
    return `HTTP ${res.status} (could not parse error response)`;
  }
}

async function githubWrite(
  path: string,
  method: 'PUT' | 'POST' | 'PATCH',
  body: unknown
): Promise<Response> {
  const { token } = getConfig();
  return fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

// --- Single-file edit (Contents API) ---

export interface EditFileResult {
  path: string;
  commitSha: string;
  commitUrl: string;
  message: string;
}

/**
 * Edit a file using surgical find-and-replace, then commit.
 *
 * Fetches the current file content + SHA, applies the replacement,
 * validates uniqueness, and commits via Contents API.
 *
 * @param oldContent - Exact text to find in the file
 * @param newContent - Replacement text
 */
export async function editFile(
  repo: string,
  filePath: string,
  oldContent: string,
  newContent: string,
  commitMessage: string
): Promise<EditFileResult> {
  const { owner } = getConfig();

  // Fetch current file (always fresh — never use cached SHA)
  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${filePath}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`File not found: ${filePath}`);
    const errDetail = await parseGitHubError(res);
    throw new Error(`GitHub API error reading ${filePath}: ${errDetail}`);
  }
  const data = await res.json();
  if (data.type !== 'file') throw new Error(`${filePath} is a directory`);

  // Guard: GitHub Contents API returns empty content for files >1MB
  if (!data.content && data.size > 0) {
    throw new Error(
      `${filePath} is too large (${Math.round(data.size / 1024)}KB) for the Contents API. ` +
      `GitHub only returns base64 content for files under 1MB.`
    );
  }

  const currentContent = Buffer.from(data.content || '', 'base64').toString('utf-8');
  const currentSha = data.sha;

  // Guard: empty old_content would match everywhere
  if (!oldContent || !oldContent.trim()) {
    throw new Error('old_content cannot be empty. Provide the exact text to find and replace.');
  }

  // Guard: no-op edit
  if (oldContent === newContent) {
    throw new Error('old_content and new_content are identical. Nothing to change.');
  }

  // Validate: old_content must exist exactly once
  const occurrences = currentContent.split(oldContent).length - 1;
  if (occurrences === 0) {
    throw new Error(
      `old_content not found in ${filePath}. The file may have changed since you read it. ` +
      `Re-read the file with academy_read_files to get the current content and try again.`
    );
  }
  if (occurrences > 1) {
    throw new Error(
      `old_content found ${occurrences} times in ${filePath}. ` +
      `Provide more surrounding context in old_content to make the match unique.`
    );
  }

  // Apply the replacement — use function form to prevent $ pattern interpretation
  // (String.replace interprets $&, $', $`, $1-$9 in replacement strings)
  const updatedContent = currentContent.replace(oldContent, () => newContent);
  const contentBase64 = Buffer.from(updatedContent, 'utf-8').toString('base64');

  // Commit
  const writeRes = await githubWrite(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    'PUT',
    { message: commitMessage, content: contentBase64, sha: currentSha, branch: 'master' }
  );

  if (!writeRes.ok) {
    if (writeRes.status === 409) {
      throw new Error(
        `SHA conflict on ${filePath}: the file was modified by another commit since we read it. ` +
        `Re-read the file with academy_read_files and try the edit again.`
      );
    }
    const errDetail = await parseGitHubError(writeRes);
    throw new Error(`GitHub write failed for ${filePath}: ${errDetail}`);
  }

  const result = await writeRes.json();
  invalidateCacheForFile(repo, filePath);

  return {
    path: filePath,
    commitSha: result.commit.sha,
    commitUrl: result.commit.html_url,
    message: commitMessage,
  };
}

// --- Multi-file atomic commit (Git Trees API) ---

export interface FileChange {
  path: string;
  content: string; // Full new file content
}

export interface CommitFilesResult {
  commitSha: string;
  commitUrl: string;
  filesChanged: string[];
  message: string;
}

/**
 * Atomic multi-file commit via Git Trees API.
 *
 * Creates a single commit touching all files. Uses the 3-step pattern:
 * create tree → create commit → update branch ref.
 */
export async function commitFiles(
  repo: string,
  files: FileChange[],
  commitMessage: string,
  branch: string = 'master'
): Promise<CommitFilesResult> {
  const { owner } = getConfig();

  // Step 1: Get current branch HEAD
  const refRes = await githubFetch(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  if (!refRes.ok) {
    const errDetail = await parseGitHubError(refRes);
    throw new Error(`Cannot get branch ref for ${branch}: ${errDetail}`);
  }
  const refData = await refRes.json();
  const baseCommitSha: string = refData.object.sha;

  // Step 2: Get the base tree SHA
  const commitRes = await githubFetch(`/repos/${owner}/${repo}/git/commits/${baseCommitSha}`);
  if (!commitRes.ok) {
    const errDetail = await parseGitHubError(commitRes);
    throw new Error(`Cannot get base commit: ${errDetail}`);
  }
  const commitData = await commitRes.json();
  const baseTreeSha: string = commitData.tree.sha;

  // Step 3: Create new tree with all file changes
  const treeRes = await githubWrite(
    `/repos/${owner}/${repo}/git/trees`,
    'POST',
    {
      base_tree: baseTreeSha,
      tree: files.map(f => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        content: f.content,
      })),
    }
  );
  if (!treeRes.ok) {
    const errDetail = await parseGitHubError(treeRes);
    throw new Error(`Cannot create tree: ${errDetail}`);
  }
  const newTreeSha: string = (await treeRes.json()).sha;

  // Step 4: Create the commit
  const newCommitRes = await githubWrite(
    `/repos/${owner}/${repo}/git/commits`,
    'POST',
    { message: commitMessage, tree: newTreeSha, parents: [baseCommitSha] }
  );
  if (!newCommitRes.ok) {
    const errDetail = await parseGitHubError(newCommitRes);
    throw new Error(`Cannot create commit: ${errDetail}`);
  }
  const newCommitSha: string = (await newCommitRes.json()).sha;

  // Step 5: Update branch ref
  const updateRefRes = await githubWrite(
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    'PATCH',
    { sha: newCommitSha, force: false }
  );
  if (!updateRefRes.ok) {
    const errDetail = await parseGitHubError(updateRefRes);
    throw new Error(`Cannot update branch ref: ${errDetail}`);
  }

  // Invalidate cache for all changed files
  for (const f of files) {
    invalidateCacheForFile(repo, f.path);
  }

  return {
    commitSha: newCommitSha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommitSha}`,
    filesChanged: files.map(f => f.path),
    message: commitMessage,
  };
}
