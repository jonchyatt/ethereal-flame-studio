---
phase: H-google-calendar
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/google/GoogleCalendarClient.ts (NEW)
  - src/lib/jarvis/google/calendarToolExecutor.ts (NEW)
  - src/lib/jarvis/executive/types.ts
  - src/lib/jarvis/executive/BriefingBuilder.ts
  - src/lib/jarvis/stores/personalStore.ts
  - src/lib/jarvis/hooks/useJarvisFetch.ts
  - src/lib/jarvis/intelligence/tools.ts
  - src/lib/jarvis/intelligence/chatProcessor.ts
autonomous: false
---

<objective>
## Goal
Import Google Calendar events into Jarvis via service account, making Jarvis hyper-aware of Jonathan's real schedule across all briefing types, chat conversations, and the CalendarView UI.

## Purpose
Jarvis currently derives "calendar events" from Notion tasks with due times — a facade. Real calendar awareness (meetings, appointments, blocks) is missing. This makes morning briefings, evening wraps, weekly reviews, nudges, and conversational queries about schedule incomplete. Google Calendar is Jonathan's actual schedule source.

## Output
- `GoogleCalendarClient.ts` — service account JWT auth (native crypto, zero deps), event fetching, retry/circuit breaker (mirrors NotionClient patterns)
- `calendarToolExecutor.ts` — executes `query_calendar` tool for chat conversations
- Extended `CalendarEvent` type with `endTime`, `source`, `location`, `allDay`
- All 4 BriefingBuilder functions enriched with real Google Calendar events merged alongside Notion-derived events
- `query_calendar` chat tool so Jarvis can answer "what's on my calendar?"
- Transform pipeline updated to pass through rich event data to CalendarView

## Design Decisions
- **Service account over OAuth** — single-user read-only, no token refresh dance, no callback routes, no DB storage
- **Native fetch + crypto over googleapis SDK** — zero new dependencies, JWT signing via `crypto.createSign('RSA-SHA256')`
- **iCal alternative rejected** — fragile RRULE parsing, requires library, secret URL can't be rotated, dead end for write-back
- **Single calendar for now** — `calendarId` parameter enables multi-calendar later without architectural change
- **Don't touch CalendarView** — it renders from personalStore.events already; richer data (endTime, location) flows through automatically. Jonathan is actively polishing UI in a parallel session.
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Source Files
@src/lib/jarvis/notion/NotionClient.ts — singleton + circuit breaker + retry pattern to replicate
@src/lib/jarvis/notion/schemas.ts — getTodayInTimezone() + getDateInTimezone() for timezone-safe date calculations
@src/lib/jarvis/executive/BriefingBuilder.ts — 4 builder functions to enrich (morning, checkin, evening_wrap, weekly_review)
@src/lib/jarvis/executive/types.ts — CalendarEvent interface to extend
@src/lib/jarvis/hooks/useJarvisFetch.ts — transformCalendar() to update
@src/lib/jarvis/stores/personalStore.ts — store CalendarEvent to extend
@src/lib/jarvis/intelligence/tools.ts — tool definitions + getAllTools()
@src/lib/jarvis/intelligence/chatProcessor.ts — tool routing (3-way: notion/memory/tutorial → becomes 4-way)
@src/lib/jarvis/resilience/withRetry.ts — retry utility
@src/lib/jarvis/resilience/CircuitBreaker.ts — circuit breaker utility
</context>

<acceptance_criteria>

## AC-1: Google Calendar Client Fetches Events
```gherkin
Given GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON and GOOGLE_CALENDAR_ID env vars are set
When queryGoogleCalendarEvents() is called with a time range and timezone
Then it returns an array of calendar events with id, title, startTime, endTime, location, allDay fields
And uses the same resilience patterns as NotionClient (singleton, withRetry, circuit breaker)
And passes the timezone parameter to the Google Calendar API for correct date interpretation
```

## AC-2: Graceful Degradation Without Credentials (or Malformed Credentials)
```gherkin
Given GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON is NOT set, empty, or contains invalid JSON
When any briefing builder function runs
Then it returns all existing data unchanged (Notion-derived calendar events still work)
And logs a single warning "[GoogleCalendar] Not configured — skipping" (not per-call)
And does NOT throw or break the briefing pipeline
```

## AC-3: Morning Briefing Includes Google Calendar Events
```gherkin
Given Google Calendar is configured and has events today
When buildMorningBriefing(timezone) runs
Then BriefingData.calendar.today contains BOTH Notion-derived events AND Google Calendar events
And Google Calendar events have source: 'google', Notion events have source: 'notion'
And events are sorted by start time (all-day events first)
And time boundaries use getTodayInTimezone(timezone), NOT server-local Date
```

## AC-4: All Briefing Types Enriched With Correct Time Boundaries
```gherkin
Given Google Calendar is configured
When buildEveningWrapData(timezone) runs
Then calendar.today contains today's Google Calendar events (merged with Notion)
And tomorrow.events contains tomorrow's Google Calendar events (merged with Notion)

When buildWeeklyReviewData(timezone) runs
Then upcomingWeek.events contains this week's Google Calendar events (merged with Notion)

When buildCheckInData(type, timezone) runs
Then it inherits Google Calendar events via its internal buildMorningBriefing call
```

