# Roadmap: Jarvis v4.2 Meal Planning & Kitchen Intelligence

**Milestone:** v4.2
**Status:** COMPLETE
**Phases:** 1 (J — Meal Planning Pipeline)
**Completed:** 2026-03-01
**Previous milestones:**
- v4.0 Brain Swap & Personal Domain — COMPLETE (Phases A-G)
- v4.1 Bill Payment & Beyond — COMPLETE (Phases H-I)

---

## Previous Milestones (Complete)

| Phase | Name | Milestone | Status |
|-------|------|-----------|--------|
| A | Intelligence Audit | v4.0 | Complete |
| B | SDK Integration | v4.0 | Complete |
| C | Memory & Intelligence Preservation | v4.0 | Complete |
| D | Self-Improvement Loop | v4.0 | Complete |
| E | Mobile-First UI Redesign | v4.0 | Complete (E-01–E-06) |
| F | Vector Memory | v4.0 | Complete |
| G | Integration & Polish | v4.0 | Complete |
| H | Google Calendar Integration | v4.1 | Complete |
| I | Bill Payment Pipeline | v4.1 | Complete |

---

## Current Milestone: v4.2

**Theme:** Make meal planning effortless — save recipes conversationally, plan weekly meals, track pantry inventory, and generate smart shopping lists that subtract what you already have.

**Why now:** The Notion Life OS has three empty-shell databases (Recipes, Weekly Meal Plan, Ingredients) and ~70% of the backend infrastructure already exists. The codebase has tool definitions, schemas, interfaces, query builders, and formatters. What's missing is the remaining tools, the UI, briefing integration, and the killer feature: pantry-aware shopping list generation.

**Who uses this:** Jonathan and his wife, daily. Same UX standard as Bill Payment — immediately obvious, polished, zero friction.

---

## Phase J: Meal Planning & Kitchen Intelligence

**Goal:** Complete meal planning pipeline — conversational recipe management, weekly meal planning, pantry tracking, and smart shopping list generation through natural language.

**Plans:**

| Plan | Name | Scope | Status |
|------|------|-------|--------|
| J-01 | Backend Foundation | Schemas + 7 tools + system prompt | Complete |
| J-02 | Briefing Integration | Types + BriefingBuilder + store + fetch | Complete |
| J-03 | Frontend UI | Route + MealsView + 4 tabs + quality uplift | Complete |
| J-04 | Polish & Intelligence | Recipe times + meal awareness + Claude shopping | Complete |

**Ordering rationale:** Databases are empty. Conversational tools (J-01) ship first so Jonathan can populate data by talking to Jarvis. Briefing (J-02) makes that data visible in morning briefings. UI (J-03) gives the visual weekly planner experience. Polish (J-04) ties it all together with chat CTAs and prep time awareness.

**Blocker:** Jonathan must create the Pantry database in Notion and set env vars before J-01 execution. Existing databases (Recipes, Meal Plan, Ingredients) need Jarvis integration access confirmed.

**Pre-written plan:** Full J-01 plan exists at `~/.claude/plans/compiled-drifting-cherny.md`. J-02 through J-04 have summaries. All need migration to `.paul/phases/J-meal-planning/` and verification against current codebase (post-audit code may have shifted).

### J-01: Backend Foundation

**Scope:** 7 new Claude tools, enhanced schemas, system prompt update

**Key deliverables:**
- `PANTRY_PROPS` + `SHOPPING_LIST_PROPS` constants and interfaces
- `buildMealPlanFilter()`, `buildPantryFilter()`, `buildShoppingListFilter()`
- `formatPantryResults()`, `formatShoppingListResults()`, `parsePantryResults()`
- 7 tools: `query_meal_plan`, `create_recipe`, `query_shopping_list`, `update_pantry`, `query_pantry`, `generate_shopping_list`, `clear_shopping_list`
- `findOrCreateIngredients()` helper for recipe-ingredient auto-linking
- `generate_shopping_list` = killer feature (meal plan ingredients - pantry stock = shopping list)
- Graceful degradation when databases not configured

### J-02: Briefing Integration

