---
phase: E-mobile-ui
plan: 04-06
type: execute
wave: 1
depends_on: ["04-05", "04-05.5"]
files_modified:
  - src/lib/jarvis/stores/personalStore.ts
  - src/components/jarvis/personal/TasksList.tsx
  - src/components/jarvis/personal/HabitsList.tsx
  - src/components/jarvis/personal/BillsList.tsx
  - src/app/jarvis/app/personal/tasks/page.tsx
  - src/app/jarvis/app/personal/habits/page.tsx
  - src/app/jarvis/app/personal/bills/page.tsx
autonomous: true
---

<objective>
## Goal
Replace the 3 EmptyState placeholder pages (Tasks, Habits, Bills) with polished, delightful sub-views featuring section grouping, summary heroes, micro-interactions, and the glassmorphism aesthetic established throughout Jarvis.

## Purpose
These are the first screens where Jonathan (and his wife) will actually *interact* with data — not just see it. They need to feel as considered as the ChatOverlay's bouncing dots or TodaySnapshot's amber warnings. Flat card lists would betray the quality bar. These views should feel like a premium life management app, not a todo tutorial.

## Output
- 3 new view components: TasksList, HabitsList, BillsList
- 3 page replacements with summary heroes + grouped sections
- Store extended with mutation actions + CSS micro-interactions
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/STATE.md

## Prior Work
@.paul/phases/E-mobile-ui/E-04-05-SUMMARY.md — personalStore types/mock data, EmptyState primitive, sub-route placeholders
@.paul/phases/E-mobile-ui/E-04-05.5-PLAN.md — visual polish pass establishing quality vocabulary

## E-04-05.5 Polish Vocabulary (MUST USE)
The visual polish pass established these patterns that ALL new components must follow:
- **Card variants:** Use `glass` for read-only containers (heroes, summaries). Use `glass-interactive` for tappable surfaces. NEVER use `variant="default"` for visible containers.
- **Entrance animations:** Every list/grid of items gets staggered `fadeInUp` (400ms ease-out, 50ms stagger per item) via inline `<style>` tag + class + `animationDelay`. Pattern: `@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`
- **Hover elevation:** Interactive elements use `hover:scale-[1.01] hover:shadow-lg hover:border-white/20 transition-all duration-200`
- **Spring easing:** `cubic-bezier(0.34, 1.56, 0.64, 1)` for scale/transform, `ease` for opacity/color
- **Glass surfaces:** `bg-black/60 backdrop-blur-md border border-white/10` (not flat `bg-zinc-900`)

## Source Files
@src/lib/jarvis/stores/personalStore.ts — store with types + mock data, needs mutation actions
@src/app/jarvis/app/personal/tasks/page.tsx — EmptyState placeholder to replace
@src/app/jarvis/app/personal/habits/page.tsx — EmptyState placeholder to replace
@src/app/jarvis/app/personal/bills/page.tsx — EmptyState placeholder to replace
@src/components/jarvis/primitives/Card.tsx — Card with variants: glass, glass-interactive (E-04-05.5), default, interactive. statusStripe, header/footer slots
@src/components/jarvis/primitives/Badge.tsx — Badge with status variant (critical/warning/success/info/inactive)
@src/components/jarvis/primitives/Button.tsx — Button with ghost/primary/destructive/icon variants
@src/components/jarvis/primitives/Toggle.tsx — Toggle switch with spring animation
@src/components/jarvis/personal/TodaySnapshot.tsx — pattern reference: glass card, 2×2→4-col grid, amber warnings
@src/components/jarvis/personal/PersonalDashboard.tsx — parent dashboard, reads from store
</context>

<skills>
No SPECIAL-FLOWS.md — skills section omitted.
</skills>

<acceptance_criteria>

## AC-1: Tasks Sub-View — Grouped & Interactive
```gherkin
Given the user navigates to /jarvis/app/personal/tasks
When the page renders
Then a summary hero shows at the top: task counts (overdue / due today / upcoming) in a glass card
And tasks are grouped into labeled sections: "Overdue" (if any), "Due Today", "Upcoming"
And each task row is compact: custom checkbox + title + project tag + priority dot + due date
And completed tasks slide to a collapsed "Completed" section at the bottom with muted styling
And tapping the checkbox fires a smooth transition (check scales in, text gets strikethrough with 300ms ease, row fades to 50% opacity)
And overdue section rows have a subtle red-400/5 background tint
And a back link to Personal is present
```

