# H-01 Summary: Google Calendar Integration

**Status:** COMPLETE
**Date:** 2026-02-28

## What Was Built

### New Files (2)
- **`src/lib/jarvis/google/GoogleCalendarClient.ts`** (~230 lines)
  - Service account JWT auth via native `crypto.createSign('RSA-SHA256')` — zero new dependencies
  - `getServiceAccountConfig()` with configError flag (parse once, fail permanently until redeploy)
  - Token caching with `{ token, expiresAt }` and 60s pre-expiry buffer
  - `getTimezoneOffsetString()` — RFC 3339 offset utility exported for reuse
  - `queryGoogleCalendarEvents()` — fetches from Google Calendar REST API
  - Circuit breaker + retry (mirrors NotionClient patterns)
  - Auth failure (401/403) returns empty array, does NOT retry or trip circuit breaker

- **`src/lib/jarvis/google/calendarToolExecutor.ts`** (~110 lines)
  - `executeCalendarTool()` — handles `query_calendar` tool
  - Supports 4 timeframes: today, tomorrow, this_week, next_week
  - All time boundaries use RFC 3339 compliant timestamps
  - Formats events for Claude: timed events as "9:00 AM – 10:00 AM: Title (at Location)", all-day as "All day: Title"

### Modified Files (6)
- **`src/lib/jarvis/executive/types.ts`** — CalendarEvent extended with `endTime?`, `allDay?`, `location?`, `source` (required), `googleEventId?`
- **`src/lib/jarvis/executive/BriefingBuilder.ts`** — Three new helpers (transformGoogleCalendarEvents, mergeCalendarEvents, fetchGoogleCalendarEventsSafe), all 3 briefing builders enriched with Google Calendar events via parallel Promise.all
- **`src/lib/jarvis/stores/personalStore.ts`** — Store CalendarEvent extended with `allDay?`, `location?`, `source?`
- **`src/lib/jarvis/hooks/useJarvisFetch.ts`** — `transformCalendar()` passes through endTime, allDay, location, source
- **`src/lib/jarvis/intelligence/tools.ts`** — `calendarTools` array with `query_calendar` tool, included in `getAllTools()`
- **`src/lib/jarvis/intelligence/chatProcessor.ts`** — 4-way tool routing (tutorial → memory → calendar → notion), MCP mode includes `[...localOnlyTools, ...calendarTools]`

## Bugs Fixed

### Pre-existing Bug: Evening Wrap calendar.today Used Tomorrow's Tasks
- **Was:** `deriveCalendarEvents(tomorrowTasks)` → `calendar.today` (line 582)
- **Now:** `deriveCalendarEvents([...completedTasks, ...pendingTasks])` → `calendar.today`
- **Impact:** Evening wrap's "today's calendar" section was showing tomorrow's task-derived events

## Audit Fixes Applied (from plan audit session)

1. **RFC 3339 Compliance** — All Google Calendar API time boundaries include timezone offset via `getTimezoneOffsetString()`
2. **Evening Wrap Bug** — `calendar.today` now correctly uses today's tasks
3. **MCP Mode** — `calendarTools` included in MCP branch (`[...localOnlyTools, ...calendarTools]`)

## Verification Results

All 19 checks PASS:
- Build: zero errors
- Graceful degradation: works without credentials or with malformed JSON
- Token caching with 60s buffer
- All time boundaries use `getTodayInTimezone()` + RFC 3339 offset
- Source tagging on both Notion and Google events
- Evening wrap bug fixed
- 4-way tool routing confirmed
- MCP mode includes calendar tools
- No new npm dependencies
- All acceptance criteria (AC-1 through AC-7) met

## Checkpoint

Jonathan needs to create Google Cloud service account + share calendar before real data flows. Until then, graceful degradation works — all existing Notion-derived calendar events continue unchanged.
