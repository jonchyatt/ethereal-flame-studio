---
phase: 05-executive-function-core
plan: 02
subsystem: nudge-checkin
tags: [nudges, check-ins, notifications, scheduling, voice]
requires: ["05-01"]
provides: ["nudge-system", "check-in-flows", "gentle-chime"]
affects: ["05-03"]
tech-stack:
  added: []
  patterns: ["singleton-manager", "client-api-wrapper", "web-audio"]
key-files:
  created:
    - src/lib/jarvis/executive/NudgeManager.ts
    - src/lib/jarvis/executive/CheckInManager.ts
    - src/components/jarvis/NudgeOverlay.tsx
    - src/app/api/jarvis/briefing/route.ts
    - src/lib/jarvis/executive/BriefingClient.ts
    - public/sounds/README.md
  modified:
    - src/lib/jarvis/executive/types.ts
    - src/lib/jarvis/stores/jarvisStore.ts
    - src/lib/jarvis/types.ts
    - src/app/jarvis/page.tsx
    - src/app/globals.css
    - src/lib/jarvis/executive/BriefingFlow.ts
decisions:
  - id: web-audio-chime
    choice: "Generated chime via Web Audio API as fallback"
    rationale: "No MP3 file available; programmatic bell sound is gentle and works offline"
  - id: client-server-split
    choice: "BriefingClient wraps API route for client-side access"
    rationale: "NotionClient uses child_process which only works server-side"
metrics:
  duration: "~20 minutes"
  completed: "2026-02-02"
---

# Phase 05 Plan 02: Check-ins and Nudges Summary

Implemented time awareness nudges and scheduled check-ins with sound/visual delivery, skippable check-in flows, and multimodal acknowledgment.

## One-liner

NudgeManager with Web Audio chime + CheckInManager for midday/evening flows + NudgeOverlay visual indicator

## Commits

| Hash | Message |
|------|---------|
| d82e9cd | feat(05-02): create NudgeManager with sound and visual delivery |
| 2a54315 | feat(05-02): create CheckInManager for midday and evening check-ins |
| 6f558ce | feat(05-02): create NudgeOverlay and wire nudges/check-ins to page |

## What Was Built

### 1. NudgeManager (src/lib/jarvis/executive/NudgeManager.ts)

- **Sound delivery**: Web Audio API generates a gentle two-tone chime (C5 + E5)
- **Visual delivery**: Updates jarvisStore with activeNudge for NudgeOverlay
- **Voice delivery**: speakNudge() method for when user engages
- **Nudge detection**: checkForNudges() analyzes BriefingData for:
  - Calendar events starting soon (15 min lead time)
  - Task deadlines approaching (1 hour lead time)
  - Bills due today
- **Periodic checking**: startPeriodicCheck() runs every 5 minutes
- **Acknowledgment tracking**: Prevents re-nudging for same item
- **Singleton pattern**: getNudgeManager() for global access

### 2. CheckInManager (src/lib/jarvis/executive/CheckInManager.ts)

- **Midday check-in flow**:
  - Progress review: "You've completed X of Y tasks"
  - Reprioritization prompt
  - New capture prompt
- **Evening check-in flow**:
  - Day completion summary
  - Loose end capture
  - Tomorrow preview
  - Goal/project review (based on items with review cadence)
  - Reprioritization
- **Skip handling**: Voice "skip", tap, or 10s auto-dismiss
- **Capture tracking**: Stores captured items for future Notion integration
- **Singleton pattern**: getCheckInManager() for global access

### 3. NudgeOverlay (src/components/jarvis/NudgeOverlay.tsx)

- **Subtle visual indicator**: Bottom of screen, not blocking modal
- **Type-specific icons**: Calendar, deadline, bill, business
- **Tap to dismiss**: Clicking overlay acknowledges and hides
- **Fade-in animation**: Smooth 0.3s ease-out entrance
- **Hints**: "Tap to dismiss" and "Tap orb to respond"

### 4. Jarvis Page Integration

- **Scheduled event handling**: Midday/evening check-ins via Scheduler
- **Periodic nudge checking**: Every 5 minutes via NudgeManager
- **Orb tap + nudge**: Speaking the nudge when orb tapped while nudge active
- **Cleanup on unmount**: destroyNudgeManager() and destroyCheckInManager()

### 5. BriefingClient (src/lib/jarvis/executive/BriefingClient.ts)

- **Client-side wrapper**: Fetches briefing data via /api/jarvis/briefing
- **Compatibility exports**: buildMorningBriefing and buildCheckInData

### 6. Briefing API Route (src/app/api/jarvis/briefing/route.ts)

- **Server-side endpoint**: Calls BriefingBuilder which uses NotionClient
- **Query param support**: ?type=midday or ?type=evening for check-in data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed server/client module boundary**

- **Found during:** Task 3
- **Issue:** BriefingBuilder imports NotionClient which uses `child_process` (Node.js only), causing build failure when imported in client-side page
- **Fix:** Created BriefingClient wrapper that calls /api/jarvis/briefing API route; API route calls BriefingBuilder server-side
- **Files created:** src/lib/jarvis/executive/BriefingClient.ts, src/app/api/jarvis/briefing/route.ts
- **Files modified:** src/lib/jarvis/executive/BriefingFlow.ts, src/lib/jarvis/executive/CheckInManager.ts
- **Commit:** 6f558ce

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| NudgeManager plays gentle sound + shows visual indicator | Verified - Web Audio chime + NudgeOverlay |
| Nudges only trigger for calendar, deadlines, bills (NOT breaks) | Verified - checkForNudges() only checks these sources |
| Check-ins follow CONTEXT.md structure | Verified - Progress, reprioritization, capture prompts |
| Check-ins are easily skippable | Verified - Skip via voice, tap, or 10s auto-dismiss |
| User can acknowledge via voice OR tap | Verified - NudgeOverlay tap + orb tap + voice |
| Visual nudge is subtle overlay, not blocking modal | Verified - Bottom position, pointer-events-auto |

## Next Phase Readiness

### Dependencies Provided

- **nudge-system**: NudgeManager singleton for triggering nudges
- **check-in-flows**: CheckInManager for midday/evening check-ins
- **gentle-chime**: Web Audio generated notification sound

### Blockers for 05-03

None - Dashboard UI can use existing state from jarvisStore

### Technical Debt

- Captured items during check-ins not yet sent to Notion inbox
- Tomorrow preview in evening check-in is placeholder (needs tomorrow's data)
- Goal review cadence property not yet implemented in Notion schemas
