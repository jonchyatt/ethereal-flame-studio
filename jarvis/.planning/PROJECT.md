# Jarvis: Personal Executive Function Partner

## What This Is

A voice-enabled AI companion that integrates with Notion Life OS workspaces to provide executive function support. Jarvis captures ideas, delivers daily briefings, maintains time awareness during deep work, and runs voice-guided review sessions. It uses the Ethereal Flame audio orb as its visual avatar and is hosted on whatareyouappreciatingnow.com.

## Core Value

**One system that knows everything, surfaces what matters, and keeps you on track.** Ideas get captured, priorities stay clear, and nothing slips through cracks - so you can focus on doing the work instead of managing the work.

## Current Milestone: v2.0 Memory & Production — COMPLETE

**Goal:** Give Jarvis persistent memory across sessions and deploy to production.

**Delivered:**
- Persistent memory system (facts, preferences, session logs) — Phase 7-9
- Cross-session conversation continuity — Phase 8
- Production deployment to jarvis.whatareyouappreciatingnow.com — Phase 11
- Fix known bugs (inbox capture, tomorrow preview) — Phase 10
- Explicit guardrails and self-healing patterns — Phase 10 (7/7 verified)

## v1 State (Shipped 2026-02-02)

**Tech Stack:** Next.js + TypeScript, Three.js/R3F, Claude API, Deepgram STT, ElevenLabs TTS, Notion MCP

**Capabilities:**
- Voice input via push-to-talk with real-time transcription
- Intelligent responses via Claude with omnipresent guide personality
- Full Notion CRUD (10 tools for tasks, bills, projects, goals, habits)
- Morning briefing with outline-first spoken summary
- Time nudges for calendar events, deadlines, bills
- Midday and evening check-ins with capture mode
- Weekly review with factual retrospective and forward planning
- Life area tracking with neglect detection
- Dashboard showing tasks/calendar/habits/bills with priority indicators

**Stats:** 49 files, 11,851 LOC TypeScript

## Requirements

### Validated

- ✓ Push-to-talk voice activation — v1
- ✓ Sub-300ms response latency target — v1
- ✓ Omnipresent guide voice persona — v1
- ✓ Context retention across turns — v1
- ✓ Streaming TTS response — v1
- ✓ Daily morning briefing — v1
- ✓ Time awareness nudges — v1
- ✓ End-of-work check-in — v1
- ✓ Midday pulse check — v1
- ✓ Evening wrap — v1
- ✓ Habit/goal progress in briefings — v1
- ✓ Life area priority weighting — v1
- ✓ Voice-guided weekly review — v1
- ✓ Notion MCP integration (tasks, bills, projects, goals, habits) — v1
- ✓ Task CRUD via voice — v1
- ✓ Bill tracking via voice — v1
- ✓ Ethereal Flame orb avatar with state indicators — v1
- ✓ Dashboard with priority indicators — v1
- ✓ Mobile-responsive web app — v1

### Delivered (v2.0) — All Complete

- ✓ Persistent memory system with facts, preferences, and session logs — Phase 7-9
- ✓ Cross-session conversation continuity — Phase 8
- ✓ Production deployment to jarvis.whatareyouappreciatingnow.com — Phase 11
- ✓ Fix inbox capture (items not reaching Notion) — Phase 10
- ✓ Fix tomorrow preview (placeholder data in evening check-in) — Phase 10
- ✓ Explicit guardrails configuration — Phase 10 (7/7 verified)
- ✓ Self-healing error logging — Phase 10 (audit trail via query_audit_log)

### Out of Scope

- Mobile native app — web-first approach, PWA works well
- Calendar write access — read is enough, writing adds risk
- Multi-user accounts — single creator workflow
- Automated task execution — Jarvis advises, user executes
- Real-time streaming transcription — push-to-talk sufficient
- Offline mode — requires LLM, always needs internet
- Client & Content OS — personal first, add in v2

### Future Considerations (v3+)

- **Moltbot Agent**: Old MacBook available for dedicated automation tasks (details TBD)

## v3.0 Tutorial & Teaching System (2026-02-03 — 2026-02-05)

**Research Complete - See `.planning/V3-MASTER-RESEARCH.md`**

Key documents created:
- `V3-MASTER-RESEARCH.md` - Consolidated research and roadmap
- `V3-AGENT-ARCHITECTURE-DEEP-DIVE.md` - GOTCHA vs OpenClaw comparison
- `V3-OPENCLAW-N8N-RESEARCH.md` - N8N integration analysis
- `JARVIS-TUTORIAL-FRAMEWORK.md` - Pedagogical framework
- `ATLAS-INTEGRATION-PREP.md` - MacBook setup guide

### Completed Phases

**Phase 12: Tutorial System — COMPLETE**
- 13 tutorial modules with voice content
- TutorialManager for progress tracking
- 6 tutorial tools integrated with Claude
- Voice commands: "start tutorial", "teach me about X", "what can you do?"

