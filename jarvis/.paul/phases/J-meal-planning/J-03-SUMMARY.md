---
phase: J-meal-planning
plan: 03
subsystem: ui
tags: [react, zustand, tailwind, meals, tabs, glassmorphism]

requires:
  - phase: J-02
    provides: personalStore.meals (PersonalMeal[]), transformMeals, BriefingData.meals.shoppingListCount
provides:
  - /jarvis/app/personal/meals route with 4-tab layout
  - MealsView component (Weekly Planner, Shopping, Pantry, Recipes)
  - Dashboard Meals card on PersonalDashboard
  - shoppingListCount in personalStore + useJarvisFetch wiring
affects: [J-04 Polish & Intelligence]

tech-stack:
  added: []
  patterns: [tab container with local sub-components, prop-driven onChat pattern, inline CTA on empty states]

key-files:
  created:
    - src/app/jarvis/app/personal/meals/page.tsx
    - src/components/jarvis/personal/MealsView.tsx
  modified:
    - src/components/jarvis/personal/PersonalDashboard.tsx
    - src/lib/jarvis/stores/personalStore.ts
    - src/lib/jarvis/hooks/useJarvisFetch.ts

key-decisions:
  - "All tab contents receive onChat as prop from parent (consistent pattern)"
  - "Empty days are interactive buttons, not passive text"
  - "Shopping count badge visible on tab pill without navigating"
  - "isFirst boolean prop for tutorial IDs instead of animation delay arithmetic"

patterns-established:
  - "Tab container: parent reads stores, passes actions as props to all tab content components"
  - "Empty state micro-CTAs: day-specific prompts (e.g., 'Help me plan a meal for Wednesday')"
  - "Tab badge pattern: count badge inside pill for at-a-glance information"

duration: ~45min (execution) + ~20min (quality uplift)
completed: 2026-03-01
---

# Phase J Plan 03: Frontend UI Summary

**Dedicated /personal/meals route with 4-tab MealsView (Weekly Planner with day rotation + accordion, Shopping with count badge, Pantry + Recipes with chat CTAs), dashboard card, and store wiring — amber glassmorphic theme matching BillsList/CalendarView quality.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Meals Route and Tab Navigation | Pass | Route renders MealsView with 4 tabs, amber active state, instant tab switching |
| AC-2: Dashboard Meals Card | Pass | UtensilsCrossed icon, today's meal count, links to /personal/meals |
| AC-3: Weekly Planner Tab (Data-Driven) | Pass | Meals grouped by day starting from today, amber today highlight, time/setting/servings icons, mobile accordion, desktop full view, empty state with CTA |
| AC-4: Secondary Tabs with Chat CTAs | Pass | Shopping shows count + CTAs, Pantry/Recipes have contextual empty states, all call openWithMessage |
| AC-5: Build Passes | Pass | `npm run build` — zero errors, zero warnings |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/jarvis/app/personal/meals/page.tsx` | Created | Route page — back link, heading, renders MealsView |
| `src/components/jarvis/personal/MealsView.tsx` | Created | 415-line component with TabNav, MealRow, DaySection, WeeklyPlannerContent, ShoppingListContent, PantryContent, RecipesContent |
| `src/components/jarvis/personal/PersonalDashboard.tsx` | Modified | Added Meals & Kitchen sub-program card (UtensilsCrossed, today meal count) |
| `src/lib/jarvis/stores/personalStore.ts` | Modified | Added shoppingListCount state + setShoppingListCount action |
| `src/lib/jarvis/hooks/useJarvisFetch.ts` | Modified | Added one line: `personalStore.setShoppingListCount(data.meals?.shoppingListCount ?? 0)` |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Quality uplift | 4 | Improved UX + code consistency, no scope creep |

### Quality Uplift (Post-Execution Review)

"Is this your best work?" review identified 4 improvements applied before unify:

**1. Empty days are interactive (UX)**
- **Issue:** Empty days showed passive "No meals planned" text with no action path
- **Fix:** Replaced with button: "No meals planned — plan with Jarvis" (hover reveal), calls `openWithMessage("Help me plan a meal for Wednesday")`
- **Impact:** Every day in the weekly planner is now actionable

**2. Shopping count badge on tab pill (UX)**
- **Issue:** Shopping list count only visible after navigating to Shopping tab
- **Fix:** TabNav receives `shoppingCount`, displays amber badge: `Shopping (12)`
- **Impact:** At-a-glance information without tab navigation

**3. Consistent onChat prop pattern (Code Quality)**
- **Issue:** WeeklyPlannerContent read `useChatStore` directly while the other 3 tab contents received `onChat` as prop
- **Fix:** WeeklyPlannerContent now receives `onChat` prop from parent, matching all other tab contents
- **Impact:** Consistent component pattern, easier testing

**4. Explicit isFirst prop for tutorial ID (Code Quality)**
- **Issue:** `data-tutorial-id={animDelay === 80 ? 'meals-first-day' : undefined}` — fragile coupling to animation timing
- **Fix:** DaySection receives `isFirst` boolean prop, parent passes `index === 0`
- **Impact:** Tutorial ID survives animation timing changes

## Next Phase Readiness

**Ready:**
- All meal data flows: Notion → BriefingBuilder → API → store → UI
- 4-tab structure ready for J-04 to enrich (recipes list, pantry inventory, shopping items)
- Chat CTA pattern established for all empty states
- shoppingListCount wired end-to-end

**Captured for J-04:**
- Intelligent recipe scaling (servings field, sub-linear spice scaling)
- Proactive meal timing intelligence (contextual reminders based on setting, prep time, current activity, learned preferences)
- Human action pending: add "Servings" number column to Notion Meal Plan DB

**Known systemic issues (not J-03 scope):**
- No loading/skeleton state (systemic — same issue across all Personal views)
- fadeInUp keyframes duplicated across SubProgramCard, BillsList, CalendarView, MealsView (systemic)

---
*Phase: J-meal-planning, Plan: 03*
*Completed: 2026-03-01*
