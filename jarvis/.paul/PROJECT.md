# Jarvis — Self-Improving Life Manager

## What This Is

A self-improving, genius-level life manager built on Anthropic API + MCP Connector with 17 preserved intelligence gems, a 3-layer self-improvement loop, vector memory, and a mobile-first domain OS UI. v4.3 (Academy Engine) complete. v4.4 (Guided Onboarding) Foundation phase shipped — Academy-Spotlight bridge enables same-origin visual teaching where Claude highlights real UI elements during conversation.

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
| v4.2 = focused meal planning only | Ships faster, follows v4.1 single-phase pattern — Phase J |
| Conversational-first (tools before UI) | Databases are empty — chat tools populate data, then UI visualizes it — Phase J |
| generate_shopping_list as killer feature | Meal plan ingredients minus pantry stock = what to buy — Phase J |
| Pantry upsert, not delete | "We're out of milk" = quantity 0, preserves the item for re-stocking — Phase J |
| Sequential J-01→J-04 ordering | Each plan builds on the previous, proven pipeline from v4.1 — Phase J |
| Native chat vision over separate endpoint | Claude sees image + has tools in same turn — no separate vision API needed. User sends photo in chat, Claude calls update_pantry directly — Phase J |
| Reusable vision framework | Image input not pantry-specific — same pipeline works for receipts, documents, any domain. Design generic, not meal-locked — Phase J |
| Model switching for vision | Haiku default (cheap), Sonnet toggle for better recognition. User controls from app settings. Same pattern applies to all vision tasks — Phase J |
| Reset Biology pattern as reference | GPT-4o-mini vision proven in nutrition tracking (sharp compression, low-detail mode, ~$0.00001/image). Jarvis uses Claude native vision instead but borrows compression + cost tracking patterns — Phase J |
| v4.3 = Academy Engine milestone | Codebase teaching engine — Jarvis reads actual source code and teaches about projects — v4.3 |
| Zero new npm deps for GitHub API | Native fetch + in-memory cache sufficient for GitHub REST — Phase K |
| Curriculum-as-data (static manifests) | Topics live in registry, not DB — curriculum changes = code changes with review — Phase K |
| DB-backed progress (no Zustand persist) | Server-side tool calls update progress — localStorage would be stale — Phase K |
| Demotion guard (client + server) | "Review" must never reset completed topics — Phase K |
| Registry-driven tool descriptions | Adding new projects auto-updates all 7 tool option strings — Phase K |
| Jarvis-as-teacher over tutorial UI | Jarvis teaches conversationally through chat, not through static tooltip tutorials — v4.3 |
| Wife test as product test | If she can use Jarvis cold with zero help from Jonathan, the product is ready — future onboarding milestone |
| Zero jargon in teaching | No "Notion", "database", "tool", "query". Just "your tasks", "your meals" — future onboarding milestone |
| Academy-as-onboarding framework | Same curriculum/teaching engine for codebase teaching AND user onboarding — v4.4 L-01 |
| SSE spotlight bridge (tool_use interception) | ChatOverlay intercepts spotlight tool_use events and applies side-effects — no new API routes needed — v4.4 L-01 |
| Same-origin vs cross-origin teaching | Spotlights only for Jarvis project (same-origin); cross-origin projects get verbal descriptions only — v4.4 L-01 |
| /jarvis redirect to /jarvis/app | Old orb was dead end; redirect eliminates confusion without deleting old code — v4.4 L-01 |

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

## v4.2 Requirements — VALIDATED (Meal Planning & Kitchen Intelligence)

- ✓ Conversational recipe creation with ingredient auto-linking — J-01
- ✓ Meal plan querying by day/meal type — J-01
- ✓ Pantry inventory tracking with upsert pattern — J-01
- ✓ Smart shopping list generation (meal plan ingredients - pantry stock) — J-01
- ✓ Shopping list operations (query, check all, clear checked) — J-01
- ✓ Graceful degradation when meal databases not configured — J-01
- ✓ Meals in morning briefing with shopping list count — J-02
- ✓ Visual weekly planner UI with 4-tab layout — J-03
- ✓ Chat CTAs on every empty state — J-03
- ✓ Prep time awareness in briefing and dashboard — J-04
- ✓ Claude-reasoned shopping quantities with intelligent scaling — J-04
- ✓ Full-week meal awareness in every chat conversation — J-04

### Deferred to v4.4+ (Vision — captured during J-04, not in original v4.2 scope)
- ○ Vision input framework: camera → image recognition → tool calls (reusable across domains)
- ○ Model tier switching (Haiku ↔ Sonnet) for vision tasks, controllable from app settings
- ○ Pantry photo capture: snap groceries → recognize items → bulk update_pantry

## v4.3 Requirements — VALIDATED (Academy Engine)

- ✓ GitHub codebase reader with cache and file size guards — K-01
- ✓ Project registry with teaching context for multiple codebases — K-01
- ✓ Academy tools for code exploration, reading, and search — K-01
- ✓ Structured curriculum data model with prerequisites, difficulty, teaching notes — K-02
- ✓ 16 Visopscreen curriculum topics across 5 categories — K-02
- ✓ 12 Creator Workflow curriculum topics with verified file paths — K-03
- ✓ Registry-driven multi-domain: one entry → tools, prompt, UI auto-discover — K-03
- ✓ DB-backed progress tracking with demotion guards — K-04
- ✓ Tabbed Academy UI with 4-state topic cards — K-04
- ✓ Teaching-enriched system prompt (student progress, verification, session flow) — K-04
- ✓ Teaching context in evaluation pipeline — K-04
- ✓ Cross-project priority sorting for "Continue Learning" — K-04

### Deferred to Future Milestone (Guided Onboarding — "Wife-Ready Experience")

The original v4.3 vision was Guided Onboarding. During planning, the scope was refocused to Academy Engine (codebase teaching). v4.4 picks up the onboarding work using Academy as the delivery framework. Status updated as L-01 Foundation ships:

- ◐ 8-topic Jarvis curriculum (Welcome → Tasks → Habits → Bills → Calendar → Meals → Briefing → Chat) — L-01 created data, L-02/L-03 will test
- ◐ Interactive verification via spotlight teaching (Claude highlights UI + guides user) — L-01 bridge built, L-02 will live-test
- ◐ Wife test as acceptance criterion — L-04 is the wife test
- ○ Progressive UI unlocking (reveal features as curriculum advances) — may not be needed if teaching flow is smooth
- ○ Emotional framing on every lesson (mental load reduction)
- ○ Gentle re-engagement nudges
- ○ Zero jargon throughout — partially addressed in teaching prompt
- ○ Contextual re-teaching for unused features

## Future Concepts (Not In Any Milestone)

- **Intelligence Evolution** — Situation-behavior mappings, deterministic satisfaction, effectiveness scoring, rule graduation
- **Vision Input** — Camera → image recognition → tool calls (reusable across domains)
- **Domain Expansion** — 6 empty domains need content
- **Write-back Mutations** — Notion updates from UI (currently local-only)
- **Shell Convergence** — `/jarvis` now redirects to `/jarvis/app` (L-01); full old-shell removal deferred

---
*Last updated: 2026-03-02 after Phase L-01 (v4.4 Foundation complete)*