## AC-5: Chat Tool Queries Calendar
```gherkin
Given the user asks Jarvis "what's on my calendar today?" or "do I have anything Thursday?"
When Claude selects the query_calendar tool
Then it returns formatted calendar events for the requested timeframe
And Jarvis can reason about schedule conflicts, free time, and upcoming meetings
```

## AC-6: CalendarView Renders Real Events
```gherkin
Given Google Calendar events flow through the briefing pipeline
When the user visits Personal > Calendar in the Jarvis UI
Then events display with title, start time, end time
And events from Google Calendar are visually indistinguishable from task-derived events (same styling)
```

## AC-7: Build Passes
```gherkin
Given all changes are complete
When npm run build executes
Then it completes with zero type errors and zero build errors
```

</acceptance_criteria>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Setup: Google Cloud Service Account</name>
  <context>
    Jonathan needs to create a Google Cloud service account and share his calendar with it before any code can fetch real events. This is a one-time setup.
  </context>
  <how-to-verify>
    **Steps to set up Google Calendar service account:**

    1. **Go to Google Cloud Console** → https://console.cloud.google.com/
    2. **Create a project** (or use existing): name it "Jarvis" or similar
    3. **Enable the Google Calendar API:**
       - APIs & Services → Library → search "Google Calendar API" → Enable
    4. **Create a service account:**
       - APIs & Services → Credentials → Create Credentials → Service Account
       - Name: "jarvis-calendar-reader"
       - Role: none needed (it only reads calendars shared with it)
       - Click "Done"
    5. **Create a key:**
       - Click the service account → Keys tab → Add Key → Create New Key → JSON
       - Download the JSON file — this is your `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`
    6. **Share your Google Calendar with the service account:**
       - Open Google Calendar (calendar.google.com)
       - Settings → your calendar → "Share with specific people or groups"
       - Add the service account email (looks like `jarvis-calendar-reader@your-project.iam.gserviceaccount.com`)
       - Permission: "See all event details"
    7. **Add to Vercel env vars:**
       - `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON` = paste the ENTIRE JSON file contents (the full JSON object)
       - `GOOGLE_CALENDAR_ID` = your Google email (e.g., `jonathan@gmail.com`) or the calendar ID from Settings → "Integrate calendar"

    **Verify:** The service account email should appear in your calendar's sharing settings with "See all event details" permission.
  </how-to-verify>
  <resume-signal>Type "done" when service account is created and calendar is shared, with env vars added to Vercel. Or "skip" to proceed with code (will use graceful degradation until configured).</resume-signal>
</task>

