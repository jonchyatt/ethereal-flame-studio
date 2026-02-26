---
phase: E-mobile-ui
plan: 04-02
type: execute
wave: 1
depends_on: ["04-01"]
files_modified:
  - src/lib/jarvis/stores/homeStore.ts
  - src/lib/jarvis/widgets/types.ts
  - src/lib/jarvis/widgets/registry.ts
  - src/lib/jarvis/data/freshness.ts
  - src/components/jarvis/home/PriorityStack.tsx
  - src/components/jarvis/home/DomainHealthGrid.tsx
  - src/components/jarvis/home/QuickActionsBar.tsx
  - src/components/jarvis/home/WidgetZone.tsx
  - src/components/jarvis/home/BriefingCard.tsx
  - src/components/jarvis/home/index.ts
  - src/app/jarvis/app/page.tsx
autonomous: true
---

<objective>
## Goal
Build the Priority Home screen with all 5 sections (priority stack, domain health grid, quick actions, pinned widgets, briefing card) and the widget registry infrastructure — replacing the placeholder home page with a fully composed layout.

## Purpose
Priority Home is the command center of Jarvis's multi-domain OS. It aggregates urgency across all active domains into one screen. Without it, users must visit each domain individually to know what needs attention. This is the screen Jonathan sees first every time he opens Jarvis.

## Output
- homeStore (zustand) managing priority items, domain health, pinned widgets, briefing
- Widget registry types + static definitions for all 8 widget types
- Data freshness utility (5-tier model)
- 5 composite components: PriorityStack, DomainHealthGrid, QuickActionsBar, WidgetZone, BriefingCard
- Home page assembled with responsive layout using mock data
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work (genuine dependency — imports shell + primitives from E-04-01)
@.paul/phases/E-mobile-ui/E-04-01-SUMMARY.md

## Blueprint References
@.paul/research/phase-e-information-architecture.md — Priority Home hierarchy (lines 195-273), widget registry (lines 242-261), data freshness model (lines 1354-1400), priority stack data flow (lines 940-953)
@.paul/research/phase-e-ui-system-design.md — PriorityItem component (lines 461-471), WidgetCard component (lines 473-486), responsive layout (lines 838-859)

## Source Files
@src/app/jarvis/app/page.tsx — Current placeholder to replace
@src/lib/jarvis/stores/shellStore.ts — Shell state pattern to follow
@src/lib/jarvis/domains.ts — Domain config + DOMAIN_COLORS lookup
@src/components/jarvis/primitives/Card.tsx — Card primitive to compose with
@src/components/jarvis/primitives/Badge.tsx — Badge for urgency/status
@src/components/jarvis/primitives/Button.tsx — Button for quick actions
@src/lib/jarvis/executive/types.ts — BriefingData, TaskSummary, BillSummary, HabitSummary types
</context>

<acceptance_criteria>

## AC-1: Priority Stack renders urgent items with correct urgency ordering
```gherkin
Given the homeStore contains priority items with urgency scores (overdue=100, due_today=80, due_soon=60, info=20)
When the Priority Home page renders
Then items appear sorted by urgency score descending
And each item shows domain icon, title, urgency stripe (red/amber/none/blue), and optional quick action button
And an empty state shows "All clear" when no items exist
```

## AC-2: Domain Health Grid shows active domains with bento layout
```gherkin
Given 2 active domains (Home excluded) — Personal and any future domains
When the Priority Home page renders
Then the Domain Health Grid shows one bento card per active domain
And each card shows status indicator (red/amber/green/gray), domain name, icon, key metric, one-line summary
And the grid is responsive: 1-col mobile, 2-col tablet, 3-col desktop
```

## AC-3: Widget system supports pinning up to 4 widgets
```gherkin
Given the widget registry defines 8 widget types (Next Dose, Regime Badge, Habit Streak, Pipeline, Bill Due, Compliance, Daily Compliance, Portfolio P&L)
When a user has pinned widgets in homeStore
Then WidgetZone renders up to 4 pinned WidgetCards
And each widget shows title, metric (or placeholder), optional quick action
And widgets support small (1-col) and wide (2-col) sizes
And unpinned state shows "Add widgets" CTA
```

