---
phase: H-google-calendar
plan: 01
subsystem: api
tags: [google-calendar, jwt, service-account, briefing, rfc-3339]

requires:
  - phase: G-integration-polish
    provides: Production infrastructure (ErrorBoundary, retry, health monitor, CRON hardening)
provides:
  - Google Calendar event import via service account JWT auth
  - All briefing builders enriched with real calendar data
  - query_calendar chat tool for conversational schedule queries
  - CalendarView receives rich event data (endTime, allDay, location, source)
affects: [v4.1 Intelligence Evolution, Academy curriculum, multi-calendar future]

tech-stack:
  added: []
  patterns: [service-account-jwt, config-error-flag, rfc-3339-offset-utility, fetch-safe-wrapper]

key-files:
  created:
    - src/lib/jarvis/google/GoogleCalendarClient.ts
    - src/lib/jarvis/google/calendarToolExecutor.ts
  modified:
    - src/lib/jarvis/executive/types.ts
    - src/lib/jarvis/executive/BriefingBuilder.ts
    - src/lib/jarvis/stores/personalStore.ts
    - src/lib/jarvis/hooks/useJarvisFetch.ts
    - src/lib/jarvis/intelligence/tools.ts
    - src/lib/jarvis/intelligence/chatProcessor.ts

key-decisions:
  - "Service account over OAuth — single-user read-only, no token refresh, no callback routes"
  - "Native crypto over googleapis SDK — zero new dependencies"
  - "MCP mode: [...localOnlyTools, ...calendarTools] — calendar is external-but-not-Notion"
  - "configError flag prevents repeated parse attempts (parse once, fail permanently until redeploy)"
  - "Auth failures (401/403) return empty array — don't retry, don't trip circuit breaker"
  - "All-day events float to top in merged sort, alphabetical among themselves"

patterns-established:
  - "config-error-flag: Parse env config once, cache result or error, never retry — GoogleCalendarClient.ts"
  - "fetch-safe-wrapper: fetchGoogleCalendarEventsSafe() never throws, returns [] — BriefingBuilder.ts"
  - "rfc-3339-offset: getTimezoneOffsetString() converts IANA timezone to offset string — reusable utility"
  - "4-way tool routing: tutorial → memory → calendar → notion (chatProcessor.ts)"

duration: ~90min
started: 2026-02-28T19:00:00-05:00
completed: 2026-02-28T20:10:00-05:00
---

# Phase H Plan 01: Google Calendar Integration Summary

**Service account JWT auth (native crypto, zero deps), all 3 briefing builders enriched, query_calendar chat tool, evening wrap bug fix**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~90min |
| Started | 2026-02-28T19:00:00-05:00 |
| Completed | 2026-02-28T20:10:00-05:00 |
| Tasks | 3 completed |
| Files modified | 8 (2 new + 6 modified) |
| Lines | 647 insertions, 15 deletions |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Google Calendar Client fetches events | Pass | JWT auth via crypto.createSign('RSA-SHA256'), withRetry, circuit breaker, timezone param to API |
| AC-2: Graceful degradation without credentials | Pass | configError flag, configWarningLogged once, malformed JSON handled, returns [] |
| AC-3: Morning briefing includes Google Calendar | Pass | Promise.all entry, transformGoogleCalendarEvents, mergeCalendarEvents, timezone-safe boundaries |
| AC-4: All briefing types enriched with correct boundaries | Pass | Evening wrap (today/tomorrow split), weekly review (7-day range), check-in inherits morning |
| AC-5: Chat tool queries calendar | Pass | query_calendar tool, 4-way routing, 4 timeframes, works in both MCP and non-MCP modes |
| AC-6: CalendarView renders real events | Pass | personalStore extended, transformCalendar passes through allDay/location/source/endTime |
| AC-7: Build passes | Pass | Commit e22249a merged to master, pushed, auto-deployed |

## Accomplishments

- Google Calendar events flow into all 3 briefing types (morning, evening wrap, weekly review) via parallel Promise.all — no sequential blocking
- Native JWT auth with zero new npm dependencies — `crypto.createSign('RSA-SHA256')` + `Buffer.toString('base64url')`
- `query_calendar` chat tool enables conversational schedule queries with 4 timeframes
- Pre-existing evening wrap bug fixed — `calendar.today` was showing tomorrow's task-derived events

## Task Commits

