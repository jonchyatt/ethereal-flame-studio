# Jarvis Academy — Interactive Onboarding & Tutorial System

**Created:** 2026-02-26
**Author:** Jonathan + Claude (collaborative vision)
**Status:** Design document — comprehensive reference for all onboarding/tutorial work
**Scope:** E-04-08 (foundation) + future phase (full curriculum)

---

## 1. The Core Insight

Traditional onboarding answers "how do I set this up?" Jarvis Academy answers **"what can this do for my life and how do I use it?"**

Jonathan's guiding principle: **"You don't open a door if you don't know it exists."**

Jarvis has 38 Notion databases across 6 functional clusters, covering tasks, habits, bills, recipes, meal planning, workouts, journals, goals, health tracking, budgets, CRM, content management, and more. The UI surfaces these through 7 domain cards and dozens of sub-views. But without guided discovery, a new user (e.g., Jonathan's wife) would see cards and screens without understanding the life-changing capability behind each one.

The solution: Jarvis itself becomes the teacher. Not a static help page. Not a tooltip tour. An **AI-guided, interactive, adaptive curriculum** that walks users through every capability step by step, at their pace, remembering progress across sessions.

---

## 2. Two Distinct Systems

### System A: Setup Wizard (E-04-08)
The 6-step technical configuration from the E-02 Information Architecture spec. This handles the mechanical "get things connected" flow.

### System B: Jarvis Academy (E-04-08 foundation + future phase)
The interactive tutorial curriculum. This teaches users what Jarvis can do and how to use every feature. Inspired by Visopscreen's interactive tutorial architecture but adapted for Jarvis's unique advantage: **Jarvis IS the AI teacher, not an external observer.**

Both systems are needed. The Setup Wizard runs once on first launch. Jarvis Academy is an ongoing learning companion available anytime.

---

## 3. Setup Wizard — Detailed Specification

### Route & Architecture
- **Route:** `/jarvis/app/onboarding`
- **Architecture:** Single page component with internal step state (not URL-driven)
- **Guard:** Middleware checks `user_settings.onboarded` flag; if `false`, redirect to onboarding
- **Post-completion:** Set `onboarded = true`, redirect to Priority Home

### Step 1: Welcome
```
Visual: Jarvis orb animation (small, elegant) with domain rail preview
Headline: "Welcome to Jarvis — your multi-domain operating system."
Subtext: "Jarvis connects every area of your life into one intelligent
          dashboard. Let's get you set up in about 2 minutes."
CTA: [Get Started]
```
- Full-bleed dark background with subtle glassmorphism card
- Orb pulses gently (reuse existing mini-orb animation)
- Mobile: centered single column. Desktop: 2-column (visual left, text right)

### Step 2: Domain Selection
```
Headline: "Choose your domains"
Subtext: "Each domain connects a different area of your life.
          You can always add more later from Settings."

Grid of 7 domain cards:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 👤 Personal  │ │ 🔥 Ethereal  │ │ 🧬 Reset     │
│ Life         │ │ Flame        │ │ Biology      │
│ ✓ Always on  │ │ □ Activate   │ │ □ Activate   │
└──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🎲 CritFail  │ │ 📈 Visop-    │ │ 🏛️ Satori    │
│ Vlogs        │ │ screen       │ │ Living       │
│ □ Activate   │ │ □ Activate   │ │ □ Activate   │
└──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐
│ 🏢 Entity    │
│ Building     │
│ □ Activate   │
└──────────────┘

CTA: [Continue]
```
- Each card shows: domain icon (lucide), domain name, 1-line description, toggle
- Personal Life is pre-selected with "Always on" badge (cannot deselect)
- Cards use domain colors (violet, orange, emerald, rose, sky, amber, indigo)
- Tapping a card toggles activation with spring scale animation
- Description per domain:
  - Personal: "Tasks, habits, bills, calendar, journal, goals, health"
  - Ethereal Flame: "Your creative visual experience"
  - Reset Biology: "Health protocols and biohacking data"
  - CritFailVlogs: "Content creation and video planning"
  - Visopscreen: "Options trading analysis and screening"
  - Satori Living: "Property and living space management"
  - Entity Building: "Business entities and legal structure"

### Step 3: Connect Data Sources
```
For EACH activated domain, a connection step:

Personal Life:
  Icon: ✅ (green check)
  "Notion Life OS is already connected."
  Helper: "Your 38 Notion databases are ready to go."
  Status: Connected

Reset Biology:
  Input: "Enter your Reset Biology site URL"
  Placeholder: "https://your-reset-biology-site.com"
  Helper: "Jarvis will display your health data without duplicating it."
  Status: Needs setup / Connected

Visopscreen:
  Input: "Enter your Visopscreen URL"
  Placeholder: "https://your-visopscreen-instance.com"
  Helper: "Jarvis will surface your options analysis data."
  Status: Needs setup / Connected

Ethereal Flame:
  Icon: ✅ (green check)
  "Already connected — same codebase."
  Status: Connected

CritFailVlogs:
  "No data source needed yet."
  Helper: "Content planning tools will be available when this domain is built."
  Status: Ready

Satori Living:
  "Enter your Satori Living site URL" (or placeholder)
  Status: Needs setup / Ready

Entity Building:
  "No data source needed yet."
  Status: Ready

CTA: [Continue] (available even if some are skipped)
```
- Skipped connections put domain in "Setup" state (not "Active")
- Setup state domains show "Complete setup" prompt in their dashboard
- Each connection validates URL format before marking connected
- Visual: stacked cards per activated domain, checkmark animation on connect

### Step 4: Home Setup
```
Headline: "Customize your Home screen"
Subtext: "Pin up to 4 widgets for quick access to what matters most."

Preview: Mock Priority Home with available widgets

Widget options (based on activated domains):
- [ ] Today's Tasks (Personal) — recommended
- [ ] Habit Streaks (Personal) — recommended
- [ ] Bills Due (Personal)
- [ ] Next Calendar Event (Personal)
- [ ] Morning Briefing (Jarvis)
- [ ] Quick Capture (Jarvis)
- [ ] Domain Health (All)
- [ ] Goal Progress (Personal)

Helper: "These appear at the top of your Home screen.
         You can change them anytime in Settings."
CTA: [Continue] (defaults applied if skipped)
```
- Max 4 selections enforced (5th tap shows "Remove one first" toast)
- Default recommendations: Today's Tasks + Habit Streaks (pre-checked)
- Widget cards show mini preview of what they look like
- Spring animation on select/deselect

### Step 5: Notification Preferences
```
Headline: "When should Jarvis reach out?"
Subtext: "Jarvis adapts its behavior based on your schedule."

Section A — "When are you at work?"
  Schedule picker:
  - Weekday toggle buttons: [M] [T] [W] [Th] [F] [S] [Su]
  - Time range: [Start] — [End]
  - Default: Mon-Fri, 6:00 AM — 6:00 PM
  Helper: "During work hours, Jarvis enters Focus mode —
           only urgent items break through."

Section B — "When do you sleep?"
  Time range: [Bedtime] — [Wake up]
  - Default: 10:00 PM — 6:00 AM
  Helper: "During sleep hours, Jarvis enters Do Not Disturb —
           complete silence."

Notification mode summary:
┌────────────────────────────────────────┐
│ 6am  ░░░ FOCUS ░░░  6pm  ACTIVE  10pm │
│      (work hours)      (evenings)      │
│ 10pm ░░░░ DND ░░░░░░░░░░░░░░░░░ 6am  │
└────────────────────────────────────────┘

CTA: [Continue]
```
- Visual timeline bar showing Focus/Active/DND zones
- Tapping weekday buttons toggles them with haptic-style spring animation
- Time pickers are simple dropdowns (30-minute increments)
- Stores to settingsStore.notificationMode and schedule

### Step 6: First Briefing
```
Headline: "Here's what Jarvis knows right now"

[Live-generated briefing card with real Notion data]

Example:
┌────────────────────────────────────────┐
│ ☀️ Good evening, Jonathan              │
│                                        │
│ 📋 3 tasks due today                   │
│ 🔥 2 habit streaks active              │
│ 💰 $127 in bills due this week         │
│ 🎯 1 goal at 65% progress             │
│                                        │
│ "You're off to a great start.          │
│  Jarvis is ready when you are."        │
└────────────────────────────────────────┘

CTA: [Go to Home]

Below CTA (subtle):
"Want Jarvis to show you around?
 Start the guided tour →"
```
- Briefing is generated from REAL Notion data via BriefingBuilder
- If data is sparse: "Jarvis doesn't have much data yet. As you use the system, this briefing gets richer."
- Time-aware greeting (Good morning/afternoon/evening)
- The "Start the guided tour" link launches the first Academy lesson

### Post-Wizard State
- `user_settings.onboarded = true` — flag in settingsStore (persisted)
- `user_settings.onboardedAt = Date.now()` — timestamp for analytics
- Domain activations saved to settingsStore.activeDomainIds
- Notification schedule saved to settingsStore.notificationSchedule
- Widget selections saved to homeStore.pinnedWidgets
- Data source connections saved to settingsStore.dataSourceUrls
- Redirect to Priority Home (`/jarvis/app`)

---

## 4. Jarvis Academy — The Tutorial Curriculum System

### 4.1 Why Jarvis Has an Unfair Advantage Over Visopscreen

The Visopscreen tutorial system (documented in `INTERACTIVE-TUTORIAL-REFERENCE.md`) uses:
- An external AI coach (Claude Code) that observes via Playwright
- JSON IPC between CLI adapter and browser
- Accessibility tree snapshots to verify user actions
- Screenshot budget management for visual checks
- Separate session management

Jarvis doesn't need ANY of that infrastructure because:
1. **Jarvis IS the AI** — the chat overlay is the native instruction channel
2. **Direct store access** — Jarvis can check if a task was completed, a habit was logged, a bill was marked paid by reading zustand state directly
3. **UI element control** — Jarvis can programmatically spotlight, pulse, or highlight any component
4. **Persistent memory** — Jarvis already tracks user context across sessions via Notion
5. **Natural conversation** — users can ask "why?" mid-tutorial and Jarvis answers naturally

### 4.2 Architecture: How Tutorials Work Inside Jarvis

```
┌─────────────────────────────────────────────────────────┐
│  tutorialStore (zustand + persist)                       │
│                                                          │
│  curriculum: TutorialDefinition[]  (all available lessons)│
│  progress: { lessonId: CompletionRecord }  (per user)    │
│  currentLesson: string | null  (active lesson ID)        │
│  currentStep: number  (step index within lesson)         │
│  skillLevel: 'beginner' | 'intermediate' | 'advanced'   │
│  spotlight: { elementId: string, type: 'pulse'|'ring' }  │
│  suggestedNext: string | null  (AI-recommended next)     │
│  totalCompleted: number                                   │
│  streakDays: number  (consecutive days with a lesson)     │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ ChatOverlay  │ │ SpotlightMgr │ │ TutorialProgress │
│ (instruction │ │ (highlight   │ │ (curriculum view, │
│  channel)    │ │  UI elements)│ │  completion %)    │
└──────────────┘ └──────────────┘ └──────────────────┘
```

#### The Tutorial Flow (Jarvis-native adaptation of Visopscreen's core loop):

```
1. SUGGEST  → Jarvis suggests a lesson via chat or notification
               "Want to learn how Tasks work? It takes 3 minutes."

2. ACCEPT   → User taps "Let's go" or says "teach me about tasks"

3. INSTRUCT → Jarvis sends a chat message with the current step instruction
               Beginner: "Tap the Personal card on your home screen."
               Advanced: "Navigate to your Personal dashboard."

4. SPOTLIGHT → Jarvis highlights the target UI element
               SpotlightManager adds a pulsing ring/glow to the element

5. WAIT     → User performs the action in the real UI

6. VERIFY   → Jarvis checks store state (NOT screenshots or a11y trees)
               Example: tutorialStore checks if router.pathname === '/jarvis/app/personal'

7. RESPOND  → Based on verification:
               SUCCESS: "Nice! You're in your Personal dashboard. See those cards?"
               WRONG:   "Hmm, that opened Settings. Look for the card with the
                         violet border labeled 'Personal' on your home screen."
               QUESTION: User asked "what is this?" → Jarvis explains, then
                         restates: "Now, back to our lesson — tap Personal."

8. TEACH    → At key moments (not every step), Jarvis delivers a teaching point:
               "Everything here syncs with your Notion workspace. Changes you
                make in Jarvis appear in Notion within seconds, and vice versa."

9. ADVANCE  → Move to next step. Repeat from INSTRUCT.

10. COMPLETE → All steps done. Jarvis celebrates:
                "You just learned Tasks! You can now manage your to-do list
                 from here, from Notion, or by asking me. What's next?"
                Mark lesson complete in tutorialStore.
                Suggest next lesson.
```

#### Key Patterns Borrowed from Visopscreen:

| Visopscreen Pattern | Jarvis Adaptation |
|--------------------|--------------------|
| Outcome-based verification | Check zustand store state, not click paths |
| Adaptive instruction depth | `skillLevel` in tutorialStore adjusts verbosity |
| Mistakes are teaching moments | Always explain WHY, never just "try again" |
| Mid-exercise Q&A | User types question in chat → Jarvis answers → restates position |
| Progress tracking | tutorialStore.progress persists via zustand persist |
| Curriculum menu | Dedicated "Learn" section in Settings or Home widget |
| Session cost control | N/A — Jarvis tutorials are free (no screenshot/API budget) |
| Dynamic tours | Jarvis reads live data, not hardcoded descriptions |
| Record insights | Jarvis notes patterns: "You complete tasks faster in the evening" |

### 4.3 The Spotlight System

A new component that overlays visual hints on the UI during tutorials:

```typescript
// SpotlightManager — highlights UI elements during tutorials
interface SpotlightTarget {
  elementId: string;       // data-tutorial-id on the target element
  type: 'pulse' | 'ring' | 'arrow' | 'dim-others';
  label?: string;          // optional floating label
  position?: 'above' | 'below' | 'left' | 'right';
}
```

How it works:
- Tutorial-eligible components get a `data-tutorial-id` attribute
- When tutorialStore.spotlight is set, SpotlightManager renders:
  - **pulse**: gentle scale animation on the target (draws eye without blocking)
  - **ring**: glowing border ring in domain color
  - **arrow**: floating arrow pointing to element with label
  - **dim-others**: darken everything except the target (modal spotlight)
- Spotlight auto-clears when user interacts with the highlighted element
- CSS-only animations (no libraries), consistent with existing spring easing

### 4.4 Tutorial Definitions — Data Model

Each tutorial is a self-contained lesson definition:

```typescript
interface TutorialDefinition {
  id: string;                    // e.g., 'tasks-basics'
  name: string;                  // "Managing Your Tasks"
  description: string;           // "Learn to view, complete, and create tasks"
  domain: DomainId;              // 'personal'
  tier: 1 | 2 | 3 | 4;         // priority tier (1 = Day 1)
  estimatedMinutes: number;      // 3
  prerequisites: string[];       // lesson IDs that should be done first
  steps: TutorialStep[];
  completionMessage: string;     // celebration text
  nextSuggestion: string | null; // suggested next lesson ID
}

interface TutorialStep {
  id: string;                    // e.g., 'navigate-to-personal'
  instruction: string;           // beginner text
  instructionAdvanced: string;   // experienced text
  spotlight?: SpotlightTarget;   // what to highlight
  verification: {
    type: 'route' | 'store' | 'action' | 'chat';
    check: string;               // serializable check description
    // Examples:
    // { type: 'route', check: '/jarvis/app/personal' }
    // { type: 'store', check: 'personalStore.tasks.some(t => t.completed)' }
    // { type: 'action', check: 'task-created' }
    // { type: 'chat', check: 'user-sent-message' }
  };
  mistakeHints: MistakeHint[];   // common wrong actions + corrections
  teachingPoint?: string;        // deeper explanation (shown on success)
}

interface MistakeHint {
  detect: string;                // what wrong state looks like
  correction: string;            // friendly explanation + redirect
}

interface CompletionRecord {
  lessonId: string;
  completedAt: string;           // ISO timestamp
  stepCount: number;
  mistakeCount: number;          // for adaptive difficulty
  durationSeconds: number;
  skillLevelAtCompletion: string;
}
```

### 4.5 Full Curriculum — All Tutorials by Tier

---

#### TIER 1: "Your First Day" (Critical Path — Build First)

**Lesson 1.1: Managing Your Tasks** (3 min)
- Domain: Personal
- Prerequisites: none
- Steps:
  1. Navigate to Personal dashboard (spotlight Personal card on Home)
  2. Open Tasks sub-view (spotlight Tasks card)
  3. View your task list (teach: grouped by status — today/overdue/upcoming)
  4. Complete a task (tap checkbox — teach: syncs to Notion in real-time)
  5. Create a task via chat ("Type 'add task: buy groceries' in the chat below")
  6. See it appear in the list (teach: works from chat, from the UI, or from Notion directly)
- Teaching points:
  - "Tasks sync bidirectionally with Notion. Edit in either place."
  - "You can create tasks by tapping +, typing in chat, or speaking to Jarvis."
  - "Overdue tasks float to the top so nothing falls through the cracks."
- Completion: "You just learned Tasks! You'll never lose a to-do again."
- Next: Lesson 1.2 (Habits)

**Lesson 1.2: Building Habit Streaks** (3 min)
- Domain: Personal
- Prerequisites: 1.1 (knows how to navigate)
- Steps:
  1. Navigate to Habits sub-view (spotlight Habits card on Personal dashboard)
  2. View habit list (teach: grouped by frequency — daily/weekly/monthly)
  3. Log a habit completion (tap the circle — teach: streak increments)
  4. See the streak counter update (teach: streaks motivate consistency)
  5. Create a new habit via chat ("Tell Jarvis 'I want to track meditation daily'")
- Teaching points:
  - "Streaks reset if you miss a day. But Jarvis won't judge — just start again."
  - "Progress bars show how close you are to your daily habit goals."
  - "Jarvis can remind you about habits in your evening check-in."
- Completion: "Habits unlocked! Consistency is how small actions become big changes."
- Next: Lesson 1.3 (Bills)

**Lesson 1.3: Tracking Bills & Subscriptions** (4 min)
- Domain: Personal
- Prerequisites: 1.1
- Steps:
  1. Navigate to Bills sub-view
  2. View bill categories (teach: overdue in red, due soon in amber, upcoming in glass)
  3. See the financial summary hero (total due, overdue amount, paid count)
  4. Mark a bill as paid (tap "Mark Paid" — teach: updates Notion + recalculates totals)
  5. Add a new bill ("Tell Jarvis 'add bill: Netflix $15.99 monthly'")
  6. View the subscription with its frequency and next due date
- Teaching points:
  - "Bills are color-coded by urgency. Red = overdue, amber = due soon."
  - "Jarvis calculates your total upcoming bills automatically."
  - "You can add the service link so 'Mark Paid' takes you to the payment page."
  - "Monthly, yearly, weekly, and quarterly frequencies are all supported."
- Completion: "Bills mastered! No more missed payments."
- Next: Lesson 1.4 (Morning Briefing)

**Lesson 1.4: Your Morning Briefing** (2 min)
- Domain: Jarvis (cross-domain)
- Prerequisites: 1.1, 1.2, 1.3 (has data to brief on)
- Steps:
  1. Open chat overlay (spotlight chat button or teach Cmd+Shift+C)
  2. Type "good morning" or "brief me"
  3. See Jarvis generate a personalized briefing (tasks, habits, bills, goals)
  4. Interact with a briefing item ("Tell Jarvis to mark that task complete")
- Teaching points:
  - "Jarvis pulls from ALL your connected domains for the briefing."
  - "Morning, midday, and evening briefings are available. Just ask."
  - "The briefing gets richer as you use more features."
- Completion: "You now have a personal executive assistant. Good morning indeed."
- Next: Tier 2 (suggest Journal as first Tier 2 lesson)

---

#### TIER 2: "Your First Week" (Life Integration)

**Lesson 2.1: Journaling & Mood Tracking** (3 min)
- Domain: Personal
- Steps:
  1. Navigate to Journal sub-view
  2. View journal entries (teach: chronological, most recent first)
  3. Set today's mood (tap mood emoji — teach: only today's entry is editable)
  4. Create a journal entry via chat ("Tell Jarvis 'journal: Had a great shift today. Saved a tough case.'")
  5. See it appear with timestamp
