---
phase: E-mobile-ui
plan: 05-01
type: execute
wave: 1
depends_on: ["04-08"]
files_modified:
  - src/lib/jarvis/curriculum/tutorialLessons.ts
  - src/components/jarvis/home/DomainHealthGrid.tsx
  - src/components/jarvis/personal/SubProgramCard.tsx
  - src/components/jarvis/personal/TasksList.tsx
  - src/components/jarvis/personal/HabitsList.tsx
  - src/components/jarvis/personal/BillsList.tsx
  - src/components/jarvis/layout/BottomTabBar.tsx
  - src/components/jarvis/layout/Header.tsx
  - src/components/jarvis/layout/ChatOverlay.tsx
autonomous: true
---

<objective>
## Goal
Build the tutorial data layer and spotlight wiring — the two prerequisites the execution engine (E-05-02) needs to make interactive tutorials work.

## Purpose
This plan is pure foundation. No UI pages, no showrooms — just the data that defines what tutorials teach and the DOM hooks that let SpotlightOverlay find its targets. This enables E-05-02 to focus entirely on the execution engine and ChatOverlay integration, which is where the wife test passes.

**The Jonathan Test:** "She opens Jarvis, gets guided through setup, and within 30 minutes she's managing tasks, tracking habits, checking bills, and asking Jarvis questions — all without me having to explain anything."

E-05-01 defines the curriculum. E-05-02 brings it to life. E-05-03 adds discoverability and intelligence.

## Output
- `TutorialLesson` + `TutorialStep` type system for interactive lessons
- 4 complete Tier 1 lesson definitions (Tasks, Habits, Bills, Morning Briefing) with ~21 steps total
- Each step: beginner + advanced instruction, spotlight target, verification spec, mistake hints, teaching points
- `data-tutorial-id` attributes on ~20 critical UI elements that Tier 1 lessons spotlight
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/E-mobile-ui/E-04-08-SUMMARY.md — tutorialStore + SpotlightOverlay + OnboardingWizard

## Vision Document (CRITICAL — read sections 4.2-4.5 before executing)
@.paul/research/phase-e-jarvis-academy-vision.md

## Source Files — Existing Tutorial Infrastructure
@src/lib/jarvis/stores/tutorialStore.ts — progress, spotlight, skill level (zustand + persist)
@src/components/jarvis/onboarding/SpotlightOverlay.tsx — finds elements by data-tutorial-id, pulse/ring

## Source Files — Components Receiving data-tutorial-id
@src/components/jarvis/home/DomainHealthGrid.tsx — domain cards on Home
@src/components/jarvis/personal/SubProgramCard.tsx — 7 sub-program cards on Personal dashboard
@src/components/jarvis/personal/TasksList.tsx — task sections + checkboxes
@src/components/jarvis/personal/HabitsList.tsx — habit rows + toggles
@src/components/jarvis/personal/BillsList.tsx — bill rows + Mark Paid buttons
@src/components/jarvis/layout/BottomTabBar.tsx — mobile tab navigation
@src/components/jarvis/layout/Header.tsx — top header with search/notifications
@src/components/jarvis/layout/ChatOverlay.tsx — chat input + send button

## Existing Notion Curriculum (DO NOT MODIFY — separate system)
@src/lib/jarvis/curriculum/lessonContent.ts — 24 Notion-focused narrated lessons
@src/lib/jarvis/curriculum/lessonRegistry.ts — Notion lesson metadata registry
@src/lib/jarvis/stores/curriculumProgressStore.ts — Notion curriculum completion tracking

## Architecture Note
Two curriculum systems coexist:
1. **Notion Curriculum** (existing): 24 narrated lessons about Notion databases. Claude speaks, user follows in Notion. No spotlight needed.
2. **Interactive UI Tutorials** (THIS plan): Guided walkthroughs inside the Jarvis UI. Spotlight elements, verify store/route state, teach through doing.

