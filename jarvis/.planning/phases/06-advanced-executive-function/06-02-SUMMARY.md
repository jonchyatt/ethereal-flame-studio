---
phase: 06
plan: 02
subsystem: executive-function
tags: [life-areas, neglect-tracking, zustand, briefings, nudges]
requires:
  - phase-05 (Executive Function Core - BriefingBuilder, BriefingFlow)
provides:
  - LifeAreaTracker service for neglect calculation
  - lifeAreaStore for activity persistence
  - Life area insights in morning briefings
affects:
  - 06-03 (Weekly Review) - uses life area insights
  - Future task completion hooks - recordTaskCompletion
tech-stack:
  added:
    - zustand persist middleware for life area data
  patterns:
    - Singleton service pattern (LifeAreaTracker)
    - Rolling window baseline calculation
    - Idempotent activity recording
key-files:
  created:
    - src/lib/jarvis/stores/lifeAreaStore.ts
    - src/lib/jarvis/executive/LifeAreaTracker.ts
  modified:
    - src/lib/jarvis/executive/types.ts
    - src/lib/jarvis/executive/BriefingBuilder.ts
    - src/lib/jarvis/executive/BriefingFlow.ts
decisions:
  - id: neglect-threshold
    choice: "0.3 (30% below baseline)"
    reason: "Low enough to catch meaningful neglect, high enough to avoid noise"
  - id: max-neglected-areas
    choice: "3 areas max"
    reason: "Avoid overwhelming user with too many nudges"
  - id: message-tiers
    choice: "Three tiers: quiet/attention/no activity"
    reason: "Graduated messaging based on severity while staying gentle"
  - id: single-mention
    choice: "Only mention top neglected area in briefing"
    reason: "Per CONTEXT.md - subtle awareness, not aggressive prioritization"
metrics:
  duration: "~15 minutes"
  completed: "2026-02-02"
---

# Phase 06 Plan 02: Life Area Priority Weighting Summary

Rolling window activity tracking with gentle neglect nudges in briefings.

## What Was Built

### 1. Life Area Types (types.ts)
Extended executive types with life area interfaces:
- `LifeAreaConfig` - user priority (1-5), expected activity per week, color
- `LifeAreaActivity` - activity counts by ISO date
- `LifeAreaNeglect` - neglect score, suggested message
- `LifeAreaInsights` - aggregated neglected/active areas
- Updated `BriefingData` interface with optional `lifeAreas.insights`

### 2. Life Area Store (lifeAreaStore.ts)
Zustand store with persist middleware:
- **State**: areas config, activity history, recorded activities Set
- **Default areas**: health, work, relationships, finance, personal growth, home
- **Actions**: setAreaConfig, recordActivity (idempotent), getActivityForArea, clearOldActivity
- **SSR-safe**: Uses `skipHydration: true` per RESEARCH.md

### 3. LifeAreaTracker Service (LifeAreaTracker.ts)
Singleton service for neglect calculation:
- **Rolling windows**: 28-day baseline, 7-day recent activity
- **calculateNeglect()**: Returns null if score < 0.3
- **getNeglectedAreas()**: Top 3 neglected, sorted by score
- **getLifeAreaInsights()**: Full insights for briefings
- **recordTaskCompletion()**: Idempotent activity recording

### 4. Briefing Integration
- **BriefingBuilder**: Calls `getLifeAreaTracker().getLifeAreaInsights()` and includes in BriefingData
- **BriefingFlow**: Mentions top neglected area in habits section with "By the way, {message}"

## Key Design Decisions

### Gentle Messaging (Per CONTEXT.md)
Messages are awareness nudges, not directives:
- 0.3-0.5 score: "{area} has been quiet this week"
- 0.5-0.7 score: "{area} could use some attention"
- 0.7+ score: "{area} hasn't seen activity recently"

### Idempotent Activity Recording
Prevents double-counting per (taskId, date) pair:
```typescript
recordedActivities: Set<string>  // "taskId:YYYY-MM-DD"
```

### Rolling Window Baseline
```typescript
calculatedBaseline = (rollingActivity / 28) * 7  // Weekly rate
effectiveBaseline = userBaseline || calculatedBaseline
neglectScore = max(0, (baseline - recent) / baseline)
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2533cab | feat | Create life area store with Zustand persist |
| 95d56b8 | feat | Create LifeAreaTracker service for neglect calculation |
| 438a2a1 | feat | Integrate life area insights into briefings |

## Verification

- [x] TypeScript compiles: `npx tsc --noEmit` passes
- [x] lifeAreaStore persists to localStorage (skipHydration pattern)
- [x] LifeAreaTracker calculates neglect scores correctly
- [x] BriefingData includes lifeAreas.insights
- [x] Morning briefing mentions neglected areas subtly

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 06-03 (Weekly Review):
- Life area insights available via `getLifeAreaTracker().getLifeAreaInsights()`
- Weekly review can show neglect trends across all areas
- Activity data persists for trend analysis

## Integration Points

### To record task completion (future):
```typescript
import { getLifeAreaTracker } from './executive/LifeAreaTracker';

// When task is marked complete
getLifeAreaTracker().recordTaskCompletion(taskId, areaId);
```

### To get insights (already integrated):
```typescript
const insights = getLifeAreaTracker().getLifeAreaInsights();
// insights.neglectedAreas[0].suggestedMessage
```
