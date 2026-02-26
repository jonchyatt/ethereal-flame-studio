---
phase: E-mobile-ui
plan: 04-08
type: execute
wave: 1
depends_on: ["04-07"]
files_modified:
  - src/lib/jarvis/stores/settingsStore.ts
  - src/lib/jarvis/stores/tutorialStore.ts
  - src/app/jarvis/app/onboarding/page.tsx
  - src/components/jarvis/onboarding/OnboardingWizard.tsx
  - src/components/jarvis/onboarding/SpotlightOverlay.tsx
  - src/components/jarvis/layout/JarvisShell.tsx
autonomous: true
---

<objective>
## Goal
Build the 6-step onboarding setup wizard, tutorial progress tracking infrastructure, and spotlight overlay system — establishing the foundation for Jarvis Academy (the interactive tutorial curriculum).

## Purpose
Jonathan's guiding principle: "You don't open a door if you don't know it exists." Jarvis has 38 Notion databases and dozens of features, but without guided discovery a new user sees cards and screens without understanding the life-changing capability behind each one. This plan delivers:
1. A setup wizard that configures Jarvis on first launch (technical setup)
2. The store + spotlight infrastructure for Jarvis Academy (learning system foundation)

The full tutorial curriculum (15+ lessons) will be built in a subsequent phase using this foundation.

## Output
- 6-step onboarding wizard at `/jarvis/app/onboarding`
- Extended settingsStore with onboarding state + notification schedule
- New tutorialStore with progress tracking, skill level, spotlight state
- SpotlightOverlay component for highlighting UI elements during tutorials
- Onboarding redirect logic in JarvisShell
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Design Reference (CRITICAL — read before implementation)
@.paul/research/phase-e-jarvis-academy-vision.md (complete spec for all 6 wizard steps + tutorial architecture)
@.paul/research/phase-e-information-architecture.md (Section 1: First-Run Experience, lines 1550-1617)
@.paul/research/phase-e-ui-system-design.md (Onboarding layout, lines 926-945)

## Prior Work
@.paul/phases/E-mobile-ui/E-04-04-SUMMARY.md (settingsStore + useActiveDomains — this plan extends it)
@.paul/phases/E-mobile-ui/E-04-02-SUMMARY.md (homeStore + widget registry — wizard Step 4 uses it)
@.paul/phases/E-mobile-ui/E-04-05.5-SUMMARY.md (glass-interactive, fadeInUp, spring easing — all wizard cards MUST use these)

## Source Files
@src/lib/jarvis/stores/settingsStore.ts
@src/lib/jarvis/stores/homeStore.ts
@src/lib/jarvis/stores/shellStore.ts
@src/lib/jarvis/domains.ts
@src/lib/jarvis/widgets/registry.ts
@src/components/jarvis/layout/JarvisShell.tsx
@src/components/jarvis/primitives/Button.tsx
@src/components/jarvis/primitives/Card.tsx
@src/components/jarvis/primitives/Toggle.tsx
@src/components/jarvis/primitives/Badge.tsx
</context>

<skills>
No SPECIAL-FLOWS.md — skills section omitted.
</skills>

<acceptance_criteria>

## AC-1: settingsStore Onboarding Extensions
```gherkin
Given the settingsStore is loaded
When the app checks onboarding status
Then settingsStore exposes:
  - onboarded: boolean (default false)
  - onboardedAt: number | null (timestamp, default null)
  - notificationSchedule: { workDays, workStart, workEnd, sleepStart, sleepEnd }
  - dataSourceUrls: Record<string, string> (domain ID → URL)
  - setOnboarded() action that sets onboarded=true and onboardedAt=Date.now()
  - setNotificationSchedule() and setDataSourceUrl() actions
And all new fields persist via zustand persist (existing 'jarvis-settings' key)
```

## AC-2: tutorialStore Foundation
```gherkin
Given the tutorialStore is created
When imported by any component
Then it exposes:
  - progress: Record<string, CompletionRecord> (lessonId → completion data)
  - currentLesson: string | null
  - currentStep: number
  - skillLevel: 'beginner' | 'intermediate' | 'advanced' (default 'beginner')
  - spotlight: { elementId: string, type: 'pulse' | 'ring' } | null
  - suggestedNext: string | null
  - totalCompleted: number (computed from progress)
  - startLesson(id), advanceStep(), completeLesson(), setSpotlight(), clearSpotlight()
And progress + skillLevel persist via zustand persist ('jarvis-tutorials' key)
```

