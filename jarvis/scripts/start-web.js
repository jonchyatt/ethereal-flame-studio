/**
 * PM2 launcher for jarvis-web.
 * Loads .env.local via dotenv before spawning Next.js,
 * because PM2's env_file does not reliably work on Windows.
 */
const { config } = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');

// .env.local is at the repo root (two levels up from jarvis/scripts/)
config({ path: path.join(__dirname, '../../.env.local') });

const proc = spawn('npm', ['start', '--', '-p', '3001'], {
  shell: true,
  stdio: 'inherit',
  env: process.env,
});

proc.on('exit', (code) => process.exit(code ?? 0));