- Teaching points:
  - "Mood tracking over time reveals patterns. Jarvis can spot trends."
  - "Journal entries are private — stored only in your Notion workspace."
  - "Try ending each day with a quick journal entry. Even one sentence helps."

**Lesson 2.2: Setting & Tracking Goals** (3 min)
- Domain: Personal
- Steps:
  1. Navigate to Goals sub-view
  2. View active goals with progress bars
  3. Update a goal's progress (teach: auto-marks "Achieved" at 100%)
  4. Create a new goal via chat
- Teaching points:
  - "Goals connect to your tasks. Complete related tasks and update goal progress."
  - "The Home screen can show a Goal Progress widget for daily motivation."

**Lesson 2.3: Your Calendar** (4 min)
- Domain: Personal
- Steps:
  1. Navigate to Calendar sub-view
  2. View today's events and upcoming schedule
  3. Understand the timeline view (teach: events grouped by today/upcoming/past)
  4. Create an event via chat
  5. (Future) Connect Google Calendar for automatic import
- Teaching points:
  - "Calendar events come from your Notion databases."
  - "Violet-tinted sections highlight today's events."
  - "Google Calendar import is coming — your work schedule will sync automatically."

**Lesson 2.4: Quick Capture** (2 min)
- Domain: Jarvis
- Steps:
  1. Open chat from anywhere (teach: always accessible)
  2. Type anything unstructured ("Remind me to call the dentist" / "Idea: start a garden")
  3. Watch Jarvis classify and file it (task? note? journal entry?)