## AC-3: Onboarding Wizard — 6 Steps Functional
```gherkin
Given the user navigates to /jarvis/app/onboarding
When they progress through all 6 steps
Then:
  Step 1 (Welcome): Shows Jarvis branding + "Get Started" button
  Step 2 (Domains): Shows 7 domain cards with toggles, Personal locked as always-on
  Step 3 (Data Sources): Shows connection status per activated domain, inputs for URL-based domains
  Step 4 (Home Setup): Shows widget grid, max 4 selectable, pre-checks defaults
  Step 5 (Notifications): Shows work schedule + sleep schedule pickers with visual timeline
  Step 6 (Briefing): Shows mock briefing card with real-ish summary + "Go to Home" + "Start the guided tour" link
And step progress indicators (dots) show current position
And Back button available on steps 2-6
And each step uses glass/glass-interactive surfaces with fadeInUp entrance animations
```

## AC-4: Wizard Completes and Redirects
```gherkin
Given the user is on Step 6 of the onboarding wizard
When they tap "Go to Home"
Then:
  - settingsStore.onboarded is set to true
  - settingsStore.onboardedAt is set to current timestamp
  - settingsStore.activeDomainIds includes all domains the user activated in Step 2
  - settingsStore.notificationSchedule contains the schedule from Step 5
  - settingsStore.dataSourceUrls contains any URLs entered in Step 3
  - homeStore.pinnedWidgets contains the widgets selected in Step 4
  - Router navigates to /jarvis/app (Priority Home)
```

## AC-5: Onboarding Redirect Guard
```gherkin
Given a user visits any /jarvis/app/* route
When settingsStore.onboarded is false
Then JarvisShell redirects to /jarvis/app/onboarding
And the redirect does NOT apply when already on /jarvis/app/onboarding (no infinite loop)
```

## AC-6: SpotlightOverlay Component
```gherkin
Given the tutorialStore.spotlight is set with { elementId, type }
When SpotlightOverlay renders
Then it finds the element with matching data-tutorial-id attribute
And renders a visual indicator:
  - 'pulse': animated scale pulse on the target element's bounding rect
  - 'ring': glowing border ring in cyan around the target
And the overlay auto-clears when the user taps/clicks the highlighted element
And the overlay is positioned absolutely over the target using getBoundingClientRect
```

## AC-7: Responsive Layout
```gherkin
Given the onboarding wizard renders
When viewed on mobile (<768px)
Then it shows single-column layout, full-width cards, thumb-friendly CTAs
When viewed on desktop (>=768px)
Then Step 1 shows 2-column layout (visual left, content right)
And domain grid in Step 2 uses 3-column layout
And widget grid in Step 4 uses 2-column layout
```

