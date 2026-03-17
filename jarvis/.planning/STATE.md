# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** One agent with complete context across all life domains, taking autonomous actions while Jon works hospital shifts
**Current focus:** v5.0 Agent Unification

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-16 — Milestone v5.0 started

## Milestone Summary

**v5.0 Agent Unification** (active):
- Absorb Agent Zero capabilities into Jarvis
- Browser automation for bill pay, grants, corporate credit
- Bitwarden vault for credential injection
- Research-as-library pattern
- Flexible scheduled task system
- Sunset Agent Zero

## Completed Milestones

See `.planning/MILESTONES.md` (GSD v1-v2) and `.paul/MILESTONES.md` (PAUL v4.0-v4.3)

- v1.0: Executive Function Partner (6 phases, 18 plans) — 2026-02-02
- v2.0: Memory & Production (5 phases, 22 requirements) — 2026-02-15
- v3.0: Tutorial & Teaching (partial, 5 phases) — 2026-02-05
- v4.0: Brain Swap & Personal Domain (7 phases) — 2026-02-27
- v4.1: Bill Payment & Beyond (2 phases) — 2026-02-28
- v4.2: Meal Planning & Kitchen Intelligence (1 phase) — 2026-03-01
- v4.3: Academy Engine (1 phase) — 2026-03-02
- v4.4: Guided Onboarding (in progress, paused for v5.0)

## Accumulated Context

### Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| GSD for v5.0 planning | Parallel subagents + 1M Opus context = best outcome | 2026-03-16 |
| Sunset Agent Zero | Duplicate API billing, Jarvis absorbs all unique capabilities | 2026-03-16 |
| Own repo for Jarvis | Nested in ethereal-flame-studio causes Claude context confusion | 2026-03-16 |
| Bitwarden vault (free tier) | CLI-accessible, LLM never sees passwords, scales to many portals | 2026-03-16 |
| Unified agent > isolation | One agent with full life context makes smarter connections than 6 siloed ones | 2026-03-16 |

### Pending Todos

- v4.4 L-03-04 iPhone checkpoint still pending (paused)
- 3 urgent grants due March 31 (Verizon Digital Ready, Pilot Growth Fund, Amber Grant)

### Blockers/Concerns

- Repo migration must not break PM2 or Cloudflare tunnel
- Grant deadlines (March 31) may create urgency during milestone execution

## Session Continuity

Last session: 2026-03-16
Stopped at: Milestone v5.0 initialization — defining requirements
Resume file: None
