# Project State

## Current Position

Milestones in progress:
- v4.2 Meal Planning & Kitchen Intelligence (Phase J) — ALL PLANS COMPLETE, awaiting UNIFY
- v4.3 Academy Engine (Phase K)

Phase J: J-04 APPLIED — all 4 plans executed, ready for UNIFY
Phase K: Plan K-01 COMPLETE, ready for K-02
Last activity: 2026-03-01 — J-04 APPLIED (Polish & Intelligence — 3 tasks, 10 files)

Progress:
- v4.2: [██████████] 100% (4 of 4 plans complete, awaiting unify)
- v4.3/K: [██░░░░░░░░] 25% (1 of 4 plans)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [J-04 applied, ready for UNIFY]
```

## Current Phase: J — Meal Planning & Kitchen Intelligence

Goal: Complete meal planning pipeline — conversational recipe management, weekly meal planning, pantry tracking, and smart shopping list generation through natural language.

Key context:
- J-01 Backend Foundation COMPLETE — 7 tools deployed, all schemas/filters/formatters built
- J-02 Briefing Integration COMPLETE — full weekly meals + shopping list count in briefing pipeline
- J-03 Frontend UI COMPLETE — /personal/meals route, 4-tab MealsView, dashboard card, store wiring
- J-04 Polish & Intelligence COMPLETE — recipe times, full-week chat context, Claude-reasoned shopping
- Human blocker CLEARED: Pantry + Shopping List DBs created, 5 env vars set in Vercel
- Human action still pending: add "Servings" number column to Notion Meal Plan DB

Plans:
| Plan | Name | Status |
|------|------|--------|
| J-01 | Backend Foundation | Complete |
| J-02 | Briefing Integration | Complete |
| J-03 | Frontend UI | Complete |
| J-04 | Polish & Intelligence | Complete |

New requirements captured (vision input):
- Vision input framework: camera → recognition → tool calls (reusable across domains)
- Model tier switching (Haiku ↔ Sonnet) controllable from app settings
- Pantry photo capture: snap groceries → recognize items → bulk update_pantry
- Reference implementation: Reset Biology nutrition tracking (GPT-4o-mini, sharp compression)
- Architectural decision: native chat vision (Claude sees image + has tools in same turn) over separate endpoint

New requirements captured (J-04 — intelligent scaling):
- Servings field wired end-to-end (MEAL_PLAN_PROPS → MealPlanSummary → PersonalMeal). Human action: add "Servings" number column to Notion Meal Plan DB.
- Intelligent recipe scaling via Claude reasoning, NOT dumb multiplication. When servings changes: spices scale sub-linearly, proteins/carbs scale linearly, cooking times adjust for volume, equipment constraints noted.
- generate_shopping_list should accept target servings override, pull recipe base servings + ingredients, pass to Claude for intelligent adjustment, return adjusted quantities + cooking notes.
- Evening wrap / briefing meal text should mention servings when set ("Stir-Fry for 6 tonight").

New requirements captured (J-04 — proactive meal timing intelligence):
- Contextual meal reminders: Jarvis reasons about when to notify based on setting (Home=prep time, Dine-Out=travel+reservation, Takeout=order lead), current user activity, and household context
- NOT fixed-offset timers — Claude reasons about the right moment from first principles
- MVP: enrich system prompt with tonight's meal + prep context during any conversation (zero new infra)
- Full vision: proactive notification channel (Telegram/push) for out-of-chat reminders
- Learning loop: Phase D captures timing preferences as situational rules that sharpen over weeks ("Jonathan needs prep_time + 20min warning when coding", "wife prefers 30min heads-up")
- Setting discriminator already exists in data model — three completely different temporal patterns from one field

## Completed Milestones

### v4.1 Bill Payment & Beyond — COMPLETE

- Phase H: Google Calendar Integration — COMPLETE (H-01)
- Phase I: Bill Payment Pipeline — COMPLETE (I-01)

### v4.0 Brain Swap & Personal Domain — COMPLETE

- Phase A: Intelligence Audit — COMPLETE (17 gems identified)
- Phase B: SDK Integration — COMPLETE (Anthropic API + MCP Connector)
- Phase C: Memory & Intelligence Preservation — COMPLETE (17/17 gems preserved)
- Phase D: Self-Improvement Loop — COMPLETE (3-layer: Haiku critic + Opus reflection + Opus meta-eval)
- Phase E: Mobile-First UI — COMPLETE (core shell + personal domain, E-01 through E-06)
- Phase F: Vector Memory — COMPLETE (F-01 dual retrieval + F-02 consolidation)
- Phase G: Integration & Polish — COMPLETE (G-01 through G-04)

## Honest Gaps (Future milestones)

- 6 empty domains (only Personal has content)
- Journal + Health sub-pages: no API data, show empty
- Write-back mutations: local-only (Notion doesn't update)
- Voice pipeline absent from new shell
- Old shell (/jarvis) not converged with new (/jarvis/app)
- Intelligence Evolution concepts documented but not executed
- Jarvis Academy K-01 complete (3 tools), K-02-K-04 not executed

## Accumulated Context

### Key Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| v4.2 = focused meal planning only | Milestone | Ships faster, follows v4.1 pattern |
| 4 sequential plans (Backend → Briefing → UI → Polish) | Phase J | Same proven pipeline as Bill Payment |
| Pre-written plan needs migration + verification | Phase J | Code shifted during 6-layer audit |
| Pantry DB is human-action blocker | J-01 | Jonathan creates in Notion before execution |
| generate_shopping_list is the killer feature | J-01 | Meal plan ingredients - pantry stock = shopping list |
| archivePage added to NotionClient | J-01 | updatePage can't set archived:true — needed for clear_shopping_list |
| Native chat vision over separate endpoint | Phase J | Claude sees image + has tools in same turn, no separate API |
| Reusable vision framework | Phase J | Same pipeline works for receipts, documents, any domain |
| Model switching for vision (Haiku ↔ Sonnet) | Phase J | User controls from app settings, applies to all vision tasks |
| v4.3 = Guided Onboarding milestone | Milestone | Wife-ready experience — Jarvis teaches conversationally, progressive day-by-day curriculum, zero jargon |
| Teach AFTER stability, not during build | Milestone | v4.3 depends on v4.2 complete — all features stable before teaching them |
| Pantry + Shopping List DBs created | J-01 blocker cleared | 5 env vars ready to set in Vercel |
| Servings field added to schema + pipeline | J-02 | Flows through entire pipeline, degrades to null until Notion column added |
| Intelligent recipe scaling (not just multiply) | J-04 | Claude reasons about sub-linear spice scaling, cooking time changes, equipment |
| Consistent onChat prop pattern for tab contents | J-03 | All tab content components receive callbacks as props, not read stores directly |
| Empty days are interactive, not passive | J-03 | Day-specific CTA opens chat with contextual prompt |
| Proactive meal timing = contextual reasoning, not timers | J-04 | Setting field discriminates Home/Dine-Out/Takeout temporal patterns |
| Recipes DB queried ONCE in BriefingBuilder | J-04 | Single query replaces 10-15 individual retrievePage calls |
| Full-week meal context in system prompt | J-04 | Enables proactive empty-day suggestions, dinner timing reasoning |
| Conservative pantry subtraction (same-unit only) | J-04 | No risky unit conversions between pantry and shopping |

### Git State
Last commit: b595bde (uncommitted: J-02 + J-03 + J-04 + K-01 + quality fixes)
Branch: master
Feature branches merged: none (developed directly on master)

## Session Continuity

Last session: 2026-03-01 (session 8)
Stopped at: J-04 APPLIED — all 3 tasks complete, build passes, ready for UNIFY
Next action: /paul:unify .paul/phases/J-meal-planning/J-04-PLAN.md
Resume file: .paul/HANDOFF-2026-03-01-session8.md
Resume context:
- J-04 fully applied: recipe detail pipeline, full-week chat context, Claude-reasoned shopping
- All 10 files modified, build clean (zero errors)
- Uncommitted work: J-02 + J-03 + J-04 + K-01 + quality fixes (all on master)
- v4.2 milestone ready for completion after J-04 unify
- Human action still pending: add "Servings" number column to Notion Meal Plan DB