## AC-8: Build Compiles Clean
```gherkin
Given all changes are complete
When running tsc --noEmit
Then zero new TypeScript errors are introduced (pre-existing audio-prep errors allowed)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create stores + onboarding route + SpotlightOverlay</name>
  <files>
    src/lib/jarvis/stores/settingsStore.ts,
    src/lib/jarvis/stores/tutorialStore.ts,
    src/app/jarvis/app/onboarding/page.tsx,
    src/components/jarvis/onboarding/SpotlightOverlay.tsx,
    src/components/jarvis/layout/JarvisShell.tsx
  </files>
  <action>
    **1a. Extend settingsStore.ts:**
    Add to the SettingsState interface:
    - `onboarded: boolean` (default: false)
    - `onboardedAt: number | null` (default: null)
    - `notificationSchedule: NotificationSchedule | null` (default: null)
    - `dataSourceUrls: Record<string, string>` (default: {})

    Add NotificationSchedule type:
    ```
    { workDays: number[], workStart: string, workEnd: string, sleepStart: string, sleepEnd: string }
    ```
    workDays is array of day indices (0=Sun, 1=Mon, ... 6=Sat).
    Default schedule values (applied during onboarding): workDays=[1,2,3,4,5], workStart='06:00', workEnd='18:00', sleepStart='22:00', sleepEnd='06:00'.

    Add actions:
    - `setOnboarded()` → sets onboarded=true, onboardedAt=Date.now()
    - `setNotificationSchedule(schedule: NotificationSchedule)` → stores schedule
    - `setDataSourceUrl(domainId: string, url: string)` → updates dataSourceUrls[domainId]

    Ensure ALL new fields are included in the persist partialize (existing pattern: only specific fields persist). Add onboarded, onboardedAt, notificationSchedule, dataSourceUrls to the persisted fields.

    **1b. Create tutorialStore.ts:**
    New zustand store with persist middleware (key: 'jarvis-tutorials').

    Types:
    ```typescript
    interface CompletionRecord {
      lessonId: string;
      completedAt: string;
      stepCount: number;
      mistakeCount: number;
      durationSeconds: number;
    }

    interface SpotlightTarget {
      elementId: string;
      type: 'pulse' | 'ring';
    }

    interface TutorialState {
      progress: Record<string, CompletionRecord>;
      currentLesson: string | null;
      currentStep: number;
      skillLevel: 'beginner' | 'intermediate' | 'advanced';
      spotlight: SpotlightTarget | null;
      suggestedNext: string | null;
    }
    ```

    Computed:
    - `totalCompleted` → derived via `Object.keys(state.progress).length`

    Actions:
    - `startLesson(lessonId: string)` → sets currentLesson, currentStep=0, clears spotlight
    - `advanceStep()` → increments currentStep, clears spotlight
    - `completeLesson(record: Omit<CompletionRecord, 'lessonId'>)` → adds to progress, clears currentLesson/currentStep
    - `setSpotlight(target: SpotlightTarget)` → sets spotlight
    - `clearSpotlight()` → sets spotlight to null
    - `setSuggestedNext(lessonId: string | null)` → updates suggestion
    - `setSkillLevel(level)` → updates skill level

    Persist: progress and skillLevel only (not currentLesson, currentStep, spotlight — those are session-transient).

    **1c. Create onboarding page route:**
    File: `src/app/jarvis/app/onboarding/page.tsx`
    - 'use client' directive
    - Import and render `<OnboardingWizard />` (from step 2)
    - NO JarvisShell wrapping — onboarding is a standalone full-screen experience
    - Full viewport: `min-h-dvh bg-black text-white`
    - The page.tsx should be minimal — just mounts the wizard component

    IMPORTANT: This page must NOT be wrapped in JarvisShell layout. Since `/jarvis/app/layout.tsx` applies JarvisShell, we need to handle this. Options:
    - Check: if `/jarvis/app/layout.tsx` conditionally renders based on pathname, use that.
    - Otherwise: Add a condition in JarvisShell that checks pathname — if on /jarvis/app/onboarding, render children only without shell chrome (no Header, no DomainRail, no BottomTabBar).

    **1d. Onboarding redirect in JarvisShell:**
    In JarvisShell.tsx, add a useEffect that:
    - Reads `useSettingsStore().onboarded`
    - Reads `usePathname()` from next/navigation
    - If `onboarded === false` AND pathname !== '/jarvis/app/onboarding', redirect to '/jarvis/app/onboarding'
    - If pathname === '/jarvis/app/onboarding', render ONLY children (skip Header, DomainRail, BottomTabBar, ChatOverlay, ToastContainer)
    - This prevents infinite redirect loops and gives onboarding a clean full-screen canvas

    **1e. Create SpotlightOverlay.tsx:**
    File: `src/components/jarvis/onboarding/SpotlightOverlay.tsx`
    - 'use client' directive
    - Reads `tutorialStore.spotlight`
    - If spotlight is null, render nothing
    - If spotlight has a target:
      1. Use `document.querySelector('[data-tutorial-id="<elementId>"]')` to find element
      2. Use `getBoundingClientRect()` to position overlay
      3. Render overlay div with:
         - Fixed positioning matching the target's bounding rect (with 4px padding)
         - CSS pointer-events: none (don't block interaction)
         - Animation based on type:
           - 'pulse': `@keyframes spotlight-pulse { 0%,100% { box-shadow: 0 0 0 2px rgba(34,211,238,0.4) } 50% { box-shadow: 0 0 0 6px rgba(34,211,238,0.2) } }` — 2s infinite
           - 'ring': `border: 2px solid rgba(34,211,238,0.6); border-radius: 8px;`
      4. Add a global click listener that checks if clicked element matches `[data-tutorial-id="<elementId>"]` — if so, call `clearSpotlight()`
      5. Use ResizeObserver or window resize listener to reposition on layout changes
    - Define CSS keyframes via inline style tag (same pattern as ChatOverlay)
    - Clean up listeners on unmount

    Wire SpotlightOverlay into JarvisShell.tsx — render it AFTER ToastContainer (highest z-index layer).
  </action>
  <verify>
    - `tsc --noEmit` passes with zero new errors
    - settingsStore exports onboarded, setOnboarded, notificationSchedule, setNotificationSchedule, dataSourceUrls, setDataSourceUrl
    - tutorialStore exports progress, currentLesson, startLesson, advanceStep, completeLesson, spotlight, setSpotlight, clearSpotlight
    - `/jarvis/app/onboarding/page.tsx` exists and imports OnboardingWizard
    - SpotlightOverlay.tsx exists with pulse and ring animation keyframes
    - JarvisShell has redirect logic and SpotlightOverlay rendered
  </verify>
  <done>AC-1, AC-2, AC-5, AC-6, AC-8 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Build OnboardingWizard component with all 6 steps</name>
  <files>
    src/components/jarvis/onboarding/OnboardingWizard.tsx
  </files>
  <action>
    Create a single 'use client' component that manages the 6-step wizard internally via useState.

    **Overall Structure:**
    ```
    const [step, setStep] = useState(0) // 0-5 for steps 1-6
    const [selections, setSelections] = useState({
      activeDomains: ['home', 'personal'], // locked defaults
      dataSourceUrls: {},
      pinnedWidgets: ['habit-streak', 'bill-due'], // defaults pre-checked
      notificationSchedule: { workDays: [1,2,3,4,5], workStart: '06:00', workEnd: '18:00', sleepStart: '22:00', sleepEnd: '06:00' }
    })
    ```

    **Step Indicator:**
    - Row of 6 dots at top of wizard
    - Current step: `w-2.5 h-2.5 rounded-full bg-cyan-400`
    - Completed: `w-2 h-2 rounded-full bg-cyan-400/60`
    - Future: `w-2 h-2 rounded-full bg-white/20`
    - Centered, with 8px gap between dots
    - Animate dot transition with scale spring

    **Navigation:**
    - Bottom area: [Back] (steps 2-6) and [Continue / Get Started / Go to Home] button
    - Back: `ghost` variant Button
    - Continue: `primary` variant Button, full-width on mobile
    - Each step renders inside a container with fadeInUp animation (200ms) on step change
    - Use a key={step} on the step container to trigger re-mount animation

    **Step 1 — Welcome:**
    - Mobile: centered single column
    - Desktop: 2-col grid (left: visual area with cyan gradient orb glow, right: text)
    - Heading: "Welcome to Jarvis" (text-3xl font-bold)
    - Subheading: "Your multi-domain operating system" (text-lg text-white/60)
    - Body: "Jarvis connects every area of your life into one intelligent dashboard. Let's get you set up." (text-sm text-white/40)
    - CTA: "Get Started" Button (primary)
    - Visual area: div with radial-gradient cyan glow (bg-gradient-radial or manual css), pulsing subtle animation

    **Step 2 — Domain Selection:**
    - Heading: "Choose your domains"
    - Subtext: "Each domain connects a different area of your life. You can always add more later from Settings."
    - Grid: 2 columns mobile, 3 columns desktop
    - Each domain card: glass-interactive surface (rounded-xl p-4)
      - DomainIcon (import from home components) + domain name + 1-line description
      - Toggle or checkbox indicator (top-right)
      - Personal: show "Always on" Badge, no toggle, locked
      - Other domains: tappable to toggle, spring scale animation on tap
      - When active: domain color border glow (border-{color}-500/40)
    - Domain descriptions (hardcoded):
      - home: (not shown — home is implicit)
      - personal: "Tasks, habits, bills, calendar, journal, goals, health" — LOCKED
      - ethereal-flame: "Your creative visual experience"
      - reset-biology: "Health protocols and biohacking data"
      - critfailvlogs: "Content creation and video planning"
      - visopscreen: "Options trading analysis and screening"
      - satori-living: "Property and living space management"
      - entity-building: "Business entities and legal structure"
    - Import DOMAINS from domains.ts and DOMAIN_COLORS for border colors
    - On toggle: update selections.activeDomains (add/remove domain ID)

    **Step 3 — Connect Data Sources:**
    - Heading: "Connect your data"
    - Only show cards for domains activated in Step 2 (filter selections.activeDomains, excluding 'home')
    - Per domain, a glass Card:
      - personal: Green check icon + "Notion Life OS is already connected" + "38 databases ready" helper
      - ethereal-flame: Green check icon + "Already connected — same codebase"
      - reset-biology: Input field for URL + "Enter your Reset Biology site URL"
      - visopscreen: Input field for URL + "Enter your Visopscreen URL"
      - critfailvlogs: "No data source needed yet" + "Content tools coming soon"
      - satori-living: Input field for URL + "Enter your Satori Living site URL"
      - entity-building: "No data source needed yet"
    - Input fields: use the Input primitive, placeholder URLs
    - On input change: update selections.dataSourceUrls[domainId]
    - Each card shows domain icon + domain color accent

    **Step 4 — Home Setup:**
    - Heading: "Customize your Home screen"
    - Subtext: "Pin up to 4 widgets for quick access to what matters most."
    - Grid: 2 columns
    - Import WIDGET_REGISTRY from widgets/registry.ts
    - Filter widgets to show only those whose domain is in selections.activeDomains
    - Each widget: glass-interactive card with checkbox + name + domain badge
    - Pre-check: 'habit-streak' and 'bill-due' (defaults from registry)
    - Max 4 selection enforced: if user taps 5th, show toast "Remove one first" (import toast from Toast)
    - On toggle: update selections.pinnedWidgets array
    - Summary text below: "X of 4 widgets selected"

    **Step 5 — Notification Preferences:**
    - Heading: "When should Jarvis reach out?"
    - Subtext: "Jarvis adapts its behavior based on your schedule."
    - Section A: "When are you at work?"
      - Day buttons: M T W Th F S Su — tappable rounded-lg buttons
      - Selected: bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40
      - Unselected: bg-white/5 text-white/40
      - Time selectors: two <select> dropdowns (Start time — End time)
      - Options: 30-min increments from 00:00 to 23:30
      - Default: Mon-Fri selected, 06:00 — 18:00
    - Section B: "When do you sleep?"
      - Two <select> dropdowns (Bedtime — Wake up)
      - Default: 22:00 — 06:00
    - Visual timeline bar below:
      - Horizontal bar showing 24h with colored zones:
      - Focus (work): cyan-500/30
      - Active (between work and sleep): emerald-500/30
      - DND (sleep): violet-500/30
      - Labels above each zone
    - On change: update selections.notificationSchedule

    **Step 6 — First Briefing:**
    - Heading: "Here's what Jarvis knows right now"
    - Glass Card with mock briefing:
      - Time-aware greeting: "Good morning/afternoon/evening, Jonathan" (use date logic)
      - 4 stat lines with icons: "3 tasks due today", "2 habit streaks active", "$127 in bills due this week", "1 goal at 65% progress"
      - Warm closing: "You're off to a great start. Jarvis is ready when you are."
    - CTA: "Go to Home" Button (primary, full-width)
    - Below CTA (subtle): text-sm text-white/40 link: "Want Jarvis to show you around? Start the guided tour →"
      - Tour link: sets tutorialStore.suggestedNext = 'tasks-basics' then navigates to home
    - On "Go to Home" click:
      1. Call settingsStore.setOnboarded()
      2. Call settingsStore.activateDomain() for each domain in selections.activeDomains (skip home/personal — already active)
      3. Call settingsStore.setNotificationSchedule(selections.notificationSchedule)
      4. For each URL in selections.dataSourceUrls: call settingsStore.setDataSourceUrl(domainId, url)
      5. Call homeStore pinWidget/unpinWidget to match selections.pinnedWidgets
      6. Router.push('/jarvis/app')

    **Polish Requirements (MANDATORY — from E-04-05.5):**
    - ALL visible containers use glass or glass-interactive (Card component with appropriate variant)
    - fadeInUp entrance animation on each step transition (use key={step} for re-mount)
    - Spring easing on toggles and domain card selections: cubic-bezier(0.34, 1.56, 0.64, 1)
    - No flat bg-zinc-900 containers anywhere
    - Domain cards must show their domain color when active (colored border glow)

    **Define CSS keyframes** via inline style tag at top of component (same pattern as ChatOverlay):
    ```css
    @keyframes onboard-fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes onboard-orb-pulse {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }
    ```
  </action>
  <verify>
    - `tsc --noEmit` passes with zero new errors
    - OnboardingWizard.tsx is a single component managing 6 steps via useState
    - Each step renders distinct UI matching the acceptance criteria
    - Step transitions use fadeInUp animation
    - Step 2 shows 7 domain cards (home excluded from display since it's implicit) with Personal locked
    - Step 4 enforces max 4 widget selections
    - Step 5 has day picker + time selectors + visual timeline
    - Step 6 "Go to Home" calls all store actions and navigates
    - All containers use glass/glass-interactive
  </verify>
  <done>AC-3, AC-4, AC-7, AC-8 satisfied</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/primitives/* (all 8+1 primitives are stable — use them, don't modify)
- src/components/jarvis/home/* (home composites are stable)
- src/components/jarvis/personal/* (all 7 sub-view components are stable)
- src/lib/jarvis/stores/personalStore.ts (personal mock data is stable)
- src/lib/jarvis/stores/chatStore.ts (chat state is stable)
- src/lib/jarvis/stores/homeStore.ts (do NOT modify the store definition — only CALL its existing actions from the wizard)
- src/lib/jarvis/domains.ts (domain definitions are stable — import, don't modify)
- src/lib/jarvis/widgets/registry.ts (widget registry is stable — import, don't modify)
- src/middleware.ts (middleware handles subdomain routing + API auth — don't touch)

## SCOPE LIMITS
- No tutorial lesson content (Tier 1-4 lessons are a FUTURE phase — just build the store infrastructure)
- No Google Calendar integration (future feature)
- No real Notion data fetching for briefing (Step 6 uses mock/hardcoded data)
- No notification delivery system (just the schedule storage in settingsStore)
- No TutorialRunner/TutorialEngine component (future phase — just the store + spotlight)
- Do NOT add data-tutorial-id attributes to existing components yet (that's tutorial phase work)
- No changes to existing ChatOverlay, DomainRail, BottomTabBar, or Header beyond what's specified
- The ONLY change to JarvisShell is: onboarding redirect logic + SpotlightOverlay render + conditional chrome hiding

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` in the repo root — zero new errors
- [ ] `/jarvis/app/onboarding/page.tsx` exists and renders OnboardingWizard
- [ ] settingsStore has onboarded flag that defaults to false
- [ ] tutorialStore persists progress and skillLevel
- [ ] SpotlightOverlay renders pulse/ring animations when spotlight is set
- [ ] JarvisShell redirects to /onboarding when onboarded is false
- [ ] JarvisShell hides chrome (Header, DomainRail, etc.) on /onboarding route
- [ ] OnboardingWizard has 6 functioning steps with step indicator dots
- [ ] Step 2 has Personal locked, other domains toggleable
- [ ] Step 4 enforces max 4 widgets
- [ ] Step 6 "Go to Home" writes to all stores and navigates
- [ ] All surfaces use glass/glass-interactive, fadeInUp entrance, spring easing
- [ ] All acceptance criteria (AC-1 through AC-8) met
</verification>

<success_criteria>
- All tasks completed (2 of 2)
- All verification checks pass
- No new TypeScript errors introduced
- Onboarding wizard renders all 6 steps with proper store integration
- Tutorial infrastructure (tutorialStore + SpotlightOverlay) is ready for future lesson content
- Visual polish matches E-04-05.5 standards (glass surfaces, animations, spring easing)
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-08-SUMMARY.md`
</output>
