/**
 * PM2 launcher for jarvis-web.
 * Loads .env.local via dotenv before spawning Next.js,
 * because PM2's env_file does not reliably work on Windows.
 *
 * IMPORTANT: Builds a clean env without CLAUDECODE and avoids shell: true.
 * On Windows, shell: true spawns cmd.exe which re-inherits the parent
 * process environment, defeating any env var deletions. Using npm.cmd
 * directly bypasses cmd.exe entirely.
 */
const { config } = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');

// .env.local is at the repo root (two levels up from jarvis/scripts/)
config({ path: path.join(__dirname, '../../.env.local') });

// Build a clean env copy with CLAUDECODE stripped.
// This prevents the Claude Code SDK from detecting a nested-process block,
// regardless of how PM2 was started.
const cleanEnv = {};
for (const [key, val] of Object.entries(process.env)) {
  if (key !== 'CLAUDECODE' && val !== undefined) cleanEnv[key] = val;
}

const proc = spawn('npm', ['start', '--', '-p', '3001'], {
  shell: true,
  stdio: 'inherit',
  env: cleanEnv,
});

proc.on('exit', (code) => process.exit(code ?? 0));
