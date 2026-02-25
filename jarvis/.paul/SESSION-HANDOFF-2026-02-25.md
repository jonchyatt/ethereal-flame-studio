# Session Handoff — 2026-02-25

## What Happened This Session

### 1. Resumed from interrupted v4.0 milestone setup
- Previous session had updated PROJECT.md with v4.0 scope but nothing else
- STATE.md, MILESTONES.md, ROADMAP.md were all stale (still showing v2.0)

### 2. Chose PAUL over GSD for v4.0
- User asked which workflow leads to a "self-improving, DaVinci genius-level life manager"
- Recommended PAUL (scalpel) over GSD (bulldozer) because:
  - Work is nuanced transformation, not volume execution
  - User explicitly wants to NOT rush and destroy hidden gems
  - Self-improvement requires iteration, not assembly-line execution

### 3. Ran deep research (Phase A) — 3 parallel Explore agents
**Jarvis audit (completed):** Found 17 hidden gems across the intelligence stack
**Agent Zero audit (completed):** Found self-improvement loop (critic → evaluate → evolve behavior)
**ClaudeClaw audit (completed):** Proved Claude Code SDK pattern (query() + .mcp.json)

Research saved to: `jarvis/.paul/research/v4-intelligence-audit.md`

### 4. Phase B: SDK Integration (COMPLETE)
- **Decision:** Claude Code SDK is INCOMPATIBLE with Vercel serverless (spawns subprocess, needs persistent JSONL, MCP servers also spawn subprocesses)
- **Chosen:** Option B — Anthropic API + MCP Connector (beta)
- **Built:** `sdkBrain.ts` (161 LOC) — dedicated tool execution engine
- **Refactored:** `chatProcessor.ts` (263→168 LOC) — now an orchestrator
- **Added:** Multi-model routing (Haiku for CRUD, Sonnet for complex when A0 down)
- **Loop:** PLAN ✓ → APPLY ✓ → UNIFY ✓

### 5. Phase C: Planning (IN PROGRESS — plan needs revision)
- Created C-01-PLAN.md but user raised valid concern:
  - Original plan said "keep Notion tools custom, don't use MCP"
  - User worried this disconnects from how Claude's brain intends to work
  - **Resolution:** Gems CAN be relocated:
    - Gem #12 (fuzzy matching) → Claude with MCP can search directly (BETTER)
    - Gem #13 (recurring task auto-creation) → post-tool-result hook in sdkBrain
    - Gem #16 (Notion API workarounds) → Notion MCP server may handle, else post-hook
  - Plan C-01 needs revision to use MCP for Notion + relocate gems to hooks/prompts

---

## Current File State

### PAUL Project Structure
```
jarvis/.paul/
├── PROJECT.md              — v4.0 scope, Option D architecture
├── ROADMAP.md              — 7 phases (A-G), A+B complete, C planning
├── STATE.md                — Phase C planning, loop at PLAN created
├── SESSION-HANDOFF-2026-02-25.md  — this file
├── research/
│   └── v4-intelligence-audit.md   — full 3-codebase audit (17 gems)
└── phases/
    ├── B-sdk-integration/
    │   ├── B-01-PLAN.md           — SDK integration plan (executed)
    │   └── B-01-SUMMARY.md        — completion summary
    └── C-memory-preservation/
        └── C-01-PLAN.md           — NEEDS REVISION (see concern above)
```

### Source Files Changed This Session
```
NEW:  src/lib/jarvis/intelligence/sdkBrain.ts (161 LOC)
      — Tool execution engine: think() function
      — Multi-model: MODEL_FAST (Haiku), MODEL_DEEP (Sonnet)
      — Parallel tool execution via Promise.all
      — withRetry wrapper preserved
      — Prepared for MCP Connector (not yet wired)

MODIFIED: src/lib/jarvis/intelligence/chatProcessor.ts (168 LOC, was 263)
      — Now an orchestrator, delegates tool loop to sdkBrain.think()
      — Preserved: Agent Zero routing (complex query regex patterns)
      — Preserved: Fire-and-forget persistence + summarization triggers
      — Tool name routing uses Set.has() instead of Array.includes()
      — createToolExecutor(sessionId) factory routes to 3 executors
```

