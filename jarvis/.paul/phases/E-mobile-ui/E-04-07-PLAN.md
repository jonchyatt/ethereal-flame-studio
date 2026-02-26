---
phase: E-mobile-ui
plan: 04-07
type: execute
wave: 1
depends_on: ["E-04-06"]
files_modified:
  - src/components/jarvis/personal/CalendarView.tsx
  - src/components/jarvis/personal/JournalView.tsx
  - src/components/jarvis/personal/GoalsList.tsx
  - src/components/jarvis/personal/HealthView.tsx
  - src/app/jarvis/app/personal/calendar/page.tsx
  - src/app/jarvis/app/personal/journal/page.tsx
  - src/app/jarvis/app/personal/goals/page.tsx
  - src/app/jarvis/app/personal/health/page.tsx
  - src/lib/jarvis/stores/personalStore.ts
autonomous: true
---

<objective>
## Goal
Replace the remaining 4 EmptyState placeholders (Calendar, Journal, Goals, Health) with polished, data-driven sub-views — completing the Personal domain's 7 sub-programs.

## Purpose
Finishes the Personal domain UI so all 7 sub-programs are functional with mock data. After this, Personal is feature-complete for Wave 1 and ready for real data integration in future phases.

## Output
4 new view components, 4 updated route pages, 1 store mutation (journal mood). Personal domain 7/7 sub-views complete.
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/E-mobile-ui/E-04-06-SUMMARY.md — TasksList/HabitsList/BillsList patterns, section grouping, status tints, summary heroes, spring animations

## Source Files
@src/lib/jarvis/stores/personalStore.ts — types + mock data for all 7 sub-programs
@src/components/jarvis/personal/TasksList.tsx — reference pattern (section grouping, hero, fadeInUp, Card usage)
@src/components/jarvis/personal/HabitsList.tsx — reference pattern (progress bar, toggles, streaks)
@src/components/jarvis/personal/BillsList.tsx — reference pattern (SECTION_CONFIG, status-tinted sections, Badge)
</context>

<skills>
No specialized flows configured — skills section omitted.
</skills>

<acceptance_criteria>

## AC-1: Calendar Timeline View
```gherkin
Given the personalStore contains CalendarEvent[] with isToday flags
When the user navigates to /jarvis/app/personal/calendar
Then they see a summary hero with "X events today" pill
And events are grouped into "TODAY" and "UPCOMING" sections
And each event shows time range (formatted HH:MM) + title
And today's events appear in a violet-tinted section, upcoming in glass Card
And all sections have staggered fadeInUp entrance animation
```

## AC-2: Journal Entries with Mood
```gherkin
Given the personalStore contains JournalEntry[] with optional mood
When the user navigates to /jarvis/app/personal/journal
Then they see a summary hero with entry count and current streak info
And each entry shows date, mood emoji (or "—" if null), and content preview (truncated)
And tapping a mood selector on today's entry calls setJournalMood in the store
And entries use glass Cards with fadeInUp entrance
```

## AC-3: Goals Progress View
```gherkin
Given the personalStore contains PersonalGoal[] with progress 0-100
When the user navigates to /jarvis/app/personal/goals
Then they see a summary hero with goal count and average progress
And each goal shows title, category badge, and animated progress bar
And progress bars use the spring-eased width transition pattern from HabitsList
And goals use glass Cards with fadeInUp entrance
```

## AC-4: Health Activity Log
```gherkin
Given the personalStore contains HealthItem[] with type (workout/meal/sleep)
When the user navigates to /jarvis/app/personal/health
Then they see a summary hero with today's activity count
And items are grouped by type with appropriate icons (Dumbbell/UtensilsCrossed/Moon)
And each item shows title + summary + formatted date
And sections use glass Cards with fadeInUp entrance
```

## AC-5: Store Mutation — Journal Mood
```gherkin
Given a JournalEntry with mood: null
When the user taps a mood emoji on that entry
Then setJournalMood(id, mood) updates the entry's mood in the store
And the mood emoji renders immediately without page reload
```

## AC-6: Build Compiles Clean
```gherkin
Given all 4 new components and updated pages
When running tsc --noEmit
Then no new TypeScript errors are introduced (pre-existing audio-prep errors acceptable)
```