Single atomic commit containing all 3 tasks:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: GoogleCalendarClient + calendarToolExecutor | `e22249a` | feat | Service account JWT auth, event fetching, tool executor |
| Task 2: BriefingBuilder + Types + Transform | `e22249a` | feat | All builders enriched, evening wrap bug fix, type extensions |
| Task 3: Chat tool + routing | `e22249a` | feat | query_calendar tool, 4-way routing, MCP mode visibility |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/google/GoogleCalendarClient.ts` | Created (278 lines) | Service account JWT auth, token caching, RFC 3339 offset utility, event fetching with retry/circuit breaker |
| `src/lib/jarvis/google/calendarToolExecutor.ts` | Created (125 lines) | query_calendar tool executor — 4 timeframes, formatted output for Claude |
| `src/lib/jarvis/executive/types.ts` | Modified | CalendarEvent extended: endTime?, allDay?, location?, source (required), googleEventId? |
| `src/lib/jarvis/executive/BriefingBuilder.ts` | Modified (+134 lines) | 3 helpers (transform, merge, fetchSafe), all 3 builders enriched, deriveCalendarEvents tagged with source:'notion' |
| `src/lib/jarvis/stores/personalStore.ts` | Modified (+3 lines) | Store CalendarEvent: allDay?, location?, source? |
| `src/lib/jarvis/hooks/useJarvisFetch.ts` | Modified (+5/-1 lines) | transformCalendar() passes through endTime, allDay, location, source |
| `src/lib/jarvis/intelligence/tools.ts` | Modified (+28 lines) | calendarTools array with query_calendar, included in getAllTools() |
| `src/lib/jarvis/intelligence/chatProcessor.ts` | Modified (+17/-3 lines) | 4-way routing, calendarToolNames set, MCP mode includes calendarTools |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Service account over OAuth | Single-user read-only — no token refresh dance, no callback routes, no DB storage | Simplest possible auth path |
| Native crypto over googleapis SDK | Zero new dependencies — JWT signing via crypto.createSign is 15 lines | No bundle bloat |
| configError flag (parse once, fail permanently) | Prevents repeated JSON.parse on every briefing cycle on warm Vercel instances | Efficient failure mode |
| Auth failures return empty, skip retry + circuit breaker | 401/403 are permanent (wrong permissions), not transient — retrying wastes time | Clean failure semantics |
| RFC 3339 offset via getTimezoneOffsetString() | Google Calendar API requires mandatory timezone offset — bare datetimes may fail or be interpreted as UTC | Correct cross-timezone behavior |
| MCP mode: [...localOnlyTools, ...calendarTools] | Calendar is external-but-not-Notion — MCP replaces Notion tools only, calendar stays | query_calendar works in both modes |
| Single fetch for evening wrap (today→tomorrow), split after | One API call instead of two — halves Google Calendar API usage for evening wrap | Efficient API usage |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | N/A |
| Scope additions | 0 | N/A |
| Deferred | 0 | N/A |

**Total impact:** None — plan executed exactly as written, including all 3 audit corrections (RFC 3339 compliance, evening wrap bug, MCP mode).

## Issues Encountered

None.

## 19/19 Verification Checks

1. `npm run build` passes — zero errors
2. `isGoogleCalendarConfigured()` returns false when env vars unset (no crash)
3. `isGoogleCalendarConfigured()` returns false when JSON malformed (no crash, logged once)
4. Token caching uses `{ token, expiresAt }` with 60s pre-expiry buffer
5. All Google Calendar time boundaries use `getTodayInTimezone(timezone)`
6. All time boundaries include RFC 3339 offset via `getTimezoneOffsetString(timezone)`
7. `getTimezoneOffsetString()` returns "Z" for undefined/invalid, correct offset for valid IANA
8. `deriveCalendarEvents()` includes `source: 'notion' as const`
9. `deriveCalendarEventsForTomorrow()` includes `source: 'notion' as const`
10. Evening wrap `calendar.today` from `[...completedTasks, ...pendingTasks]` (bug fix confirmed)
11. Evening wrap routes today's Google events to `calendar.today`, tomorrow's to `tomorrow.events`
12. `buildMorningBriefing()` type-checks with Google Calendar in Promise.all
13. `getAllTools()` includes `query_calendar`
14. `createToolExecutor` has 4-way routing (tutorial → memory → calendar → notion)
15. MCP mode includes calendar tools: `[...localOnlyTools, ...calendarTools]`
16. CalendarEvent type has required source, optional endTime, allDay, location
17. `transformCalendar()` passes through all new fields
18. No new npm dependencies added
19. All acceptance criteria (AC-1 through AC-7) met

## Next Phase Readiness

**Ready:**
- All v4.0 phases (A through H) complete
- Google Calendar integration shipped with graceful degradation
- Architecture supports multi-calendar via calendarId parameter (future)

**Concerns:**
- Google Calendar data is only active once Jonathan sets up the service account (graceful degradation active until then)
- Phase E has E-07+ (remaining domains, advanced features) still open — deferred to v4.1

**Blockers:**
- None for milestone completion
- Service account setup is a human action checkpoint — not a code blocker

---
*Phase: H-google-calendar, Plan: 01*
*Completed: 2026-02-28*
