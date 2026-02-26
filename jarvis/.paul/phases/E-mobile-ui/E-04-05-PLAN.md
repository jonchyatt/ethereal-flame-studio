---
phase: E-mobile-ui
plan: 04-05
type: execute
wave: 1
depends_on: ["E-04-01", "E-04-04"]
files_modified:
  - src/components/jarvis/primitives/EmptyState.tsx
  - src/components/jarvis/primitives/index.ts
  - src/lib/jarvis/stores/personalStore.ts
  - src/app/jarvis/app/personal/page.tsx
  - src/components/jarvis/personal/PersonalDashboard.tsx
  - src/components/jarvis/personal/SubProgramCard.tsx
  - src/components/jarvis/personal/TodaySnapshot.tsx
autonomous: true
---

<objective>
## Goal
Build the Personal domain dashboard — the landing page at `/jarvis/app/personal` — with a reusable EmptyState primitive, a personalStore with mock data for all 7 sub-programs, and a navigable dashboard showing today's snapshot and sub-program entry cards.

## Purpose
Personal is the first (and always-on) domain. The dashboard is the central hub for Jonathan's life management — tasks, habits, bills, calendar, journal, goals, and health. This plan establishes the data layer and navigation that all subsequent Personal sub-view plans (E-04-06, E-04-07) will build on.

## Output
- EmptyState primitive (reusable across all domains)
- personalStore with typed mock data for 7 sub-programs
- Personal dashboard with TodaySnapshot + SubProgramCard grid + navigation to sub-routes
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/E-mobile-ui/E-04-04-SUMMARY.md
  - settingsStore provides useActiveDomains() hook
  - Settings page with domain activation

## Source Files
@src/app/jarvis/app/personal/page.tsx (placeholder — will be replaced)
@src/lib/jarvis/stores/homeStore.ts (pattern reference for store + types + mock data)
@src/lib/jarvis/domains.ts (DOMAIN_COLORS lookup, getDomainById)
@src/components/jarvis/primitives/Card.tsx (Card variants: default, glass, interactive)
@src/components/jarvis/primitives/Badge.tsx (Badge variants: status, count, domain)
@src/components/jarvis/primitives/Button.tsx (Button variants: primary, secondary, ghost)
@src/components/jarvis/primitives/Skeleton.tsx (Skeleton variants for loading states)
@src/components/jarvis/primitives/index.ts (barrel export — add EmptyState here)
@src/components/jarvis/home/DomainIcon.tsx (icon resolver for lucide icons)
@src/components/jarvis/layout/index.ts (ContentContainer import path)

## Blueprint References (for sub-program specs)
@.paul/research/phase-e-information-architecture.md (Personal domain: lines ~275-348)
@.paul/research/phase-e-ui-system-design.md (Empty states, domain visuals)
</context>

<acceptance_criteria>

## AC-1: EmptyState Primitive
```gherkin
Given any page or section with no data
When the EmptyState component is rendered with icon, title, description, and optional CTA
Then it displays a centered layout with domain-themed icon (48px), heading, body text, and action button
And the CTA button uses the primary Button variant
And without a CTA, it shows only icon + text
```

## AC-2: personalStore with Mock Data
```gherkin
Given the personalStore is imported
When accessed via usePersonalStore()
Then it provides typed mock data for all 7 sub-programs:
  - tasks: 5 items (2 due today, 1 overdue, 2 upcoming)
  - habits: 4 items (2 done today, 2 pending)
  - bills: 3 items (1 overdue, 1 due soon, 1 paid)
  - calendar: 3 events (1 today, 2 upcoming)
  - journal: 1 today entry (partial)
  - goals: 3 active goals with progress percentages
  - health: 2 items (last workout, meals today)
And provides todayStats computed from mock data
```

