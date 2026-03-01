# Jarvis v4.0 — Brain Swap & Life Manager UI

## What This Is

A self-improving, genius-level life manager that replaces Jarvis's custom Claude API backend with Claude Code SDK while preserving all intelligence gems, and rebuilds the UI as an elegant responsive interface for desktop and mobile.

## Core Value

**One system that knows everything, surfaces what matters, keeps you on track, and gets smarter over time.** Ideas captured, priorities clear, nothing slips — and the system improves itself through self-critique and behavioral evolution.

## Architecture: Option D — Hybrid SDK + Agent Zero Self-Improvement

```
PRESERVED INTELLIGENCE (17 gems from Jarvis)
  personality, memory scoring, preference learning, executive function,
  fuzzy matching, proactive surfacing, error self-healing

SDK BRAIN (ClaudeClaw pattern)
  query(), .mcp.json, session resumption, built-in tools

AGENT ZERO PATTERNS (borrowed)
  self-improvement loop, vector memory, secrets masking

MOBILE-FIRST UI (new)
  responsive chat + voice + dashboard, archived 3D orb
```

## Constraints

- **Deployment:** Push to GitHub → auto-deploy to https://www.whatamiappreciatingnow.com/
- **No local test environments** — test from live site only
- **Tech stack:** Next.js + TypeScript
- **Voice:** Deepgram STT, ElevenLabs TTS
- **Data:** Notion SDK + Turso/libsql for memory
- **AI:** Anthropic API + MCP Connector (not Claude Code SDK — incompatible with Vercel serverless)
- **Hosting:** Vercel (jarvis.whatamiappreciatingnow.com)

## Prior Work

- **v1** (shipped 2026-02-02): Voice pipeline, Notion CRUD, executive function, dashboard
- **v2.0** (complete): Persistent memory, production deployment
- **v3.0** (partial): Tutorial system (T1-T4 complete, T5 backlog)
- **Research:** `jarvis/.paul/research/v4-intelligence-audit.md` — full audit of 3 codebases

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Option D hybrid approach | Preserves all 17 gems while gaining SDK + self-improvement |
| Research before removing | Audit found 17 hidden gems that would've been lost in naive replacement |
| PAUL over GSD for v4.0 | Scalpel approach for nuanced transformation, not volume execution |
| v4.0 numbering | Preserves prior milestone history (v1, v2.0, v3.0) |
| Archive orb, don't delete | Preserve for future miniaturized version |
| Anthropic API + MCP Connector | Claude Code SDK incompatible with Vercel serverless — Phase B |
| Opus for reflection ($3/month) | Best reasoning for the brain that improves the brain — Phase D |
| Three-layer self-improvement | L1 Haiku critic, L2 Opus reflection, L3 Opus meta-evaluation — Phase D |
| enableSelfImprovement ON by default | Self-improvement active immediately, opt-out via env var — Phase D |
| Chat-first bill editing over UI form | update_bill covers all needs without form state/validation/API routes — Phase I |
| navigate_to_payment NOT in WRITE_TOOLS | Opens browser tab, no Notion mutation — avoids wasteful refresh — Phase I |
| JSON action pattern for payment | Follows open_notion_panel pattern: { action, url, title } — Phase I |

## Validated Requirements

- ✓ SDK brain swap with dual-path architecture — Phase B
- ✓ MCP Connector for Notion (server-side) — Phase C
- ✓ Intelligence gems preserved (17/17) — Phase C
- ✓ Self-improvement: conversation evaluation — Phase D
- ✓ Self-improvement: reflection loop with rule evolution — Phase D
- ✓ Self-improvement: meta-evaluation health monitoring — Phase D
- ✓ Vector memory with dual retrieval (BM25 + semantic) — Phase F
- ✓ Memory consolidation (merge similar memories) — Phase F
- ✓ Mobile-first UI with domain OS architecture — Phase E (core shell + personal domain)
- ✓ Brain activation + live data pipeline + executive bridge — Phase G
- ✓ Production hardening (ErrorBoundary, retry, health, CRON) — Phase G
- ✓ Google Calendar integration via service account — Phase H
- ✓ All briefing types enriched with real calendar data — Phase H
- ✓ query_calendar chat tool for schedule queries — Phase H
- ✓ serviceLink end-to-end pipeline (Notion → BriefingBuilder → stores → UI) — Phase I
- ✓ Pay Now button with payment portal navigation — Phase I
- ✓ update_bill chat tool for bill property editing — Phase I
- ✓ navigate_to_payment chat tool for browser-tab payment — Phase I
- ✓ create_bill enhanced with service_link — Phase I
- ✓ Chat bill queries include [Pay here] links — Phase I