- Teaching points:
  - "Quick Capture is Jarvis's superpower. Throw ANY thought at it."
  - "Jarvis decides where it goes — task, note, or capture — based on context."
  - "You never need to think about organization. Just talk."

---

#### TIER 3: "Your First Month" (Lifestyle Upgrade)

**Lesson 3.1: Recipes & Meal Planning** (5 min)
- Domain: Personal (Tracking cluster)
- Steps:
  1. Navigate to the meal planning area (when built)
  2. Search recipes by name ("Find me chicken recipes")
  3. Filter by difficulty and category
  4. View a recipe with ingredients, prep time, cook time, calories
  5. Add a recipe to the weekly meal plan ("Add chicken stir fry to Wednesday dinner")
  6. View the weekly meal plan by day
- Teaching points:
  - "Recipes are stored in Notion. You can add new ones from Notion or via Jarvis."
  - "The meal plan helps with grocery shopping — you'll know exactly what you need."
  - "Filter by 'Easy' difficulty for busy weeknights."
  - "Favorite recipes appear first when you search."
  - "Ingredients are linked to recipes — future shopping list feature will use this."

**Lesson 3.2: Fitness & Workout Tracking** (4 min)
- Domain: Personal (Tracking cluster)
- Steps:
  1. Navigate to Health sub-view
  2. View workout sessions grouped by type
  3. Log a workout ("Tell Jarvis 'I did 30 minutes of running today'")
  4. View personal records
  5. Track weights, cardio, and classes separately
