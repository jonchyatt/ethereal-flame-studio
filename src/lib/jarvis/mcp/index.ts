#!/usr/bin/env node
/**
 * Jarvis MCP Server — CLI Entry Point
 *
 * Run: node dist/lib/jarvis/mcp/index.js
 * Or:  npx tsx src/lib/jarvis/mcp/index.ts
 */

import { startServer } from './server.js';

startServer().catch((err) => {
  console.error('[Jarvis MCP] Fatal error:', err);
  process.exit(1);
});
