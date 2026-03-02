# Milestones

Completed milestone log for Jarvis.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| v4.0 Brain Swap & Personal Domain | 2026-02-27 | ~3 weeks | 7 phases, 20+ plans |
| v4.1 Bill Payment & Beyond | 2026-02-28 | ~1 day | 2 phases, 2 plans |
| v4.2 Meal Planning & Kitchen Intelligence | 2026-03-01 | ~2 days | 1 phase, 4 plans |
| v4.3 Academy Engine | 2026-03-02 | ~2 days | 1 phase, 4 plans |

---

## v4.3 Academy Engine

**Completed:** 2026-03-02
**Duration:** ~2 days (2026-03-01 to 2026-03-02)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 1 (K — Jarvis Academy) |
| Plans | 4 (K-01 through K-04) |
| Files changed | ~20 unique files |
| Audit fixes | 21 (across 5 hardening sessions on K-04) |

### Key Accomplishments

- 7 academy tools: explore_project, read_files, search_code, list_projects, list_topics, explore_topic, update_progress
- GitHub codebase reader with 5-min cache, 300-line truncation, large file guards
- 28 curriculum topics (16 Visopscreen + 12 Creator Workflow) with prerequisites, teaching notes, difficulty levels
- Registry-driven multi-domain: adding a new project = one registry entry → tools, prompt, UI auto-discover
- DB-backed progress tracking (academy_progress table) with demotion guards on both client and server
- Tabbed Academy UI with 4-state topic cards (locked/available/in-progress/completed)
- Teaching-enriched intelligence: student progress in system prompt, teaching verification, session flow guidance
- Teaching context injected into evaluation pipeline for self-improvement feedback on Jarvis's teaching quality
- Cross-project priority sorting: "Continue Learning" surfaces in-progress topics from any project

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Zero new npm deps for GitHub API | Native fetch + in-memory cache sufficient |
| Curriculum-as-data (static manifests) | Topics live in registry, not DB — curriculum changes = code changes with review |
| DB-backed store (no Zustand persist) | Server-side tool calls update progress — localStorage would be stale |
| Demotion guard (client + server) | "Review" must never reset completed topics |
| Registry-driven tool descriptions | Adding new projects auto-updates all 7 tool option strings |

---

## v4.2 Meal Planning & Kitchen Intelligence

**Completed:** 2026-03-01
**Duration:** ~2 days

### Stats

| Metric | Value |
|--------|-------|
| Phases | 1 (J — Meal Planning Pipeline) |
| Plans | 4 (J-01 through J-04) |

### Key Accomplishments

- 7 meal planning tools: query_meal_plan, create_recipe, query_shopping_list, update_pantry, query_pantry, generate_shopping_list, clear_shopping_list
- Smart shopping list generation (meal plan ingredients - pantry stock = what to buy)
- Claude Haiku-reasoned shopping quantities
- Meals in morning briefing with prep time awareness
- 4-tab MealsView UI (weekly planner, recipe browser, shopping list, pantry)
- Full-week meal context in every chat conversation

---

## v4.1 Bill Payment & Beyond

**Completed:** 2026-02-28
**Duration:** ~1 day

### Key Accomplishments

- Google Calendar integration via service account
- Bill payment pipeline with Pay Now navigation
- Calendar-enriched briefings

---

## v4.0 Brain Swap & Personal Domain

**Completed:** 2026-02-27
**Duration:** ~3 weeks

### Key Accomplishments

- Anthropic API + MCP Connector brain swap (17 intelligence gems preserved)
- 3-layer self-improvement loop (Haiku critic → Opus reflection → Opus meta-eval)
- Mobile-first domain OS UI (shell, home, personal, academy, command palette)
- Vector memory with dual retrieval (BM25 + semantic) and consolidation
- Production hardening (ErrorBoundary, retry, health monitoring, CRON security)

---
