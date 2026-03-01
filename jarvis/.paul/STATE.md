# Project State

## Current Position

Milestones in progress:
- v4.2 Meal Planning & Kitchen Intelligence (Phase J)
- v4.3 Academy Engine (Phase K)

Phase J: Plan J-01 COMPLETE, ready for J-02
Phase K: Plan K-01 COMPLETE, ready for K-02
Last activity: 2026-03-01 — K-01 Core Academy Engine shipped (3 tools + GitHub reader + system prompt)

Progress:
- v4.2: [██░░░░░░░░] 25% (1 of 4 plans)
- v4.3/K: [██░░░░░░░░] 25% (1 of 4 plans)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [J-01 loop complete — ready for next PLAN]
```

## Current Phase: J — Meal Planning & Kitchen Intelligence

Goal: Complete meal planning pipeline — conversational recipe management, weekly meal planning, pantry tracking, and smart shopping list generation through natural language.

Key context:
- J-01 Backend Foundation COMPLETE — 7 tools deployed, all schemas/filters/formatters built
- Human blocker remains: Jonathan must create Pantry DB in Notion + set 5 env vars in Vercel
- Tools gracefully degrade until databases are configured
- Vision input framework captured as new requirement (camera → image recognition → tool calls)
- Model switching (Haiku ↔ Sonnet) for vision tasks captured as requirement
- 3 remaining plans: Briefing → UI → Polish

Plans:
| Plan | Name | Status |
|------|------|--------|
| J-01 | Backend Foundation | Complete |
| J-02 | Briefing Integration | Not started |
| J-03 | Frontend UI | Not started |
| J-04 | Polish & Intelligence | Not started |

New requirements captured (vision input):
- Vision input framework: camera → recognition → tool calls (reusable across domains)
- Model tier switching (Haiku ↔ Sonnet) controllable from app settings
- Pantry photo capture: snap groceries → recognize items → bulk update_pantry
- Reference implementation: Reset Biology nutrition tracking (GPT-4o-mini, sharp compression)
- Architectural decision: native chat vision (Claude sees image + has tools in same turn) over separate endpoint

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

### Git State
Last commit: (pending K-01 commit)
Branch: master
Feature branches merged: none (developed directly on master)

## Session Continuity

Last session: 2026-03-01
Stopped at: J-01 unified, loop complete
Next action: J-02 (Briefing Integration) or K-02 (Deep Visopscreen Curriculum)
Resume files:
- .paul/phases/J-meal-planning/J-01-SUMMARY.md
- .paul/phases/K-jarvis-academy/K-01-SUMMARY.md
Resume context:
- J-01 loop fully closed: SUMMARY written, all 7 AC pass, 1 deviation documented
- K-01 complete: 3 academy tools, GitHub reader, system prompt enhancement, 5 new files + 4 modified
- K-01 human blocker: Jonathan must create GitHub PAT + set GITHUB_TOKEN/GITHUB_OWNER in Vercel
- J-02 scope: MealPlanSummary interface, BriefingBuilder integration, store wiring
- K-02 scope: Deep Visopscreen curriculum, topic-to-file mapping, teaching notes per area