## AC-3: Personal Dashboard
```gherkin
Given the user navigates to /jarvis/app/personal
When the page renders
Then it shows:
  1. Page header "Personal" with violet domain color
  2. TodaySnapshot card — quick stats (tasks due, habits done, bills due, streak)
  3. Sub-program grid — 7 cards (Tasks, Habits, Bills, Calendar, Journal, Goals, Health)
  4. Each sub-program card shows: icon, name, summary stat from mock data, status indicator
And sub-program cards link to /jarvis/app/personal/{sub-program} routes
And the layout is 1 column on mobile, 2 columns on tablet+
```

## AC-4: Sub-Program Route Placeholders
```gherkin
Given the user taps a sub-program card on the Personal dashboard
When they navigate to /jarvis/app/personal/tasks (or habits, bills, etc.)
Then they see an EmptyState with the sub-program icon, name, and "Coming soon" message
And they can navigate back to the Personal dashboard
```

## AC-5: Build Compiles Clean
```gherkin
Given all changes are complete
When running `npx tsc --noEmit`
Then there are 0 new TypeScript errors (pre-existing audio-prep errors excluded)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create EmptyState primitive</name>
  <files>src/components/jarvis/primitives/EmptyState.tsx, src/components/jarvis/primitives/index.ts</files>
  <action>
    Create EmptyState.tsx following established primitive patterns (see Card.tsx, Badge.tsx):

    Props:
    - icon: ReactNode (lucide icon element, rendered at 48px)
    - title: string (heading-md, text-white/90)
    - description: string (body-sm, text-white/50)
    - actionLabel?: string (CTA button text)
    - onAction?: () => void (CTA click handler)
    - className?: string

    Layout: centered flex-col, gap-4, py-12 px-6 (generous vertical space)
    - Icon wrapper: w-12 h-12, text-white/30
    - Title: text-lg font-medium text-white/90
    - Description: text-sm text-white/50 text-center max-w-xs
    - CTA: Button variant="primary" size="md" (only if actionLabel provided)

    Mark as 'use client'.

    Add `export { EmptyState } from './EmptyState';` to primitives/index.ts barrel.
  </action>
  <verify>
    - File exists with correct props interface
    - Exported from primitives/index.ts
    - Uses established patterns (className passthrough, 'use client' directive)
    - npx tsc --noEmit shows no new errors
  </verify>
  <done>AC-1 satisfied: EmptyState renders icon, title, description, optional CTA</done>
</task>

<task type="auto">
  <name>Task 2: Create personalStore with typed mock data</name>
  <files>src/lib/jarvis/stores/personalStore.ts</files>
  <action>
    Create personalStore following homeStore.ts pattern (zustand, types at top, mock data, store):

    Types (export all for use in components):
    - PersonalTask: { id, title, project, dueDate, priority: 'high'|'medium'|'low', completed, overdue }
    - PersonalHabit: { id, name, frequency: 'daily'|'weekly', completedToday, currentStreak }
    - PersonalBill: { id, name, amount, dueDate, status: 'overdue'|'due_soon'|'paid'|'upcoming', category }
    - CalendarEvent: { id, title, startTime, endTime, isToday }
    - JournalEntry: { id, date, content, mood: 'great'|'good'|'okay'|'rough' | null }
    - PersonalGoal: { id, title, progress: number (0-100), category }
    - HealthItem: { id, type: 'workout'|'meal'|'sleep', title, summary, date }
    - TodayStats: { tasksDue, tasksCompleted, habitsDone, habitsTotal, billsDue, streak }

    Mock data — realistic for Jonathan's life:
    - 5 tasks: "Review budget spreadsheet" (overdue), "Schedule dentist", "Update Visopscreen docs" (due today), "Plan weekend trip" (upcoming), "Read Chapter 5" (upcoming)
    - 4 habits: "Meditation" (done), "Exercise" (pending), "Read 30min" (done), "Journal" (pending)
    - 3 bills: "Electric" ($142, overdue), "Internet" ($89, due in 2 days), "Gym" ($45, paid)
    - 3 calendar events: "Team standup" (today 9am), "Dentist" (tomorrow 2pm), "Weekend trip" (Saturday)
    - 1 journal entry: today, partial content, mood null (not yet set)
    - 3 goals: "Financial freedom" (45%), "Read 24 books" (33%), "Run half marathon" (20%)
    - 2 health items: "Morning run — 5K in 28:14" (today), "Meal prep — 1,800 cal" (today)

    Computed:
    - todayStats derived from mock data (tasksDue: 3, tasksCompleted: 0, habitsDone: 2, habitsTotal: 4, billsDue: 1, streak: 5)

    Store does NOT persist (mock data resets are fine).
    Do NOT import from homeStore — keep personalStore independent.
  </action>
  <verify>
    - All 7 type interfaces exported
    - Mock data arrays populated with realistic items
    - todayStats computed correctly
    - npx tsc --noEmit shows no new errors
  </verify>
  <done>AC-2 satisfied: personalStore provides typed mock data for all 7 sub-programs + todayStats</done>
</task>

<task type="auto">
  <name>Task 3: Build Personal dashboard page with TodaySnapshot + SubProgramCard grid + sub-route placeholders</name>
  <files>
    src/app/jarvis/app/personal/page.tsx,
    src/components/jarvis/personal/PersonalDashboard.tsx,
    src/components/jarvis/personal/SubProgramCard.tsx,
    src/components/jarvis/personal/TodaySnapshot.tsx,
    src/app/jarvis/app/personal/tasks/page.tsx,
    src/app/jarvis/app/personal/habits/page.tsx,
    src/app/jarvis/app/personal/bills/page.tsx,
    src/app/jarvis/app/personal/calendar/page.tsx,
    src/app/jarvis/app/personal/journal/page.tsx,
    src/app/jarvis/app/personal/goals/page.tsx,
    src/app/jarvis/app/personal/health/page.tsx
  </files>
  <action>
    **personal/page.tsx** — Replace placeholder with PersonalDashboard:
    - Import ContentContainer, PersonalDashboard
    - Render header "Personal" with subtitle "Your life at a glance"
    - Render PersonalDashboard below header

    **PersonalDashboard.tsx** — Main dashboard composition:
    - Import usePersonalStore for todayStats + sub-program data
    - Render TodaySnapshot at top (full width)
    - Render 7 SubProgramCards in responsive grid:
      - Mobile: 1 column
      - Tablet+: 2 columns (grid-cols-1 md:grid-cols-2 gap-3)
    - Sub-programs config array (inline, not a separate file):
      ```
      { id: 'tasks', name: 'Tasks', icon: CheckSquare, route: '/jarvis/app/personal/tasks', stat: `${todayStats.tasksDue} due today` }
      { id: 'habits', name: 'Habits', icon: Zap, route: '/jarvis/app/personal/habits', stat: `${todayStats.habitsDone}/${todayStats.habitsTotal} done` }
      { id: 'bills', name: 'Bills & Finance', icon: Receipt, route: '/jarvis/app/personal/bills', stat: `${todayStats.billsDue} due soon` }
      { id: 'calendar', name: 'Calendar', icon: Calendar, route: '/jarvis/app/personal/calendar', stat: `${events.filter(e=>e.isToday).length} today` }
      { id: 'journal', name: 'Journal', icon: BookOpen, route: '/jarvis/app/personal/journal', stat: entry ? 'Entry started' : 'No entry yet' }
      { id: 'goals', name: 'Goals & Planning', icon: Target, route: '/jarvis/app/personal/goals', stat: `${goals.length} active` }
      { id: 'health', name: 'Health & Wellness', icon: Heart, route: '/jarvis/app/personal/health', stat: `${healthItems.length} logged today` }
      ```
    - Icons from lucide-react: CheckSquare, Zap, Receipt, Calendar, BookOpen, Target, Heart

    **SubProgramCard.tsx** — Individual sub-program entry:
    - Props: name, icon (LucideIcon), stat (string), route (string), statusBadge?: BadgeStatus
    - Uses Card variant="interactive" padding="md"
    - Layout: icon (24px, text-violet-400) + name (text-sm font-medium) on left, stat (text-xs text-white/50) + chevron-right on right
    - Wrap in Next.js Link to route
    - If bills overdue: pass statusBadge="critical", if habits incomplete: statusBadge="warning"

    **TodaySnapshot.tsx** — Quick stats summary:
    - Import usePersonalStore todayStats
    - Card variant="glass" padding="md"
    - Grid of 4 stat items (2x2 on mobile, 4-col on desktop):
      - Tasks: `${tasksDue} due` with CheckSquare icon
      - Habits: `${habitsDone}/${habitsTotal}` with Zap icon
      - Bills: `${billsDue} due` with Receipt icon
      - Streak: `${streak} days` with Flame icon
    - Each stat: icon (16px, text-violet-400) + value (text-lg font-semibold text-white) + label (text-xs text-white/50)
    - If tasksDue > 0 or billsDue > 0, show warning color on that stat

    **7 sub-route placeholders** — Create page.tsx for each sub-program:
    - Each: 'use client', import ContentContainer + EmptyState + specific lucide icon
    - Render EmptyState with:
      - icon: relevant lucide icon (same as SubProgramCard)
      - title: sub-program name
      - description: "Coming in the next build wave"
    - Add a Back link at top: `← Personal` linking to /jarvis/app/personal
    - Keep each placeholder under 25 lines

    Avoid:
    - Do NOT create a separate domains/personal config file — inline the sub-program array
    - Do NOT wire to real Notion APIs — mock data only
    - Do NOT use DomainIcon for sub-program icons (those are domain icons, not sub-program icons)
    - Do NOT add layout.tsx files for sub-routes — use ContentContainer directly in each page
  </action>
  <verify>
    - /jarvis/app/personal shows dashboard with TodaySnapshot + 7 sub-program cards
    - Each card navigates to /jarvis/app/personal/{sub-program}
    - Sub-program pages show EmptyState with correct icon and "Coming in the next build wave"
    - Responsive: 1-col mobile, 2-col tablet+
    - npx tsc --noEmit shows no new errors
  </verify>
  <done>AC-3, AC-4, AC-5 satisfied: Personal dashboard with navigation, sub-route placeholders, clean build</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/layout/* (shell, header, domain rail, bottom tab bar — stable)
- src/components/jarvis/home/* (priority home components — stable)
- src/lib/jarvis/stores/homeStore.ts (home data — separate from personal)
- src/lib/jarvis/stores/settingsStore.ts (settings — stable)
- src/lib/jarvis/stores/shellStore.ts (shell state — stable)
- src/lib/jarvis/domains.ts (domain config — stable)
- src/app/jarvis/app/page.tsx (home page — stable)
- src/app/jarvis/app/settings/page.tsx (settings page — stable)
- Any existing primitives other than index.ts (adding export only)

## SCOPE LIMITS
- Mock data only — no Notion API calls, no data fetching
- No onboarding flow (deferred to E-04-08)
- No notification wiring (deferred to E-04-08)
- No real quick actions on sub-program cards (just navigation)
- Sub-program detail pages are EmptyState placeholders only (built in E-04-06, E-04-07)
- No new dependencies — use only lucide-react, zustand, next/link (already installed)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` — 0 new errors
- [ ] EmptyState renders in primitives/index.ts barrel
- [ ] personalStore exports all 7 type interfaces + todayStats
- [ ] /jarvis/app/personal shows dashboard (not placeholder)
- [ ] All 7 sub-program cards render with stats from personalStore
- [ ] All 7 sub-route pages render EmptyState
- [ ] Layout responsive: 1-col mobile, 2-col tablet+
- [ ] `npm run build` completes successfully
</verification>

<success_criteria>
- All 3 tasks completed
- All 5 acceptance criteria met
- No new TypeScript errors introduced
- EmptyState reusable for any domain (not Personal-specific)
- personalStore mock data realistic and typed
- Dashboard navigable with working sub-route links
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-05-SUMMARY.md`
</output>
