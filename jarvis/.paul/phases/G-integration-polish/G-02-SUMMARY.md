# G-02 Summary: Live Data Pipeline

**Status:** COMPLETE
**Date:** 2026-02-27

## What Was Done

Replaced ALL mock data across homeStore and personalStore with real Notion data fetched from the existing `/api/jarvis/briefing` endpoint. Created a central data pipeline hook that transforms BriefingData into the shapes both stores expect.

### Key Insight
The briefing endpoint already returns individual items (TaskSummary[], BillSummary[], HabitSummary[], GoalSummary[], CalendarEvent[]) — no new API endpoints were needed. One fetch populates both the Home screen and all Personal sub-pages.

## Architecture

```
JarvisShell mounts
  → useJarvisFetch() hook
  → GET /api/jarvis/briefing
  → BriefingData transforms:
      → homeStore: PriorityItem[], DomainHealthItem[], briefingSummary
      → personalStore: tasks, habits, bills, goals, calendar events
  → 5-minute auto-refresh (if tab visible)
```

## What Changed

| File | Lines | Change |
|------|-------|--------|
| `useJarvisFetch.ts` | +210 new | Central fetch hook + 8 transform functions |
| `homeStore.ts` | -40/+15 | Mock data removed, isLoading/fetchError added |
| `personalStore.ts` | -90/+5 | Mock data removed, dynamic today |
| `JarvisShell.tsx` | +2 | Hook mount |
| `page.tsx` (Home) | +50 | Loading skeleton + error state with retry |
| `BriefingCard.tsx` | +50 | Freshness dot (live/recent/stale) + refresh icon |
| `QuickActionsBar.tsx` | +30 | Wired to navigation + ChatOverlay intents |
| `chatStore.ts` | +12 | queuedMessage + openWithMessage |
| `ChatOverlay.tsx` | +15 | Queued message auto-send on panel open |
| `PersonalDashboard.tsx` | +1 | Dynamic today instead of hardcoded date |

## Honest Gaps

- **Journal + Health sub-pages:** No API data exists for these — they show empty (honest)
- **Write-back:** Toggle task/habit/bill mutations are local-only (Notion doesn't update)
- **Project names:** Tasks don't show project associations (not in BriefingData)
- **Bill categories:** Not available from briefing endpoint (shows empty)

## Acceptance Criteria

- [x] Home screen shows real tasks, bills, habits from Notion
- [x] Personal sub-pages consume real data (tasks, habits, bills, goals, calendar)
- [x] Loading skeleton on first render
- [x] Error state with retry on fetch failure
- [x] 5-minute auto-refresh
- [x] BriefingCard shows freshness indicator
- [x] QuickActionsBar buttons all wired
- [x] Build passes