- Teaching points:
  - "Health data is grouped by type: workouts, cardio, weights, classes."
  - "Personal records are tracked automatically. Beat your best and Jarvis celebrates."
  - "Consistent tracking reveals patterns — Jarvis can spot when you're overtraining."

**Lesson 3.3: Budgets & Finance** (5 min)
- Domain: Personal (Financial cluster)
- Steps:
  1. Understand the financial databases (budgets, income, expenditure)
  2. View budget categories and allocations
  3. Log an expenditure ("Spent $45 on groceries")
  4. View income vs expenditure trends
  5. Understand how bills/subscriptions connect to the budget
- Teaching points:
  - "Six financial databases work together: Bills, Budgets, Income, Expenditure, Financial Years, Invoices."
  - "Bills track recurring costs. Expenditure tracks one-time spending."
  - "Budgets set your limits. Jarvis can warn when you're approaching them."

**Lesson 3.4: Projects & Areas** (3 min)
- Domain: Personal (Daily Action cluster)
- Steps:
  1. View active projects
  2. Understand the project → task relationship
  3. View areas of life (the P.A.R.A. system)
  4. Create a project with linked tasks
- Teaching points:
  - "Projects group related tasks. 'Renovate kitchen' might have 20 tasks underneath."
  - "Areas are permanent life categories. Projects belong to areas."
  - "The P.A.R.A. system (Projects, Areas, Resources, Archive) organizes everything."