**Scope:** Meals appear in morning briefings and feed the personal store

**Key deliverables:**
- `MealPlanSummary` interface + `meals` field in `BriefingData`
- Meal plan + shopping list count queries in `buildMorningBriefing()` parallel fetch
- `transformMeals()` in useJarvisFetch + `personalStore.setMeals()`

### J-03: Frontend UI

**Scope:** Dedicated `/personal/meals` page with 4-tab layout

**Key deliverables:**
- `MealsView.tsx` container with tab navigation
- `WeeklyPlannerTab.tsx` — 7-day grid (desktop) / accordion (mobile)
- `RecipeBrowserTab.tsx` — filterable recipe gallery
- `ShoppingListTab.tsx` — grouped checklist
- `PantryTab.tsx` — categorized inventory with low-stock warnings
- Amber-themed glassmorphism, chat CTAs on every empty state

### J-04: Polish & Intelligence

**Scope:** Chat CTAs, prep time awareness, shopping intelligence

**Key deliverables:**
- Empty state buttons open chat with contextual prompts
- Prep time calculation: recipe prepTime + cookTime → suggest start time
- Shopping list grouping by store category
- Briefing enrichment: "Chicken Stir-Fry for dinner — start prep around 5:30 PM"

---

## Dependency Graph

```
Phase J (Meal Planning)
    │
    ├── J-01: Backend Foundation (tools + schemas)
    │     │
    │     ▼
    ├── J-02: Briefing Integration (meals in morning briefing)
    │     │
    │     ▼
    ├── J-03: Frontend UI (visual weekly planner)
    │     │
    │     ▼
    └── J-04: Polish & Intelligence (chat CTAs + prep time)
```

Sequential: each plan builds on the previous.

---

## Progress

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| J | Meal Planning & Kitchen Intelligence | 4/4 | ✅ Complete | J-01, J-02, J-03, J-04 |

---

## Next Milestone: v4.3 — Guided Onboarding ("Wife-Ready Experience")

**Vision:** Jarvis becomes a patient, emotionally intelligent teacher. Jonathan's wife opens the app cold, knows nothing, and Jarvis walks her step-by-step through every feature — framing each as mental load removed. Progressive day-by-day curriculum, conversational teaching through chat, micro-celebrations, zero jargon. If she can use it with zero help from Jonathan, the product is ready.

**Depends on:** v4.2 complete (all features stable before teaching them)
**Full requirements:** See PROJECT.md v4.3 section

---

## Phase K: Jarvis Academy — Codebase Teaching Engine

**Goal:** Give Jarvis the ability to read, understand, and teach about Jonathan's project codebases through conversation. Read actual source code via GitHub API, explain how things work, find bugs together.

**Plans:**

| Plan | Name | Scope | Status |
|------|------|-------|--------|
| K-01 | Core Academy Engine | 3 tools + GitHub reader + project registry + system prompt | Complete |
| K-02 | Deep Visopscreen Curriculum | Expanded manifest, topic-to-file mapping, teaching notes | Not started |
| K-03 | Creator Workflow + Multi-Domain | Creator expansion, template for adding new projects | Not started |
| K-04 | Academy UI + Intelligence | Progress page, DB-backed tracking, teaching effectiveness | Not started |

**Blocker:** Jonathan must create GitHub PAT and set GITHUB_TOKEN + GITHUB_OWNER in Vercel.

---

## Future Concepts (Not In This Milestone)

- **Intelligence Evolution** — Situation-behavior mappings, deterministic satisfaction, effectiveness scoring, rule graduation (`concepts/intelligence-evolution-v41.md`)
- **Domain Expansion** — 6 empty domains need content (Ethereal Flame, Reset Biology, CritFailVlogs, Visopscreen, Satori Living, Entity Building)
- **Write-back Mutations** — Notion updates from UI (currently local-only)
- **Shell Convergence** — Unify `/jarvis` and `/jarvis/app`

---

*Created: 2026-02-28*
*Milestones: v4.2 Meal Planning & Kitchen Intelligence, v4.3 Academy Engine*
