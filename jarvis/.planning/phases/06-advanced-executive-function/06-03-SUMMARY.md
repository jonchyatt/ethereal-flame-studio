---
phase: 06-advanced-executive-function
plan: 03
subsystem: executive-function
tags: [weekly-review, voice-flow, checkpoints, life-areas]
dependency-graph:
  requires: ["06-01", "06-02"]
  provides: ["WeeklyReviewFlow", "weekly_review_reminder", "buildWeeklyReviewData"]
  affects: ["jarvis-integration", "voice-pipeline"]
tech-stack:
  added: []
  patterns: ["state-machine-flow", "checkpoint-timeout", "factual-retrospective"]
key-files:
  created:
    - src/lib/jarvis/executive/WeeklyReviewFlow.ts
  modified:
    - src/lib/jarvis/executive/types.ts
    - src/lib/jarvis/executive/Scheduler.ts
    - src/lib/jarvis/executive/BriefingBuilder.ts
    - src/lib/jarvis/executive/BriefingClient.ts
    - src/app/api/jarvis/briefing/route.ts
decisions:
  - id: factual-retrospective
    choice: "Retrospective is factual only (tasks completed, bills paid, projects progressed)"
    rationale: "Per CONTEXT.md: not scorecard, not judgment, not therapy"
  - id: checkpoint-timeout
    choice: "15 second auto-advance timeout on checkpoints"
    rationale: "Allows user time to respond but keeps flow moving"
  - id: disabled-by-default
    choice: "Weekly review disabled by default, user opts in"
    rationale: "Per CONTEXT.md: no default day imposed, user configures"
  - id: section-skipping
    choice: "Skip horizon scan if empty, skip life areas if no neglected areas"
    rationale: "Avoids empty sections, keeps review concise"
metrics:
  duration: "~25 minutes"
  completed: "2026-02-01"
---

# Phase 6 Plan 03: Weekly Review Flow Summary

Voice-guided weekly review with factual retrospective and forward planning focus, checkpoint pauses for user input.

## What Was Built

### WeeklyReviewFlow State Machine
- **File:** `src/lib/jarvis/executive/WeeklyReviewFlow.ts`
- Complete voice-guided weekly review flow following BriefingFlow/EveningWrapFlow pattern
- Section order: intro -> retrospective -> checkpoint1 -> upcomingWeek -> checkpoint2 -> horizonScan -> checkpoint3 -> lifeAreas -> closing -> complete
- Retrospective is brief and factual (per CONTEXT.md: no scorecard, no judgment)
- Forward planning (upcoming week + horizon scan) is primary focus
- Checkpoint pauses with 15s auto-advance timeout for user input
- Life area balance surfaced during dedicated section
- Exports `WeeklyReviewFlow` class and `createWeeklyReviewFlow` factory function

### Types Extension
- **File:** `src/lib/jarvis/executive/types.ts`
- Added `WeeklyReviewSection` type with all section names including checkpoints
- Added `WeeklyReviewData` interface with retrospective, upcomingWeek, horizon, lifeAreas
- Added `WeeklyReviewConfig` interface for scheduling configuration
- Added `'weekly_review_reminder'` to `ScheduledEventType`
- Added optional `dayOfWeek` field to `ScheduledEvent` for weekly events

### Scheduler Enhancement
- **File:** `src/lib/jarvis/executive/Scheduler.ts`
- Added `weekly_review_reminder` to default schedule (disabled by default)
- Added `dayOfWeek` matching in `check()` for weekly events
- Added `updateWeeklyReviewDay(day)` method for user configuration
- Weekly review only triggers on configured day at configured time

### Weekly Review Data Builder
- **File:** `src/lib/jarvis/executive/BriefingBuilder.ts`
- Added `buildWeeklyReviewData()` function
- Retrospective: tasks completed, bills paid, projects progressed (last 7 days)
- Upcoming week: task count, busy/light days, calendar events
- Horizon scan: deadlines and bills due in 2-4 weeks
- Integrates with LifeAreaTracker for life area insights
- Added `extractProjectsFromTasks()` helper for project name detection

### API Route Update
- **File:** `src/app/api/jarvis/briefing/route.ts`
- Added `type=weekly_review` handler
- Returns `WeeklyReviewData` structure

### Client Update
- **File:** `src/lib/jarvis/executive/BriefingClient.ts`
- Added `fetchWeeklyReviewData()` / `buildWeeklyReviewData()` export

## Key Implementation Details

### Checkpoint Behavior
```typescript
// Checkpoints pause for user input with 15s timeout
const CHECKPOINT_TIMEOUT = 15000;

// User responses at checkpoints:
// - "skip", "next", "no", "nothing", "move on" -> advance
// - "done", "that's all", "that's it" -> advance
// - Substantive response -> "Got it. Anything else?" + restart timer
// - Timeout -> auto-advance
```

### Section Skipping Logic
```typescript
// horizonScan: skip if empty
return (
  data.horizon.deadlines.length > 0 ||
  data.horizon.upcomingBills.length > 0 ||
  data.horizon.projectMilestones.length > 0
);

// lifeAreas: skip if no neglected areas
return data.lifeAreas.neglectedAreas.length > 0;
```

### Retrospective Script (Factual Only)
```typescript
// Per CONTEXT.md: no scorecard, no judgment, no emotional prompts
"This week: 12 tasks completed, 3 bills paid. You made progress on Project A, Project B."

// Empty week case:
"This week was quiet. No recorded task completions."
```

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Retrospective style | Factual only (no scorecard) | Per CONTEXT.md guidance |
| Checkpoint timeout | 15 seconds | Allows response but keeps flow moving |
| Default enabled state | Disabled by default | User opts in, per CONTEXT.md |
| Horizon scan range | 14-28 days out | "2-4 weeks ahead" per plan |
| Max life area nudges | 2 areas shown | Keep brief, avoid overwhelm |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. **TypeScript compiles:** `npx tsc --noEmit` passes
2. **Scheduler supports weekly_review_reminder with dayOfWeek:** Verified in Scheduler.ts
3. **API returns weekly review data structure:** Route handler added
4. **WeeklyReviewFlow class instantiates:** Exports verified
5. **Checkpoints timeout and auto-advance:** 15s timer implemented
6. **Retrospective script is factual:** No judgment/scorecard language

## Commits

| Hash | Message |
|------|---------|
| b144490 | feat(06-03): extend types and Scheduler for weekly review |
| 1f82dd0 | feat(06-03): add weekly review data builder and API |
| 59fdfa6 | feat(06-03): create WeeklyReviewFlow class |

## Next Phase Readiness

**Phase 6 Complete** - All 3 plans executed:
- 06-01: Evening Wrap Flow
- 06-02: Life Area Priority Weighting
- 06-03: Weekly Review Flow

**Dependencies satisfied:**
- EveningWrapFlow provides evening wrap workflow
- LifeAreaTracker provides life area balance awareness
- WeeklyReviewFlow provides weekly review session

**Ready for:** Integration with voice pipeline and Jarvis main controller.

---

*Completed: 2026-02-01*