---

#### TIER 4: "Mastery" (Power User)

**Lesson 4.1: Knowledge Base** (3 min)
- Notes & References, Topics & Resources, Notebooks, Wish List
- How to use Jarvis as a second brain

**Lesson 4.2: CRM & Contacts** (3 min)
- Managing relationships and contact information
- Quick lookups: "What's Sarah's email?"

**Lesson 4.3: Content Management** (4 min)
- Content calendar, channels, tweets
- Planning CritFailVlogs episodes
- Social media scheduling

**Lesson 4.4: Domain Rail & Customization** (2 min)
- Reordering domains
- Activating/deactivating domains
- Widget management on Home

**Lesson 4.5: The Weekly Review** (5 min)
- Sunday retrospective ritual
- Wheel of Life scoring
- Goal check-in
- Next week planning
- Jarvis's weekly summary and suggestions

**Lesson 4.6: Advanced Chat Commands** (3 min)
- Multi-step requests ("Create a task, add it to the Kitchen Reno project, and set it as high priority")
- Cross-domain queries ("What bills are due and what tasks relate to them?")
- Bulk operations ("Mark all grocery tasks as complete")

---

## 5. The "Suggest Next Lesson" Intelligence

Jarvis doesn't wait for the user to browse a menu. It proactively suggests lessons based on:

### Trigger Rules:
1. **Post-onboarding:** Immediately suggest Lesson 1.1 (Tasks)
2. **Lesson just completed:** Suggest the `nextSuggestion` from the completed lesson
3. **New session, lessons incomplete:** "Welcome back! Last time you completed [X]. Ready for [Y]?"
4. **User navigates to an unexplored area:** "I see you found the Goals section! Want a quick walkthrough?"
5. **Time-based:** If no lesson done in 3+ days: "Hey, want to pick up where we left off? You were on [lesson name]."
6. **Feature discovery:** If user tries to use a feature they haven't been taught: "Looks like you're exploring Recipes! Want me to walk you through it? It takes 5 minutes."

### Delivery:
- Via chat overlay (Jarvis sends a message with inline action buttons)
- Via notification (in-app badge)
- Via Home widget (if "Learning Progress" widget is pinned)
- NEVER pushy. Always skippable. "Not now" is always an option.

### Adaptive Difficulty:
```
skillLevel is inferred from:
- mistakeCount across completed lessons (low mistakes → advance faster)
- time per lesson (fast completion → less hand-holding)
- user explicitly saying "I know this" or "skip ahead"

Beginner (default for new users):
- Click-by-click instructions
- Spotlight on every target element
- Detailed teaching points

Intermediate (after completing Tier 1 with few mistakes):
- Goal-based instructions ("Navigate to your habits")
- Spotlight only on non-obvious elements
- Teaching points only at key moments

Advanced (after completing Tier 2 or user self-selects):
- High-level goals ("Log a habit and check your streak")
- No spotlight
- Teaching points only for advanced concepts
```

