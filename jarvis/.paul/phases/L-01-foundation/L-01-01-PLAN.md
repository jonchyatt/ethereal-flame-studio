---
phase: L-01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/middleware.ts
  - src/lib/jarvis/academy/projects.ts
  - src/components/jarvis/onboarding/OnboardingWizard.tsx
autonomous: true
---

<objective>
## Goal
Wire the front door, register the Jarvis self-teaching curriculum, and connect the OnboardingWizard to the Academy — so a new user flows from `/jarvis` → dashboard → onboarding → Academy-guided learning.

## Purpose
Right now the front door is a dead end (old voice orb), the Academy doesn't know about Jarvis itself, and the OnboardingWizard finishes into a void. This plan fixes all three, creating the data + routing foundation for interactive teaching (Plan 02).

## Output
- `/jarvis` redirects to `/jarvis/app` (both subdomain and main domain paths)
- "Jarvis" project appears as a tab in Academy Hub with 8 Tier 0-1 topics
- OnboardingWizard completion flows into Academy with `jarvis` as active project
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md
@.paul/concepts/guided-onboarding-v44.md

## Source Files
@jarvis/src/middleware.ts (redirect logic — line 94-95 handles subdomain root)
@jarvis/src/lib/jarvis/academy/projects.ts (ACADEMY_PROJECTS registry, CurriculumTopic interface)
@jarvis/src/components/jarvis/onboarding/OnboardingWizard.tsx (finishOnboarding + startTour handlers)
@jarvis/src/lib/jarvis/stores/academyStore.ts (setActiveProject, markExplored)
@jarvis/src/components/jarvis/academy/AcademyHub.tsx (tab rendering from projects with curriculum)
</context>

<acceptance_criteria>

## AC-1: Front Door Redirect
```gherkin
Given a user visits /jarvis (main domain) or / (jarvis subdomain)
When the page loads
Then they are redirected/rewritten to /jarvis/app
And the old voice orb page is no longer the default entry point
```

## AC-2: Jarvis Academy Curriculum
```gherkin
Given the Academy Hub is loaded
When the user views the curriculum tabs
Then a "Jarvis" tab appears alongside Visopscreen and Creator Workflow
And it shows 8 topics organized into "First Contact" (2) and "Your First Day" (6) categories
And each topic has teachingNotes, keyFiles, prerequisites, and conceptsIntroduced
And topic prerequisites correctly gate progression (e.g., tasks-basics requires navigation-basics)
```

