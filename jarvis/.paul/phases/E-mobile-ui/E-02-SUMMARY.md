---
phase: E-mobile-ui
plan: 02
type: research
status: COMPLETE
started: 2026-02-25
completed: 2026-02-25
---

# E-02 Summary: Information Architecture

## What Was Built

Complete information architecture document for the Jarvis multi-domain operating system:
`jarvis/.paul/research/phase-e-information-architecture.md` (v1.1, ~1,600 lines)

### Document Contents (9 Sections + 6 Enhancements)

1. **Navigation Model** — Domain Rail + Priority Home + Command Palette + Quick Capture (4 layers)
2. **Domain Hierarchy** — All 7 domains mapped to leaf level with data sources, actions, notifications, build status. Includes activation model (Active/Setup/Hidden) and pinnable widget registry
3. **Screen Architecture** — 8 screen types: Priority Home, Domain Dashboard, Sub-Program View, Detail View, Chat Overlay, Action Sheet, Empty State, Error State
4. **Cross-Domain Data Flows** — 14 flows documented (source → destination → trigger → priority)
5. **Notification & Briefing Architecture** — Pipeline diagram, priority classification rules, 4 auto-switching modes (Focus/Active/Review/DND), morning/midday/evening briefings + Weekly Review retrospective
6. **Sentinel Integration** — Monitoring hooks per domain, instruction format, graceful degradation
7. **State Management** — Domain-scoped Zustand stores, data fetching strategy, optimistic updates, data freshness model (5 tiers: Live → Unknown)
8. **Technical Routing** — Complete Next.js App Router layout tree, shared components, middleware, API proxy strategy, first-run onboarding flow
9. **Implementation Wave Guide** — 5 build waves mapped to architecture sections

### v1.1 Enhancements (Added During Review)

| Enhancement | Section | Value |
|-------------|---------|-------|
| Pinnable Home Widgets | Section 2 (Home) | iOS-style widget registry — user pins up to 4 domain widgets to Home for instant 30-second scan |
| Quick Capture & Route | Section 1 (Navigation) | One-shot voice/text input → NLP classify → route to domain in ≤3 seconds |
| Weekly Review | Section 5 (Briefings) | Sunday retrospective with cross-domain trends + self-improvement insights |
| First-Run Experience | Section 8 (Routing) | 6-step onboarding wizard: welcome → domains → data sources → widgets → notifications → first briefing |
| Empty & Error States | Section 3 (Screens) | Architectural patterns for no-data and API-failure states across all screens |
| Data Freshness Model | Section 7 (State) | Trust layer for proxy architecture — 5 freshness tiers with visual indicators |

## Acceptance Criteria Results

| AC | Status | Notes |
|----|--------|-------|
| AC-1: Navigation Model Defined | PASS | 4-layer model: Domain Rail + Priority Home + Command Palette + Quick Capture. Desktop + mobile specified. Context persistence defined. |
| AC-2: Screen Architecture Mapped | PASS | 8 screen types with ASCII wireframes. Chat as contextual overlay. Deep linking URL scheme for all routes. |
| AC-3: Cross-Domain Data Flows | PASS | 14 flows documented with source/destination/trigger/priority. Covers all required connections. |
| AC-4: Notification & Briefing Architecture | PASS | Full pipeline (sources → classifier → mode gate → channels). 4 modes. 4 briefing types (morning/midday/evening/weekly). Aggregation rules concrete. |
| AC-5: Sentinel Integration Points | PASS | Monitoring hooks per domain with frequencies. Instruction format (JSON). Graceful degradation specified. |
| AC-6: Architecture Enables E-03 | PASS | All navigation, hierarchy, and data flow decisions resolved. E-03 can design components without structural ambiguity. |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Domain Rail as primary navigation | Research: Slack/Discord icon rail pattern scales to 7+ domains, works on both mobile (horizontal) and desktop (vertical) |
| Priority Home as default view | Things 3 "Today" mental model — cross-domain, not tied to any single domain |
| Command Palette (Cmd+K) for power users | Superhuman/Linear pattern — keyboard-first, search-everything |
| Quick Capture as 4th navigation layer | Between-patients use case needs <3s one-shot input, distinct from chat or action sheets |
| Pinnable widgets (max 4) | iOS widget pattern — personalizes the 30-second scan without bloating Home |
| Chat as contextual overlay (not dedicated screen) | Chat should enhance any view, not be a destination. Context injection from current screen. |
| Proxy pattern for external data | Don't duplicate Reset Bio MongoDB or Visopscreen DB. Jarvis is display layer. |
| Data freshness tiers | Trust layer required because proxy data has variable staleness |
| Onboarding wizard (6 steps) | First-run experience shapes all subsequent UX — can't leave it undefined |
| Weekly Review | Bridges self-improvement loop (Phase D) into the UI — patterns become actionable suggestions |

## Files Created/Modified

- **Created:** `jarvis/.paul/research/phase-e-information-architecture.md` (v1.1)
- **Input consumed:** `jarvis/.paul/research/phase-e-domain-atlas.md`, web research on UI patterns

## Next

E-03: UI System Design — component architecture, visual language, responsive strategy.
The information architecture resolves all structural decisions. E-03 designs how each room *looks*.