These serve different purposes. The Notion curriculum teaches the data layer (Notion databases). The interactive tutorials teach the presentation layer (Jarvis UI). They may converge in the future but are correctly separate now.
</context>

<acceptance_criteria>

## AC-1: Interactive Lesson Type System
```gherkin
Given the curriculum directory at src/lib/jarvis/curriculum/
When tutorialLessons.ts is imported
Then TutorialLesson and TutorialStep types are exported with:
  - TutorialLesson: id, name, description, tier (1-4), estimatedMinutes,
    prerequisites (lesson IDs), steps (TutorialStep[]),
    completionMessage, nextSuggestion
  - TutorialStep: id, instruction (beginner), instructionAdvanced,
    spotlight (optional: elementId + type matching SpotlightTarget),
    verification ({ type: 'route' | 'store' | 'action', check: string }),
    mistakeHints (array of { detect, correction }),
    teachingPoint (optional string)
And helper functions exported: getLesson(id), getTier1Lessons(), TUTORIAL_TIERS
```

## AC-2: Tier 1 Lesson Definitions Complete and Rich
```gherkin
Given the Tier 1 lessons are defined in tutorialLessons.ts
When getTier1Lessons() is called
Then 4 complete lessons are returned:
  - "tasks-basics" (6 steps): Home → Personal → Tasks → view list → complete task → create via chat
  - "habits-basics" (5 steps): Personal → Habits → view → log completion → see streak
  - "bills-basics" (6 steps): Personal → Bills → categories → summary → mark paid → create via chat
  - "morning-briefing" (4 steps): open chat → type "brief me" → see briefing → learn chat commands
And EVERY step has:
  - instruction (beginner: click-by-click, warm tone)
  - instructionAdvanced (experienced: goal-based, concise)
  - verification (type + check string that E-05-02 engine will evaluate)
  - at least 1 mistakeHint with detect + friendly correction
  - teachingPoint on steps where deeper understanding matters
And MOST steps have a spotlight target (elementId matching a data-tutorial-id)
And completion messages celebrate genuinely (not "Tutorial complete" but "You just mastered tasks!")
```

## AC-3: data-tutorial-id Attributes on Tier 1 Critical Elements
```gherkin
Given the Jarvis app is rendered with all components
When document.querySelectorAll('[data-tutorial-id]') is called
Then at least 18 elements are found, including:
  Navigation: bottom-tab-home, bottom-tab-chat, bottom-tab-add
  Header: header-search, header-notifications, header-settings
  Home: home-domain-card-personal (dynamic per domain: home-domain-card-{id})
  Personal: personal-subprogram-tasks, personal-subprogram-habits,
            personal-subprogram-bills, personal-subprogram-calendar,
            personal-subprogram-journal, personal-subprogram-goals,
            personal-subprogram-health
  Tasks: tasks-summary, tasks-first-checkbox
  Habits: habits-progress, habits-first-toggle
  Bills: bills-summary, bills-first-mark-paid
  Chat: chat-input, chat-send
And every spotlight elementId referenced in Tier 1 lesson steps
  has a matching data-tutorial-id in the DOM
```