## AC-3: Onboarding → Academy Handoff
```gherkin
Given the OnboardingWizard completes (user finishes step 6)
When the user clicks "Start Tour" or the wizard auto-completes
Then academyStore.activeProject is set to 'jarvis'
And the user lands on /jarvis/app (home)
And the Academy progress widget shows "Jarvis" curriculum ready
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Redirect /jarvis → /jarvis/app in middleware</name>
  <files>jarvis/src/middleware.ts</files>
  <action>
    Modify the existing middleware to redirect old entry points to the new dashboard:

    1. Find the subdomain root handler (currently rewrites `/` → `/jarvis`). Change it to rewrite to `/jarvis/app` instead.
    2. Add a new condition: if pathname is exactly `/jarvis` (on any domain), redirect to `/jarvis/app`.
       - Use NextResponse.redirect() for main domain path (URL visibly changes)
       - The subdomain rewrite already handles that case via step 1

    Logic:
    ```
    // Subdomain root: rewrite / → /jarvis/app (was /jarvis)
    if (isJarvisSubdomain && pathname === '/') {
      return NextResponse.rewrite(new URL('/jarvis/app', request.url));
    }

    // Main domain: redirect /jarvis → /jarvis/app
    if (pathname === '/jarvis') {
      return NextResponse.redirect(new URL('/jarvis/app', request.url));
    }
    ```

    Do NOT:
    - Delete or modify the old /jarvis page files (preserve for future orb convergence)
    - Break /jarvis/app/* or /jarvis/api/* routing (only exact /jarvis match)
    - Touch the Jarvis API auth logic
  </action>
  <verify>npm run build passes. Read middleware.ts to confirm redirect logic.</verify>
  <done>AC-1 satisfied: /jarvis and subdomain root both resolve to /jarvis/app</done>
</task>

<task type="auto">
  <name>Task 2: Register Jarvis self-teaching curriculum in Academy</name>
  <files>jarvis/src/lib/jarvis/academy/projects.ts</files>
  <action>
    1. Extend CurriculumTopic interface with optional same-origin fields:
       ```typescript
       spotlightTargets?: string[];  // data-tutorial-id values for DOM highlighting
       verificationSteps?: { type: 'route' | 'store' | 'action'; check: string }[];
       ```

    2. Add a `jarvis` entry to ACADEMY_PROJECTS with:
       - id: 'jarvis'
       - name: 'How to Use Jarvis'
       - repo: 'ethereal-flame-studio'
       - basePath: 'jarvis/src/components/jarvis'
       - description: 'Your personal OS — tasks, habits, bills, calendar, meals, and more'
       - Appropriate techStack, architecture, workflows, complexAreas strings
       - curriculum: 8 topics (Tier 0-1)

    3. Define these 8 curriculum topics:

       **Tier 0 — First Contact:**
       - `welcome-tour` (difficulty 1): Meet Jarvis — what this app does and how it's organized
         - keyFiles: layout/JarvisShell.tsx, layout/DomainRail.tsx, layout/BottomTabBar.tsx
         - prerequisites: [] (entry point)
         - spotlightTargets: domain-rail, bottom-tabs, home-priority-stack
       - `navigation-basics` (difficulty 1): Domain Rail, Bottom Tabs, Command Palette
         - keyFiles: layout/DomainRail.tsx, layout/BottomTabBar.tsx, CommandPalette.tsx
         - prerequisites: [welcome-tour]
         - spotlightTargets: domain-rail-personal, bottom-tab-home, bottom-tab-chat, bottom-tab-academy

       **Tier 1 — Your First Day:**
       - `tasks-basics` (difficulty 1): View, complete, and create tasks
         - keyFiles: personal/TasksList.tsx, stores/personalStore.ts
         - prerequisites: [navigation-basics]
         - spotlightTargets: home-domain-card-personal, personal-subprogram-tasks
       - `habits-basics` (difficulty 1): Track daily habits, build streaks
         - keyFiles: personal/HabitsList.tsx, stores/personalStore.ts
         - prerequisites: [navigation-basics]
         - spotlightTargets: personal-subprogram-habits
       - `bills-basics` (difficulty 2): Track bills, mark paid, urgency colors
         - keyFiles: personal/BillsList.tsx, stores/personalStore.ts
         - prerequisites: [navigation-basics]
         - spotlightTargets: personal-subprogram-bills
       - `calendar-basics` (difficulty 1): View calendar, understand events
         - keyFiles: personal/CalendarView.tsx, stores/personalStore.ts
         - prerequisites: [navigation-basics]
         - spotlightTargets: personal-subprogram-calendar
       - `meals-basics` (difficulty 2): Meal planning, grocery lists, kitchen intelligence
         - keyFiles: personal/MealsView.tsx, stores/personalStore.ts
         - prerequisites: [navigation-basics]
         - spotlightTargets: personal-subprogram-meals
       - `morning-briefing` (difficulty 1): Ask Jarvis "brief me" — daily executive summary
         - keyFiles: brain/tools/briefing.ts, chat/ChatOverlay.tsx
         - prerequisites: [tasks-basics]
         - spotlightTargets: bottom-tab-chat, chat-input

    4. Each topic needs:
       - Detailed teachingNotes explaining the feature, how it works, and what the user should learn
       - keyFiles with path relative to basePath and explanation
       - conceptsIntroduced array (e.g., 'task-completion', 'urgency-grouping')
       - verificationSteps for same-origin validation (routes, store checks)

    Follow the EXACT pattern used by visopscreen and creator-workflow entries.
    Do NOT modify existing project entries.
    Do NOT add Tier 2-3 topics yet (deferred to later plan).
  </action>
  <verify>npm run build passes. TypeScript compiles with extended interface. Read projects.ts to confirm jarvis entry with 8 topics.</verify>
  <done>AC-2 satisfied: Jarvis tab appears in Academy Hub with 8 categorized topics</done>
</task>

<task type="auto">
  <name>Task 3: Rewire OnboardingWizard → Academy handoff</name>
  <files>jarvis/src/components/jarvis/onboarding/OnboardingWizard.tsx</files>
  <action>
    Modify the OnboardingWizard completion flow to hand off to Academy instead of the old tutorial system:

    1. Import `useAcademyStore` at the top of the file
    2. In the `startTour()` function (or equivalent completion handler):
       - Replace `useTutorialStore.getState().setSuggestedNext('tasks-basics')` with:
         ```typescript
         useAcademyStore.getState().setActiveProject('jarvis');
         ```
       - Keep the existing `finishOnboarding()` call (domain activation, schedule, etc.)
       - The route push to `/jarvis/app` should remain (user lands on home)

    3. If there's a "Skip Tour" path that calls finishOnboarding() without startTour():
       - Still set activeProject to 'jarvis' so the Academy widget appears
       - The user can discover Academy at their own pace

    Do NOT:
    - Remove useTutorialStore import (still used for spotlight in Plan 02)
    - Change any of the 6 wizard step UIs
    - Modify domain selection, widget pinning, or schedule logic
    - Break the existing finishOnboarding() store commits
  </action>
  <verify>npm run build passes. Read OnboardingWizard.tsx to confirm academyStore.setActiveProject('jarvis') in completion flow.</verify>
  <done>AC-3 satisfied: Onboarding completion sets Academy active project to jarvis</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/stores/academyStore.ts (store interface is stable)
- src/lib/jarvis/stores/tutorialStore.ts (will be used in Plan 02)
- src/components/jarvis/academy/AcademyHub.tsx (already renders project tabs automatically)
- src/components/jarvis/academy/CurriculumTopicCard.tsx (already handles topic display)
- src/app/api/jarvis/academy/* (API routes stable)
- Any existing ACADEMY_PROJECTS entries (visopscreen, creator-workflow)
- The 6 OnboardingWizard step UIs (keep all wizard steps as-is)

## SCOPE LIMITS
- NO spotlight bridge (Plan 02)
- NO enhanced teaching context/prompts (Plan 02)
- NO Tier 2-3 curriculum topics (future plan)
- NO new brain tools or API routes
- NO changes to chat system or teaching intelligence
- NO deletion of old /jarvis page files

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] middleware.ts has redirect for /jarvis → /jarvis/app
- [ ] middleware.ts subdomain root rewrites to /jarvis/app
- [ ] projects.ts has 'jarvis' entry in ACADEMY_PROJECTS
- [ ] CurriculumTopic interface extended with spotlightTargets? and verificationSteps?
- [ ] 8 curriculum topics defined (2 Tier 0 + 6 Tier 1)
- [ ] Each topic has teachingNotes, keyFiles, prerequisites, conceptsIntroduced
- [ ] OnboardingWizard sets academyStore.activeProject to 'jarvis' on completion
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All 3 tasks completed
- All verification checks pass
- Build succeeds with zero type errors
- No existing Academy projects or routes broken
- Curriculum follows same data pattern as Visopscreen/Creator Workflow
</success_criteria>

<output>
After completion, create `.paul/phases/L-01-foundation/L-01-01-SUMMARY.md`
</output>