## AC-4: Quick Actions Bar changes based on time of day
```gherkin
Given the current time is morning (before 12pm), midday (12pm-5pm), or evening (after 5pm)
When the Priority Home page renders
Then the Quick Actions Bar shows contextual shortcuts:
  Morning: "Start briefing", "Log dose", "Check tasks"
  Midday: "Quick add task", "Check Visopscreen", "Log meal"
  Evening: "Evening review", "Journal", "Tomorrow's plan"
```

## AC-5: Build compiles without new errors
```gherkin
Given all new files are created
When TypeScript compilation runs on the new files
Then no new type errors are introduced (pre-existing audio-prep errors are acceptable)
And all imports resolve correctly
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Data layer — homeStore, widget registry, freshness utility</name>
  <files>src/lib/jarvis/stores/homeStore.ts, src/lib/jarvis/widgets/types.ts, src/lib/jarvis/widgets/registry.ts, src/lib/jarvis/data/freshness.ts</files>
  <action>
    **1a. Create `src/lib/jarvis/widgets/types.ts`:**
    Define types for the widget system:
    - `WidgetSize = 'small' | 'wide'`
    - `WidgetDefinition`: id, name, domain (domain id string), dataSource (string key), tapRoute (string), quickActionLabel (string | null), defaultSize (WidgetSize)
    - `PinnedWidget`: widgetId (string), position (number 0-3)

    **1b. Create `src/lib/jarvis/widgets/registry.ts`:**
    Static registry array of all 8 WidgetDefinitions from IA spec:
    - next-dose (Reset Bio), regime-badge (Visopscreen), habit-streak (Personal), pipeline (Ethereal Flame), bill-due (Personal), compliance (Satori/Entity), daily-compliance (Reset Bio), portfolio-pnl (Visopscreen)
    - Export `getWidgetById(id)`, `getWidgetsForDomain(domainId)`, `DEFAULT_PINNED_WIDGETS` (habit-streak + bill-due for Personal-active setup)
    - Each definition includes: id, name, domain, dataSource key, tapRoute, quickActionLabel, defaultSize

    **1c. Create `src/lib/jarvis/data/freshness.ts`:**
    Export `type FreshnessTier = 'live' | 'recent' | 'stale' | 'old' | 'unknown'`
    Export `getFreshness(lastFetched: Date | null): FreshnessTier`:
    - null → 'unknown'
    - <1 min → 'live'
    - 1-15 min → 'recent'
    - 15 min - 1 hr → 'stale'
    - 1-6 hr → 'old'
    - >6 hr → 'unknown'

    **1d. Create `src/lib/jarvis/stores/homeStore.ts`:**
    Zustand store (with persist for pinnedWidgets only) managing:
    - `priorityItems: PriorityItem[]` — each has: id, domainId, title, subtitle, urgency ('critical'|'warning'|'routine'|'info'), urgencyScore (number), quickActionLabel (string|null)
    - `domainHealth: DomainHealthItem[]` — each has: domainId, status ('red'|'amber'|'green'|'gray'), metric (string), summary (string)
    - `pinnedWidgets: PinnedWidget[]` — max 4, persisted to localStorage
    - `briefingSummary: string | null` — latest briefing one-liner
    - `lastFetched: Date | null` — for freshness calculation
    - Actions: `setPriorityItems`, `setDomainHealth`, `pinWidget(widgetId)` (enforces max 4), `unpinWidget(widgetId)`, `reorderWidgets(widgets)`, `setBriefingSummary`, `setLastFetched`
    - Load mock data in initial state: 4-5 sample priority items across Personal domain (overdue bill, tasks due today, habit reminder), Personal health card showing "3 tasks, 0 overdue" green status. This mock data makes the Home screen immediately visual.

    Avoid: Don't import from executive/types — define PriorityItem and DomainHealthItem locally in homeStore. The priority stack is a UI aggregation layer, not a copy of BriefingData.
  </action>
  <verify>TypeScript compilation: `npx tsc --noEmit src/lib/jarvis/stores/homeStore.ts src/lib/jarvis/widgets/types.ts src/lib/jarvis/widgets/registry.ts src/lib/jarvis/data/freshness.ts` passes (or verify imports resolve via IDE)</verify>
  <done>AC-3 partially satisfied (registry exists with 8 widgets, pin/unpin logic with max-4 enforcement). AC-5 partially satisfied (no new type errors from data layer).</done>
</task>

<task type="auto">
  <name>Task 2: Build 5 Home composite components</name>
  <files>src/components/jarvis/home/PriorityStack.tsx, src/components/jarvis/home/DomainHealthGrid.tsx, src/components/jarvis/home/QuickActionsBar.tsx, src/components/jarvis/home/WidgetZone.tsx, src/components/jarvis/home/BriefingCard.tsx, src/components/jarvis/home/index.ts</files>
  <action>
    **2a. Create `src/components/jarvis/home/PriorityStack.tsx`:**
    Reads `priorityItems` from homeStore. Renders a `<ul role="list">` with each item as `<li>`.
    Each PriorityItem row:
    - Left: urgency stripe (red=critical, amber=warning, blue=info, none=routine) using Card's statusStripe pattern
    - Domain icon from lucide-react (resolve via domains.ts getDomainById → icon name → dynamic import or a small icon map)
    - Title + subtitle text
    - Right: optional quick action Button (ghost variant, sm size) if quickActionLabel exists
    - Use Card variant="interactive" for each item (tappable)
    Empty state: Card variant="glass" with "All clear — nothing urgent right now" text and a muted checkmark icon.
    Note on domain icon rendering: Since lucide icon names are strings in domains.ts, create a small `DomainIcon` helper that maps icon string names (Home, User, Flame, Dna, Dice6, TrendingUp, Landmark, Building2) to actual lucide components. Keep this in PriorityStack.tsx or extract to a shared util if it's reusable.

    **2b. Create `src/components/jarvis/home/DomainHealthGrid.tsx`:**
    Reads `domainHealth` from homeStore + `getActiveDomains()` from domains.ts (filter out 'home').
    Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
    Each DomainHealthCard (inline, not separate file):
    - Card variant="interactive", padding="md"
    - Status dot: 8px circle colored by status (red-400, amber-400, green-400, zinc-600 for gray)
    - Domain name + domain icon (use the DomainIcon helper from 2a — extract to shared `src/components/jarvis/home/DomainIcon.tsx` if needed)
    - Key metric (bold, larger text)
    - One-line summary (text-white/60, smaller)
    - onClick navigates to domain route
    Only show cards for active domains (not 'home'). If no domains active beyond home, show empty state.

    **2c. Create `src/components/jarvis/home/QuickActionsBar.tsx`:**
    Pure component (no store dependency). Determines time period from `new Date().getHours()`:
    - Morning (<12): actions = [{label: "Start briefing", icon: Sun}, {label: "Log dose", icon: Pill}, {label: "Check tasks", icon: CheckSquare}]
    - Midday (12-17): actions = [{label: "Quick add task", icon: Plus}, {label: "Check Visopscreen", icon: TrendingUp}, {label: "Log meal", icon: UtensilsCrossed}]
    - Evening (>=17): actions = [{label: "Evening review", icon: Moon}, {label: "Journal", icon: BookOpen}, {label: "Tomorrow's plan", icon: Calendar}]
    Render as horizontal row of Button variant="secondary" size="sm" with icon prop.
    Use a flex row with gap-2 and overflow-x-auto for mobile scrollability.
    Note: These are placeholder actions — onClick will be wired to real flows in later plans. For now, onClick can be undefined (buttons render but don't navigate).

    **2d. Create `src/components/jarvis/home/WidgetZone.tsx`:**
    Reads `pinnedWidgets` from homeStore + imports widget registry.
    Grid: `grid grid-cols-2 gap-3` (wide widgets span `col-span-2`).
    For each pinned widget, resolve WidgetDefinition from registry. Render WidgetCard (inline):
    - Card variant="glass" padding="sm"
    - Title (widget name), metric placeholder text ("--"), optional quick action Button
    - Domain color accent from DOMAIN_COLORS lookup
    - onClick placeholder (navigate to tapRoute in future)
    If no widgets pinned: show "Add widgets to your Home" CTA with a Plus icon.
    If fewer than 4 pinned: show a ghost "+" card at the end as add-widget hint.

    **2e. Create `src/components/jarvis/home/BriefingCard.tsx`:**
    Reads `briefingSummary` from homeStore.
    Expandable Card variant="glass":
    - Header: "Latest Briefing" label + expand/collapse chevron
    - Collapsed: one-line summary (briefingSummary or "No briefing yet today")
    - Expanded: full summary text (for now just the one-liner, real briefing content comes later)
    - Use local useState for expanded toggle
    - FileText icon from lucide-react for the header

    **2f. Create `src/components/jarvis/home/index.ts`:**
    Barrel export: PriorityStack, DomainHealthGrid, QuickActionsBar, WidgetZone, BriefingCard

    Avoid: Don't create separate files for sub-components like PriorityItem or DomainHealthCard — keep them inline in the parent component. Only extract DomainIcon if needed by multiple components.
  </action>
  <verify>All 6 files compile. Imports from primitives, homeStore, domains.ts, and widget registry all resolve.</verify>
  <done>AC-1, AC-2, AC-3, AC-4 satisfied (all 5 sections render correctly with proper urgency ordering, responsive grid, widget pinning, and time-of-day actions).</done>
</task>

<task type="auto">
  <name>Task 3: Assemble Home page — replace placeholder with full layout</name>
  <files>src/app/jarvis/app/page.tsx</files>
  <action>
    Replace the entire placeholder content in page.tsx with the full Priority Home layout:

    ```
    ContentContainer wrapping:
      1. Greeting area: "Priority Home" heading + subtitle with current date
      2. PriorityStack
      3. DomainHealthGrid
      4. QuickActionsBar
      5. WidgetZone
      6. BriefingCard
    ```

    Use `space-y-6` for vertical spacing between sections.
    Each section gets a subtle label (text-xs uppercase tracking-wide text-white/40) above it: "PRIORITIES", "DOMAINS", "QUICK ACTIONS", "WIDGETS", "BRIEFING".
    Keep 'use client' directive since home components use zustand stores.
    Import all 5 components from '@/components/jarvis/home'.
    Import ContentContainer from '@/components/jarvis/layout'.

    The page should immediately show mock data (priority items, health card for Personal) from homeStore's initial state, making the Home screen look populated on first load.
  </action>
  <verify>Navigate to /jarvis/app in browser — Priority Home renders with all 5 sections visible, mock data populating priority stack and domain health grid. Responsive layout works (1-col mobile, multi-col desktop).</verify>
  <done>AC-1, AC-2, AC-3, AC-4, AC-5 fully satisfied — Home page is assembled, responsive, and compiles cleanly.</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/primitives/* (use as-is, no modifications)
- src/components/jarvis/layout/* (shell + header + rail + tabs stable from E-04-01)
- src/lib/jarvis/stores/shellStore.ts (shell state stable)
- src/lib/jarvis/domains.ts (domain config stable)
- src/lib/jarvis/executive/* (existing briefing/executive system untouched)
- src/components/jarvis/Dashboard/* (old dashboard preserved)
- src/app/jarvis/* (old orb page untouched — only modify /jarvis/app/page.tsx)

## SCOPE LIMITS
- No API endpoints — components render from zustand store with mock initial data
- No real data fetching — wire-up to Notion/APIs comes in domain-specific plans
- No widget management UI in Settings — separate plan
- No widget suggestion logic ("pin Next Dose?") — later plan
- No notification badge wiring — notification foundation is a separate plan
- Quick action buttons are presentational only — onClick wired in later plans
- Briefing card shows placeholder text — real briefing content integration is later

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` shows no new errors (pre-existing audio-prep errors acceptable)
- [ ] All 11 files exist with correct imports resolving
- [ ] Home page at /jarvis/app renders all 5 sections
- [ ] Priority stack shows mock items sorted by urgency
- [ ] Domain health grid responsive: 1-col mobile, 2-col tablet, 3-col desktop
- [ ] Widget zone shows default pinned widgets (habit-streak + bill-due)
- [ ] Quick actions bar shows time-appropriate shortcuts
- [ ] Empty states render correctly when store is empty
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All 3 tasks completed
- All verification checks pass
- No errors or warnings introduced
- Home page transforms from placeholder to fully composed Priority Home
- Widget registry infrastructure ready for future domain activation
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-02-SUMMARY.md`
</output>
