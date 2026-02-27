---
phase: E-mobile-ui
plan: 05-03
type: execute
wave: 1
depends_on: ["05-02"]
files_modified:
  - src/app/jarvis/app/academy/page.tsx
  - src/components/jarvis/academy/AcademyHub.tsx
  - src/components/jarvis/academy/LessonCard.tsx
  - src/components/jarvis/academy/AcademyProgress.tsx
  - src/lib/jarvis/curriculum/tutorialLessons.ts
  - src/components/jarvis/layout/BottomTabBar.tsx
  - src/app/jarvis/app/page.tsx
autonomous: true
---

<objective>
## Goal
Build the Academy Hub page (browsable lesson catalog), an Academy progress section on the Home screen, and contextual suggestion intelligence — the discoverability layer that makes tutorials findable and inviting.

## Purpose
E-05-01 built the data layer and E-05-02 built the execution engine, but there's no way for users to browse lessons, see their progress, or discover tutorials outside of the onboarding flow. This plan adds the "front door" to Jarvis Academy.

## Output
- New route `/jarvis/app/academy` with lesson catalog grouped by tier
- Academy progress section on Home page (dedicated component, not widget registry)
- BottomTabBar "Learn" tab replacing placeholder Alerts tab
- Suggestion intelligence: context-aware next-lesson picking
- Resume support for in-progress lessons
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/E-mobile-ui/E-05-01-SUMMARY.md — data layer + 4 Tier 1 lessons
@.paul/phases/E-mobile-ui/E-05-02-SUMMARY.md — execution engine + ChatOverlay integration

## Source Files
@src/lib/jarvis/curriculum/tutorialLessons.ts — TIER_1_LESSONS, TUTORIAL_TIERS, getLesson(), getTier1Lessons()
@src/lib/jarvis/stores/tutorialStore.ts — progress, currentLesson, suggestedNext, totalCompleted, CompletionRecord
@src/lib/jarvis/hooks/useTutorialEngine.ts — TutorialEngineAPI, startLesson(), isActive
@src/components/jarvis/layout/BottomTabBar.tsx — TABS array
@src/components/jarvis/layout/JarvisShell.tsx — TutorialEngineContext provider
@src/app/jarvis/app/page.tsx — home page layout with sections
</context>

<acceptance_criteria>

## AC-1: Academy Hub Page Renders Lesson Catalog
```gherkin
Given the user navigates to /jarvis/app/academy
When the page loads
Then they see a header "Jarvis Academy" with overall progress (e.g. "1 of 4 complete")
And lessons are grouped by tier with tier name and description headers
And each lesson shows name, description, estimated time, and completion status
```

## AC-2: Lesson Cards Show Accurate Progress Including Resume
```gherkin
Given a user has completed "tasks-basics" and is mid-lesson on "habits-basics"
When they view the Academy Hub
Then "Managing Your Tasks" shows a green check and completion time
And "Building Habit Streaks" shows a "Resume" button (since currentLesson matches)
And other incomplete lessons show a "Start" button
And the suggested next lesson has a highlighted cyan border
```

## AC-3: Tapping Start/Resume Triggers the Tutorial Engine
```gherkin
Given the user taps "Start" on an incomplete lesson in the Academy Hub
When the engine starts
Then the tutorial engine begins step-by-step instruction through ChatOverlay
And the user is navigated to /jarvis/app so the lesson starts from the correct context
```

## AC-4: Academy Progress Section on Home Screen
```gherkin
Given the user views the Home page
When Academy progress section renders
Then it shows the next suggested lesson name (or "All complete!" if done)
And shows a compact progress indicator (e.g. "1/4 lessons")
And tapping it navigates to /jarvis/app/academy
```

## AC-5: BottomTabBar Has Academy Navigation
```gherkin
Given the user is anywhere in the Jarvis app (mobile)
When they look at the bottom tab bar
Then there is a "Learn" tab with a GraduationCap icon
And tapping it navigates to /jarvis/app/academy
And it highlights when on the /jarvis/app/academy route
```

## AC-6: Suggestion Intelligence Picks Context-Aware Next Lesson
```gherkin
Given the user has completed some lessons but not all
When the system computes the suggested next lesson
Then it follows the nextSuggestion chain from the last completed lesson
And falls back to the first incomplete Tier 1 lesson if no chain exists
And returns null when all Tier 1 lessons are complete
```