## AC-2: Habits Sub-View — Progress Hero & Streaks
```gherkin
Given the user navigates to /jarvis/app/personal/habits
When the page renders
Then a progress hero at top shows daily completion: "2 of 4" with a horizontal progress bar (violet fill, animated width transition)
And the progress bar fills proportionally and uses a spring-eased width transition on change
And each habit row shows: Toggle + name + frequency label + streak with Flame icon
And active streaks (>0) display in amber-400 with the Flame icon
And toggling a habit updates the progress bar fill in real-time
And when all habits are complete, the progress hero text changes to "All done today" with a green-400 accent
And a back link to Personal is present
```

## AC-3: Bills Sub-View — Financial Summary & Status Groups
```gherkin
Given the user navigates to /jarvis/app/personal/bills
When the page renders
Then a financial summary hero shows: "Total Due" (sum of unpaid) and "Paid This Month" (sum of paid) in a glass card with large dollar amounts
And bills are grouped into labeled sections: "Overdue" (critical tint), "Due Soon" (warning tint), "Upcoming", "Paid" (muted)
And each bill row shows: name + category + formatted amount ($XX.XX) + due date + status Badge
And overdue bills have a red-400/5 section background tint
And unpaid bills show a "Mark Paid" ghost button that on click transitions the bill to the Paid section
And paid bills render at opacity-60 with a success badge and strikethrough on the amount
And a back link to Personal is present
```

## AC-4: Store Mutations Recompute Stats
```gherkin
Given the user toggles a task, habit, or bill status
When the store mutation fires
Then todayStats recomputes to reflect the change
And the Personal dashboard stats (TodaySnapshot) update when navigating back
```

## AC-5: Micro-Interactions & Transitions
```gherkin
Given any interactive element is toggled
When the state changes
Then CSS transitions animate the change smoothly (300ms ease for opacity/strikethrough, spring-eased for progress bar width)
And no layout shift occurs during transitions
And no animation libraries are used — pure CSS transitions and keyframes via inline style tags
```

## AC-7: E-04-05.5 Polish Consistency
```gherkin
Given any new component renders
When inspecting the visual surface
Then all visible containers use variant="glass" or "glass-interactive" (never "default")
And all sections/lists have staggered fadeInUp entrance animations (400ms ease-out, 50-80ms stagger)
And spring easing cubic-bezier(0.34, 1.56, 0.64, 1) is used for scale/transform transitions
```