---

## 6. Notion Template Teaching — Deep Dive

### The Problem
Jonathan's Notion Life OS has 38 databases organized into 6 clusters with 21 dashboard pages. Most users won't explore Notion's raw databases. They need Jarvis to:
1. Reveal what templates exist ("Did you know you can track recipes?")
2. Show them how to populate templates ("Here's how to add a recipe")
3. Explain relationships ("Recipes link to Ingredients, which builds your shopping list")
4. Demonstrate the value loop ("Plan your meals → auto-generate grocery list → cook → rate the recipe")

### Template Teaching Per Cluster

#### Cluster 1: Daily Action (5 DBs)
**Tasks + Projects + Areas + Daily Habits + Habits**
- Teach: Task lifecycle (create → prioritize → do → complete → recurring)
- Teach: Project decomposition (big goal → task list)
- Teach: P.A.R.A. areas as life categories
- Teach: Daily habit check-in ritual
- Value loop: "Create tasks → complete them → see progress on projects → hit goals"

#### Cluster 2: Financial (6 DBs)
**Subscriptions/Bills + Budgets + Income + Expenditure + Financial Years + Invoices**
- Teach: Bill creation with frequency (monthly/yearly/quarterly)
- Teach: Mark paid workflow with payment portal links
- Teach: Budget categories and spending limits
- Teach: Income logging for net worth tracking
- Teach: Expenditure logging for spending awareness
- Value loop: "Track income → set budgets → log spending → see where money goes → adjust"

#### Cluster 3: Knowledge (6 DBs)
**Notes + Journal + CRM + Topics + Notebooks + Wish List**
- Teach: Journal as daily reflection practice
- Teach: Notes as capture-anything second brain
- Teach: CRM for relationship management
- Teach: Wish List for deferred wants (anti-impulse-buy tool)
- Value loop: "Capture knowledge → organize → retrieve when needed → build expertise"

#### Cluster 4: Tracking (10 DBs)
**Workouts + Weights + Cardio + Classes + Fitness Records + Meal Plan + Recipes + Ingredients + Timesheets + Days**
- Teach: Recipe search and meal plan creation
- Teach: Workout logging across 4 types
- Teach: Personal record tracking
- Teach: Timesheet for work hour tracking
- Teach: Day ratings for life quality tracking
- Value loop: "Plan meals → shop → cook → rate → repeat favorites"
- Value loop: "Log workouts → track PRs → see progress → stay motivated"

#### Cluster 5: Planning (6 DBs)
**Goals + Years + Wheel of Life + Fear Setting + Dream Setting + Significant Events**
- Teach: Goal setting with progress tracking (0-100%)
- Teach: Yearly themes and goal planning
- Teach: Wheel of Life for life balance assessment
- Teach: Fear Setting (Stoic exercise from Tim Ferriss)
- Teach: Dream Setting (vision board in database form)
- Value loop: "Set goals → track progress → review yearly → celebrate achievements"

#### Cluster 6: Business/Content (4 DBs)
**Content + Channels + Tweets + Client Portal**
- Teach: Content calendar for CritFailVlogs
- Teach: Multi-channel management
- Teach: Tweet drafting and scheduling
- Value loop: "Plan content → draft → publish → track performance"

---

## 7. Google Calendar Integration (Future Feature)

### The Ask
Jonathan wants to import Google Calendar events into Jarvis's Calendar sub-view. This would bring work schedules, appointments, and shared family calendars into the unified view.

