# Jarvis SDK Migration — Handoff Document

**Date:** 2026-03-05
**Status:** Code complete, needs build verification + integration testing
**Work from:** `C:\Users\jonch\Projects\ethereal-flame-studio\`

## What Was Done

All 4 workstreams implemented. TypeScript compiles clean (`tsc --noEmit` = 0 errors).

### New Files Created (11)

| File | Purpose |
|------|---------|
| `src/lib/jarvis/mcp/server.ts` | MCP server wrapping 40+ Jarvis tools |
| `src/lib/jarvis/mcp/toolBridge.ts` | Tool routing to 5 executors |
| `src/lib/jarvis/mcp/index.ts` | CLI entry: `npx tsx src/lib/jarvis/mcp/index.ts` |
| `src/lib/jarvis/intelligence/ccodeBrain.ts` | Claude Code SDK brain (`query()` + session resumption) |
| `src/lib/jarvis/intelligence/providerRouter.ts` | Routes to sdk/api/ollama based on env |
| `src/lib/jarvis/intelligence/llmProvider.ts` | Provider abstraction for self-improvement pipeline |
| `src/lib/jarvis/scheduler/cronRunner.ts` | node-cron daily 5AM reflection |
| `jarvis/ecosystem.config.js` | PM2 config (3 processes) |
| `jarvis/.mcp.json` | MCP server config for Claude Code SDK |
| `jarvis/CLAUDE.md` | SDK brain personality |
| `jarvis/scripts/start-jarvis.bat` | Windows one-click startup |

### Modified Files (7)

| File | Changes |
|------|---------|
| `src/lib/jarvis/intelligence/chatProcessor.ts` | Uses `routeToProvider()`, passes `sdkSessionId` |
| `src/lib/jarvis/config.ts` | Added `brainProvider`, `deployMode` env vars |
| `src/app/api/jarvis/chat/route.ts` | Passes `sdkSessionId`, streams SDK session back via SSE |
| `src/lib/jarvis/intelligence/evaluator.ts` | Uses `callWithTools()` from llmProvider |
| `src/lib/jarvis/intelligence/reflectionLoop.ts` | Same |
| `src/lib/jarvis/intelligence/metaEvaluator.ts` | Same |
| `src/lib/jarvis/telegram/bot.ts` | Added `startLongPolling()` export |

### Dependencies Added (3)

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | latest | MCP server framework |
| `@anthropic-ai/claude-code` | 1.0.128 | Claude Code SDK (v1 has sdk.mjs/sdk.d.ts) |
| `node-cron` + `@types/node-cron` | latest | Local cron scheduler |

### Research Docs Placed

`jarvis/docs/` now contains:
- `agent-capabilities.md` — vault pattern, use cases, security model
- `agent-landscape-2026.md` — industry research, vendor comparison
- `jarvis-claude-code-integration-architecture.md` — full technical spec

## Key Environment Variables

```bash
# Brain provider (default: claude-code-sdk)
JARVIS_BRAIN_PROVIDER=claude-code-sdk   # claude-code-sdk | anthropic-api | ollama

# Deployment mode
JARVIS_DEPLOY_MODE=local                # vercel | local

# Self-improvement provider overrides (all default to JARVIS_SI_PROVIDER)
JARVIS_SI_PROVIDER=claude-code-sdk
JARVIS_SI_EVALUATOR_PROVIDER=anthropic-api   # optional per-component
JARVIS_SI_REFLECTOR_PROVIDER=claude-code-sdk
JARVIS_SI_META_PROVIDER=claude-code-sdk
```

## What Needs Testing

1. **Build:** `npm run build` in ethereal-flame-studio
2. **MCP Server:** `npx tsx src/lib/jarvis/mcp/index.ts` — should start on stdio
3. **SDK Brain:** Set `JARVIS_BRAIN_PROVIDER=claude-code-sdk`, send a chat message
4. **Provider fallback:** Set `JARVIS_BRAIN_PROVIDER=anthropic-api`, verify existing behavior unchanged
5. **Self-improvement:** Run evaluator with SDK provider, check Turso for entries
6. **PM2:** `pm2 start jarvis/ecosystem.config.js` — 3 processes should start
7. **Telegram long-polling:** Import and call `startLongPolling()` from bot.ts
8. **Cron:** Verify `cronRunner.ts` fires at 5AM ET (or test manually)

## Architecture Notes

- **Provider Router pattern:** `chatProcessor.ts` → `providerRouter.ts` → `ccodeBrain.ts` OR `sdkBrain.ts`
- **sdkBrain.ts is KEPT** as the `anthropic-api` fallback. Not deleted.
- **llmProvider.ts** wraps LLM calls for SI pipeline (evaluator, reflection, meta) independently from the chat brain
- **MCP server** runs as a separate PM2 process, communicates via stdio
- **Session resumption:** SDK returns `sessionId` which flows back through SSE → client can send it on next request
- **Claude Code SDK v1.0.128** is required (v2.x removed `sdk.mjs`/`sdk.d.ts` exports)

## Future Phases (post-migration)

See `jarvis/docs/jarvis-claude-code-integration-architecture.md` for:
1. Vault integration (Bitwarden CLI)
2. Approval gateway (Telegram inline buttons)
3. Browser agent tasks
4. Voice phone calls (Retell AI)
5. Proactive intelligence
6. Weekly activity reports
