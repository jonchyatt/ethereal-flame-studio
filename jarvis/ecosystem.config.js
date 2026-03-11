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
      },
      autorestart: true,
      watch: false,
    },
    {
      name: 'jarvis-tunnel',
      script: 'jarvis/scripts/start-tunnel.bat',
      interpreter: 'cmd',
      interpreter_args: '/c',
      cwd: './',
      autorestart: true,
      watch: false,
    },
  ],
};