### Files NOT Changed (all 17 gems intact)
```
src/lib/jarvis/intelligence/systemPrompt.ts    — Gem #1: personality
src/lib/jarvis/memory/retrieval.ts              — Gems #2, #3: scoring, proactive surfacing
src/lib/jarvis/memory/decay.ts                  — Gem #4: explicit-never-decay
src/lib/jarvis/memory/preferenceInference.ts    — Gem #5: observation → inference
src/lib/jarvis/memory/queries/memoryEntries.ts  — Gem #6: BM25 fuzzy search
src/lib/jarvis/memory/summarization.ts          — Gem #7: summarize + backfill
src/lib/jarvis/executive/Scheduler.ts           — Gem #9: tab visibility recovery
src/lib/jarvis/executive/CheckInManager.ts      — Gem #10: auto-dismiss + capture
src/lib/jarvis/executive/LifeAreaTracker.ts     — Gem #11: relative neglect
src/lib/jarvis/notion/recentResults.ts          — Gem #12: fuzzy title resolution
src/lib/jarvis/notion/toolExecutor.ts           — Gem #13: recurring task auto-create
src/lib/jarvis/executive/NudgeManager.ts        — Gem #14: programmatic chime
src/lib/jarvis/resilience/errorClassifier.ts    — Gem #15: error self-healing
src/lib/jarvis/executive/BriefingBuilder.ts     — Gem #16: parallel queries + workarounds
src/lib/jarvis/intelligence/tools.ts            — Gem #17: panel tools (teach/view/show)
src/lib/jarvis/intelligence/memoryTools.ts      — memory tool schemas
src/lib/jarvis/config.ts                        — feature flags (not yet modified for MCP)
src/lib/jarvis/telegram/context.ts              — system prompt context builder
src/app/api/jarvis/chat/route.ts                — SSE endpoint (unchanged)
```

---

## Key Decisions Made This Session

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | PAUL over GSD for v4.0 | Scalpel for nuanced transformation vs bulldozer for volume |
| 2 | v4.0 numbering | Preserve milestone history (v1, v2.0, v3.0) |
| 3 | Option D: Hybrid SDK + Agent Zero patterns | Preserves gems + gains SDK + self-improvement |
| 4 | Claude Code SDK incompatible with Vercel | Spawns subprocess, needs persistent filesystem |
| 5 | Option B: Anthropic API + MCP Connector | Works in serverless, Anthropic handles MCP server-side |
| 6 | Multi-model routing | Haiku for CRUD, Sonnet for complex when Agent Zero down |
| 7 | Gems CAN be relocated to hooks/prompts | Allows using Notion MCP while preserving intelligence |

## Open Item: Phase C Plan Revision Needed

C-01-PLAN.md says "keep Notion tools custom, don't use MCP for Notion." This needs revision based on the user's feedback:

**New approach for Phase C:**
- Upgrade @anthropic-ai/sdk to latest
- Wire MCP Connector for Notion (not just future tools)
- Relocate gems to post-tool-result hooks in sdkBrain.ts
- Enrich system prompt with recurring task instructions
- Let Claude use Notion MCP search directly (replaces fuzzy matching)
- Feature flag so it's safe to roll out gradually

## Pre-existing Build Issues (not from our work)

```
local-agent routes have missing module imports:
- @/lib/leases
- @/lib/local-agent/auth
- @/lib/local-agent/registry
- @/lib/storage/r2Multipart
These existed before this session. Unrelated to Jarvis.
```

## Git Status

Branch: feature/audio-prep-mvp
Changed files:
- .claude/settings.local.json (modified)
- jarvis/.planning/PROJECT.md (modified — v4.0 scope added)
- src/lib/jarvis/intelligence/chatProcessor.ts (refactored)
- src/lib/jarvis/intelligence/sdkBrain.ts (new)
- jarvis/.paul/* (new — entire PAUL project structure)

**NOT YET COMMITTED.** All changes are unstaged.

**Remember:** Always merge to master immediately after commit. Single developer, auto-deploys from master.
