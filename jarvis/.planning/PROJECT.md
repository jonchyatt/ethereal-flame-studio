# Jarvis: Personal Executive Function Partner

## What This Is

A voice-enabled AI companion that integrates with Notion Life OS workspaces to provide executive function support. Jarvis captures ideas, delivers daily briefings, maintains time awareness during deep work, and runs voice-guided review sessions. It uses the Ethereal Flame audio orb as its visual avatar and is hosted on whatareyouappreciatingnow.com.

## Core Value

**One system that knows everything, surfaces what matters, and keeps you on track.** Ideas get captured, priorities stay clear, and nothing slips through cracks - so you can focus on doing the work instead of managing the work.

## Current State (v1 Shipped 2026-02-02)

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

### Active

(None yet — define for next milestone)

### Out of Scope

- Mobile native app — web-first approach, PWA works well
- Calendar write access — read is enough, writing adds risk
- Multi-user accounts — single creator workflow
- Automated task execution — Jarvis advises, user executes
- Real-time streaming transcription — push-to-talk sufficient
- Offline mode — requires LLM, always needs internet
- Client & Content OS — personal first, add in v2

## Context

**Shipped v1** with 11,851 LOC TypeScript across 49 files.

**User Environment:**
- Primary device: phone (often away from computer)
- Work pattern: gets deeply absorbed, loses track of time and priorities
- Challenge: Not procrastination - *too much engagement*, forgets to shift
- Need: External system to hold the big picture while user focuses

**Known Issues:**
- Captured items during check-ins not yet sent to Notion inbox
- Tomorrow preview in evening check-in uses placeholder data
- ANTHROPIC_API_KEY requires user configuration
- Notion databases require user sharing setup

## Constraints

- **Tech Stack**: Next.js + Three.js/R3F — consistent with Ethereal Flame Studio
- **Voice**: Deepgram STT, ElevenLabs TTS — proven providers
- **Data Layer**: Notion API via MCP for all read/write operations
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
*Last updated: 2026-02-02 after v1 milestone*
