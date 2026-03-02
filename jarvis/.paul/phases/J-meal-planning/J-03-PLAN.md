---
phase: J-meal-planning
plan: 03
type: execute
wave: 1
depends_on: ["J-02"]
files_modified:
  - src/app/jarvis/app/personal/meals/page.tsx
  - src/components/jarvis/personal/MealsView.tsx
  - src/components/jarvis/personal/PersonalDashboard.tsx
  - src/lib/jarvis/stores/personalStore.ts
  - src/lib/jarvis/hooks/useJarvisFetch.ts
autonomous: true
---

<objective>
## Goal
Build the dedicated `/personal/meals` page with a 4-tab layout (Weekly Planner, Shopping List, Pantry, Recipes) that matches the exquisite glassmorphic UI quality of existing Personal domain views, integrates with the chat overlay for contextual actions, and surfaces the meal plan data already flowing through the store from J-02.

## Purpose
Jonathan and his wife interact with Jarvis daily. The Weekly Planner tab is the crown jewel — a gorgeous, data-driven 7-day view of their meal plan. The three secondary tabs (Shopping, Pantry, Recipes) serve as discovery surfaces that guide users to interact with Jarvis via chat, the primary intelligence interface. Every empty state should feel intentional and helpful, not broken.

## Output
- New route: `/jarvis/app/personal/meals`
- New component: `MealsView.tsx` (~400-450 lines, all 4 tabs in one file with local sub-components)
- Modified: PersonalDashboard (Meals card), personalStore (shoppingListCount), useJarvisFetch (wire count)
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/J-meal-planning/J-02-SUMMARY.md
- J-02 wired full weekly meal plan into `personalStore.meals` (PersonalMeal[])
- `shoppingListCount` exists in BriefingData but is NOT stored in personalStore (only used in briefing summary text)
- Data flow: Notion → BriefingBuilder → API → useJarvisFetch → personalStore.setMeals()
- All data needed for WeeklyPlannerTab is already in the store — zero additional API calls

## Source Files
@src/components/jarvis/personal/PersonalDashboard.tsx — add Meals sub-program card
@src/components/jarvis/personal/SubProgramCard.tsx — pattern reference for dashboard card
@src/components/jarvis/personal/BillsList.tsx — gold standard UI pattern reference
@src/components/jarvis/personal/CalendarView.tsx — today-highlight pattern reference
@src/app/jarvis/app/personal/bills/page.tsx — route page pattern reference
@src/lib/jarvis/stores/personalStore.ts — PersonalMeal interface, store shape
@src/lib/jarvis/hooks/useJarvisFetch.ts — transformMeals, refetchJarvisData
@src/components/jarvis/primitives/index.ts — Card, Badge, Button, EmptyState, Skeleton
@src/lib/jarvis/stores/chatStore.ts — openWithMessage for chat CTAs
@src/lib/jarvis/domains.ts — DOMAIN_COLORS (amber for meals accent)
</context>

<acceptance_criteria>

## AC-1: Meals Route and Tab Navigation
```gherkin
Given the user navigates to /jarvis/app/personal/meals
When the page loads
Then MealsView renders with a back link to Personal, "Meals & Kitchen" heading, and 4-tab navigation (Weekly, Shopping, Pantry, Recipes) with the Weekly tab active by default
And the active tab has an amber accent indicator
And tapping a different tab switches content immediately
```

## AC-2: Dashboard Meals Card
```gherkin
Given PersonalDashboard renders
When meals data exists in personalStore
Then a "Meals & Kitchen" sub-program card appears with UtensilsCrossed icon, today's meal count (e.g., "2 planned today"), and links to /jarvis/app/personal/meals
And when no meals are planned today the stat reads "No meals planned"
```

## AC-3: Weekly Planner Tab (Data-Driven)
```gherkin
Given personalStore.meals has entries across multiple days
When the Weekly tab is active
Then meals display grouped by day of week starting from today
And today's section is highlighted with amber accent (bg-amber-400/5, border-amber-400/10)
And each meal row shows name, time-of-day icon (Sunrise/Sun/Moon), setting icon (Home/MapPin/Package), and servings count
And meals within each day are sorted by time-of-day order (Breakfast → Lunch → Dinner)
And days with no meals show subtle "No meals planned" text
And on mobile, days besides today are collapsed (accordion) with tap-to-expand
And on desktop, all days are visible
And when personalStore.meals is empty, an EmptyState renders with "Plan your week with Jarvis" chat CTA
```