### Architecture (High-Level)
```
Google Calendar API (OAuth 2.0)
    │
    ▼
/api/integrations/google-calendar
    │
    ├── GET /events → fetch events for date range
    ├── POST /events → create event from Jarvis
    └── GET /calendars → list available calendars
    │
    ▼
calendarStore (new zustand store)
    │
    ├── events: CalendarEvent[]
    ├── connectedCalendars: GoogleCalendar[]
    ├── syncStatus: 'synced' | 'syncing' | 'error'
    └── lastSynced: Date
    │
    ▼
CalendarView (enhanced)
    └── Merges Notion events + Google Calendar events
        └── Color-coded by source
```

### Requirements:
- OAuth consent flow (Google Cloud project required)
- Read + write scope for Google Calendar
- Periodic polling (every 5-15 minutes) or webhook for real-time
- Merge display: Notion events in violet, Google events in blue
- Conflict detection: warn if same time slot has events from both sources

### When to Build:
- NOT in E-04-08 (too much scope)
- Could be its own sub-phase (E-04-09 or E-05-xx)
- The Calendar tutorial (Lesson 2.3) should mention it as "coming soon"

---

## 8. Implementation Strategy

### Phase E-04-08 Scope (Build Now)
1. **Setup Wizard** — All 6 steps, functional, with settingsStore integration
2. **tutorialStore** — Progress tracking, skill level, spotlight state
3. **SpotlightManager** — Component for highlighting UI elements
4. **Tutorial infrastructure** — Lesson definitions, verification system, step advancement
5. **Tier 1 Lessons** (proof of concept) — Tasks, Habits, Bills, Morning Briefing
6. **Notification foundation** — In-app notification badge, notification mode store integration
7. **"Learn" section** — Accessible from Settings or Home, shows curriculum and progress

### Future Phase Scope (Build Later)
1. **Remaining curriculum** — Tier 2, 3, 4 lessons (11+ more tutorials)
2. **Adaptive difficulty** — Automatic skill level inference from completion data
3. **Google Calendar integration** — OAuth + sync + merged display
4. **Shopping list generation** — From meal plan recipes
5. **Weekly Review ritual** — Guided Sunday retrospective
6. **Cross-session lesson resumption** — Pick up mid-lesson after closing app
7. **Learning Progress widget** — Home screen widget showing curriculum progress
8. **Proactive lesson suggestions** — Smart triggers based on user behavior

---

## 9. Design Principles (Non-Negotiable)

1. **Jarvis speaks like a warm, knowledgeable mentor** — Not a robot, not a manual. "Great question!" not "Error: invalid input."

2. **Mistakes are always teaching moments** — Adapted from Visopscreen: never just say "try again." Always explain WHY and redirect gently.

3. **Every lesson delivers immediate value** — User should accomplish a REAL action (complete a task, log a habit) during the tutorial, not just watch a demo.

4. **Progress is always visible** — User can always see how far they've come and what's next.

5. **Never pushy, always available** — Lessons are suggested, not forced. "Not now" is always respected. But Jarvis remembers and asks again later.

6. **Teach the WHY, not just the HOW** — Don't just say "tap here." Explain "This marks the bill as paid and Jarvis updates your total upcoming costs automatically."

7. **The real UI is the classroom** — No separate "tutorial mode" that looks different from real usage. Users learn by DOING in the actual interface with gentle guidance.

8. **Celebrate completion genuinely** — Each finished lesson gets a warm, personal message. Not just "Complete!" but "You just learned to manage your finances through Jarvis. No more missed payments."

9. **Mobile-first instruction** — All tutorials must work beautifully on phone (Jonathan's wife will likely use it on mobile). Spotlight must not obscure small screens. Chat instructions must be concise.

10. **Accessible from Day 1 to Day 365** — The Academy isn't just for new users. Power users can revisit lessons, discover features they missed, or use it to teach others.

---

## 10. Success Metric

**The Jonathan Test:** "When I show my wife what we built for our life, she opens Jarvis, gets guided through setup, and within 30 minutes she's managing tasks, tracking habits, checking bills, and asking Jarvis questions — all without me having to explain anything."

**The Life-Changing Test:** "Unless you know how to use it, that ability will be wasted." Every feature in Jarvis must have a discoverable, teachable path. Zero capabilities should remain hidden behind unintuitive navigation.

---

*This document is the permanent reference for all onboarding and tutorial work. It should be read before planning any E-04-08+ sub-phase.*
