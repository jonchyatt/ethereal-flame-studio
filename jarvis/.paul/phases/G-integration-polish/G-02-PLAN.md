---
phase: G-integration-polish
plan: 02
type: execute
wave: 2
depends_on: ["G-01"]
files_modified:
  - src/lib/jarvis/hooks/useHomeFetch.ts
  - src/app/jarvis/app/page.tsx
  - src/lib/jarvis/stores/homeStore.ts
autonomous: true
---

<objective>
## Goal
Replace mock data in the Priority Home screen with live data from the Jarvis briefing API. The home screen transforms from a static mockup into a real-time command center showing actual tasks, bills, habits, calendar events, and domain health.

## Purpose
The integration audit revealed that PriorityStack, DomainHealthGrid, and BriefingCard all display hardcoded mock data from homeStore. The /api/jarvis/briefing endpoint already returns real Notion data via BriefingBuilder (parallel queries). The gap is a data-fetching layer that calls the API and transforms BriefingData into homeStore shapes. This is the single highest-impact change in Phase G — it turns the new UI from "beautiful but hollow" into "actually useful."

## Output
- New `useHomeFetch` hook that fetches briefing data on mount + periodic refresh
- Transform functions: BriefingData → PriorityItem[], DomainHealthItem[], briefingSummary
- Home page wired to live data with loading/error states
- homeStore cleared of mock data (replaced by API-driven state)
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/STATE.md

## Prior Work
@.paul/phases/G-integration-polish/G-01-PLAN.md — Config activation (prerequisite)

## Source Files — Data Producers
@src/app/api/jarvis/briefing/route.ts — API endpoint returning BriefingData
@src/lib/jarvis/executive/types.ts — BriefingData, TaskSummary, BillSummary, HabitSummary types
@src/lib/jarvis/executive/BriefingClient.ts — fetchBriefingData() client wrapper

## Source Files — Data Consumers
@src/lib/jarvis/stores/homeStore.ts — PriorityItem, DomainHealthItem, HomeState types + actions
@src/components/jarvis/home/PriorityStack.tsx — Consumes priorityItems from homeStore
@src/components/jarvis/home/DomainHealthGrid.tsx — Consumes domainHealth from homeStore
@src/components/jarvis/home/BriefingCard.tsx — Consumes briefingSummary from homeStore
@src/app/jarvis/app/page.tsx — Renders all home components

## Reference
@src/lib/jarvis/api/fetchWithAuth.ts — postJarvisAPI / fetchJarvisAPI for authenticated requests
@src/lib/jarvis/domains.ts — DOMAINS registry for domain ID resolution
</context>

<acceptance_criteria>

## AC-1: Home Screen Shows Real Task Data
```gherkin
Given the user has tasks in Notion (today + overdue)
When they visit /jarvis/app (Priority Home)
Then PriorityStack displays real tasks sorted by urgency
And overdue tasks show urgency='critical' (red indicator)
And today's tasks show urgency='warning' (amber indicator)
And upcoming bills show with their amounts
```

## AC-2: Domain Health Shows Real Metrics
```gherkin
Given the user has active domains with Notion data
When they visit /jarvis/app
Then DomainHealthGrid shows health status per active domain
And Personal domain shows task/habit-derived health (green/amber/red)
And domains without data show status='gray'
```

## AC-3: Briefing Card Shows Real Summary
```gherkin
Given the briefing API returns real Notion data
When the user visits /jarvis/app
Then BriefingCard displays a generated summary of today's priorities
And the summary reflects actual task counts, bill amounts, and habit streaks
```

## AC-4: Loading and Error States
```gherkin
Given the home page is fetching briefing data
When the API call is in progress
Then Skeleton components or loading indicators show (not mock data)
When the API call fails (no Notion token, network error, etc.)
Then a graceful error state shows with a retry option
And the app does not crash
```