## AC-7: Polish Consistency
```gherkin
Given the E-04-05.5 polish vocabulary
When reviewing all 4 new components
Then all containers use glass or glass-interactive Card variants (no flat bg-zinc-900)
And all lists/sections have staggered fadeInUp entrance (400ms/50-80ms delay)
And spring easing used for transforms, ease for opacity/color
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Calendar + Journal view components and pages</name>
  <files>
    src/components/jarvis/personal/CalendarView.tsx,
    src/components/jarvis/personal/JournalView.tsx,
    src/app/jarvis/app/personal/calendar/page.tsx,
    src/app/jarvis/app/personal/journal/page.tsx,
    src/lib/jarvis/stores/personalStore.ts
  </files>
  <action>
    **CalendarView.tsx:**
    - Import CalendarEvent from personalStore, Card from primitives
    - useMemo to group events: todayEvents (isToday === true), upcomingEvents (isToday === false)
    - Format time: extract HH:MM from startTime/endTime ISO strings (e.g., "9:00 – 9:30")
    - Summary hero: Card variant="glass" with "X events today" pill (violet-tinted, matching summary hero pill pattern from TasksList)
    - TODAY section: violet-tinted container (bg-violet-400/5 border border-violet-400/10) — matches domain color
    - UPCOMING section: Card variant="glass"
    - Each event row: time range (text-xs text-white/40) + title (text-sm text-white/90)
    - Staggered fadeInUp on each section (80ms delay per section)
    - CSS keyframes via inline style tag (self-contained pattern)

    **JournalView.tsx:**
    - Import JournalEntry from personalStore, Card from primitives
    - MOOD_EMOJI map: great→😊, good→🙂, okay→😐, rough→😔, null→"—"
    - Summary hero: Card variant="glass" with entry count pill
    - Each entry: Card variant="glass-interactive" with date header, mood emoji display, content preview (truncate to ~100 chars)
    - Today's entry gets a mood selector row: 4 emoji buttons that call setJournalMood(id, mood)
    - Mood buttons: rounded-full, bg-white/5 default, bg-violet-400/20 when selected, spring transition on scale
    - Staggered fadeInUp on entry cards
    - Avoid: Don't add new journal entries — just mood setting on existing ones

    **Store mutation (personalStore.ts):**
    - Add setJournalMood: (id: string, mood: JournalEntry['mood']) => void to PersonalActions
    - Implementation: map journal entries, set mood on matching id
    - No todayStats recomputation needed (mood doesn't affect stats)

    **Update pages:**
    - calendar/page.tsx: Replace EmptyState with CalendarView, keep back link
    - journal/page.tsx: Replace EmptyState with JournalView, keep back link
  </action>
  <verify>tsc --noEmit shows no new errors; calendar and journal pages render view components instead of EmptyState</verify>
  <done>AC-1 (Calendar timeline), AC-2 (Journal with mood), AC-5 (setJournalMood mutation), AC-7 (polish) satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Goals + Health view components and pages</name>
  <files>
    src/components/jarvis/personal/GoalsList.tsx,
    src/components/jarvis/personal/HealthView.tsx,
    src/app/jarvis/app/personal/goals/page.tsx,
    src/app/jarvis/app/personal/health/page.tsx
  </files>
  <action>
    **GoalsList.tsx:**
    - Import PersonalGoal from personalStore, Card/Badge from primitives
    - useMemo for average progress: Math.round(goals.reduce / goals.length)
    - Summary hero: Card variant="glass" with "X goals" pill + "Y% avg" pill
    - Each goal: Card variant="glass-interactive" with:
      - Title (text-sm text-white/90)
      - Category Badge (variant="outline", small text)
      - Progress bar: h-2 bg-white/10 rounded-full track, inner div with violet bg, spring-eased width transition (reuse exact HabitsList progress bar pattern)
      - Progress text: "XX%" right-aligned (text-xs text-white/40)
    - Staggered fadeInUp on each goal card (50ms delay)
    - CSS keyframes via inline style tag

    **HealthView.tsx:**
    - Import HealthItem from personalStore, Card from primitives
    - Import icons: Dumbbell, UtensilsCrossed, Moon from lucide-react
    - TYPE_CONFIG map: workout → { icon: Dumbbell, label: 'Workouts', color: 'emerald' }, meal → { icon: UtensilsCrossed, label: 'Meals', color: 'amber' }, sleep → { icon: Moon, label: 'Sleep', color: 'indigo' }
    - useMemo to group by type: Record<HealthItem['type'], HealthItem[]>
    - Summary hero: Card variant="glass" with "X activities today" pill
    - Each type group: Card variant="glass" with:
      - Section header: icon (16px, colored) + label (text-xs uppercase tracking-wider)
      - Item rows: title (text-sm text-white/90) + summary (text-xs text-white/40) + formatted date
      - Only render non-empty groups
    - Staggered fadeInUp on each group (80ms delay)
    - formatDate helper: same pattern as TasksList (month day format)

    **Update pages:**
    - goals/page.tsx: Replace EmptyState with GoalsList, keep back link
    - health/page.tsx: Replace EmptyState with HealthView, keep back link
  </action>
  <verify>tsc --noEmit shows no new errors; goals and health pages render view components instead of EmptyState</verify>
  <done>AC-3 (Goals progress), AC-4 (Health activity), AC-6 (build clean), AC-7 (polish) satisfied</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/personal/TasksList.tsx (completed in E-04-06)
- src/components/jarvis/personal/HabitsList.tsx (completed in E-04-06)
- src/components/jarvis/personal/BillsList.tsx (completed in E-04-06)
- src/components/jarvis/primitives/* (primitives are stable)
- src/components/jarvis/layout/* (layout is stable)
- src/app/jarvis/app/personal/tasks/* (completed in E-04-06)
- src/app/jarvis/app/personal/habits/* (completed in E-04-06)
- src/app/jarvis/app/personal/bills/* (completed in E-04-06)
- src/app/jarvis/app/personal/page.tsx (personal dashboard is stable)

## SCOPE LIMITS
- Mock data only — no API endpoints, no real data fetching
- No new primitives — use existing Card, Badge, etc.
- No new store slices — extend existing personalStore only
- No new dependencies — lucide-react icons + zustand + React only
- Display-focused views — minimal interactivity (only journal mood setter)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` — no new TypeScript errors
- [ ] All 4 EmptyState placeholders replaced with data-driven views
- [ ] CalendarView groups by today/upcoming with time formatting
- [ ] JournalView shows mood emojis and mood selection works
- [ ] GoalsList shows progress bars with spring animation
- [ ] HealthView groups by type with appropriate icons
- [ ] All components use glass Card variants (no flat surfaces)
- [ ] All components have fadeInUp entrance animations
- [ ] setJournalMood mutation works in store
- [ ] `npm run build` passes (ignoring pre-existing audio-prep errors)
</verification>

<success_criteria>
- All 7 Personal sub-programs have functional views (3 from E-04-06 + 4 from this plan)
- All acceptance criteria (AC-1 through AC-7) met
- No new errors or warnings introduced
- Consistent polish vocabulary across all 4 new components
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-07-SUMMARY.md`
</output>