## AC-6: Build Compiles Clean
```gherkin
Given all changes are complete
When running tsc --noEmit
Then no new TypeScript errors are introduced (pre-existing audio-prep errors tolerated)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Extend personalStore with mutation actions</name>
  <files>src/lib/jarvis/stores/personalStore.ts</files>
  <action>
    Add 3 mutation actions to PersonalActions interface and implement in the store:

    1. `toggleTask(id: string)` — Toggles task.completed. If marking complete on an overdue task, also set overdue to false. Recomputes todayStats.

    2. `toggleHabit(id: string)` — Toggles habit.completedToday. When toggling ON, increment currentStreak; when toggling OFF, decrement currentStreak (min 0). Recomputes todayStats.

    3. `markBillPaid(id: string)` — Sets bill.status to 'paid'. Recomputes todayStats.

    Implementation: follow the existing set() + map() pattern. Each mutation recomputes todayStats via computeTodayStats().
  </action>
  <verify>tsc --noEmit passes; all 3 actions exist on store type</verify>
  <done>AC-4 satisfied: mutations exist and recompute todayStats</done>
</task>

<task type="auto">
  <name>Task 2: Tasks and Habits sub-views with heroes + micro-interactions</name>
  <files>
    src/components/jarvis/personal/TasksList.tsx,
    src/components/jarvis/personal/HabitsList.tsx,
    src/app/jarvis/app/personal/tasks/page.tsx,
    src/app/jarvis/app/personal/habits/page.tsx
  </files>
  <action>
    **TasksList.tsx — Grouped task view with summary hero:**

    Structure:
    ```
    [Summary Hero — glass card]
      3 stat pills inline: "1 overdue" (red) · "2 due today" (amber) · "2 upcoming" (white/50)

    [Section: "Overdue"] — only if overdue tasks exist
      Section header: text-xs uppercase tracking-wider text-red-400/70, "OVERDUE"
      Section bg: rounded-xl with bg-red-400/5 border border-red-400/10 p-3
      Compact rows inside (no individual cards — rows within the section card)

    [Section: "Due Today"]
      Section header: text-xs uppercase tracking-wider text-amber-400/70, "DUE TODAY"
      Rows in a glass Card (variant="glass")

    [Section: "Upcoming"]
      Section header: text-xs uppercase tracking-wider text-white/30, "UPCOMING"
      Rows in a glass Card (variant="glass")

    [Section: "Completed"] — collapsed/muted if any exist
      Section header: text-xs text-white/20, "COMPLETED · {count}"
      Rows at opacity-40 in a glass Card (variant="glass")
    ```

    **Entrance animations:**
    - Each section group gets staggered `fadeInUp` (hero first, then each section 50ms apart).
    - Add inline `<style>` tag with `@keyframes fadeInUp` and `.task-section-enter { animation: fadeInUp 400ms ease-out both; }`.
    - Apply `.task-section-enter` + `style={{ animationDelay: '${sectionIndex * 80}ms' }}` to each section wrapper.

    Each task row layout (inside section cards, separated by border-b border-white/5):
    - Left: Custom checkbox — 20×20 rounded-md border-2. Unchecked: border-white/20 bg-transparent. Checked: bg-violet-500 border-violet-500 with a CSS-transitioned Check icon (lucide Check, size 14, white, scale from 0→1 over 200ms). Use a `<button>` for accessibility.
    - Center column: Task title (text-sm text-white/90, gains line-through + text-white/40 with transition-all duration-300 when complete). Below title: project tag in text-xs text-white/30 (show only if project is not null).
    - Right side: Priority dot (w-2 h-2 rounded-full — high: bg-amber-400, medium: bg-blue-400, low: bg-zinc-600) + due date text-xs text-white/30.

    Sort order: Group by status → within each group sort by priority (high→medium→low).

    CSS transitions for checkbox: Use inline `<style>` tag (same pattern as ChatOverlay) with:
    ```css
    .task-check { transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1); }
    .task-check-icon { transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1); }
    .task-row-text { transition: all 300ms ease; }
    ```

    **HabitsList.tsx — Progress hero + streak display:**

    Structure:
    ```
    [Progress Hero — glass card]
      Left: "2 of 4" text (text-2xl font-bold, number in white, "of 4" in white/50)
      Right: "today's habits" label text-xs text-white/40
      Below: Full-width progress bar — h-2 rounded-full bg-white/10 track, inner fill div with bg-violet-500 rounded-full.
        Width: (habitsDone / habitsTotal * 100)% with transition-all duration-500 and spring easing.
        When all complete: fill changes to bg-green-400, label text changes to "All done today" in green-400.

    [Habit rows — single Card variant="glass" wrapping all rows]
      Each row separated by border-b border-white/5 (last:border-0)
      Left: Toggle (existing primitive, size="sm")
      Center: Habit name (text-sm text-white/90). Below: frequency label (text-xs text-white/30, "Daily" or "Weekly")
      Right: Streak display — if currentStreak > 0: "{streak}" in text-sm font-semibold text-amber-400 + Flame icon (size 14, text-amber-400). If 0: "—" in text-white/20.
    ```

    **Entrance animations:**
    - Progress hero and habit rows card both get staggered `fadeInUp` (hero at 0ms, rows card at 80ms).
    - Individual habit rows stagger within the card at 50ms intervals via `animationDelay`.
    - Add inline `<style>` tag with shared `fadeInUp` keyframe and `.habit-enter { animation: fadeInUp 400ms ease-out both; }`.

    Progress bar CSS: add via inline `<style>` tag (combine with entrance animation keyframe):
    ```css
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .habit-enter { animation: fadeInUp 400ms ease-out both; }
    .habit-progress-fill { transition: width 500ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 300ms ease; }
    ```

    **Page replacements:**
    - tasks/page.tsx: ContentContainer + back link (keep existing pattern) + page header (h2 "Tasks" text-lg font-semibold text-white/90 — NOT violet, let the content speak) + TasksList.
    - habits/page.tsx: Same pattern + h2 "Habits" + HabitsList.

    Page header pattern for all 3 pages:
    ```
    <back link>
    <h2 className="text-lg font-semibold text-white/90 mb-4">Title</h2>
    <Component />
    ```
  </action>
  <verify>tsc --noEmit passes; tasks page shows grouped sections with hero; habits page shows progress bar and streak flames</verify>
  <done>AC-1, AC-2, AC-5 satisfied: grouped tasks with transitions, habits with progress hero and animated bar</done>
</task>

<task type="auto">
  <name>Task 3: Bills sub-view with financial summary + status groups</name>
  <files>
    src/components/jarvis/personal/BillsList.tsx,
    src/app/jarvis/app/personal/bills/page.tsx
  </files>
  <action>
    **BillsList.tsx — Financial summary + grouped bills:**

    Structure:
    ```
    [Financial Summary Hero — glass card, grid grid-cols-2 gap-4]
      Left stat: "Total Due" label (text-xs text-white/40), amount below (text-2xl font-bold text-white)
        Calculated: sum of bills where status !== 'paid', formatted $X,XXX.XX
      Right stat: "Paid" label (text-xs text-white/40), amount below (text-2xl font-bold text-green-400)
        Calculated: sum of bills where status === 'paid', formatted $X,XXX.XX

    [Section: "Overdue"] — only if overdue bills exist
      Section container: rounded-xl bg-red-400/5 border border-red-400/10 p-3
      Section header: text-xs uppercase tracking-wider text-red-400/70 mb-2, "OVERDUE"
      Bill rows inside

    [Section: "Due Soon"] — only if due_soon bills exist
      Section container: rounded-xl bg-amber-400/5 border border-amber-400/10 p-3
      Header: text-xs uppercase tracking-wider text-amber-400/70

    [Section: "Upcoming"] — only if upcoming bills exist
      Glass Card wrapper (variant="glass")
      Header: text-xs uppercase tracking-wider text-white/30

    [Section: "Paid"] — only if paid bills exist
      Glass Card wrapper (variant="glass") at opacity-60
      Header: text-xs text-white/20 "PAID · {count}"
    ```

    **Entrance animations:**
    - Financial summary hero and each section group get staggered `fadeInUp` (hero at 0ms, sections at 80ms intervals).
    - Add inline `<style>` tag with `@keyframes fadeInUp` and `.bill-section-enter { animation: fadeInUp 400ms ease-out both; }`.
    - Apply `.bill-section-enter` + `style={{ animationDelay: '${sectionIndex * 80}ms' }}` to each section wrapper.

    Each bill row layout (separated by border-b border-white/5, last:border-0):
    - Left column: Bill name (text-sm font-medium text-white/90), category below (text-xs text-white/30)
    - Right column (text-right): Amount (text-sm font-semibold — use text-white for unpaid, text-white/40 line-through for paid), due date below (text-xs text-white/30). For overdue: amount in text-red-400.
    - Far right: Status Badge (overdue→critical "Overdue", due_soon→warning "Due Soon", paid→success "Paid", upcoming→info "Upcoming")
    - Below the row for unpaid bills: "Mark Paid" Button (variant="ghost", size="sm", full width, text-xs). On click → store.markBillPaid(id).

    Amount formatting: helper function `formatCurrency(n: number): string` → `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`. Define inline in the component file.

    **Page replacement:**
    - bills/page.tsx: ContentContainer + back link + h2 "Bills & Finance" + BillsList.
  </action>
  <verify>tsc --noEmit passes; bills page shows financial summary hero + grouped sections with status badges and Mark Paid</verify>
  <done>AC-3, AC-5 satisfied: bills with financial hero, grouped sections, status badges, Mark Paid transitions</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/primitives/* (use existing primitives as-is, do not modify)
- src/components/jarvis/personal/PersonalDashboard.tsx (dashboard composition unchanged)
- src/components/jarvis/personal/SubProgramCard.tsx (card component unchanged)
- src/components/jarvis/personal/TodaySnapshot.tsx (snapshot component unchanged)
- src/components/jarvis/layout/* (layout components unchanged)
- Any file outside src/components/jarvis/personal/ and src/app/jarvis/app/personal/ and src/lib/jarvis/stores/

## SCOPE LIMITS
- Only Tasks, Habits, Bills — Calendar/Journal/Goals/Health remain as EmptyState placeholders (E-04-07)
- No new store creation — extend existing personalStore only
- No API wiring — all data remains mock from personalStore
- No new primitives — use existing Card, Badge, Button, Toggle
- No routing changes — pages already exist at correct paths
- No animation libraries — CSS transitions + inline style tags only (pattern from ChatOverlay)
- No emoji in code — use lucide icons (Flame for streaks, Check for checkboxes)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` — no new TypeScript errors
- [ ] Tasks page: summary hero with counts, grouped sections (Overdue/Today/Upcoming/Completed), checkbox transitions
- [ ] Habits page: progress hero bar animates on toggle, streak flames in amber, all-done state in green
- [ ] Bills page: financial summary with dollar totals, grouped sections with tinted backgrounds, Mark Paid works
- [ ] Store mutations recompute todayStats — dashboard updates on navigate back
- [ ] All 3 pages retain back link to Personal
- [ ] CSS transitions smooth, no layout shift, no animation libraries
- [ ] All containers use glass/glass-interactive variants (no flat bg-zinc-900 default)
- [ ] All section groups have staggered fadeInUp entrance animations
- [ ] All acceptance criteria met (including AC-7 polish consistency)
</verification>

<success_criteria>
- 3 placeholder pages replaced with polished, grouped sub-views
- Each view has a distinctive summary hero (stat pills / progress bar / financial summary)
- Store extended with 3 mutation actions, todayStats recomputes
- Micro-interactions: checkbox spring, progress bar fill, strikethrough fade
- Build compiles clean (no new errors)
- ~500-700 lines across 7 files
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-06-SUMMARY.md`
</output>
