# Handoff — SDK Migration Shipped
**Date:** 2026-03-05
**Session focus:** SDK migration verification + fix + commit + push
**Time:** Break after push

---

## What This Session Did

This session did NOT build the SDK migration — a prior session had already done that.
This session:
1. Discovered the prior session's work by reading the handoff doc
2. Reviewed all 18 files that were built (new + modified)
3. Found and fixed a critical default provider bug before pushing
4. Committed and pushed two commits to master

---

## Critical Fix Applied

**Bug:** `getBrainProvider()` in `providerRouter.ts` defaulted to `claude-code-sdk`.
Vercel has no `JARVIS_BRAIN_PROVIDER` env var set, so the live site would have routed
all chat requests to the Claude Code SDK — which cannot run serverlessly. Chat would
have broken the moment it was pushed.

**Fix:** Changed default from `'claude-code-sdk'` to `'anthropic-api'`.

The PM2 `ecosystem.config.js` already explicitly sets `JARVIS_BRAIN_PROVIDER: 'claude-code-sdk'`
for local deployment, so the local SDK path still works correctly.

**File:** `src/lib/jarvis/intelligence/providerRouter.ts:59`

---

## What Was Shipped (2 commits)

### Commit 1: `690009e` — SDK Migration (4 workstreams)

**WS1 — MCP Server** (`src/lib/jarvis/mcp/`):
- `server.ts` — MCP server wrapping 40+ tools via StdioServerTransport
- `toolBridge.ts` — Unified tool routing to 5 executors (same logic as chatProcessor)
- `index.ts` — CLI entry: `npx tsx src/lib/jarvis/mcp/index.ts`
- Dependency added: `@modelcontextprotocol/sdk`

**WS2 — Claude Code SDK Brain** (`src/lib/jarvis/intelligence/`):
- `ccodeBrain.ts` — Uses `query()` from `@anthropic-ai/claude-code`, streams events, extracts sessionId
- `providerRouter.ts` — Routes to `claude-code-sdk | anthropic-api | ollama` based on `JARVIS_BRAIN_PROVIDER`
- `chatProcessor.ts` — Now calls `routeToProvider()` instead of `think()` directly; passes `sdkSessionId`
- `config.ts` — Added `brainProvider` and `deployMode` config fields
- `src/app/api/jarvis/chat/route.ts` — Accepts `sdkSessionId` from client; streams it back via SSE on response
- Dependency added: `@anthropic-ai/claude-code@1.0.128` (v1 required — v2 removed sdk.mjs/sdk.d.ts exports)

**WS3 — Provider-Agnostic Self-Improvement** (`src/lib/jarvis/intelligence/`):
- `llmProvider.ts` — `callWithTools()` abstraction for evaluator/reflector/meta pipeline
- `evaluator.ts`, `reflectionLoop.ts`, `metaEvaluator.ts` — All updated to use `callWithTools()`
- Cost win: reflection loop (was Opus API $15/MTok) → free on SDK locally

**WS4 — Local Deployment**:
- `jarvis/ecosystem.config.js` — PM2 config: 3 processes (jarvis-web, jarvis-mcp, jarvis-cron)
- `jarvis/.mcp.json` — MCP server config: jarvis-tools + notion + playwright
- `jarvis/CLAUDE.md` — Static personality for Claude Code SDK brain
- `jarvis/scripts/start-jarvis.bat` — Windows one-click startup
- `src/lib/jarvis/scheduler/cronRunner.ts` — node-cron: daily 5AM ET reflection (replaces Vercel cron)
- `src/lib/jarvis/telegram/bot.ts` — Added `startLongPolling()` export
- Dependency added: `node-cron` + `@types/node-cron`

**Docs placed** (`jarvis/docs/`):
- `agent-capabilities.md` — Vault pattern, use cases, security model
- `agent-landscape-2026.md` — Industry research, vendor comparison
- `jarvis-claude-code-integration-architecture.md` — Full technical spec (~49KB)
- `migration/HANDOFF-SDK-MIGRATION.md` — Prior session's completion record

### Commit 2: `2e8259d` — Visopscreen Academy Bridge