## AC-5: Periodic Refresh
```gherkin
Given the user is on the home page
When 5 minutes have elapsed since last fetch
Then the home data refreshes automatically (silent, no loading flash)
And the UI updates with new data
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create useHomeFetch hook with BriefingData transforms</name>
  <files>src/lib/jarvis/hooks/useHomeFetch.ts</files>
  <action>
    Create a new hook that fetches briefing data and populates homeStore.

    **Hook responsibilities:**
    1. On mount: call GET /api/jarvis/briefing via fetchJarvisAPI (from fetchWithAuth.ts)
    2. Transform BriefingData → PriorityItem[] using this mapping:
       - tasks.overdue → urgency='critical', urgencyScore=100, quickActionLabel='View'
       - tasks.today → urgency='warning', urgencyScore=80, quickActionLabel='View'
       - bills.thisWeek → urgency='warning', urgencyScore=70, subtitle=`$${amount}`, quickActionLabel='Pay'
       - calendar.today → urgency='info', urgencyScore=20, subtitle=event.time
       - All items: domainId='personal' (only domain with Notion data currently)
       - Sort by urgencyScore descending
    3. Transform BriefingData → DomainHealthItem[] using this mapping:
       - For 'personal' domain: compute from tasks + habits
         - status='red' if overdue.length > 0
         - status='amber' if today tasks > 5 or habits streak broken
         - status='green' otherwise
         - metric=`${tasks.today.length} tasks`
         - summary=`${tasks.overdue.length} overdue, ${habits.active.length} habits tracked`
       - For other active domains: status='gray', metric='No data', summary='Not connected'
    4. Transform BriefingData → briefingSummary string:
       - Build from actual counts: "X tasks today (Y overdue). Z bills due ($total). N habits active."
       - If no data: null (BriefingCard handles null gracefully)
    5. Set lastFetched to new Date()
    6. Periodic refresh: setInterval every 5 minutes, only if document is visible
    7. Cleanup interval on unmount

    **Error handling:**
    - On fetch failure: log error, keep existing data (don't clear), set a fetchError state
    - On empty response: treat as "no data" — clear priorities, set briefingSummary to null
    - Return { isLoading, error, refetch } from the hook

    **Import from:**
    - fetchJarvisAPI from '@/lib/jarvis/api/fetchWithAuth'
    - BriefingData from '@/lib/jarvis/executive/types'
    - useHomeStore from '@/lib/jarvis/stores/homeStore'
    - useActiveDomains from settingsStore hook

    **Do NOT:**
    - Import BriefingBuilder (server-side only)
    - Call buildMorningBriefing directly (use the API endpoint)
    - Add new dependencies
  </action>
  <verify>TypeScript compiles: import the hook in a test file or verify npm run build</verify>
  <done>AC-1, AC-2, AC-3, AC-4, AC-5 data layer satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Wire Home page to useHomeFetch and clear mock data</name>
  <files>src/app/jarvis/app/page.tsx, src/lib/jarvis/stores/homeStore.ts</files>
  <action>
    **In homeStore.ts:**
    - Remove mock PriorityItem data from initial state (set to empty array [])
    - Remove mock DomainHealthItem data from initial state (set to empty array [])
    - Remove mock briefingSummary from initial state (set to null)
    - Keep all type definitions, actions, and widget-related state unchanged
    - Keep DEFAULT_PINNED_WIDGETS unchanged (widget system is separate from data)

    **In page.tsx (Home page):**
    - Import and call useHomeFetch() at the top of the component
    - Destructure { isLoading, error, refetch } from the hook
    - If isLoading on first render: show Skeleton primitives in place of PriorityStack and DomainHealthGrid
      - Use existing Skeleton component (from primitives, built in E-04-01)
      - 3 skeleton cards for PriorityStack area, 2 for DomainHealthGrid area
    - If error: show EmptyState primitive with retry button
      - Use existing EmptyState component (from E-04-05)
      - Icon: AlertCircle, title: "Couldn't load data", description: error message
      - CTA: "Try again" button that calls refetch()
    - Normal render: existing components read from homeStore (no changes needed to PriorityStack, DomainHealthGrid, BriefingCard — they already consume from the store)

    **Do NOT:**
    - Modify PriorityStack, DomainHealthGrid, or BriefingCard components
    - Change the widget system or AcademyProgress
    - Change QuickActionsBar (separate concern, stays as-is)
    - Add loading spinners to the ChatOverlay or other non-home components
  </action>
  <verify>npm run build passes. Home page renders with Skeleton on load, then real data.</verify>
  <done>AC-1 through AC-5 fully satisfied: Home screen displays real Notion data with loading/error states and periodic refresh</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/home/PriorityStack.tsx — Already consumes from homeStore correctly
- src/components/jarvis/home/DomainHealthGrid.tsx — Already consumes from homeStore correctly
- src/components/jarvis/home/BriefingCard.tsx — Already consumes from homeStore correctly
- src/components/jarvis/home/QuickActionsBar.tsx — Separate concern, not wired here
- src/components/jarvis/home/WidgetZone.tsx — Widget system independent of briefing data
- src/lib/jarvis/executive/BriefingBuilder.ts — Server-side only, not modified
- src/app/api/jarvis/briefing/route.ts — API route already works, not modified
- Any other page besides /jarvis/app (home)

## SCOPE LIMITS
- Only Personal domain gets real health data — other domains show gray/disconnected
- Widget data remains static for now (widget data sources are domain-specific, not from briefing)
- QuickActionsBar stays hardcoded (wiring actions is separate work)
- No new API endpoints — uses existing /api/jarvis/briefing

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] homeStore initial state has no mock data (empty arrays, null summary)
- [ ] useHomeFetch hook created with fetch + transform + refresh logic
- [ ] Home page shows Skeleton during loading
- [ ] Home page shows EmptyState with retry on error
- [ ] Home page populates real data from briefing API
- [ ] Periodic refresh fires every 5 minutes
- [ ] No changes to existing home components (PriorityStack, DomainHealthGrid, BriefingCard)
</verification>

<success_criteria>
- Home screen shows real tasks, bills, habits from Notion
- Domain health computed from live data
- Briefing summary reflects actual state
- Loading and error states are graceful
- 5-minute auto-refresh keeps data current
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.paul/phases/G-integration-polish/G-02-SUMMARY.md`
</output>
