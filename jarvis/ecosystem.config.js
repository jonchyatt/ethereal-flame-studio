/**
 * PM2 Process Configuration — Jarvis Local Deployment
 *
 * Runs 4 processes:
 * 1. jarvis-web    — Next.js app on port 3001
 * 2. jarvis-mcp    — MCP tool server (stdio, used by Claude Code SDK)
 * 3. jarvis-cron   — Daily reflection + backfill via node-cron
 * 4. jarvis-tunnel — Cloudflare tunnel → jarvis.whatamiappreciatingnow.com
 *
 * Usage:
 *   pm2 start jarvis/ecosystem.config.js
 *   pm2 logs jarvis-web
 *   pm2 stop all
 */

const fs = require('fs');
const path = require('path');

// Auto-detect cloudflared location across machines
function findCloudflared() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'cloudflared.exe'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'cloudflared.exe'),
    path.join(process.env.PROGRAMFILES || '', 'cloudflared', 'cloudflared.exe'),
    'C:/Program Files (x86)/cloudflared/cloudflared.exe',
    'C:/cloudflared/cloudflared.exe',
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  // Fallback: assume it's on PATH
  return 'cloudflared';
}

module.exports = {
  apps: [
    {
      name: 'jarvis-web',
      script: 'jarvis/scripts/start-web.js',
      interpreter: 'node',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        JARVIS_DEPLOY_MODE: 'local',
        JARVIS_BRAIN_PROVIDER: 'claude-code-sdk',
        CLAUDECODE: '',
      },
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
    },
    {
      name: 'jarvis-mcp',
      script: 'npx',
      args: 'tsx src/lib/jarvis/mcp/index.ts',
      interpreter: 'cmd',
      interpreter_args: '/c',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        CLAUDECODE: '',
      },
      autorestart: true,
      watch: false,
      // MCP server communicates via stdio — PM2 captures logs from stderr
      merge_logs: true,
    },
    {
      name: 'jarvis-cron',
      script: 'npx',
      args: 'tsx src/lib/jarvis/scheduler/cronRunner.ts',
      interpreter: 'cmd',
      interpreter_args: '/c',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        JARVIS_SI_PROVIDER: 'claude-code-sdk',
        CLAUDECODE: '',
      },
      autorestart: true,
      watch: false,
    },
    {
      name: 'jarvis-tunnel',
      script: findCloudflared(),
      args: 'tunnel run jarvis',
      cwd: './',
      autorestart: true,
      watch: false,
    },
  ],
};
