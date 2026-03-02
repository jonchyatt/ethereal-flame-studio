# Jarvis — Self-Improving Life Manager

## What This Is

A self-improving, genius-level life manager built on Anthropic API + MCP Connector with 17 preserved intelligence gems, a 3-layer self-improvement loop, vector memory, and a mobile-first domain OS UI. v4.2 (Meal Planning) complete, entering v4.3 (Guided Onboarding).

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
| v4.3 = Guided Onboarding milestone | Teaching requires stability — teach AFTER all features work, not while building. Cross-cutting scope (tasks through meals) deserves its own milestone — v4.3 |
| Jarvis-as-teacher over tutorial UI | Jarvis teaches conversationally through chat, not through static tooltip tutorials. She talks to Jarvis, Jarvis walks her through — v4.3 |
| Progressive disclosure by day | Don't dump all features. Day 1: briefing + tasks. Day 2: bills. Day 3: meals + shopping. Confidence before complexity — v4.3 |
| Wife test as product test | If she can use Jarvis cold with zero help from Jonathan, the product is ready. This is the acceptance criterion for v4.3 — v4.3 |
| Zero jargon in teaching | No "Notion", "database", "tool", "query". Just "your tasks", "your meals", "your shopping list". Emotional framing: each feature removes mental load — v4.3 |

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

## v4.3 Requirements (Guided Onboarding — "Wife-Ready Experience")

**Vision:** Jonathan's wife opens Jarvis for the first time. She knows nothing about how it works. Jarvis itself becomes her patient, emotionally intelligent guide — walking her step-by-step through every feature, framing each as mental load removed, building confidence before complexity. If she can use it cold with zero help from Jonathan, the product is ready.

**Primary user:** Jonathan's wife (non-technical, first-time user, managing household + life)
**Core metaphor:** Jarvis removes emotional and mental load — every feature is framed as "one less thing to carry"
**Architecture:** Structured curriculum (the backbone) delivered through natural conversation (the mechanism). Jarvis has a lesson plan. It knows what to teach, in what order, what's been covered, what's next. Conversation is how it delivers — but the curriculum ensures nothing gets missed.

### Curriculum Architecture
- ○ Defined curriculum with specific learning objectives per feature — what she must understand, what she must try, what confirms mastery
- ○ Ordered lesson progression with prerequisites — can't learn meal planning before she's comfortable with basic chat interaction
- ○ Curriculum state tracked per user — Jarvis knows: lessons completed, current lesson, next lesson, skipped/deferred lessons
- ○ Each lesson has: objective, emotional hook (why this matters), guided walkthrough, interactive exercise, success confirmation, bridge to next lesson
- ○ Jarvis can assess understanding before advancing — "Before we move on, try asking me about your tasks for today"
- ○ Curriculum is complete and auditable — every feature of Jarvis has a lesson, no gaps, no features left untaught

### Curriculum Content (Modules — User Controls the Pace)
- ○ Self-paced: user can complete the entire curriculum in one sitting (2-3 hours) or spread across days — their choice
- ○ After each module, Jarvis offers: "Ready for the next one?" — she continues or stops, picks up exactly where she left off
- ○ Module 1 — Welcome: Jarvis introduces itself, learns her name, sets expectations (~5 min)
- ○ Module 2 — Morning Briefing + Tasks: "This is what your morning looks like now" — briefing walkthrough, adding a task, completing a task
- ○ Module 3 — Calendar + Habits: "Jarvis already knows your schedule" — calendar queries, habit tracking
- ○ Module 4 — Bill Pay: "You'll never miss a payment again" — bill overview, payment navigation, due dates
- ○ Module 5 — Meal Planning + Recipes: "What's for dinner? Jarvis knows" — meal queries, recipe creation
- ○ Module 6 — Shopping + Pantry: "The killer feature" — generate shopping list, pantry tracking, grocery workflow
- ○ Module 7 — Graduation: recap, "you're ready", open-ended confidence

### Conversational Delivery
- ○ Jarvis teaches through chat, not tooltips — "Try saying 'what's on my plate today'" → she does → Jarvis celebrates
- ○ Emotional framing on every lesson: each feature introduced as mental load reduction ("You'll never have to remember bill due dates again")
- ○ Interactive verification: after teaching, Jarvis asks her to try it, confirms success, bridges to next topic
- ○ Micro-celebrations: positive reinforcement at each milestone ("You just set up your first meal plan!")
- ○ Zero jargon: no Notion, database, tool, query — just "your tasks", "your meals", "your shopping list"
- ○ Gentle re-engagement: if she hasn't continued the curriculum, Jarvis nudges — "Ready for the next thing? I think you'll love this one"
- ○ "Ask me anything" escape hatch: at any point she can just ask Jarvis naturally — curriculum pauses, resumes when ready

### System Requirements
- ○ Progressive UI unlocking: don't show all tabs/features at once — reveal as curriculum reaches each feature
- ○ Curriculum completion tracking visible to user: she can see her progress, what she's learned, what's coming
- ○ Contextual re-teaching: if she hasn't used a feature in a while, Jarvis gently reminds and re-offers guidance
- ○ Complete feature coverage: tasks, calendar, habits, bills, meal planning, recipes, pantry, shopping lists, briefings — every feature has a lesson
- ○ Existing tutorial infrastructure reuse: tutorialStore, lessonRegistry, action bus, AcademyHub — upgrade from static scripts to curriculum-driven conversational teaching
- ○ Curriculum data persisted: survives app close, page refresh, device switch — she picks up where she left off

---
*Last updated: 2026-03-01 after Phase J (v4.2 Meal Planning complete)*