## AC-4: Secondary Tabs with Chat CTAs
```gherkin
Given the Shopping List tab is selected
When shoppingListCount > 0
Then the count displays prominently with amber accent and a "View full list" chat CTA button
When shoppingListCount === 0
Then an EmptyState renders with ShoppingCart icon and "Generate a shopping list" chat CTA

Given the Pantry tab is selected
When the tab renders
Then an EmptyState shows with contextual description about pantry tracking and a "What's in my pantry?" chat CTA

Given the Recipes tab is selected
When the tab renders
Then an EmptyState shows with contextual description about recipe browsing and a "Show me my recipes" chat CTA

And clicking any chat CTA button calls useChatStore.openWithMessage() with the contextual prompt
```

## AC-5: Build Passes
```gherkin
Given all files created and modified
When npm run build executes
Then zero TypeScript errors and zero build failures
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Route + Store + Dashboard Integration</name>
  <files>
    src/app/jarvis/app/personal/meals/page.tsx,
    src/lib/jarvis/stores/personalStore.ts,
    src/lib/jarvis/hooks/useJarvisFetch.ts,
    src/components/jarvis/personal/PersonalDashboard.tsx
  </files>
  <action>
    **1a. Create meals route page** (`src/app/jarvis/app/personal/meals/page.tsx`):
    - Follow exact pattern from `bills/page.tsx`:
      - `'use client'` directive
      - Import `Link` from next/link, `ContentContainer` from layout, `MealsView` from personal components
      - Back link: `<Link href="/jarvis/app/personal" className="text-sm text-violet-400 hover:text-violet-300 mb-4 inline-block">&larr; Personal</Link>`
      - Heading: `<h2 className="text-lg font-semibold text-white/90 mb-4">Meals &amp; Kitchen</h2>`
      - Render `<MealsView />`
    - NOTE: MealsView doesn't exist yet — Task 2 creates it. Ensure the import path is correct: `@/components/jarvis/personal/MealsView`

    **1b. Add shoppingListCount to personalStore** (`src/lib/jarvis/stores/personalStore.ts`):
    - Add `shoppingListCount: number` to `PersonalState` interface (after `meals: PersonalMeal[]`)
    - Add `setShoppingListCount: (count: number) => void` to `PersonalActions` interface (after `setMeals`)
    - Initialize `shoppingListCount: 0` in the store creation (after `meals: []`)
    - Add setter: `setShoppingListCount: (count) => set({ shoppingListCount: count }),` (after `setMeals`)

    **1c. Wire shoppingListCount in useJarvisFetch** (`src/lib/jarvis/hooks/useJarvisFetch.ts`):
    - In `refetchJarvisData()`, after `personalStore.setMeals(transformMeals(data));` (line ~277), add:
      `personalStore.setShoppingListCount(data.meals?.shoppingListCount ?? 0);`
    - This is one line. Do NOT change any other logic.

    **1d. Add Meals sub-program card to PersonalDashboard** (`src/components/jarvis/personal/PersonalDashboard.tsx`):
    - Import `UtensilsCrossed` from lucide-react (add to existing import)
    - Add selector: `const meals = usePersonalStore((s) => s.meals);`
    - Compute today's day name and meal count:
      ```
      const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayMeals = meals.filter((m) => m.dayOfWeek === todayDayName).length;
      ```
    - Add Meals entry to the `subPrograms` array AFTER the 'calendar' entry and BEFORE the 'journal' entry:
      ```
      {
        id: 'meals',
        name: 'Meals & Kitchen',
        icon: UtensilsCrossed,
        route: '/jarvis/app/personal/meals',
        stat: todayMeals > 0 ? `${todayMeals} planned today` : 'No meals planned',
        warn: false,
        critical: false,
      },
      ```

    **Avoid:**
    - Do NOT change the existing subPrograms entries or their order relative to each other
    - Do NOT add any other fields to PersonalState beyond shoppingListCount
    - Do NOT modify transformMeals — only add the one setShoppingListCount line after it
  </action>
  <verify>npm run build (may show import error for MealsView which doesn't exist yet — acceptable until Task 2 completes; verify store types compile cleanly by checking the specific file)</verify>
  <done>AC-2 satisfied (dashboard card), AC-5 partially (store + fetch types correct). Route page created for AC-1.</done>
</task>

<task type="auto">
  <name>Task 2: MealsView Component with All 4 Tabs</name>
  <files>
    src/components/jarvis/personal/MealsView.tsx
  </files>
  <action>
    Create `src/components/jarvis/personal/MealsView.tsx` as a single file with local sub-components. This is the heart of J-03 — it must match the exquisite UI quality of BillsList and CalendarView.

    **Structure Overview:**
    ```
    MealsView.tsx
    ├── Constants (DAYS_ORDER, TIME_ORDER, TIME_ICONS, SETTING_ICONS, TABS)
    ├── TabNav (local component — tab pill navigation)
    ├── MealRow (local component — single meal within a day)
    ├── DaySection (local component — day header + meal list + accordion)
    ├── WeeklyPlannerContent (local component — full weekly view)
    ├── ShoppingListContent (local component — count + CTA)
    ├── PantryContent (local component — empty state + CTA)
    ├── RecipesContent (local component — empty state + CTA)
    └── MealsView (exported — tab container + state)
    ```

    **Imports:**
    ```typescript
    'use client';

    import { useState, useMemo } from 'react';
    import { Card, EmptyState, Button } from '@/components/jarvis/primitives';
    import {
      Sunrise, Sun, Moon, Home, MapPin, Package,
      ShoppingCart, Warehouse, BookOpen, ChevronDown,
      UtensilsCrossed, Users,
    } from 'lucide-react';
    import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';
    import { useChatStore } from '@/lib/jarvis/stores/chatStore';
    ```

    **Constants:**
    ```typescript
    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const TIME_ORDER: Record<string, number> = {
      'Breakfast': 0, 'Lunch': 1, 'Dinner': 2,
    };

    const TIME_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
      'Breakfast': Sunrise, 'Lunch': Sun, 'Dinner': Moon,
    };

    const SETTING_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
      'Home': Home, 'Dine-Out': MapPin, 'Takeout': Package,
    };

    const TABS = ['Weekly', 'Shopping', 'Pantry', 'Recipes'] as const;
    type TabId = typeof TABS[number];
    ```

    **TabNav Component:**
    - Container: `<div className="bg-black/40 backdrop-blur-sm rounded-2xl p-1 flex gap-1 mb-4">`
    - Each tab button:
      - Active: `bg-amber-500/20 text-amber-400 border border-amber-500/30`
      - Inactive: `text-white/50 hover:text-white/70 hover:bg-white/5 border border-transparent`
      - Shared: `px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-1 text-center`
    - Props: `active: TabId`, `onChange: (tab: TabId) => void`

    **MealRow Component:**
    - Props: `meal: PersonalMeal`, `isLast: boolean`
    - Layout: `<div className={flex items-center gap-3 py-2.5 px-1 ${!isLast ? 'border-b border-white/5' : ''}}>`
    - Structure:
      1. Time-of-day icon: Look up `TIME_ICONS[meal.timeOfDay]`, render at `size={14} className="text-amber-400/70 flex-shrink-0"`. If no match, skip icon.
      2. Time label: `<span className="text-xs text-amber-400/70 w-16 flex-shrink-0">{meal.timeOfDay}</span>` — fixed width for alignment
      3. Meal name: `<p className="text-sm text-white/90 flex-1 min-w-0 truncate">{meal.name}</p>`
      4. Setting badge (if meal.setting is not empty): Look up `SETTING_ICONS[meal.setting]`, render icon at `size={12}` inside `<span className="flex items-center gap-1 text-xs text-white/40 flex-shrink-0">`. Show setting name next to icon.
      5. Servings badge (if meal.servings): `<span className="flex items-center gap-1 text-xs text-white/40 flex-shrink-0"><Users size={12} />{meal.servings}</span>`

    **DaySection Component:**
    - Props: `day: string`, `meals: PersonalMeal[]`, `isToday: boolean`, `defaultExpanded: boolean`, `animDelay: number`
    - State: `const [expanded, setExpanded] = useState(defaultExpanded)`
    - Today wrapper: `<div className="rounded-xl bg-amber-400/5 border border-amber-400/10 p-3">`
    - Today header: `<p className="text-xs uppercase tracking-wider text-amber-400/70 mb-2">TODAY · {day}</p>`
    - Other day wrapper: `<Card variant="glass" padding="sm">`
    - Other day header: `<p className="text-xs uppercase tracking-wider text-white/30 mb-2 px-1">{day}</p>`
    - Day header is a `<button>` on mobile (md:hidden chevron, toggles expanded):
      ```
      <button className="flex items-center justify-between w-full" onClick={() => setExpanded(!expanded)}>
        <p className={headerClass}>{isToday ? `TODAY · ${day}` : day}</p>
        <ChevronDown className={`w-4 h-4 text-white/30 md:hidden transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      ```
    - Meals container: `<div className={`${expanded ? '' : 'hidden md:block'}`}>`
    - If no meals for this day: `<p className="text-xs text-white/20 py-2 px-1">No meals planned</p>`
    - If meals exist: map to MealRow with isLast check
    - Animation: `className="meal-section-enter"` with `style={{ animationDelay: `${animDelay}ms` }}`

    **WeeklyPlannerContent Component:**
    - Props: `meals: PersonalMeal[]`
    - Compute today's day name: `new Date().toLocaleDateString('en-US', { weekday: 'long' })`
    - Rotate DAYS_ORDER so today is first:
      ```typescript
      const todayIndex = DAYS_ORDER.indexOf(todayDayName);
      const orderedDays = [...DAYS_ORDER.slice(todayIndex), ...DAYS_ORDER.slice(0, todayIndex)];
      ```
    - Group meals by day: `useMemo` to create `Map<string, PersonalMeal[]>` sorted by TIME_ORDER within each day
    - If meals.length === 0: render EmptyState with UtensilsCrossed icon, title "No meals planned yet", description "Tell Jarvis what you'd like to eat this week and watch your plan come together", actionLabel "Plan my week", onAction calls `openWithMessage("Help me plan meals for this week")`
    - If meals exist: render `<div className="space-y-3">` with DaySection for each day in orderedDays
      - isToday: `day === todayDayName`
      - defaultExpanded: `true` for today, `false` for others (mobile accordion)
      - animDelay: `(index + 1) * 80` (staggered, starting after hero)
    - Summary hero card (first, before day sections):
      ```
      <Card variant="glass" padding="md" className="meal-section-enter mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
            {todayMealCount} {todayMealCount === 1 ? 'meal' : 'meals'} today
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
            {totalMealCount} this week
          </span>
        </div>
      </Card>
      ```
      - Only show this hero when meals.length > 0

    **ShoppingListContent Component:**
    - Props: `count: number`, `onChat: (msg: string) => void`
    - If count > 0:
      - Card variant="glass" padding="md" with centered layout:
        - Large count: `<p className="text-3xl font-bold text-amber-400">{count}</p>`
        - Label: `<p className="text-sm text-white/50">items on your shopping list</p>`
        - Two buttons in `flex gap-2 mt-4`:
          - Button variant="primary": "View full list" → `onChat("Show me my shopping list")`
          - Button variant="secondary": "Generate new list" → `onChat("Generate a shopping list from this week's meal plan")`
    - If count === 0:
      - EmptyState with ShoppingCart icon (size 48), title "Shopping list is empty", description "Generate a smart shopping list from your meal plan — Jarvis checks your pantry and only adds what you need", actionLabel "Generate shopping list", onAction → `onChat("Generate a shopping list from this week's meal plan")`

    **PantryContent Component:**
    - Props: `onChat: (msg: string) => void`
    - EmptyState with Warehouse icon (size 48), title "Pantry tracking", description "Tell Jarvis what's in your kitchen so shopping lists subtract what you already have", actionLabel "What's in my pantry?", onAction → `onChat("What's in my pantry?")`

    **RecipesContent Component:**
    - Props: `onChat: (msg: string) => void`
    - EmptyState with BookOpen icon (size 48), title "Recipe collection", description "Browse your saved recipes or ask Jarvis to find something new for dinner", actionLabel "Show my recipes", onAction → `onChat("Show me all my saved recipes")`

    **MealsView (exported):**
    ```typescript
    export function MealsView() {
      const [activeTab, setActiveTab] = useState<TabId>('Weekly');
      const meals = usePersonalStore((s) => s.meals);
      const shoppingListCount = usePersonalStore((s) => s.shoppingListCount);
      const openWithMessage = useChatStore((s) => s.openWithMessage);

      return (
        <>
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .meal-section-enter { animation: fadeInUp 400ms ease-out both; }
          `}</style>
          <TabNav active={activeTab} onChange={setActiveTab} />
          {activeTab === 'Weekly' && <WeeklyPlannerContent meals={meals} />}
          {activeTab === 'Shopping' && <ShoppingListContent count={shoppingListCount} onChat={openWithMessage} />}
          {activeTab === 'Pantry' && <PantryContent onChat={openWithMessage} />}
          {activeTab === 'Recipes' && <RecipesContent onChat={openWithMessage} />}
        </>
      );
    }
    ```

    **Animations:**
    - Use same `fadeInUp` pattern as BillsList (8px translate, 400ms ease-out)
    - Stagger day sections at 80ms intervals
    - Tab content has no transition (instant switch — matches existing pattern)

    **Responsive Design:**
    - Tab nav: all 4 pills fit horizontally (short labels)
    - MealRow: flex layout with truncate on meal name
    - DaySection: accordion on mobile (ChevronDown visible `md:hidden`), all expanded on desktop (`hidden md:block` for collapsed state)
    - Weekly summary hero: flex-wrap handles narrow screens

    **Accessibility:**
    - Tab buttons: `role="tab"`, `aria-selected={isActive}`
    - Tab container: `role="tablist"`
    - Accordion buttons: `aria-expanded={expanded}`
    - Chat CTA buttons use EmptyState's built-in Button (already accessible)
    - data-tutorial-id="meals-weekly-tab" on the Weekly tab button
    - data-tutorial-id="meals-first-day" on the first DaySection

    **Avoid:**
    - Do NOT use dynamic Tailwind classes (e.g., `bg-${color}-400`) — use string literals
    - Do NOT import from external UI libraries — only Jarvis primitives + lucide-react
    - Do NOT add any API calls — all data comes from personalStore (already populated by useJarvisFetch)
    - Do NOT duplicate the fadeInUp keyframes more than once (one inline `<style>` block)
    - Do NOT use useMediaQuery or window.matchMedia — use CSS classes only for responsive behavior
    - Do NOT create separate files for tab content — keep all local sub-components in this one file
  </action>
  <verify>npm run build — zero errors, zero warnings. Verify MealsView exports correctly and page.tsx imports resolve.</verify>
  <done>AC-1 satisfied (route + tabs), AC-3 satisfied (weekly planner), AC-4 satisfied (chat CTAs), AC-5 satisfied (clean build).</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `src/lib/jarvis/executive/BriefingBuilder.ts` — briefing pipeline is stable from J-02
- `src/lib/jarvis/executive/types.ts` — MealPlanSummary and BriefingData types are stable
- `src/lib/jarvis/intelligence/tools.ts` — tool definitions are stable from J-01
- `src/lib/jarvis/notion/schemas.ts` — schema constants are stable from J-01
- `src/components/jarvis/primitives/*` — do not modify any primitive components
- `src/components/jarvis/layout/*` — do not modify shell, header, or navigation
- Any other existing Personal domain views (TasksList, BillsList, CalendarView, etc.)

## SCOPE LIMITS
- This plan creates UI only — no new API endpoints, no new Notion queries
- No recipe detail fetching (only IDs exist in store — full recipe data is future work)
- No shopping list item fetching (only count — full item list is future work)
- No pantry data fetching (no pantry data in store — future work)
- No write-back mutations (marking items, adding meals — all read-only display)
- Chat CTAs are fire-and-forget (open chat with message — chat handles the rest)
- No prep time calculations (J-04 scope)
- No new dependencies or packages

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] Route `/jarvis/app/personal/meals` exists and renders MealsView
- [ ] PersonalDashboard shows Meals card between Calendar and Journal
- [ ] Tab navigation switches between 4 tabs with amber active state
- [ ] WeeklyPlannerContent groups meals by day starting from today
- [ ] Today's section has amber highlight (bg-amber-400/5)
- [ ] Mobile accordion works (ChevronDown toggles, hidden on desktop)
- [ ] Empty states render with contextual chat CTA text
- [ ] Chat CTAs call openWithMessage with correct prompts
- [ ] All animations use staggered fadeInUp pattern
- [ ] No dynamic Tailwind classes (all string literals)
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All tasks completed with zero build errors
- MealsView matches the visual quality of BillsList and CalendarView
- Weekly Planner displays real data from personalStore.meals
- All empty states guide users toward chat interaction
- Responsive: accordion on mobile, full view on desktop
- Amber accent theme creates warm, kitchen-appropriate visual identity
</success_criteria>

<output>
After completion, create `.paul/phases/J-meal-planning/J-03-SUMMARY.md`
</output>