## AC-4: Build Compiles Clean
```gherkin
Given all changes are complete
When npm run build is executed
Then the build succeeds with zero new TypeScript errors
And no existing component behavior is altered (data attributes are purely additive)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create TutorialLesson type system + Tier 1 interactive lesson definitions</name>
  <files>src/lib/jarvis/curriculum/tutorialLessons.ts</files>
  <action>
    Create the interactive tutorial data model and all 4 Tier 1 lesson definitions.

    **Types to define:**

    Import SpotlightTarget from tutorialStore.ts (reuse existing type).

    ```typescript
    export interface MistakeHint {
      detect: string;       // description of wrong state (for E-05-02 engine to match)
      correction: string;   // warm, friendly redirect (shown to user via chat)
    }

    export interface TutorialStep {
      id: string;
      instruction: string;          // beginner: click-by-click, warm
      instructionAdvanced: string;   // experienced: goal-based, concise
      spotlight?: SpotlightTarget;   // { elementId, type: 'pulse' | 'ring' }
      verification: {
        type: 'route' | 'store' | 'action';
        check: string;  // serialized check for engine
      };
      mistakeHints: MistakeHint[];
      teachingPoint?: string;        // deeper insight shown on step success
    }

    export interface TutorialLesson {
      id: string;
      name: string;
      description: string;
      tier: 1 | 2 | 3 | 4;
      estimatedMinutes: number;
      prerequisites: string[];
      steps: TutorialStep[];
      completionMessage: string;
      nextSuggestion: string | null;
    }
    ```

    **Tier 1 Lessons — "Your First Day":**

    Each lesson is crafted from the vision doc section 4.5, adapted for the real
    components that exist in the codebase. Spotlight elementIds MUST match the
    data-tutorial-id attributes being added in Task 2.

    **Lesson 1: tasks-basics — "Managing Your Tasks" (3 min, 6 steps)**

    Step 1: "Navigate to your Personal domain"
    - instruction: "Let's start with your tasks. See the card labeled 'Personal' on your home screen? It has a violet border. Tap it now."
    - instructionAdvanced: "Head to your Personal dashboard."
    - spotlight: { elementId: 'home-domain-card-personal', type: 'pulse' }
    - verification: { type: 'route', check: '/jarvis/app/personal' }
    - mistakeHint: detect "opened Settings or another domain" → "That opened a different area. Look for the card with the violet border labeled 'Personal' on your home screen."
    - teachingPoint: "Personal is your life command center — tasks, habits, bills, calendar, journal, goals, and health all live here."

    Step 2: "Open your Tasks"
    - instruction: "Great! You're in your Personal dashboard. See those cards below? Tap the one labeled 'Tasks' with the checkmark icon."
    - instructionAdvanced: "Open your Tasks view."
    - spotlight: { elementId: 'personal-subprogram-tasks', type: 'pulse' }
    - verification: { type: 'route', check: '/jarvis/app/personal/tasks' }
    - mistakeHint: detect "opened Habits or Bills instead" → "Close one! That's a different section. Look for the card with the ✓ checkmark icon labeled 'Tasks'."

    Step 3: "View your task list"
    - instruction: "Here's your task list! Tasks are grouped by urgency — overdue at the top in red, due today in amber, and upcoming below. Take a moment to look around."
    - instructionAdvanced: "Review your tasks grouped by status."
    - spotlight: { elementId: 'tasks-summary', type: 'ring' }
    - verification: { type: 'route', check: '/jarvis/app/personal/tasks' } (just needs to be on the page)
    - mistakeHint: detect "navigated away" → "Looks like you left the Tasks page. Tap the back arrow and then the Tasks card again."
    - teachingPoint: "Overdue tasks always float to the top so nothing falls through the cracks. The summary card at the top shows your counts at a glance."

    Step 4: "Complete a task"
    - instruction: "Now try completing a task. See the circle next to each task? Tap it to mark the task as done. Watch it animate!"
    - instructionAdvanced: "Mark any task as complete."
    - spotlight: { elementId: 'tasks-first-checkbox', type: 'pulse' }
    - verification: { type: 'store', check: 'personalStore.tasks.some(t => t.completed && t.justToggled)' }
    - mistakeHint: detect "tapped the task name instead of checkbox" → "Almost! Tap the circle on the left side of the task, not the task name."
    - teachingPoint: "Tasks sync bidirectionally with your Notion workspace. Complete it here and it's done in Notion too — and vice versa."

    Step 5: "Create a task via chat"
    - instruction: "Now let's create a task using Jarvis. Tap the chat icon at the bottom of your screen — it looks like a message bubble."
    - instructionAdvanced: "Open the chat to create a task by voice."
    - spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' }
    - verification: { type: 'store', check: 'shellStore.isChatOpen === true' }
    - mistakeHint: detect "tapped home or add button instead" → "That's a different button. Look for the speech bubble icon in the bottom bar — it's labeled 'Chat'."

    Step 6: "Type your first task"
    - instruction: "Type something like 'add task: buy groceries' and hit send. Jarvis will create it for you instantly."
    - instructionAdvanced: "Create a task through chat: type 'add task: [anything]'."
    - spotlight: { elementId: 'chat-input', type: 'ring' }
    - verification: { type: 'action', check: 'user-sent-chat-message' }
    - mistakeHint: detect "typed but didn't send" → "Don't forget to tap the send button (or press Enter) after typing your message!"
    - teachingPoint: "You can create tasks three ways: tapping in the UI, typing in chat, or speaking to Jarvis. Whatever feels natural."

    completionMessage: "You just learned Tasks! You can now manage your entire to-do list from here, from Notion, or just by talking to Jarvis. Nothing falls through the cracks."
    nextSuggestion: "habits-basics"


    **Lesson 2: habits-basics — "Building Habit Streaks" (3 min, 5 steps)**

    Step 1: "Navigate to Habits"
    - instruction: "Let's build some habits! From your Personal dashboard, tap the 'Habits' card — the one with the lightning bolt icon."
    - instructionAdvanced: "Open Habits from your Personal dashboard."
    - spotlight: { elementId: 'personal-subprogram-habits', type: 'pulse' }
    - verification: { type: 'route', check: '/jarvis/app/personal/habits' }
    - mistakeHint: detect "not on Personal dashboard first" → "Head to your Personal dashboard first (tap 'Personal' on the home screen), then look for the Habits card."
    - teachingPoint: null (save teaching for later steps)

    Step 2: "Understand your habits"
    - instruction: "This is your Habit Tracker! The progress bar at the top shows how many habits you've completed today. Below, each habit shows its name, frequency, and current streak."
    - instructionAdvanced: "Review your habits and progress bar."
    - spotlight: { elementId: 'habits-progress', type: 'ring' }
    - verification: { type: 'route', check: '/jarvis/app/personal/habits' }
    - mistakeHint: detect "navigated away" → "Looks like you left the Habits page. Head back through Personal → Habits."
    - teachingPoint: "Habits are grouped by frequency — daily, weekly, monthly. The progress bar fills as you complete today's habits."

    Step 3: "Log a habit completion"
    - instruction: "Try logging a habit! Tap the circle next to any habit to mark it done for today. Watch your streak grow!"
    - instructionAdvanced: "Mark a habit as complete."
    - spotlight: { elementId: 'habits-first-toggle', type: 'pulse' }
    - verification: { type: 'store', check: 'personalStore.habits.some(h => h.completedToday)' }
    - mistakeHint: detect "tapped habit name" → "Tap the circle on the left side, not the habit name. That's the toggle!"
    - teachingPoint: "Streaks are powerful motivation. Each consecutive day you complete a habit, the streak counter grows. Miss a day and it resets — but don't worry, just start again."

    Step 4: "Watch the progress update"
    - instruction: "See how the progress bar at the top updated? And the streak count went up! Every small win adds up."
    - instructionAdvanced: "Observe the progress bar and streak update."
    - spotlight: { elementId: 'habits-progress', type: 'ring' }
    - verification: { type: 'store', check: 'personalStore.todayStats.habitsComplete > 0' }
    - mistakeHint: detect "progress didn't change" → "Hmm, the progress didn't update. Try tapping the circle next to a habit that isn't checked off yet."
    - teachingPoint: "Jarvis can remind you about your habits in your evening check-in. Consistency beats perfection — even logging 3 out of 5 habits daily builds real change over time."

    Step 5: "Create a habit via chat"
    - instruction: "Want to add a new habit? Open the chat and tell Jarvis something like 'I want to track meditation daily'."
    - instructionAdvanced: "Create a new habit through chat."
    - spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' }
    - verification: { type: 'action', check: 'user-sent-chat-message' }
    - mistakeHint: detect "didn't open chat" → "Tap the chat bubble in the bottom bar first, then type your new habit."
    - teachingPoint: null

    completionMessage: "Habits unlocked! Consistency is how small actions become big changes. Start with just 2-3 habits and build from there — Jarvis will help you stay on track."
    nextSuggestion: "bills-basics"


    **Lesson 3: bills-basics — "Tracking Bills & Subscriptions" (4 min, 6 steps)**

    Step 1: "Navigate to Bills"
    - instruction: "Time to get your finances organized! From your Personal dashboard, tap the 'Bills & Finance' card — the one with the receipt icon."
    - instructionAdvanced: "Open Bills from Personal."
    - spotlight: { elementId: 'personal-subprogram-bills', type: 'pulse' }
    - verification: { type: 'route', check: '/jarvis/app/personal/bills' }
    - mistakeHint: detect "on wrong page" → "Head to your Personal dashboard first, then look for 'Bills & Finance' with the receipt icon."

    Step 2: "Understand the color system"
    - instruction: "Bills are organized by urgency. Red sections are overdue — pay these first. Amber means due soon. And the glass sections are upcoming or already paid."
    - instructionAdvanced: "Review bills grouped by urgency status."
    - verification: { type: 'route', check: '/jarvis/app/personal/bills' }
    - mistakeHint: detect "navigated away" → "Stay on the Bills page — there's more to see!"
    - teachingPoint: "The color system is your early warning system. Red means something needs attention NOW. Amber is your heads-up. No surprises."

    Step 3: "Read the financial summary"
    - instruction: "See the card at the top? It shows your total due, any overdue amount, and how many bills you've already paid. This is your financial snapshot."
    - instructionAdvanced: "Review the financial summary card."
    - spotlight: { elementId: 'bills-summary', type: 'ring' }
    - verification: { type: 'route', check: '/jarvis/app/personal/bills' }
    - mistakeHint: detect "scrolled past summary" → "Scroll back to the top — the financial summary card is the first thing on the page."
    - teachingPoint: "Jarvis automatically calculates your total upcoming bills. No spreadsheet needed — the numbers update every time you mark a bill paid or a new one comes due."

    Step 4: "Mark a bill as paid"
    - instruction: "Find a bill and tap the 'Mark Paid' button. It's the small button on the right side of each unpaid bill."
    - instructionAdvanced: "Mark any bill as paid."
    - spotlight: { elementId: 'bills-first-mark-paid', type: 'pulse' }
    - verification: { type: 'store', check: 'personalStore.bills.some(b => b.status === "paid")' }
    - mistakeHint: detect "tapped bill name instead" → "Look for the 'Mark Paid' button on the right side of the bill row, not the bill name."
    - teachingPoint: "When you mark a bill paid, Jarvis updates the totals instantly and moves it to the Paid section. It also updates in Notion."

    Step 5: "Create a bill via chat"
    - instruction: "Let's add a new bill. Open the chat and type something like 'add bill: Netflix $15.99 monthly'."
    - instructionAdvanced: "Create a bill through chat."
    - spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' }
    - verification: { type: 'action', check: 'user-sent-chat-message' }
    - mistakeHint: detect "didn't include amount" → "Try including the amount and frequency, like: 'add bill: Netflix $15.99 monthly'. Jarvis needs those details to track it."

    Step 6: "Review your updated finances"
    - instruction: "Head back to the Bills page and check your summary. The numbers should reflect your changes. This is your real-time financial dashboard."
    - instructionAdvanced: "Return to Bills to see updated totals."
    - verification: { type: 'route', check: '/jarvis/app/personal/bills' }
    - mistakeHint: detect "still in chat" → "Close the chat and navigate back to Personal → Bills to see your updated summary."
    - teachingPoint: "Monthly, yearly, weekly, and quarterly billing frequencies are all supported. You can even add the payment link so 'Mark Paid' takes you straight to the payment page."

    completionMessage: "Bills mastered! No more missed payments, no more financial surprises. Jarvis keeps your money organized so you can focus on what matters."
    nextSuggestion: "morning-briefing"


    **Lesson 4: morning-briefing — "Your Morning Briefing" (2 min, 4 steps)**

    Step 1: "Open the chat"
    - instruction: "Let's see what Jarvis can tell you about your day. Tap the chat bubble at the bottom of your screen."
    - instructionAdvanced: "Open chat."
    - spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' }
    - verification: { type: 'store', check: 'shellStore.isChatOpen === true' }
    - mistakeHint: detect "tapped wrong tab" → "Look for the speech bubble icon in the bottom bar."

    Step 2: "Ask for your briefing"
    - instruction: "Type 'good morning' or 'brief me' and hit send. Jarvis will pull together everything you need to know about your day."
    - instructionAdvanced: "Request your daily briefing."
    - spotlight: { elementId: 'chat-input', type: 'ring' }
    - verification: { type: 'action', check: 'user-sent-chat-message' }
    - mistakeHint: detect "typed but didn't send" → "Hit the send button or press Enter after typing."
    - teachingPoint: "Jarvis pulls from ALL your connected domains for the briefing — tasks, habits, bills, goals, calendar. Morning, midday, and evening briefings are available. Just ask."

    Step 3: "Read your personalized briefing"
    - instruction: "Look at that! Jarvis knows your tasks, your habit streaks, your bills, and your goals. This briefing gets richer the more you use Jarvis."
    - instructionAdvanced: "Review the briefing content."
    - verification: { type: 'store', check: 'chatStore.messages.length >= 2' }
    - mistakeHint: detect "no response yet" → "Jarvis might need a moment to generate your briefing. If nothing appears, try typing 'brief me' and sending again."
    - teachingPoint: "The briefing is personalized and time-aware. Morning briefings focus on the day ahead. Evening briefings summarize what you accomplished."

    Step 4: "Interact with Jarvis"
    - instruction: "Try asking Jarvis something! Type 'what tasks are due today?' or 'how are my habits going?' — Jarvis can answer questions about any part of your life."
    - instructionAdvanced: "Ask Jarvis a follow-up question."
    - spotlight: { elementId: 'chat-input', type: 'ring' }
    - verification: { type: 'action', check: 'user-sent-second-message' }
    - mistakeHint: detect "closed chat" → "Open the chat again and try asking a question. Jarvis is always ready to help."
    - teachingPoint: "You can ask Jarvis anything — check your calendar, look up a contact, create a task, log a workout. The chat is your universal interface to your entire life system."

    completionMessage: "You now have a personal executive assistant. Every morning, Jarvis is ready with everything you need to know. Good morning indeed."
    nextSuggestion: null (Tier 1 complete — E-05-03 suggestion engine will handle Tier 2 recommendations)


    **Exports:**
    - `TIER_1_LESSONS: TutorialLesson[]` — all 4 lessons
    - `getTier1Lessons(): TutorialLesson[]` — returns TIER_1_LESSONS
    - `getLesson(id: string): TutorialLesson | undefined` — find by ID
    - `TUTORIAL_TIERS: Record<number, { name: string; description: string }>` — tier metadata
      - 1: "Your First Day" / "The essential features that change your daily routine"
      - 2: "Your First Week" / "Deeper capabilities for life integration"
      - 3: "Your First Month" / "Advanced lifestyle features"
      - 4: "Mastery" / "Power user capabilities"

    **Tone:** Vision doc principle #1 — "Jarvis speaks like a warm, knowledgeable mentor."
    Instructions should feel like a patient friend showing you around, not a manual.
    Celebrate completion genuinely. Mistakes are teaching moments, never failures.
  </action>
  <verify>
    Verify by importing and checking:
    - getTier1Lessons() returns 4 lessons
    - Each lesson has correct step count (6, 5, 6, 4)
    - Every step has: instruction, instructionAdvanced, verification, mistakeHints (length >= 1)
    - Most steps (>75%) have a spotlight with an elementId
    - All spotlight elementIds match IDs being added in Task 2
    - Types compile without errors
  </verify>
  <done>AC-1 + AC-2 satisfied: Type system exported, 4 Tier 1 lessons with 21 steps total, all with verification specs, mistake hints, and spotlight targets matching DOM attributes</done>
</task>

<task type="auto">
  <name>Task 2: Wire data-tutorial-id attributes on Tier 1 critical elements</name>
  <files>
    src/components/jarvis/home/DomainHealthGrid.tsx,
    src/components/jarvis/personal/SubProgramCard.tsx,
    src/components/jarvis/personal/TasksList.tsx,
    src/components/jarvis/personal/HabitsList.tsx,
    src/components/jarvis/personal/BillsList.tsx,
    src/components/jarvis/layout/BottomTabBar.tsx,
    src/components/jarvis/layout/Header.tsx,
    src/components/jarvis/layout/ChatOverlay.tsx
  </files>
  <action>
    Add `data-tutorial-id` attributes to every UI element that Tier 1 lessons reference
    in their spotlight targets. SpotlightOverlay.tsx finds elements via
    `document.querySelector('[data-tutorial-id="X"]')` — these attributes are the hooks.

    **CRITICAL: Every spotlight elementId in Task 1's lesson definitions MUST have a
    matching data-tutorial-id in the DOM. Cross-reference the lesson steps.**

    **BottomTabBar.tsx (3 IDs):**
    - Home tab button: `data-tutorial-id="bottom-tab-home"`
    - Chat tab button: `data-tutorial-id="bottom-tab-chat"`
    - Quick add FAB (center button): `data-tutorial-id="bottom-tab-add"`

    **Header.tsx (3 IDs):**
    - Search/command palette trigger: `data-tutorial-id="header-search"`
    - Notifications button (bell): `data-tutorial-id="header-notifications"`
    - Settings button (gear): `data-tutorial-id="header-settings"`

    **DomainHealthGrid.tsx (dynamic IDs — 1 per domain):**
    - Each domain card's clickable wrapper: `data-tutorial-id={`home-domain-card-${domain.id}`}`
    - This is dynamic — generates home-domain-card-personal, home-domain-card-ethereal, etc.
    - CRITICAL for Lesson 1 Step 1: home-domain-card-personal

    **SubProgramCard.tsx (7 IDs — 1 per sub-program):**
    - Each sub-program card's Link or clickable wrapper: `data-tutorial-id={`personal-subprogram-${subProgram.id}`}`
    - Read the component to determine how cards are rendered — could be individual components
      or a mapped list. Add the attribute to whichever element wraps each card.
    - CRITICAL for Tier 1: personal-subprogram-tasks, personal-subprogram-habits, personal-subprogram-bills
    - Also add for Tier 2 readiness: personal-subprogram-calendar, personal-subprogram-journal,
      personal-subprogram-goals, personal-subprogram-health

    **TasksList.tsx (2 IDs):**
    - Summary/hero card (the stats card at top): `data-tutorial-id="tasks-summary"`
    - First incomplete task's checkbox button: `data-tutorial-id="tasks-first-checkbox"`
      Implementation: use a `let firstCheckboxTagged = false` flag outside the map.
      Inside the map, for incomplete tasks: if !firstCheckboxTagged, add the attribute
      and set firstCheckboxTagged = true. This ensures only ONE checkbox gets the ID.

    **HabitsList.tsx (2 IDs):**
    - Progress hero card (shows X of Y): `data-tutorial-id="habits-progress"`
    - First incomplete habit's toggle: `data-tutorial-id="habits-first-toggle"`
      Same pattern: flag to tag only the first non-completed habit's toggle element.

    **BillsList.tsx (2 IDs):**
    - Financial summary card (top card): `data-tutorial-id="bills-summary"`
    - First unpaid bill's "Mark Paid" button: `data-tutorial-id="bills-first-mark-paid"`
      Same pattern: flag to tag only the first unpaid bill's Mark Paid button.

    **ChatOverlay.tsx (2 IDs):**
    - Chat input field (the Input component): `data-tutorial-id="chat-input"`
    - Send button: `data-tutorial-id="chat-send"`

    **Rules:**
    - data-tutorial-id is purely a DOM attribute — NO behavioral changes, NO styling changes
    - Place on the outermost interactive/tappable element (what the user would tap)
    - For dynamic IDs using template literals, ensure proper JSX syntax: data-tutorial-id={`prefix-${id}`}
    - The "first" pattern (first-checkbox, first-toggle, first-mark-paid) prevents spotlight
      from targeting a specific mock data item that might not exist. It targets whatever
      appears first in the rendered list.
    - Read each component file before modifying to understand its render structure
    - Some components may use Link from next/link — add data-tutorial-id to the Link or its wrapper div
  </action>
  <verify>
    After build, verify all IDs exist by searching the source:
    - grep for 'data-tutorial-id' across modified files — should find 20+ attribute placements
    - Cross-reference against Task 1's spotlight elementIds — every spotlight target must have a matching DOM element
    - Verify the critical set: home-domain-card-personal, personal-subprogram-tasks,
      personal-subprogram-habits, personal-subprogram-bills, tasks-summary,
      tasks-first-checkbox, habits-progress, habits-first-toggle, bills-summary,
      bills-first-mark-paid, bottom-tab-chat, chat-input, chat-send
  </verify>
  <done>AC-3 + AC-4 satisfied: 20+ data-tutorial-id attributes across 8 component files. Every Tier 1 lesson spotlight target has a matching DOM hook. Build compiles clean.</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/stores/tutorialStore.ts (stable — E-05-02 may extend)
- src/lib/jarvis/stores/curriculumProgressStore.ts (Notion curriculum — separate system)
- src/lib/jarvis/curriculum/lessonContent.ts (Notion narrations — separate system)
- src/lib/jarvis/curriculum/lessonRegistry.ts (Notion lesson registry — separate system)
- src/lib/jarvis/tutorial/tutorialTools.ts (Claude tools — E-05-02 will update)
- src/components/jarvis/onboarding/OnboardingWizard.tsx (stable)
- src/components/jarvis/onboarding/SpotlightOverlay.tsx (stable — E-05-02 may enhance)
- src/components/jarvis/layout/JarvisShell.tsx (stable)
- src/app/jarvis/app/settings/page.tsx (NOT modifying Settings — Academy link comes in E-05-03)
- Any store logic, mutations, API routes, or intelligence layer files
- Component behavior — all changes are ADDITIVE data attributes only (Task 2)

## SCOPE LIMITS
- NO Academy Hub page (E-05-03 — build after execution engine works)
- NO lesson execution engine (E-05-02)
- NO ChatOverlay tutorial message integration (E-05-02)
- NO suggestion intelligence or trigger rules (E-05-03)
- NO adaptive difficulty automation (E-05-03)
- NO Learning Progress home widget (E-05-03)
- NO Settings page modifications (E-05-03)
- NO Tier 2-4 lesson definitions (future)
- NO new npm dependencies
- NO new routes or pages

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero new TypeScript errors
- [ ] tutorialLessons.ts exports TutorialLesson, TutorialStep, MistakeHint types
- [ ] getTier1Lessons() returns exactly 4 lessons
- [ ] Step counts: tasks-basics=6, habits-basics=5, bills-basics=6, morning-briefing=4
- [ ] Every step has instruction + instructionAdvanced + verification + mistakeHints (>= 1)
- [ ] >75% of steps have spotlight targets with elementIds
- [ ] Every spotlight elementId has a matching data-tutorial-id in a component file
- [ ] data-tutorial-id attributes found in 8 component files (20+ total placements)
- [ ] No component behavior changed — only data attributes added
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- Both tasks completed
- All verification checks pass
- No errors or warnings introduced
- Lesson data is complete, type-safe, and warm in tone
- Every spotlight target has a real DOM hook
- Foundation is 100% ready for E-05-02 execution engine
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-05-01-SUMMARY.md`
</output>