## AC-7: Build Compiles Clean
```gherkin
Given all changes are made
When npm run build is executed
Then zero new TypeScript errors are introduced
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Suggestion intelligence + tutorialLessons helpers</name>
  <files>src/lib/jarvis/curriculum/tutorialLessons.ts</files>
  <action>
    Add three new exported functions to tutorialLessons.ts (do NOT modify existing definitions or types):

    1. `getAllLessons(): TutorialLesson[]` — returns TIER_1_LESSONS. Simple alias for future expansion when Tier 2-4 lessons exist.

    2. `getSuggestedLesson(progress: Record<string, CompletionRecord>): TutorialLesson | null` — context-aware next-lesson picker:
       - Walk TIER_1_LESSONS in order
       - Find the last completed lesson that has a non-null `nextSuggestion`
       - If that nextSuggestion lesson is NOT yet completed, return it
       - If no chain match, return the first Tier 1 lesson not in `progress`
       - If all Tier 1 complete, return null

    3. `getLessonCount(): { total: number; tier1: number }` — returns lesson counts for progress display. Currently `{ total: 4, tier1: 4 }`.

    Import `CompletionRecord` type from tutorialStore.ts.

    Avoid: Modifying existing lesson objects, types, or the TIER_1_LESSONS array. Only add new exported functions below the existing exports.
  </action>
  <verify>TypeScript compiles. getSuggestedLesson({}) returns tasksBasics. getSuggestedLesson with all 4 keys returns null. getSuggestedLesson with only tasks-basics returns habitsBasics (via nextSuggestion chain).</verify>
  <done>AC-6 satisfied: Suggestion intelligence follows nextSuggestion chain with fallback to first incomplete</done>
</task>

<task type="auto">
  <name>Task 2: Academy Hub page + LessonCard with Resume support</name>
  <files>
    src/app/jarvis/app/academy/page.tsx,
    src/components/jarvis/academy/AcademyHub.tsx,
    src/components/jarvis/academy/LessonCard.tsx
  </files>
  <action>
    **LessonCard component** (`src/components/jarvis/academy/LessonCard.tsx`):
    - Props: `lesson: TutorialLesson`, `completionRecord: CompletionRecord | null`, `isSuggested: boolean`, `isInProgress: boolean`, `onStart: (lessonId: string) => void`, `index: number` (for stagger delay)
    - Card variant="glass-interactive" (per E-04-05.5 mandatory pattern)
    - Layout: lesson name (text-sm font-medium), description (text-xs text-white/50), bottom row with time estimate + action
    - Time estimate: Clock icon + "~3 min" text
    - Three visual states:
      1. **Completed:** Green check icon, "Completed" text in emerald, muted card opacity (opacity-60), no action button
      2. **In-progress (isInProgress=true):** Amber border (ring-1 ring-amber-500/40), "Resume" button (amber variant or amber-tinted ghost), pulsing dot indicator
      3. **Suggested (isSuggested=true, not completed, not in-progress):** Cyan border ring (ring-1 ring-cyan-500/40), "Recommended" badge (cyan), "Start" button (primary cyan)
      4. **Default (not completed, not suggested, not in-progress):** "Start" button (ghost variant)
    - Tapping Start/Resume calls onStart(lesson.id)
    - fadeInUp entrance animation with stagger: `animationDelay: ${index * 80}ms`
    - Uses lucide icons: Check, Clock, Play, RotateCcw (for resume)

    **AcademyHub component** (`src/components/jarvis/academy/AcademyHub.tsx`):
    - Reads from tutorialStore: `progress`, `currentLesson` (for resume detection)
    - Computes: totalCompleted = Object.keys(progress).length, totalLessons via getLessonCount()
    - Uses getSuggestedLesson(progress) to determine the highlighted lesson
    - Uses getAllLessons() to get the full catalog, groups by tier using TUTORIAL_TIERS
    - Gets tutorialEngine via useTutorialEngineContext() from JarvisShell

    - **Header section:**
      - Back arrow (ArrowLeft) linking to /jarvis/app
      - "Jarvis Academy" title (text-xl font-semibold)
      - Progress subtitle: "{n} of {total} lessons complete"
      - SVG circular progress ring: 40px diameter, 3px stroke, cyan fill proportional to completion, zinc-800 track

    - **Tier sections:**
      - Tier name heading (TUTORIAL_TIERS[tier].name) as section header
      - Tier description (text-xs text-white/40)
      - LessonCards rendered with:
        - `completionRecord={progress[lesson.id] || null}`
        - `isInProgress={currentLesson === lesson.id}`
        - `isSuggested={suggestedLesson?.id === lesson.id}`

    - **On lesson start:**
      - If engine is already active (tutorialEngine.isActive), call exitTutorial() first
      - Call tutorialEngine.startLesson(lessonId)
      - Navigate to /jarvis/app using router.push (lessons start from home context)
      - Exception: if lesson is being resumed (isInProgress), do NOT navigate — user may already be mid-flow on the correct page

    - Uses ContentContainer layout wrapper
    - 'use client' directive

    **Page route** (`src/app/jarvis/app/academy/page.tsx`):
    - Simple page component: `export default function AcademyPage() { return <AcademyHub />; }`
    - 'use client' directive

    Avoid: Creating a new store — all data comes from existing tutorialStore + tutorialLessons.ts.
    Avoid: Flat bg-zinc-900 surfaces — use glass or glass-interactive per design system.
  </action>
  <verify>Route /jarvis/app/academy renders. Lessons grouped by tier. Completed lessons show check. In-progress shows Resume. Suggested has cyan ring. Start triggers engine and navigates to home.</verify>
  <done>AC-1, AC-2, AC-3 satisfied: Academy Hub with grouped catalog, accurate progress with resume, and engine integration</done>
</task>

<task type="auto">
  <name>Task 3: Academy progress on Home + BottomTabBar "Learn" tab + build verification</name>
  <files>
    src/components/jarvis/academy/AcademyProgress.tsx,
    src/app/jarvis/app/page.tsx,
    src/components/jarvis/layout/BottomTabBar.tsx
  </files>
  <action>
    **AcademyProgress component** (`src/components/jarvis/academy/AcademyProgress.tsx`):
    - Dedicated Home page section component (NOT a widget registry entry — keeps widget system clean)
    - 'use client' directive
    - Reads tutorialStore.progress to compute completed count
    - Uses getSuggestedLesson() + getLessonCount() from tutorialLessons.ts
    - Layout: Card variant="glass-interactive", single row:
      - Left: GraduationCap icon (cyan) + text block
        - "Jarvis Academy" label (text-sm font-medium)
        - Next lesson name: "Next: [lesson name]" (text-xs text-white/50) or "All lessons complete!" (emerald)
      - Right: compact progress text "1/4" + small SVG ring (24px, cyan fill)
    - Entire card is a Link to /jarvis/app/academy (clickable)
    - If all lessons complete, show celebratory emerald tint on card border
    - fadeInUp entrance animation (consistent with other home sections)

    **Home page update** (`src/app/jarvis/app/page.tsx`):
    - Import AcademyProgress from '@/components/jarvis/academy/AcademyProgress'
    - Add a new section AFTER "Quick Actions" and BEFORE "Widgets":
      ```
      <section>
        <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Academy</h2>
        <AcademyProgress />
      </section>
      ```
    - This is a first-class home section, not a widget — it always shows (not pinnable/unpinnable)

    **BottomTabBar update** (`src/components/jarvis/layout/BottomTabBar.tsx`):
    - Import GraduationCap from lucide-react (add to existing import)
    - Replace the 'alerts' tab entry in the TABS array:
      - Old: `{ id: 'alerts', label: 'Alerts', icon: Bell, action: 'navigate', route: '/jarvis/app' }`
      - New: `{ id: 'learn', label: 'Learn', icon: GraduationCap, action: 'navigate', route: '/jarvis/app/academy' }`
    - Remove Bell from the lucide-react import if no longer used
    - The existing data-tutorial-id template `bottom-tab-${tab.id}` will automatically produce `bottom-tab-learn`

    **Build verification:**
    - Run `npm run build` to verify zero new TypeScript errors

    Avoid: Touching the widget registry or WidgetZone — Academy is a dedicated home section, not a widget.
    Avoid: Modifying any other BottomTabBar tabs.
    Avoid: Modifying JarvisShell or any engine files.
  </action>
  <verify>npm run build succeeds. Home page shows Academy section between Quick Actions and Widgets. BottomTabBar shows "Learn" tab with GraduationCap. Tapping Learn navigates to /jarvis/app/academy.</verify>
  <done>AC-4, AC-5, AC-7 satisfied: Academy progress on home, Learn tab in nav, build clean</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/curriculum/verificationEngine.ts (execution engine internals)
- src/lib/jarvis/curriculum/tutorialActionBus.ts (pub/sub bus)
- src/lib/jarvis/hooks/useTutorialEngine.ts (engine hook — only consume, don't modify)
- src/lib/jarvis/stores/tutorialStore.ts (store shape stable)
- src/components/jarvis/onboarding/OnboardingWizard.tsx (onboarding flow complete)
- src/components/jarvis/layout/JarvisShell.tsx (shell structure stable)
- src/lib/jarvis/widgets/registry.ts (widget system stays clean — no Academy widget)
- src/components/jarvis/home/WidgetZone.tsx (no special-casing)
- Any existing lesson definitions in tutorialLessons.ts (only add new functions)

## SCOPE LIMITS
- No Tier 2-4 lesson content creation — only Tier 1 lessons exist, catalog shows what's available
- No streak/gamification system — just completion tracking
- No settings page integration for Academy preferences
- No push notifications for lesson suggestions

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero new errors
- [ ] /jarvis/app/academy route renders with lesson catalog
- [ ] Lessons grouped by tier with correct headers
- [ ] Completed lessons show green check, incomplete show "Start"
- [ ] In-progress lesson shows "Resume" with amber indicator
- [ ] Suggested lesson has cyan highlight
- [ ] Starting a lesson from Academy triggers the tutorial engine
- [ ] Resume does NOT navigate away (user stays on current page)
- [ ] Academy progress section renders on Home between Quick Actions and Widgets
- [ ] BottomTabBar shows "Learn" tab with GraduationCap icon replacing Alerts
- [ ] All 7 acceptance criteria met
</verification>

<success_criteria>
- All 3 tasks completed
- All 7 acceptance criteria pass
- No TypeScript or build errors
- Academy is the discoverable "front door" to Jarvis tutorials
- Resume state handled for mid-lesson users
- Widget system untouched — Academy is a first-class home section
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-05-03-SUMMARY.md`
</output>
