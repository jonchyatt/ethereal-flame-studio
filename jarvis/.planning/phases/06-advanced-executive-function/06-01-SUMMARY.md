---
phase: 06
plan: 01
subsystem: executive-function
tags: [evening-wrap, state-machine, briefing, scheduling]

dependency_graph:
  requires: [05-01, 05-02, 05-03]
  provides: [EveningWrapFlow, evening_wrap scheduler event, EveningWrapData API]
  affects: [06-02, 06-03]

tech_stack:
  added: []
  patterns: [state-machine-flow, section-walkthrough, adaptive-duration]

file_tracking:
  key_files:
    created:
      - src/lib/jarvis/executive/EveningWrapFlow.ts
    modified:
      - src/lib/jarvis/executive/types.ts
      - src/lib/jarvis/executive/Scheduler.ts
      - src/lib/jarvis/executive/BriefingBuilder.ts
      - src/lib/jarvis/executive/BriefingClient.ts
      - src/lib/jarvis/notion/schemas.ts
      - src/app/api/jarvis/briefing/route.ts

decisions:
  - id: evening-wrap-sections
    choice: 9-section walkthrough (outline, dayReview, taskUpdates, newCaptures, tomorrowPreview, weekSummary, financeCheck, closing, complete)
    rationale: Comprehensive coverage per CONTEXT.md while allowing adaptive skip
  - id: extended-missed-window
    choice: 3-hour missed event window for evening_wrap vs 1-hour for others
    rationale: Users may be busy in evening, need longer window to catch up
  - id: factual-not-scorecard
    choice: Day review presents completed/incomplete counts without judgment
    rationale: Per CONTEXT.md, avoid scorecard mentality

metrics:
  duration: ~25 minutes
  completed: 2026-02-01
---

# Phase 6 Plan 1: Evening Wrap Flow Summary

Comprehensive evening wrap state machine with day review, tomorrow preview, and task capture.

## One-liner

9-section evening wrap flow with adaptive duration, newCaptures accumulation, and factual day review following BriefingFlow pattern.

## What Was Built

### 1. Extended Types and Scheduler (Task 1)

**Files:** `types.ts`, `Scheduler.ts`

- Added `ScheduledEventType` union with `'evening_wrap'` type
- Added `EveningWrapSection` type with 9 sections
- Added `EveningWrapData` interface extending `BriefingData` with:
  - `DayReviewData`: completedTasks, incompleteTasks, completionRate
  - `TomorrowPreviewData`: tasks, events
  - `WeekSummaryData`: busyDays, lightDays, upcomingDeadlines
- Added `MissedPromptInfo` interface for missed prompt tracking
- Added evening_wrap to default schedule at 21:00 (9 PM)
- Extended missed event window to 180 minutes (3 hours) for evening_wrap

### 2. Evening Wrap Data Builder (Task 2)

**Files:** `BriefingBuilder.ts`, `schemas.ts`, `route.ts`

- Added `buildEveningWrapData()` function that:
  - Queries completed and pending tasks for today
  - Queries tomorrow's tasks
  - Queries next 7 days for week analysis
  - Calculates completion rate
  - Builds week summary with busy/light days and deadlines
- Added `buildDayReview()` helper for completed vs incomplete analysis
- Added `buildTomorrowPreview()` helper for tomorrow tasks and events
- Added `analyzeWeekLoad()` helper for busy/light day detection
- Added `'tomorrow'` filter support to `buildTaskFilter()`
- Updated API route to handle `type=evening_wrap` parameter

### 3. EveningWrapFlow State Machine (Task 3)

**Files:** `EveningWrapFlow.ts`, `BriefingClient.ts`

- Created `EveningWrapFlow` class following BriefingFlow pattern
- Section order: outline -> dayReview -> taskUpdates -> newCaptures -> tomorrowPreview -> weekSummary -> financeCheck -> closing -> complete
- Section scripts per CONTEXT.md:
  - `dayReview`: Factual listing of completed/incomplete (not a scorecard)
  - `taskUpdates`: Prompt for status updates if incomplete tasks exist
  - `newCaptures`: Accumulate items until "done" (capturedItems array)
  - `tomorrowPreview`: Task list with high priority callout
  - `weekSummary`: Busy/light days and upcoming deadlines
  - `financeCheck`: Bills due soon with total
  - `closing`: Open-ended "Anything else on your mind?"
- Adaptive duration: `hasSectionData()` skips empty sections automatically
- User response handling: skip, continue, stop commands
- Added `fetchEveningWrapData()` to BriefingClient
- Exported `createEveningWrapFlow` factory function

## Technical Details

### Section Flow Logic

```typescript
// Section order constant
SECTION_ORDER: ['outline', 'dayReview', 'taskUpdates', 'newCaptures',
                'tomorrowPreview', 'weekSummary', 'financeCheck', 'closing', 'complete']

// hasSectionData() determines if section should be shown
- dayReview: Show if any tasks (completed or incomplete)
- taskUpdates: Show only if incomplete tasks exist
- newCaptures: Always show (opportunity to capture)
- tomorrowPreview: Show if tasks tomorrow
- weekSummary: Show if busy/light days or deadlines
- financeCheck: Show if bills due
- closing: Always show (open-ended per CONTEXT.md)
```

### Missed Event Window

```typescript
// Default: 60 minutes
// Evening wrap: 180 minutes (3 hours)
const windowMinutes = event.type === 'evening_wrap'
  ? MISSED_EVENT_WINDOW_EVENING_WRAP_MINUTES  // 180
  : MISSED_EVENT_WINDOW_MINUTES;               // 60
```

### Capture Mode

During `newCaptures` section, items are accumulated:
```typescript
if (this.state.currentSection === 'newCaptures') {
  this.state.capturedItems.push(response);
  this.callbacks.onItemCaptured?.(response);
  await this.speak('Got it. Anything else?');
}
```

## Commits

| Hash | Message |
|------|---------|
| ca19b09 | feat(06-01): extend types and Scheduler for evening wrap |
| 6610d95 | feat(06-01): add evening wrap data builder |
| 81f8542 | feat(06-01): create EveningWrapFlow state machine |

## Verification Results

- TypeScript compiles without errors
- Scheduler includes evening_wrap event at 21:00
- API returns evening wrap data structure with dayReview, tomorrow, weekSummary
- EveningWrapFlow class instantiates with correct methods
- All section scripts follow CONTEXT.md guidance (factual, not scorecard)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 06-02:** Life Area Tracking
- Evening wrap data builder pattern established
- State machine pattern for flows established
- Types extended for additional data structures

**Dependencies satisfied:**
- BriefingFlow pattern proven and replicated
- Scheduler extended for new event types
- API route pattern for different briefing types