**Phase T1: Notion Panel Foundation — COMPLETE**
- NotionPanel overlay (80% width, slide-in, swipe-to-dismiss)
- notionPanelStore (Zustand, ephemeral)
- open_notion_panel / close_notion_panel tools
- 38 database URLs + 21 dashboard page URLs mapped

**Phase T2: View Mode + Dashboard Integration — COMPLETE**
- CurriculumCard in dashboard sidebar
- 6 cluster cards with lesson counts
- "What can I learn?" voice trigger → get_curriculum_status tool

**Phase T3: Curriculum UI + Progress Tracking — COMPLETE**
- Lesson registry (24 lessons across 6 clusters)
- curriculumProgressStore (persisted, tracks completed lessons)
- CurriculumCard shows progress bars per cluster

**Phase T4: Teach Mode + Daily Action Tutorials — COMPLETE**
- Lesson execution engine (start_lesson / complete_lesson tools)
- Step-by-step content for 5 Daily Action lessons
- Teach mode UI in NotionPanel (step list, practice link, voice hint)
- Claude narrates lessons conversationally, panel is visual companion
- Bug fix: get_curriculum_status routing in chat/route.ts

### Backlog: T5 — Remaining Lesson Content (19 lessons)

Write step-by-step lesson content for the remaining 4 clusters:

| Cluster | Lessons | IDs |
|---------|---------|-----|
| Financial (4) | Budgets, Income, Expenditure, Invoices | budgets-intro, income-tracking, expenses-overview, invoices-intro |
| Knowledge (4) | Notes, Journal, CRM, Topics | notes-intro, journal-intro, crm-intro, topics-intro |
| Tracking (4) | Workouts, Meals, Timesheets, Daily Log | workouts-intro, meals-intro, timesheets-intro, days-intro |
| Planning (4) | Goals, Yearly, Wheel of Life, Dreams | goals-intro, years-intro, wheel-intro, dreams-intro |
| Business (3) | Content, Clients, Channels | content-intro, clients-intro, channels-intro |

**Scope:** Add entries to `src/lib/jarvis/curriculum/lessonContent.ts` only. No new architecture — same pattern as Daily Action lessons. Each lesson needs intro, 3-5 steps with narration + panel notes, and outro.

**Priority:** Low — can be done incrementally as clusters become relevant. Daily Action (the most-used cluster) is already complete.

### Remaining v3 Phases

- **Phase 13: Memory Enhancement** — conversation continuity, hybrid search (BM25 + semantic)
- **Phase 14: Self-Healing Loop** — automatic error recovery with learning
- **Phase 15: Telegram Control** — remote command capability via Telegram
- **Phase 16: Atlas Integration** — MacBook agent (requires hardware)

## Context

**Shipped v1** with 11,851 LOC TypeScript across 49 files.

**User Environment:**
- Primary device: phone (often away from computer)
- Work pattern: gets deeply absorbed, loses track of time and priorities
- Challenge: Not procrastination - *too much engagement*, forgets to shift
- Need: External system to hold the big picture while user focuses

**Known Issues:**
- ~~Captured items during check-ins not yet sent to Notion inbox~~ Fixed in Phase 10
- ~~Tomorrow preview in evening check-in uses placeholder data~~ Fixed in Phase 10
- ANTHROPIC_API_KEY requires user configuration
- Notion databases require user sharing setup

## Constraints

- **Tech Stack**: Next.js + Three.js/R3F — consistent with Ethereal Flame Studio
- **Voice**: Deepgram STT, ElevenLabs TTS — proven providers
- **Data Layer**: Notion SDK v5 (direct) + Turso/libsql for memory
- **AI Backend**: Claude API (Anthropic)
- **Hosting**: whatareyouappreciatingnow.com (Vercel)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app on existing domain | Leverage current infrastructure, accessible from any device | ✓ Good |
| Notion as single source of truth | User already has rich PARA system, avoid data duplication | ✓ Good |
| Ethereal Flame orb as avatar | Creates visual presence, reuses existing component | ✓ Good |
| MCP for Notion integration | Secure tool-based access, no direct API exposure | ✓ Good |
| Push-to-talk (not wake word) | Simpler, more reliable, privacy-friendly | ✓ Good |
| Raw PCM audio (Web Audio API) | MediaRecorder format issues, PCM works reliably | ✓ Good |
| Omnipresent guide personality | Calm, knowing, warm — NOT butler/British assistant | ✓ Good |
| Fuzzy title matching | Natural voice commands like "mark call mom complete" | ✓ Good |
| State machine for briefing flows | Consistent pattern across Morning/Evening/Weekly | ✓ Good |
| 28-day rolling baseline for life areas | Detects relative neglect without rigid schedules | ✓ Good |
| Integration token (not OAuth) | Works for single user, OAuth deferred to v2 | ✓ Good |

---
*Last updated: 2026-02-05 — v2.0 complete, T1-T4 complete, Phase 13 next*