*This was a separate feature found alongside the migration — not part of the 4 workstreams.*

- `src/lib/jarvis/visopscreen/bridge.ts` — Typed postMessage protocol (startLesson, highlightElement, ping)
- `src/lib/jarvis/visopscreen/index.ts` — Barrel export
- `src/lib/jarvis/academy/academyTools.ts` — Added `trigger_visopscreen` tool for Phase 28 teaching integration

Enables Jarvis to highlight UI elements or start guided spotlight lessons in the live
Visopscreen app during Academy teaching sessions.

---

## Current State of Vercel Deployment

The live site (`jarvis.whatamiappreciatingnow.com`) is running the pushed code.
- Brain: `anthropic-api` (unchanged — correct default, Vercel has no JARVIS_BRAIN_PROVIDER set)
- Chat: works exactly as before
- New code: present in the bundle but dormant until env vars or local PM2 activate it

**Nothing broke. The Vercel deployment is safe.**

---

## What's Left — Local SDK Path Activation

The code is shipped but the local Opus brain has NOT been tested yet.
Per the original handoff checklist, still pending:

| Test | How | Status |
|------|-----|--------|
| Build | `npm run build` | ✅ DONE (exit 0) |
| MCP Server | `npx tsx src/lib/jarvis/mcp/index.ts` | ⬜ Pending |
| SDK Brain | Set `JARVIS_BRAIN_PROVIDER=claude-code-sdk`, send chat | ⬜ Pending |
| Provider fallback | Set `JARVIS_BRAIN_PROVIDER=anthropic-api` | ✅ Live on Vercel |
| PM2 | `pm2 start jarvis/ecosystem.config.js` | ⬜ Pending |
| Cloudflare Tunnel | Route tunnel → port 3001 | ⬜ Pending |
| Telegram long-polling | Call `startLongPolling()` from bot.ts | ⬜ Pending |
| Cron | `npx tsx src/lib/jarvis/scheduler/cronRunner.ts` | ⬜ Pending |

**Prerequisites for local activation:**
- PM2 installed: `npm install -g pm2`
- Claude Code SDK authenticated: `claude` CLI logged in on this machine
- Cloudflare Tunnel: `cloudflared tunnel` pointing at port 3001

---

## Active Milestone Context

The v4.4 Guided Onboarding milestone (L-03 in progress) is SEPARATE from this SDK work.
The SDK migration was a parallel track. Both are now on master.

**v4.4 current position (from STATE.md):**
- L-01 COMPLETE, L-02 COMPLETE
- L-03: PLAN created (L-03-01-PLAN.md), awaiting APPLY
- 7 bugs were fixed in commit `fbd1459` (last v4.4 session)
- UNIFY for L-03-02/03 was pending — still pending
- Resume file for v4.4: `jarvis/.paul/HANDOFF-2026-03-05-h.md`

---

## How to Resume

**If resuming the SDK local activation:**
```
Read jarvis/.paul/HANDOFF-2026-03-05-sdk-shipped.md
The SDK migration is shipped to Vercel (anthropic-api path, unchanged behavior).
Local activation needs: PM2 start, MCP server test, SDK brain test.
See the pending tests table above.
```

**If resuming v4.4 Guided Onboarding:**
```
Read jarvis/.paul/HANDOFF-2026-03-05-h.md
Resume L-03 — UNIFY L-03-02/03 first, then APPLY L-03-01-PLAN.md
```

---

## Env Vars Reference

```bash
# Vercel (already set, no changes needed)
ANTHROPIC_API_KEY=...          # existing brain
ELEVENLABS_API_KEY=...         # TTS (Jonathan's cloned voice)

# Add to .env.local for local SDK activation
JARVIS_BRAIN_PROVIDER=claude-code-sdk   # activates Opus SDK brain
JARVIS_DEPLOY_MODE=local                # switches to local mode
JARVIS_SI_PROVIDER=claude-code-sdk      # SI pipeline uses SDK too

# PM2 sets these automatically via ecosystem.config.js
# Do NOT set JARVIS_BRAIN_PROVIDER on Vercel — default (anthropic-api) is correct
```