<task type="auto">
  <name>Task 1: Create GoogleCalendarClient + calendarToolExecutor</name>
  <files>
    src/lib/jarvis/google/GoogleCalendarClient.ts (NEW),
    src/lib/jarvis/google/calendarToolExecutor.ts (NEW)
  </files>
  <action>
    **GoogleCalendarClient.ts:**

    Create a new file mirroring NotionClient.ts patterns:

    1. **Configuration validation with malformed JSON protection:**
       ```typescript
       interface ServiceAccountConfig {
         client_email: string;
         private_key: string;
       }

       let configError: string | null = null;
       let parsedConfig: ServiceAccountConfig | null = null;
       let configWarningLogged = false;

       function getServiceAccountConfig(): ServiceAccountConfig | null {
         if (configError) return null;
         if (parsedConfig) return parsedConfig;

         const json = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON;
         const calendarId = process.env.GOOGLE_CALENDAR_ID;

         if (!json || !calendarId) {
           if (!configWarningLogged) {
             console.warn('[GoogleCalendar] Not configured — skipping (set GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON + GOOGLE_CALENDAR_ID)');
             configWarningLogged = true;
           }
           return null;
         }

         try {
           const parsed = JSON.parse(json);
           if (!parsed.client_email || !parsed.private_key) {
             configError = 'Service account JSON missing client_email or private_key';
             console.error(`[GoogleCalendar] ${configError}`);
             return null;
           }
           parsedConfig = { client_email: parsed.client_email, private_key: parsed.private_key };
           return parsedConfig;
         } catch (e) {
           configError = `Invalid JSON in GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON: ${e instanceof Error ? e.message : 'parse error'}`;
           console.error(`[GoogleCalendar] ${configError}`);
           return null;
         }
       }

       export function isGoogleCalendarConfigured(): boolean {
         return getServiceAccountConfig() !== null;
       }
       ```
       Key: `configError` flag prevents repeated parse attempts on every briefing cycle. Once invalid, stays invalid until redeploy.

    2. **Token caching with explicit expiry tracking:**
       ```typescript
       let cachedToken: { token: string; expiresAt: number } | null = null;

       async function getAccessToken(): Promise<string> {
         // Return cached token if still valid (60s buffer before actual expiry)
         if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
           return cachedToken.token;
         }

         const config = getServiceAccountConfig();
         if (!config) throw new Error('Google Calendar not configured');

         // Create JWT assertion
         const now = Math.floor(Date.now() / 1000);
         const header = { alg: 'RS256', typ: 'JWT' };
         const claims = {
           iss: config.client_email,
           scope: 'https://www.googleapis.com/auth/calendar.readonly',
           aud: 'https://oauth2.googleapis.com/token',
           iat: now,
           exp: now + 3600,
         };

         const segments = [
           base64urlEncode(JSON.stringify(header)),
           base64urlEncode(JSON.stringify(claims)),
         ];
         const signingInput = segments.join('.');

         // Sign with RSA-SHA256 using Node.js crypto
         const sign = crypto.createSign('RSA-SHA256');
         sign.update(signingInput);
         const signature = sign.sign(config.private_key, 'base64url');

         const jwt = `${signingInput}.${signature}`;

         // Exchange JWT for access token
         const response = await fetch('https://oauth2.googleapis.com/token', {
           method: 'POST',
           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
           body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
         });

         if (!response.ok) {
           const text = await response.text();
           throw new Error(`Token exchange failed (${response.status}): ${text}`);
         }

         const data = await response.json();
         cachedToken = {
           token: data.access_token,
           expiresAt: Date.now() + (data.expires_in * 1000),
         };
         return cachedToken.token;
       }

       function base64urlEncode(str: string): string {
         return Buffer.from(str).toString('base64url');
       }
       ```
       Key: Token cached at module level. Survives warm Vercel instances (~10-15 min). Cold start = one extra ~100ms HTTP call. 60s buffer prevents using a token that's about to expire mid-request.

    3. **RFC 3339 timezone offset utility (CRITICAL for Google Calendar API compliance):**

       Google Calendar API requires RFC 3339 timestamps with **mandatory timezone offset** (e.g., `2026-02-28T00:00:00-05:00`). Bare datetimes like `2026-02-28T00:00:00` are non-compliant and may fail or be interpreted as UTC.

       ```typescript
       /**
        * Convert IANA timezone to RFC 3339 offset string (e.g., "-05:00", "+09:00")
        * Falls back to "Z" (UTC) if timezone is invalid or not provided
        */
       function getTimezoneOffsetString(timezone?: string): string {
         if (!timezone) return 'Z';
         try {
           const now = new Date();
           const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
           const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
           const diffMinutes = Math.round((local.getTime() - utc.getTime()) / 60000);
           const sign = diffMinutes >= 0 ? '+' : '-';
           const absMin = Math.abs(diffMinutes);
           const h = String(Math.floor(absMin / 60)).padStart(2, '0');
           const m = String(absMin % 60).padStart(2, '0');
           return `${sign}${h}:${m}`;
         } catch {
           console.warn(`[GoogleCalendar] Invalid timezone "${timezone}", using UTC`);
           return 'Z';
         }
       }
       ```
       This utility is used by BOTH `queryGoogleCalendarEvents` (internally) and exported for `calendarToolExecutor.ts`. Export it:
       ```typescript
       export { getTimezoneOffsetString };
       ```

    4. **Core query function with timezone parameter:**
       ```typescript
       export async function queryGoogleCalendarEvents(options: {
         timeMin: string;  // RFC 3339 datetime like "2026-02-28T00:00:00-05:00"
         timeMax: string;  // RFC 3339 datetime like "2026-02-28T23:59:59-05:00"
         timezone?: string;  // IANA timezone — passed to Google API for all-day event interpretation
         maxResults?: number;  // default 50
         calendarId?: string;  // defaults to GOOGLE_CALENDAR_ID env
       }): Promise<GoogleCalendarEvent[]>
       ```
       - Calls Google Calendar Events.list REST API: `GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`
       - Query params: `timeMin` (RFC 3339 — callers must include timezone offset), `timeMax` (RFC 3339), `timeZone` (from options.timezone — critical for all-day event boundaries), `maxResults`, `singleEvents=true` (expands recurring events), `orderBy=startTime`
       - **timeMin/timeMax MUST include timezone offset** — callers construct them using `getTimezoneOffsetString(timezone)`. The function should validate this: if timeMin doesn't contain '+', '-' (after 'T'), or 'Z', log a warning.
       - Parse response: extract `items[]` array (default to empty array if missing)
       - Transform each item to `GoogleCalendarEvent` type:
         - `id` = item.id
         - `title` = item.summary || 'Untitled'
         - `startTime` = item.start.dateTime || item.start.date (all-day events use date, not dateTime)
         - `endTime` = item.end.dateTime || item.end.date
         - `allDay` = !item.start.dateTime (true when only date is present)
         - `location` = item.location || null
         - `description` = item.description ? item.description.slice(0, 200) : null

    5. **Types:**
       ```typescript
       export interface GoogleCalendarEvent {
         id: string;
         title: string;        // from summary
         startTime: string;    // ISO datetime or date (all-day)
         endTime: string;      // ISO datetime or date
         allDay: boolean;      // true if start.date (not dateTime)
         location: string | null;
         description: string | null;  // truncated to 200 chars
       }
       ```

    6. **Resilience:**
       - Wrap the fetch call in the query function with `withRetry('google-calendar', { maxAttempts: 2, initialDelayMs: 500 })` from existing resilience module
       - Register `getBreaker('google-calendar')` circuit breaker
       - On auth failure (401/403): log clear error about service account permissions, do NOT retry (return empty array, don't let circuit breaker count auth errors as transient)

    7. **Logging:**
       - `[GoogleCalendar] Fetching events ${timeMin} → ${timeMax}` on each query
       - `[GoogleCalendar] Found N events` on success
       - `[GoogleCalendar] Not configured — skipping` via configWarningLogged flag (ONCE, not per-call)

    **calendarToolExecutor.ts:**

    Create a simple executor for the `query_calendar` chat tool:

    1. Export `executeCalendarTool(name: string, input: Record<string, unknown>): Promise<string>`
    2. For `query_calendar`:
       - Accept `timeframe: 'today' | 'tomorrow' | 'this_week' | 'next_week'` and optional `timezone: string`
       - Import `getTodayInTimezone` and `getDateInTimezone` from `../notion/schemas` for timezone-correct date math
       - Import `getTimezoneOffsetString` from `./GoogleCalendarClient` for RFC 3339 offset
       - Calculate `timeMin`/`timeMax` from timeframe with proper RFC 3339 offset:
         ```typescript
         const offset = getTimezoneOffsetString(timezone);
         // today: `${today}T00:00:00${offset}` → `${today}T23:59:59${offset}`
         // tomorrow: `${tomorrow}T00:00:00${offset}` → `${tomorrow}T23:59:59${offset}`
         // this_week: `${today}T00:00:00${offset}` → `${todayPlus7}T23:59:59${offset}`
         // next_week: `${todayPlus7}T00:00:00${offset}` → `${todayPlus14}T23:59:59${offset}`
         ```
       - Call `queryGoogleCalendarEvents({ timeMin, timeMax, timezone })`
       - Format results as readable text for Claude: each event as:
         - Timed: `"- 9:00 AM – 10:00 AM: Team Standup (at Conference Room B)"`
         - All-day: `"- All day: Company Holiday"`
         - No location: omit the "(at ...)" part
       - If no events: `"No calendar events for {timeframe}."`
       - If not configured: `"Google Calendar is not connected. Ask Jonathan to set up the service account."`

    **IMPORTANT constraints:**
    - ZERO new npm dependencies — use native `fetch()` and `crypto`
    - JWT signing: use `crypto.createSign('RSA-SHA256')` with the PEM private key from service account JSON
    - Do NOT use `jsonwebtoken`, `jose`, `googleapis`, or `google-auth-library`
    - Match the existing codebase style: named exports, JSDoc comments, section dividers with `// ===...===`
    - Import `import crypto from 'crypto';` at top (Node.js built-in)
  </action>
  <verify>
    - File exists at src/lib/jarvis/google/GoogleCalendarClient.ts
    - File exists at src/lib/jarvis/google/calendarToolExecutor.ts
    - `isGoogleCalendarConfigured()` returns false when env vars are missing (no crash)
    - `isGoogleCalendarConfigured()` returns false when JSON is malformed (no crash, configError flag set)
    - Token caching stores `{ token, expiresAt }` with 60s buffer
    - `queryGoogleCalendarEvents` accepts timezone parameter and passes it as `timeZone` to Google API
    - `getTimezoneOffsetString()` returns "Z" for undefined timezone, correct offset for valid IANA timezone, "Z" for invalid timezone
    - `getTimezoneOffsetString` is exported for use by calendarToolExecutor and BriefingBuilder
    - All time boundaries in calendarToolExecutor use `${dateStr}T00:00:00${offset}` format (RFC 3339 compliant)
    - TypeScript compiles without errors (checked via build in final verification)
  </verify>
  <done>AC-1 satisfied (client fetches events with timezone + RFC 3339 compliance), AC-2 satisfied (graceful degradation including malformed JSON)</done>
</task>

<task type="auto">
  <name>Task 2: Wire Google Calendar into BriefingBuilder + Types + Transform Pipeline</name>
  <files>
    src/lib/jarvis/executive/types.ts,
    src/lib/jarvis/executive/BriefingBuilder.ts,
    src/lib/jarvis/stores/personalStore.ts,
    src/lib/jarvis/hooks/useJarvisFetch.ts
  </files>
  <action>
    **types.ts — Extend CalendarEvent:**

    Update the briefing-level `CalendarEvent` interface (lines 110-116):
    ```typescript
    export interface CalendarEvent {
      id: string;
      title: string;
      time: string;              // Formatted start time like "9:00 AM" or "All day"
      endTime?: string;          // Formatted end time like "10:00 AM" (new)
      isUpcoming: boolean;
      allDay?: boolean;          // True for all-day events (new)
      location?: string;         // Event location (new)
      source: 'notion' | 'google';  // Where this event came from (new, REQUIRED)
      sourceTaskId?: string;     // If derived from a Notion task
      googleEventId?: string;    // If from Google Calendar (new)
    }
    ```

    **BriefingBuilder.ts — Merge Google Calendar events:**

    1. Import at top:
       ```typescript
       import { queryGoogleCalendarEvents, isGoogleCalendarConfigured, getTimezoneOffsetString, type GoogleCalendarEvent } from '../google/GoogleCalendarClient';
       ```
       Note: `getTodayInTimezone` and `getDateInTimezone` are ALREADY imported from `../notion/schemas` (line 37). Do NOT duplicate them.

    2. **FIX #2 — Add `source: 'notion'` directly in deriveCalendarEvents()** (~line 456):
       Update the return object inside `deriveCalendarEvents()` to include the source tag:
       ```typescript
       return {
         id: `cal-${t.id}`,
         title: t.title,
         time: format(eventTime, 'h:mm a'),
         isUpcoming,
         source: 'notion' as const,  // ← ADD THIS
         sourceTaskId: t.id,
       };
       ```
       This ensures TypeScript is satisfied — the required `source` field is present at the point of creation, not applied post-hoc.

    3. **Also fix `deriveCalendarEventsForTomorrow()`** (similar function for tomorrow events):
       Add `source: 'notion' as const` to its return object as well.

    4. Create a transform function (add near the existing `deriveCalendarEvents`):
       ```typescript
       /**
        * Transform Google Calendar API events into the briefing CalendarEvent format
        */
       function transformGoogleCalendarEvents(events: GoogleCalendarEvent[]): CalendarEvent[] {
         const now = new Date();
         const oneHourFromNow = addHours(now, 1);

         return events.map(e => {
           const start = new Date(e.startTime);
           const end = new Date(e.endTime);
           const isUpcoming = !e.allDay && isWithinInterval(start, { start: now, end: oneHourFromNow });

           return {
             id: `gcal-${e.id}`,
             title: e.title,
             time: e.allDay ? 'All day' : format(start, 'h:mm a'),
             endTime: e.allDay ? undefined : format(end, 'h:mm a'),
             isUpcoming,
             allDay: e.allDay,
             location: e.location ?? undefined,
             source: 'google' as const,
             googleEventId: e.id,
           };
         });
       }
       ```

    5. Create a merge + sort helper:
       ```typescript
       /**
        * Merge Notion-derived and Google Calendar events, sorted by time
        */
       function mergeCalendarEvents(notionEvents: CalendarEvent[], googleEvents: CalendarEvent[]): CalendarEvent[] {
         const merged = [...notionEvents, ...googleEvents];
         return merged.sort((a, b) => {
           // All-day events float to top
           if (a.allDay && !b.allDay) return -1;
           if (!a.allDay && b.allDay) return 1;
           // Both all-day: alphabetical
           if (a.allDay && b.allDay) return a.title.localeCompare(b.title);
           // Both timed: sort by time string
           return a.time.localeCompare(b.time);
         });
       }
       ```
       Note: `notionEvents` already have `source: 'notion'` from step 2 (FIX #2), so NO post-hoc tagging needed.

    6. Create a safe Google Calendar query wrapper:
       ```typescript
       /**
        * Fetch Google Calendar events with full error containment
        * NEVER throws — returns empty array on any failure
        */
       async function fetchGoogleCalendarEventsSafe(
         timeMin: string,
         timeMax: string,
         timezone?: string
       ): Promise<GoogleCalendarEvent[]> {
         if (!isGoogleCalendarConfigured()) return [];
         try {
           return await queryGoogleCalendarEvents({ timeMin, timeMax, timezone });
         } catch (error) {
           console.error('[BriefingBuilder] Google Calendar fetch failed, continuing without:', error);
           return [];
         }
       }
       ```

    7. **FIX #1 — Timezone-safe time boundaries in `buildMorningBriefing()`** (~line 97):

       BEFORE the Promise.all, calculate timezone-aware boundaries with RFC 3339 offset:
       ```typescript
       // Timezone-safe date boundaries for Google Calendar (RFC 3339 compliant)
       const todayStr = getTodayInTimezone(timezone); // "2026-02-28"
       const tzOffset = getTimezoneOffsetString(timezone); // "-05:00" or "Z"
       const gcalTodayStart = `${todayStr}T00:00:00${tzOffset}`;
       const gcalTodayEnd = `${todayStr}T23:59:59${tzOffset}`;
       ```

       Add `fetchGoogleCalendarEventsSafe(gcalTodayStart, gcalTodayEnd, timezone)` as the 6th entry in the existing Promise.all.

       After deriving Notion calendar events, transform + merge:
       ```typescript
       const notionCalendarEvents = deriveCalendarEvents(allTodayTasks);
       const googleCalendarEvents = transformGoogleCalendarEvents(googleResult);
       const calendarEvents = mergeCalendarEvents(notionCalendarEvents, googleCalendarEvents);
       ```

       Update the log line to distinguish sources:
       ```typescript
       calendarEvents: calendarEvents.length,
       calendarFromNotion: notionCalendarEvents.length,
       calendarFromGoogle: googleCalendarEvents.length,
       ```

    8. **FIX #5 — Fix pre-existing bug + Google Calendar integration in `buildEveningWrapData()`** (~line 530):

       **PRE-EXISTING BUG (line 582):** The existing code does:
       ```typescript
       const calendarEvents = deriveCalendarEvents(tomorrowTasks);  // BUG: tomorrow's tasks
       // ...
       calendar: { today: calendarEvents }  // ...labeled as "today"
       ```
       This puts TOMORROW's task-derived events into `calendar.today`. Fix by changing to today's tasks:
       ```typescript
       const notionTodayEvents = deriveCalendarEvents([...completedTasks, ...pendingTasks]);
       ```
       This uses the already-parsed `completedTasks` and `pendingTasks` (lines 558-559) which are today's tasks.

       Calculate timezone-aware boundaries for BOTH today and tomorrow with RFC 3339 offset:
       ```typescript
       const todayStr = getTodayInTimezone(timezone);
       const tomorrowStr = getDateInTimezone(1, timezone);
       const tzOffset = getTimezoneOffsetString(timezone);
       const gcalTodayStart = `${todayStr}T00:00:00${tzOffset}`;
       const gcalTodayEnd = `${todayStr}T23:59:59${tzOffset}`;
       const gcalTomorrowStart = `${tomorrowStr}T00:00:00${tzOffset}`;
       const gcalTomorrowEnd = `${tomorrowStr}T23:59:59${tzOffset}`;
       ```

       Add TWO Google Calendar fetches to the Promise.all (or one wider range and split):
       Recommended approach — single fetch spanning today through end of tomorrow, then split:
       ```typescript
       fetchGoogleCalendarEventsSafe(gcalTodayStart, gcalTomorrowEnd, timezone)
       ```

       After receiving results, split by date:
       ```typescript
       const allGoogleEvents = transformGoogleCalendarEvents(googleResult);
       const googleTodayEvents = allGoogleEvents.filter(e => {
         // Events with time "All day" or time within today
         // Use the original GoogleCalendarEvent startTime for date comparison
         const original = googleResult.find(g => `gcal-${g.id}` === e.id);
         if (!original) return false;
         return original.startTime.startsWith(todayStr);
       });
       const googleTomorrowEvents = allGoogleEvents.filter(e => {
         const original = googleResult.find(g => `gcal-${g.id}` === e.id);
         if (!original) return false;
         return original.startTime.startsWith(tomorrowStr);
       });
       ```

       Actually, simpler approach — keep the raw GoogleCalendarEvents and filter BEFORE transforming:
       ```typescript
       const googleTodayRaw = googleResult.filter(e => e.startTime.startsWith(todayStr) || (e.allDay && e.startTime === todayStr));
       const googleTomorrowRaw = googleResult.filter(e => e.startTime.startsWith(tomorrowStr) || (e.allDay && e.startTime === tomorrowStr));
       const googleTodayEvents = transformGoogleCalendarEvents(googleTodayRaw);
       const googleTomorrowEvents = transformGoogleCalendarEvents(googleTomorrowRaw);
       ```

       Then merge into the correct data structure locations:
       ```typescript
       // TODAY's events: Notion today tasks (bug fix above) + Google today events
       const notionTodayEvents = deriveCalendarEvents([...completedTasks, ...pendingTasks]);
       const calendarTodayEvents = mergeCalendarEvents(notionTodayEvents, googleTodayEvents);

       // TOMORROW's events: Notion tomorrow tasks (existing buildTomorrowPreview) + Google tomorrow events
       // Note: buildTomorrowPreview at line 567 already calls deriveCalendarEventsForTomorrow(tomorrowTasks)
       // We need to intercept its result to merge Google events. Replace the buildTomorrowPreview call:
       const notionTomorrowEvents = deriveCalendarEventsForTomorrow(tomorrowTasks);
       const tomorrowCalendarEvents = mergeCalendarEvents(notionTomorrowEvents, googleTomorrowEvents);
       const tomorrow: TomorrowPreviewData = {
         tasks: tomorrowTasks,
         events: tomorrowCalendarEvents,
       };
       ```

       Update the data structure:
       - `calendar.today` = `calendarTodayEvents` (was: `deriveCalendarEvents(tomorrowTasks)` — the bug)
       - Remove the separate `buildTomorrowPreview(tomorrowTasks)` call at line 567 — replaced by the inline construction above
       - `tomorrow` = the inline `TomorrowPreviewData` constructed above

    9. **Modify `buildWeeklyReviewData()`** (~line 753):

       Calculate timezone-aware week boundaries with RFC 3339 offset:
       ```typescript
       const todayStr = getTodayInTimezone(timezone);
       const weekEndStr = getDateInTimezone(7, timezone);
       const tzOffset = getTimezoneOffsetString(timezone);
       const gcalWeekStart = `${todayStr}T00:00:00${tzOffset}`;
       const gcalWeekEnd = `${weekEndStr}T23:59:59${tzOffset}`;
       ```

       Add `fetchGoogleCalendarEventsSafe(gcalWeekStart, gcalWeekEnd, timezone)` to the Promise.all.

       Merge into `upcomingWeek.events`:
       ```typescript
       const notionCalendarEvents = deriveCalendarEvents(upcomingWeekTasks);
       const googleCalendarEvents = transformGoogleCalendarEvents(googleResult);
       const calendarEvents = mergeCalendarEvents(notionCalendarEvents, googleCalendarEvents);
       // ... use calendarEvents for upcomingWeek.events
       ```

    10. **Error-fallback empty data objects:** The existing error fallbacks return `calendar: { today: [] }`. An empty `CalendarEvent[]` is type-compatible since there are no elements to check `source` on. No changes needed to error paths.

    **personalStore.ts — Extend store CalendarEvent:**

    Update the store-level `CalendarEvent` interface (lines 32-38):
    ```typescript
    export interface CalendarEvent {
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      isToday: boolean;
      allDay?: boolean;       // new
      location?: string;      // new
      source?: 'notion' | 'google';  // new (optional for backwards compat with any consumers)
    }
    ```

    **useJarvisFetch.ts — Update transformCalendar():**

    Update `transformCalendar()` (~line 201) to pass through new fields:
    ```typescript
    function transformCalendar(data: BriefingData): StoreCalendarEvent[] {
      return data.calendar.today.map((event) => ({
        id: event.id,
        title: event.title,
        startTime: event.time,
        endTime: event.endTime || '',
        isToday: true,
        allDay: event.allDay,
        location: event.location,
        source: event.source,
      }));
    }
    ```
  </action>
  <verify>
    - `CalendarEvent` type in types.ts has required `source` field
    - `deriveCalendarEvents()` returns objects with `source: 'notion'` (FIX #2 — no type error)
    - `deriveCalendarEventsForTomorrow()` returns objects with `source: 'notion'` (same fix)
    - `buildMorningBriefing` uses `getTodayInTimezone(timezone)` for Google Calendar boundaries (FIX #1)
    - `buildEveningWrapData` derives Notion events from TODAY's tasks for `calendar.today` (pre-existing bug fixed — was using tomorrowTasks)
    - `buildEveningWrapData` splits Google events into today/tomorrow for correct data structure slots (FIX #5)
    - `buildWeeklyReviewData` uses timezone-safe week boundaries
    - `transformCalendar` passes through `endTime`, `allDay`, `location`, `source`
    - TypeScript compiles without errors
  </verify>
  <done>AC-3 satisfied (morning briefing with timezone-safe boundaries), AC-4 satisfied (all briefing types enriched with precise routing), AC-6 satisfied (CalendarView receives rich data), AC-2 reinforced (graceful skip in each builder)</done>
</task>

<task type="auto">
  <name>Task 3: Add query_calendar Chat Tool + Routing</name>
  <files>
    src/lib/jarvis/intelligence/tools.ts,
    src/lib/jarvis/intelligence/chatProcessor.ts
  </files>
  <action>
    **tools.ts — Add calendar tool definition:**

    Add a new `calendarTools` array after the existing `notionTools` array:
    ```typescript
    /**
     * Calendar tool definitions for Google Calendar integration
     *
     * 1 Read tool: query_calendar
     */
    export const calendarTools: ToolDefinition[] = [
      {
        name: 'query_calendar',
        description: 'Check upcoming calendar events from Google Calendar. Use when the user asks about their schedule, meetings, appointments, availability, free time, what\'s on their calendar, or potential scheduling conflicts.',
        input_schema: {
          type: 'object',
          properties: {
            timeframe: {
              type: 'string',
              description: 'Time range to check',
              enum: ['today', 'tomorrow', 'this_week', 'next_week']
            }
          },
          required: ['timeframe']
        }
      }
    ];
    ```

    Update `getAllTools()` to include `calendarTools`:
    ```typescript
    export function getAllTools(): ToolDefinition[] {
      return [
        ...notionTools,
        ...calendarTools,
        ...memoryTools,
        ...tutorialTools
      ];
    }
    ```

    Also add `calendarTools` to the re-exports alongside `memoryTools` and `tutorialTools`:
    ```typescript
    export { memoryTools, tutorialTools, calendarTools };
    ```

    **chatProcessor.ts — Add calendar tool routing:**

    1. Import the calendar executor and calendar tools:
       ```typescript
       import { executeCalendarTool } from '../google/calendarToolExecutor';
       ```

    2. Update the tools import to include calendarTools:
       ```typescript
       import { notionTools, memoryTools, calendarTools } from './tools';
       ```

    3. Update `allTools` at ~line 35:
       ```typescript
       const allTools = [...notionTools, ...calendarTools, ...memoryTools, ...tutorialTools];
       ```

    4. Add calendar tool name set (alongside existing sets at ~line 41):
       ```typescript
       const calendarToolNames = new Set([
         'query_calendar',
       ]);
       ```

    5. Update `createToolExecutor()` function (~line 120) to add a 4th routing branch.
       Place this AFTER tutorialToolNames check and AFTER memoryToolNames check, BEFORE the Notion fallback:
       ```typescript
       if (calendarToolNames.has(name)) {
         return executeCalendarTool(name, input);
       }
       ```

    6. **FIX: MCP mode calendar tool visibility** (~line 214):

       Calendar tools call an external Google API, so they are NOT "local-only" (memory/tutorial). However, when MCP is active, `toolsForBrain = localOnlyTools`, which would make `query_calendar` invisible to Claude. Calendar tools are a third category: external-but-not-Notion (MCP replaces Notion tools only).

       Update the MCP branch to include calendar tools:
       ```typescript
       // When MCP is enabled, only pass local tools + calendar — Notion tools come from MCP
       const toolsForBrain = config.enableMcpConnector && config.notionOAuthToken
         ? [...localOnlyTools, ...calendarTools]
         : allTools;
       ```

       **Do NOT add calendarTools to `localOnlyTools`** — keep them conceptually separate. The spread above is explicit about the composition.

    **NOTE:** `localOnlyTools` is NOT modified — calendar tools are composed into `toolsForBrain` only when MCP mode is active.
  </action>
  <verify>
    - `getAllTools()` includes `query_calendar` in the returned array
    - `createToolExecutor` routes `query_calendar` to `executeCalendarTool` (4-way: tutorial → memory → calendar → notion)
    - `calendarTools` is exported from tools.ts
    - `allTools` includes `calendarTools`
    - `localOnlyTools` is unchanged (still memory + tutorial only)
    - MCP branch includes calendar tools: `[...localOnlyTools, ...calendarTools]` — `query_calendar` works in both MCP and non-MCP modes
    - TypeScript compiles without errors
  </verify>
  <done>AC-5 satisfied (chat tool queries calendar with schedule conflict awareness, works in MCP mode too)</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/notion/* — Notion client, schemas, and tool executor are stable (import from schemas.ts, don't modify)
- src/lib/jarvis/memory/* — Memory system is stable
- src/lib/jarvis/intelligence/sdkBrain.ts — Brain module is stable
- src/lib/jarvis/intelligence/evaluator.ts — Evaluation pipeline is stable
- src/lib/jarvis/resilience/* — Resilience utilities are stable (use them, don't modify)
- src/components/jarvis/personal/CalendarView.tsx — UI component already works, will render richer data automatically via store. Jonathan is polishing UI in a parallel session.
- src/middleware.ts — No changes needed (briefing route already authenticated)

## SCOPE LIMITS
- READ-ONLY from Google Calendar — no creating/updating/deleting events
- Service account auth ONLY — no OAuth flow, no callback routes, no token storage in DB
- No new npm dependencies — use native fetch() + crypto for JWT
- Do NOT touch the CalendarView component — it already renders from personalStore.events and will pick up richer data automatically
- Do NOT add Google Calendar to the system prompt — Jarvis will see calendar data via tool results and briefing context
- Do NOT modify the NudgeManager or Scheduler — calendar-aware nudges are a future enhancement
- Single calendar (GOOGLE_CALENDAR_ID) — multi-calendar is a future enhancement (architecture supports it via calendarId parameter)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] `isGoogleCalendarConfigured()` returns false when env vars are unset (no crash)
- [ ] `isGoogleCalendarConfigured()` returns false when JSON is malformed (no crash, logged once)
- [ ] Token caching uses `{ token, expiresAt }` with 60s pre-expiry buffer
- [ ] All Google Calendar time boundaries use `getTodayInTimezone(timezone)` — NOT `new Date()` or `startOfDay(new Date())`
- [ ] All time boundaries include RFC 3339 timezone offset via `getTimezoneOffsetString(timezone)` — NOT bare datetimes
- [ ] `getTimezoneOffsetString()` returns "Z" for undefined/invalid timezone, correct offset (e.g., "-05:00") for valid IANA timezone
- [ ] `deriveCalendarEvents()` includes `source: 'notion'` in return objects (type-safe)
- [ ] `deriveCalendarEventsForTomorrow()` includes `source: 'notion'` in return objects (type-safe)
- [ ] Evening wrap `calendar.today` derives Notion events from TODAY's tasks (completedTasks + pendingTasks), NOT tomorrowTasks (pre-existing bug fixed)
- [ ] Evening wrap routes today's Google events to `calendar.today` and tomorrow's to `tomorrow.events`
- [ ] `buildMorningBriefing()` type-checks with Google Calendar in Promise.all
- [ ] `getAllTools()` includes `query_calendar`
- [ ] `createToolExecutor` has 4-way routing (tutorial → memory → calendar → notion)
- [ ] MCP mode includes calendar tools: `[...localOnlyTools, ...calendarTools]` — `query_calendar` available in both modes
- [ ] CalendarEvent type has: required source, optional endTime, allDay, location fields
- [ ] transformCalendar() passes through all new fields
- [ ] No new npm dependencies added
- [ ] All acceptance criteria (AC-1 through AC-7) met
</verification>

<success_criteria>
- All 3 tasks completed
- All verification checks pass (19 checks reflecting 3 audit fixes: RFC 3339 compliance, evening wrap bug, MCP mode)
- No errors or warnings introduced
- Google Calendar events merge seamlessly into existing briefing pipeline
- Graceful degradation: everything works unchanged without Google credentials OR with malformed credentials
- Zero new npm dependencies
- Timezone handling uses RFC 3339 compliant timestamps with proper offset
- query_calendar tool works in both MCP and non-MCP modes
- Evening wrap calendar.today contains today's events (not tomorrow's — pre-existing bug fixed)
</success_criteria>

<output>
After completion, create `.paul/phases/H-google-calendar/H-01-SUMMARY.md`
</output>
