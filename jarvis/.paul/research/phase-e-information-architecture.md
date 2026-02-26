# Jarvis Information Architecture
## The Blueprint for a Multi-Domain Operating System

**Version:** 1.1
**Date:** 2026-02-25
**Foundation:** Domain Atlas + UI Pattern Research
**Consumed by:** E-03 (UI System Design), E-04+ (Build Waves)

---

## DESIGN PRINCIPLES (Non-Negotiable)

1. **10-Second Scan** — Home screen answers "what needs my attention?" in under 10 seconds
2. **2-Tap Reach** — Any domain reachable from any other domain in ≤2 interactions
3. **Mobile-First** — Every screen designed for thumb-reach first, enhanced for desktop second
4. **Empty Rooms Don't Waste Space** — Inactive domains are hidden until activated
5. **Consistent Grammar** — All domains follow the same layout pattern (learn once, use everywhere)
6. **Voice-First Where Hands Aren't Free** — "Hey Jarvis, what's urgent?" always works
7. **Status-First** — Show health/state before details (red/amber/green at a glance)

---

## SECTION 1: NAVIGATION MODEL

### Primary Paradigm: Domain Rail + Priority Home + Command Palette

Three navigation layers work together:

**Layer 1 — Domain Rail (Persistent)**
A thin strip of domain icons, always visible, providing one-tap domain switching.
- Mobile: horizontal icon strip below the header (swipeable if >5)
- Desktop: vertical icon rail on the far left (always visible, ~60px wide)
- Each icon shows a colored status dot (red/amber/green/gray)
- Active domain is highlighted; tapping switches context instantly
- Long-press (mobile) or hover (desktop) shows domain name tooltip

**Layer 2 — Priority Home (Default View)**
The command center — cross-domain priority dashboard. This is what you see when you open the app. Not tied to any single domain. Shows what matters most RIGHT NOW across everything.

**Layer 3 — Command Palette (Power Navigation)**
- Desktop: Cmd+K / Ctrl+K opens search-everything palette
- Mobile: pull-down gesture or search icon in header
- Search across: domains, tasks, trades, protocols, content, settings
- Recent items for quick re-access
- Action shortcuts: "log dose", "mark done", "check regime"

### Domain Switching Mechanics

```
From anywhere:
  Tap domain icon in rail → Domain dashboard (1 tap)
  Tap Home icon in rail → Priority Home (1 tap)

From domain dashboard:
  Tap sub-item → Detail view (2 taps from any other domain)
  Swipe back → Domain dashboard (1 tap)
  Tap different domain icon → That domain's dashboard (1 tap)

From detail view:
  Swipe back → Parent view
  Tap domain icon → Different domain (context preserved in background)
```

### Context Persistence
When switching between domains, each domain's scroll position, open detail, and filter state are preserved in memory. Returning to a domain restores exactly where you left off. This is critical for the "between patients" workflow — leave Visopscreen mid-analysis, check a task, come back to exactly where you were.

### Deep Linking (URL Structure)
```
/                           → Priority Home (command center)
/chat                       → Chat view (full-screen conversation)
/settings                   → Settings & preferences

/personal                   → Personal Life dashboard
/personal/tasks             → Tasks list
/personal/tasks/:id         → Task detail
/personal/habits            → Habits tracker
/personal/bills             → Bills & subscriptions
/personal/calendar          → Calendar view
/personal/journal           → Journal entries
/personal/goals             → Goals & planning
/personal/health            → Health & wellness overview

/ethereal-flame             → Ethereal Flame dashboard
/ethereal-flame/pipeline    → Content pipeline status
/ethereal-flame/calendar    → Publishing calendar
/ethereal-flame/analytics   → Cross-platform analytics
/ethereal-flame/library     → Content library
/ethereal-flame/channels    → Channel management

/reset-biology              → Reset Biology dashboard
/reset-biology/breathwork   → Breathwork programs
/reset-biology/exercise     → Workout protocols
/reset-biology/vision       → Vision training
/reset-biology/nutrition    → Nutrition & meal plans
/reset-biology/peptides     → Peptide management
/reset-biology/journal      → Journaling
/reset-biology/store        → Store & orders
/reset-biology/gamification → Points & streaks

/critfail                   → CritFailVlogs dashboard
/critfail/pipeline          → Content pipeline (shared pattern)
/critfail/calendar          → Publishing calendar
/critfail/analytics         → Analytics

/visopscreen                → Visopscreen dashboard
/visopscreen/regime         → Regime status & history
/visopscreen/screener       → Daily screener results
/visopscreen/portfolio      → Portfolio tracking
/visopscreen/alerts         → Alerts & signals

/satori                     → Satori Living dashboard
/satori/compliance          → Compliance calendar
/satori/programs            → Program enrollments
/satori/research            → Research projects

/entity                     → Entity Building dashboard
/entity/health              → Entity credit health
/entity/milestones          → Milestones & tasks
/entity/compliance          → Compliance filings
```

### Keyboard Shortcuts (Desktop)
```
Cmd+K          → Command palette (search everything)
Cmd+1..7       → Switch to domain by position
Cmd+0          → Priority Home
Cmd+Shift+C    → Toggle chat overlay
Cmd+.          → Quick add (task, note, dose log)
Escape         → Close overlay / go back one level
```

### Mobile Gestures
```
Swipe right    → Go back (standard iOS/Android back)
Swipe left     → Quick action sheet (context-dependent)
Pull down      → Refresh current view / open search
Long press     → Context menu on any item
```

### Quick Capture & Route (Layer 4 — The Between-Patients Input)

A fourth navigation layer purpose-built for the moment between patients when Jonathan
has a thought and 3 seconds to act. Quick Capture is distinct from chat (no conversation)
and action sheets (no structured form). It's a one-shot input that gets intelligently
routed to the right domain.

**Trigger Points:**
- Voice button long-press (mobile) → "Add BPC-157 to reorder list"
- Cmd+. (desktop) → Quick capture text field appears
- "Hey Jarvis" wake word (when voice enabled) → voice capture
- Shake gesture (mobile, optional) → opens capture

**Flow:**
```
Input (voice/text)
    ↓
Transcribe (if voice → Whisper)
    ↓
NLP Classify → determine domain + action type:
    ├── Task → route to Personal or domain-specific task list
    ├── Reminder → create timed notification
    ├── Log → route to appropriate logging action (dose, meal, workout)
    ├── Note → append to domain-specific notes or journal
    └── Unknown → queue for next chat session ("You mentioned X earlier — what should I do with it?")
    ↓
Confirm (haptic + brief toast: "Added to Reset Bio reorder list ✓")
    ↓
Done (≤3 seconds total)
```

**Key Design Rules:**
- Zero navigation required — capture works from ANY screen including lock screen (future PWA)
- Auto-dismiss after confirmation — never leaves the user in a new context
- Classification uses the same NLP that powers chat, but in single-shot mode
- Failed classification doesn't silently drop — it queues for review
- History: all captures logged in Settings → Capture History (review misrouted items)

**Without voice enabled:** Quick Capture is a single-line text field that appears as an overlay (like Spotlight on macOS). Type, hit enter, routed, dismissed.

---

## SECTION 2: DOMAIN HIERARCHY

### Activation Model
Domains exist in three states:
- **Active** — fully set up, shows in domain rail, health card on home
- **Setup** — partially configured, shows setup wizard prompt
- **Hidden** — not yet activated, invisible in rail and home (discoverable in settings)

Default on first launch: Personal Life = Active. All others = Hidden.
User activates domains from Settings → Domains → "Add Domain."

### Complete Hierarchy

#### HOME (Priority Command Center)
```
Home /
├── Priority Stack
│   └── Top 5-10 urgent items across ALL active domains
│       Each item shows: domain icon + title + due/urgency + quick action
│       Sources: tasks due today, bills overdue, doses due, regime alerts,
│                render failures, compliance deadlines, low inventory
│       Sorted by: urgency score (overdue > due today > due soon > informational)
│
├── Domain Health Grid (Bento Cards)
│   └── One card per active domain, showing:
│       ├── Status indicator (red/amber/green)
│       ├── Domain name + icon
│       ├── Key metric (1 number or sparkline)
│       └── One-line summary ("3 tasks due, 1 overdue")
│       Cards arranged in responsive grid:
│         Mobile: 1 column (stacked, scrollable)
│         Tablet: 2 columns
│         Desktop: 3 columns
│
├── Quick Actions Bar
│   └── Contextual shortcuts (changes based on time of day):
│       Morning: "Start briefing", "Log dose", "Check tasks"
│       Midday: "Quick add task", "Check Visopscreen", "Log meal"
│       Evening: "Evening review", "Journal", "Tomorrow's plan"
│
├── Pinned Widgets (user-customizable)
│   └── Small, self-contained data cards pinned from any domain:
│       ├── User drags/adds from "Add Widget" picker
│       ├── Each widget is a mini-view of a sub-program
│       ├── Examples:
│       │   ├── "Next Dose" — shows next peptide dose + one-tap log
│       │   ├── "Regime Badge" — Visopscreen archetype + confidence %
│       │   ├── "Habit Streak" — current streak count + today's status
│       │   ├── "Pipeline Status" — renders in queue/active/complete
│       │   ├── "Bill Due" — next bill name + amount + days remaining
│       │   └── "Compliance Alert" — nearest filing deadline
│       ├── Max 4 pinned widgets (prevent Home bloat)
│       ├── Widget sizes: small (1 column) or wide (2 columns)
│       └── Manage: long-press widget → remove, or Settings → Home → Widgets
│
└── Briefing Card (expandable)
    └── Latest briefing summary (morning/midday/evening)
        Tap to expand full briefing
```

**Widget Registry:**
Domains expose widgets as self-contained data components. Each widget defines:
- Data source (API endpoint or store selector)
- Refresh interval (how often to re-fetch)
- Tap action (where to navigate on tap)
- Quick action (optional one-tap action: log dose, mark done)

| Widget | Domain | Data Source | Tap → Navigate | Quick Action |
|--------|--------|------------|----------------|-------------|
| Next Dose | Reset Bio | peptide protocols API | /reset-biology/peptides | Log dose |
| Regime Badge | Visopscreen | regime status API | /visopscreen/regime | — (view only) |
| Habit Streak | Personal | Notion Habits DB | /personal/habits | Mark today done |
| Pipeline | Ethereal Flame | BullMQ queue status | /ethereal-flame/pipeline | — (view only) |
| Bill Due | Personal | Notion Subscriptions DB | /personal/bills | Mark paid |
| Compliance | Satori/Entity | compliance calendar | /satori/compliance | — (view only) |
| Daily Compliance | Reset Bio | aggregated daily % | /reset-biology | — (view only) |
| Portfolio P&L | Visopscreen | portfolio store | /visopscreen/portfolio | — (view only) |

Default pinned widgets on first launch (Personal domain active): Habit Streak + Bill Due.
As domains activate, Jarvis suggests relevant widgets: "You activated Reset Biology — pin the Next Dose widget to Home?"

**Home card data sources and health rules:**

| Domain | Health Metric | Red | Amber | Green | Gray |
|--------|-------------|-----|-------|-------|------|
| Personal | Tasks overdue count | >3 overdue | 1-3 overdue | 0 overdue | No tasks |
| Ethereal Flame | Pipeline status | Render failed | Queue backed up | All clear | No active jobs |
| Reset Biology | Daily compliance % | <50% today | 50-80% today | >80% today | No active programs |
| CritFailVlogs | Pipeline status | Render failed | Queue backed up | All clear | No active jobs |
| Visopscreen | Regime confidence | Crisis regime | Regime transition | Stable regime | Market closed |
| Satori Living | Next deadline proximity | Overdue | Due in <7 days | >7 days out | No deadlines |
| Entity Building | Filing status | Overdue filing | Due in <30 days | All current | No filings |

#### PERSONAL LIFE
```
Personal Life /personal
│
├── Dashboard /personal
│   ├── Today's tasks (filtered from Notion Tasks DB, Do Date = today)
│   ├── Habit checklist (from Notion Habits DB + Daily Habits DB)
│   ├── Bills summary (from Notion Subscriptions DB, next due)
│   ├── Calendar preview (next 3 events)
│   └── Quick stats: tasks done today, habit streak, bills paid this month
│
├── Tasks /personal/tasks
│   ├── Inbox (no project assigned)
│   ├── Today (Do Date = today)
│   ├── Upcoming (next 7 days)
│   ├── By Project (grouped by Notion Project relation)
│   └── Completed (recently done, for satisfaction)
│   Data: Notion Tasks DB (81802093...)
│   Actions: create, edit status, set priority, set dates, assign project
│   Notifications: task overdue, task due today (morning briefing)
│
├── Habits /personal/habits
│   ├── Today's checklist (which habits to do today based on frequency)
│   ├── Streak dashboard (current streaks per habit)
│   ├── Weekly view (habit completion grid, like GitHub contributions)
│   └── Manage habits (create, edit frequency, archive)
│   Data: Notion Habits DB (23402093...) + Daily Habits DB (80a02093...)
│   Actions: mark complete, view history, create habit
│   Notifications: habit reminder (configurable time)
│
├── Bills & Finance /personal/bills
│   ├── Upcoming bills (sorted by due date)
│   ├── Paid this month
│   ├── Budget overview (from Notion Budgets DB)
│   ├── Income vs Expenses (from Notion Income + Expenditure DBs)
│   └── Subscriptions list (recurring bills)
│   Data: Notion Subscriptions DB + Budgets + Income + Expenditure + Financial Years
│   Actions: mark paid, add bill, view budget
│   Notifications: bill due in 3 days, bill overdue
│
├── Calendar /personal/calendar
│   ├── Day view (today's schedule)
│   ├── Week view
│   └── Upcoming events list
│   Data: Notion-backed (or future: Google Calendar integration)
│   Actions: view, quick-add event
│   Notifications: event reminders
│
├── Journal /personal/journal
│   ├── Today's entry (create or edit)
│   ├── Past entries (by date)
│   └── Mood trends (if tracking mood)
│   Data: Notion Journal DB
│   Actions: create entry, edit, browse
│   Notifications: evening journal prompt
│
├── Goals & Planning /personal/goals
│   ├── Active goals (from Notion Goals DB)
│   ├── Goal progress (linked to projects/tasks)
│   ├── Wheel of Life (Notion Wheel of Life DB — life balance radar)
│   └── Annual themes (from Notion Years DB)
│   Data: Notion Goals + Years + Wheel of Life + Dream Setting + Fear Setting
│   Actions: view progress, update goals
│   Notifications: weekly goal check-in
│
└── Health & Wellness /personal/health
    ├── Workout summary (from Notion Workout Sessions + Weights/Cardio)
    ├── Meal overview (from Notion Weekly Meal Plan + Recipes)
    ├── Fitness records (PRs from Notion Fitness Records)
    └── Cross-link to Reset Biology (if active)
    Data: Notion Tracking cluster (10 DBs)
    Actions: view, log (or redirect to Reset Bio for detailed logging)
    Notifications: none (Reset Bio handles detailed health notifications)
```

#### ETHEREAL FLAME
```
Ethereal Flame /ethereal-flame
│
├── Dashboard /ethereal-flame
│   ├── Pipeline status (jobs in queue, rendering, complete, failed)
│   ├── Latest published (last 3 videos with view counts)
│   ├── Upcoming scheduled (next 3 publications)
│   └── Quick stats: videos this week, total views, subscriber growth
│
├── Pipeline /ethereal-flame/pipeline
│   ├── Active jobs (rendering now)
│   ├── Queue (waiting)
│   ├── Completed (recent, with links)
│   ├── Failed (errors, retry options)
│   └── Job detail: audio → template → render settings → output
│   Data: Turso render jobs table + R2 storage
│   Actions: retry failed, cancel queued, view output
│   Notifications: render complete, render failed
│
├── Publishing Calendar /ethereal-flame/calendar
│   ├── Calendar view (scheduled publications per platform)
│   ├── List view (upcoming, by platform)
│   ├── Draft shelf (ready but not scheduled)
│   └── Platform filter (YouTube, Shorts, TikTok, Instagram)
│   Data: Creator render packs + publish metadata
│   Actions: schedule, reschedule, publish now
│   Notifications: publication complete, schedule reminder
│
├── Analytics /ethereal-flame/analytics
│   ├── Overview (total views, subs, engagement — all platforms)
│   ├── Per-video performance (views, retention, CTR)
│   ├── Per-platform breakdown
│   ├── Growth trends (sparklines, week-over-week)
│   └── Top performing content
│   Data: YouTube API, Google Sheets logs (future: direct API)
│   Actions: view only (analytics is read-only)
│   Notifications: milestone alerts (100 views, 1K views, etc.)
│
├── Content Library /ethereal-flame/library
│   ├── All rendered content (filterable by template, date, platform)
│   ├── Audio library (uploaded source audio)
│   ├── Template presets (Star Nest presets, render settings)
│   └── Thumbnail gallery
│   Data: R2 storage + Turso metadata
│   Actions: browse, preview, reuse, delete
│   Notifications: none
│
└── Channel Management /ethereal-flame/channels
    ├── YouTube settings (API connection status, channel info)
    ├── TikTok / Instagram settings
    ├── n8n workflow status
    └── Default metadata templates per platform
    Data: Environment variables + n8n status
    Actions: configure, test connection
    Notifications: API token expiry warning
```

#### RESET BIOLOGY
```
Reset Biology /reset-biology
│
├── Dashboard /reset-biology
│   ├── Daily compliance (% of today's tasks complete: doses, workouts, meals, breath)
│   ├── Active programs (which sub-programs user is enrolled in)
│   ├── Gamification: total points, current streaks, daily spinner
│   ├── Quick actions: log dose, log meal, start breathwork, log workout
│   └── Revenue summary (if business view): orders, subscribers, inventory alerts
│
├── Breathwork /reset-biology/breathwork
│   ├── Exercise library (6+ exercises with descriptions)
│   ├── Start session (select exercise → animated breathing guide)
│   ├── Session history (past sessions with stats)
│   └── Daily streak
│   Data: MongoDB BreathExercise + BreathSession (via Reset Bio API)
│   Actions: start session, view history, create custom (admin)
│   Notifications: daily breath reminder (configurable time)
│
├── Exercise /reset-biology/exercise
│   ├── Active protocol (current week, today's session)
│   ├── Pre-workout readiness check (sleep, energy, soreness, mood)
│   ├── Session logger (exercises, sets, reps, weight)
│   ├── Protocol library (available programs)
│   └── Progress (strength gains, consistency)
│   Data: MongoDB WorkoutProtocol + Assignment + Session + CheckIn
│   Actions: log session, complete readiness check, switch protocol
│   Notifications: workout day reminder, deload week suggestion
│
├── Vision Training /reset-biology/vision
│   ├── Current phase (week X of 12, today's exercises)
│   ├── Start daily session
│   ├── Progress (Snellen improvement chart, near point change)
│   ├── Reader stage tracker (0-5)
│   └── N-Back mental training
│   Data: MongoDB VisionProgramEnrollment + VisionSession + VisionProgress + NBackSession
│   Actions: log session, record measurements
│   Notifications: daily vision reminder, phase completion
│
├── Nutrition /reset-biology/nutrition
│   ├── Today's meals (logged meals with macro totals)
│   ├── Macro progress (protein/carbs/fats bars vs targets)
│   ├── Log meal (food search, quick-log, photo/voice AI)
│   ├── Meal plans (active plan with daily targets)
│   └── Trends (weekly macro averages)
│   Data: MongoDB FoodEntry + FoodLog + MealPlan + FoodRef
│   Actions: log meal, search food, create meal plan
│   Notifications: meal logging reminder, macro deficit alert
│
├── Peptides /reset-biology/peptides
│   ├── Active protocols (current peptides, next dose time)
│   ├── Log dose (one-tap: timestamp + confirm dosage)
│   ├── Schedule view (today's doses with times)
│   ├── Protocol management (create, edit, archive)
│   ├── Inventory (supply levels, reorder alerts)
│   ├── Education library (per-peptide research + dosing guides)
│   └── Compliance history (adherence % over time)
│   Data: MongoDB user_peptide_protocols + peptide_doses + Peptide + Product
│   Actions: log dose, create protocol, view education
│   Notifications: dose reminder (push, timezone-aware), low inventory
│
├── Journal /reset-biology/journal
│   ├── Today's entry
│   ├── Mood / weight tracking
│   └── Trends
│   Data: MongoDB JournalEntry
│   Actions: create entry, log mood/weight
│   Notifications: evening journal prompt
│
├── Store & Orders /reset-biology/store
│   ├── Product catalog (admin view)
│   ├── Inventory status (low stock alerts)
│   ├── Recent orders (fulfillment status)
│   ├── Waitlist management
│   └── Revenue metrics
│   Data: MongoDB Product + Order + InventoryTransaction + WaitlistEntry
│   Actions: manage inventory, fulfill orders, manage products
│   Notifications: low stock alert, new order
│
└── Gamification /reset-biology/gamification
    ├── Points dashboard (total, breakdown by activity)
    ├── Streaks (per-activity streaks)
    ├── Daily tasks checklist (unified: did you do peptides, journal, workout, meals, breath?)
    ├── Success deposits (financial stakes)
    └── Referral program (affiliate tracking)
    Data: MongoDB GamificationPoint + DailyTask + SuccessDeposit + VariableReward + AffiliateTracking
    Actions: view progress, claim rewards
    Notifications: streak at risk, daily spinner available
```

#### CRITFAILVLOGS
```
CritFailVlogs /critfail
│
├── Dashboard /critfail
│   (Mirrors Ethereal Flame structure — same pipeline, different presets)
│
├── Pipeline /critfail/pipeline
├── Publishing Calendar /critfail/calendar
├── Analytics /critfail/analytics
├── Content Library /critfail/library
└── Channel Management /critfail/channels

Data: Same infrastructure as Ethereal Flame (BullMQ + R2 + Turso)
      with CritFailVlogs-specific channel presets and metadata templates
Status: Hidden by default (activate when ready to build channel)
```

#### VISOPSCREEN
```
Visopscreen /visopscreen
│
├── Dashboard /visopscreen
│   ├── Regime badge (current archetype + confidence %)
│   ├── Today's top screener picks (if scan ran)
│   ├── Portfolio P&L summary (if positions entered)
│   ├── Recent alerts
│   └── Quick link: "Open full Visopscreen" (external link to standalone app)
│
├── Regime /visopscreen/regime
│   ├── Current regime (archetype, confidence, entropy, feature tier)
│   ├── Regime timeline (30-day history with transitions)
│   ├── Posterior probabilities (bar chart of all 5 archetypes)
│   └── Policy recommendations (activated/suppressed screeners)
│   Data: Visopscreen /api/regime-status endpoint
│   Actions: view only (regime is computed, not user-controlled)
│   Notifications: regime transition alert
│
├── Screener Results /visopscreen/screener
│   ├── Latest scan results (top 10 winners by score)
│   ├── Per-screener breakdown (which screeners found what)
│   ├── Winner cards (strike, P&L, metrics, regime context)
│   └── Historical scans (past day, past week)
│   Data: Visopscreen /api/cron/daily-scan results (R2 storage)
│   Actions: view, filter, sort
│   Notifications: daily scan complete, exceptional opportunity found
│
├── Portfolio /visopscreen/portfolio
│   ├── Open positions (manually entered initially)
│   ├── Daily P&L tracking
│   ├── Position management (add, close, adjust)
│   └── Performance history
│   Data: Future — localStorage or Turso (not yet built)
│   Actions: add position, mark closed, view P&L
│   Notifications: max loss breach, 70% profit target hit
│   Status: Placeholder (built in future wave)
│
└── Alerts /visopscreen/alerts
    ├── Alert log (all triggered alerts with timestamps)
    ├── Alert rules (configurable thresholds)
    └── Email/push preferences for trading alerts
    Data: Visopscreen notification config
    Actions: configure rules, view history
    Notifications: per rule configuration
```

#### SATORI LIVING
```
Satori Living /satori
│
├── Dashboard /satori
│   ├── Compliance status (next filing, days remaining, status color)
│   ├── Active programs (PINNACLE/CATALYST enrollment count)
│   ├── Research projects status
│   └── Quick actions: view calendar, check compliance
│
├── Compliance Calendar /satori/compliance
│   ├── Calendar view (all filing deadlines, audit dates, renewals)
│   ├── List view (sorted by urgency)
│   ├── Filing types: IRS 990, state registration, ACCME, insurance, contracts
│   ├── Status per filing: upcoming / due soon / overdue / complete
│   └── Document attachments (link to filed documents)
│   Data: New — needs Turso table or Notion DB for compliance items
│   Actions: add deadline, mark complete, set reminder, attach document
│   Notifications: filing due in 30 days, 7 days, overdue
│
├── Programs /satori/programs
│   ├── PINNACLE enrollments (if/when customers exist)
│   ├── CATALYST enrollments
│   ├── Course enrollments (education hub)
│   └── Revenue metrics
│   Data: Future — Satori website backend (when built)
│   Actions: view enrollments
│   Status: Placeholder until Satori backend exists
│
└── Research /satori/research
    ├── Active projects (title, PI, status, funding)
    ├── Publication tracking
    └── Impact metrics
    Data: Future — research project database
    Status: Placeholder
```

#### ENTITY BUILDING
```
Entity Building /entity
│
├── Dashboard /entity
│   ├── Entity health summary (credit scores, filing status)
│   ├── Next milestone
│   └── Compliance overview
│
├── Entity Health /entity/health
│   ├── Business credit scores (D&B, Experian)
│   ├── Payment history
│   ├── Credit line tracking
│   └── Improvement recommendations
│   Data: New — needs manual entry or API integration
│   Actions: update scores, log payments
│   Notifications: score change, payment due
│   Status: Placeholder (manual entry first, API later)
│
├── Milestones /entity/milestones
│   ├── Credit building checklist (step-by-step)
│   ├── Completed milestones
│   └── Next actions
│   Data: New — task-like structure (could use Notion or Turso)
│   Actions: mark complete, add milestone
│   Status: Placeholder
│
└── Compliance /entity/compliance
    ├── Filing calendar (shares pattern with Satori compliance)
    ├── Tax planning
    └── State registrations
    Data: Shares compliance calendar pattern with Satori
    Actions: same as Satori compliance
    Notifications: same pattern
```

---

## SECTION 3: SCREEN ARCHITECTURE

### Screen Types

**Type 1: Priority Home** (the command center)
```
┌─────────────────────────────────────────┐
│ [Logo]  Jarvis    [🔍] [🔔 3] [⚙️]     │  ← Header (always visible)
├─────────────────────────────────────────┤
│ [🏠] [🔥] [🧬] [📊] [🎲] [⛩️] [🏗️]    │  ← Domain rail (active domains only)
├─────────────────────────────────────────┤
│                                         │
│  ┌─ PRIORITY STACK ──────────────────┐  │
│  │ 🔴 Pay electric bill (2 days over) │  │  ← Urgent items from ALL domains
│  │ 🟡 BPC-157 dose due at 2pm       │  │     Colored by urgency
│  │ 🟡 Vision training today         │  │     Tap → detail, swipe → dismiss
│  │ 🟢 3 tasks due today             │  │
│  │ 🔵 Render complete: meditation#42│  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ DOMAIN HEALTH ───────────────────┐  │
│  │ ┌──────────┐ ┌──────────┐         │  │  ← Bento grid, one card per domain
│  │ │ 🟢 Personal│ │ 🟡 Reset  │         │  │     Status color + key metric
│  │ │ 3 tasks   │ │ 65% today │         │  │     Tap → domain dashboard
│  │ │ 2 habits  │ │ dose due  │         │  │
│  │ └──────────┘ └──────────┘         │  │
│  │ ┌──────────┐ ┌──────────┐         │  │
│  │ │ 🟢 EF     │ │ 🟢 Visop  │         │  │
│  │ │ 2 renders │ │ Compress  │         │  │
│  │ │ queued    │ │ conf: 88% │         │  │
│  │ └──────────┘ └──────────┘         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ QUICK ACTIONS ───────────────────┐  │
│  │ [+ Task] [Log Dose] [Briefing]    │  │  ← Context-aware shortcuts
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│ [🏠] [💬] [📋] [🔔] [⚙️]               │  ← Bottom tab bar (mobile only)
└─────────────────────────────────────────┘
```

**Type 2: Domain Dashboard**
```
┌─────────────────────────────────────────┐
│ [←] Reset Biology    [🔍] [🔔] [⚙️]     │  ← Header with domain name + back
├─────────────────────────────────────────┤
│ [🏠] [🔥] [🧬•] [📊] [🎲] [⛩️] [🏗️]   │  ← Domain rail (current = dot)
├─────────────────────────────────────────┤
│                                         │
│  Daily Compliance: ████████░░ 75%       │  ← Domain KPI (prominent)
│                                         │
│  ┌─ SUB-PROGRAMS ────────────────────┐  │
│  │ [🫁 Breathwork] [💪 Exercise]      │  │  ← Grid of sub-program cards
│  │ [👁️ Vision]     [🥗 Nutrition]     │  │     Each shows mini-status
│  │ [💉 Peptides]   [📔 Journal]       │  │     Tap → sub-program view
│  │ [🏪 Store]      [🎮 Gamification]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ TODAY'S TASKS ───────────────────┐  │
│  │ ☐ Morning BPC-157 dose            │  │  ← Domain-specific task list
│  │ ☑ Breathwork session              │  │
│  │ ☐ Log lunch macros                │  │
│  │ ☐ Vision training (Phase 3, Day 4)│  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│ [🏠] [💬] [📋] [🔔] [⚙️]               │
└─────────────────────────────────────────┘
```

**Type 3: Sub-Program View** (within a domain)
```
┌─────────────────────────────────────────┐
│ [←] Peptides         [🔍] [+]  [⚙️]     │  ← Sub-program header + add action
├─────────────────────────────────────────┤
│                                         │
│  Next dose: BPC-157 250mcg at 2:00 PM  │  ← Prominent next action
│  [LOG DOSE NOW]                         │  ← Primary CTA button
│                                         │
│  ┌─ ACTIVE PROTOCOLS ───────────────┐   │
│  │ BPC-157    250mcg  2x daily  ██░ │   │  ← List of active protocols
│  │ TB-500     2.5mg   2x week   ███ │   │     with compliance bars
│  │ Semaglutide 0.5mg  1x week  ████│   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─ TODAY'S SCHEDULE ───────────────┐   │
│  │ 08:00  BPC-157 250mcg    ☑ Done │   │
│  │ 14:00  BPC-157 250mcg    ☐ Due  │   │
│  │ 20:00  TB-500 2.5mg      ☐ Later│   │
│  └──────────────────────────────────┘   │
│                                         │
│  [View Education] [Inventory] [History] │  ← Secondary navigation
│                                         │
└─────────────────────────────────────────┘
```

**Type 4: Detail View** (any individual item)
```
┌─────────────────────────────────────────┐
│ [←] BPC-157 Protocol     [⋮]           │  ← Item header + overflow menu
├─────────────────────────────────────────┤
│                                         │
│  Protocol: BPC-157 (Healing)            │
│  Dosage: 250mcg subcutaneous            │
│  Frequency: 2x daily (08:00 + 20:00)   │
│  Started: Feb 10, 2026                  │
│  Compliance: 92% (23/25 doses)          │
│                                         │
│  ┌─ DOSE HISTORY ───────────────────┐   │
│  │ Feb 25  08:00  250mcg  ☑         │   │
│  │ Feb 24  20:00  250mcg  ☑         │   │
│  │ Feb 24  08:00  250mcg  ☒ missed  │   │
│  │ Feb 23  20:00  250mcg  ☑         │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─ NOTES ──────────────────────────┐   │
│  │ Slight redness at injection site  │   │
│  │ on Feb 22. Resolved in 2 hours.   │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [Edit Protocol] [Archive] [Education]  │
│                                         │
└─────────────────────────────────────────┘
```

**Type 5: Chat (Overlay / Full-Screen)**
```
Mobile: bottom sheet that slides up to ~90% height
Desktop: right panel (collapsible, ~400px) OR full-screen toggle

Chat is accessible from ANYWHERE via:
- Bottom tab "Chat" icon (mobile)
- Cmd+Shift+C (desktop)
- Voice button (always visible in header on mobile)

Chat is contextual:
- If viewing Reset Bio peptides → chat knows you're in peptide context
- "What's my BPC compliance?" works because context is injected
- Tutorial mode: chat becomes step-by-step guide with laser pointer
```

**Type 6: Action Sheet (Quick Input)**
```
Mobile: bottom sheet (slides up ~40% height)
Desktop: modal (centered, max-w-md)

Triggered by:
- "+" button
- Quick action bar items
- Command palette actions
- Voice command results

Examples:
- Log Dose: select protocol → confirm dosage → timestamp → done
- Quick Task: title → optional project → optional date → done
- Log Meal: search food OR photo → macros auto-filled → done
- Mark Paid: select bill → confirm → done

Design: minimal fields, large tap targets, auto-dismiss on completion
```

**Type 7: Empty State (No Data Yet)**
```
Every screen must define its empty state. This is NOT an edge case — it's the
FIRST thing a user sees when activating a new domain.

Pattern: Illustration + Explanation + Single CTA

┌─────────────────────────────────────────┐
│                                         │
│              [illustration]              │
│                                         │
│         No peptide protocols yet         │
│                                         │
│    Track your peptide dosing schedule    │
│    and never miss a dose again.         │
│                                         │
│        [+ Create First Protocol]        │
│                                         │
└─────────────────────────────────────────┘

Rules:
- Illustration is domain-themed (not generic)
- Explanation is 1-2 sentences: what this screen WILL show
- CTA is the obvious first action (create, import, connect)
- No "empty table" or blank grids — always a purposeful empty state
- Domain dashboards with empty sub-programs show setup cards:
  "Set up Breathwork" / "Set up Peptides" / etc.
```

**Empty State Variants:**

| Context | Empty State | CTA |
|---------|------------|-----|
| Domain just activated | Welcome card + setup checklist | "Complete setup" |
| Sub-program no data | Illustration + what it does | "Create first [item]" |
| Task list empty | Celebration message | "Add a task" or "Enjoy the quiet" |
| Search no results | "No results for X" | Suggest broadening search |
| Home no priorities | "All clear" with last briefing | "Open a domain" |
| Widget no data | Grayed mini-card | "Set up [domain]" |

**Type 8: Error State (Something Broke)**
```
When an API call fails, a proxy times out, or a domain's backend is unreachable.

Pattern: Stale Data Banner + Retry + Explain

┌─────────────────────────────────────────┐
│ ⚠️ Reset Biology data unavailable        │
│    Last updated 3 hours ago.  [Retry]   │
├─────────────────────────────────────────┤
│                                         │
│  (Show last cached data, grayed out)    │
│                                         │
│  Daily Compliance: ████████░░ 75%       │
│  (as of 3 hours ago)                    │
│                                         │
└─────────────────────────────────────────┘

Rules:
- NEVER show a blank screen on API failure — always show stale cached data
- Banner at top explains what's wrong + when data was last fresh
- Retry button for manual refresh
- Domain health card on Home: show amber status + "stale" indicator
- Quick actions that require live API: disabled with tooltip "Offline — try later"
- If no cached data exists at all (first load failed): fall back to empty state + error banner
- Error details in console, not in UI (user doesn't need stack traces)
```

**Error Escalation:**
```
API timeout (5s)  → Show cached data + stale banner
Retry fails (x3)  → Domain health card turns amber + "unreachable"
Sustained failure  → Sentinel reports (if active) OR notification after 1 hour
                     "Reset Biology backend appears down — last contact 1hr ago"
```

### Where Chat Lives

Chat is a **contextual overlay**, not a dedicated screen. It's always one tap away but never blocks the current view unless the user wants full-screen conversation.

```
Mobile:
  Bottom tab "Chat" icon → bottom sheet (slides up)
  Voice button in header → auto-transcribe → chat processes → TTS response
  Tapping outside or swiping down → dismisses chat, preserves conversation

Desktop:
  Right sidebar panel (toggleable, ~400px)
  OR Cmd+Shift+C for full-screen chat mode
  Chat panel coexists with main content (split view)
```

Chat receives context injection:
- Current domain and sub-view
- Current tutorial lesson (if in teach mode)
- Recent user actions
- Active behavioral rules (from self-improvement)
- Memory facts (cross-session)

---

## SECTION 4: CROSS-DOMAIN DATA FLOWS

### Flow Registry

```
Flow 1: Peptide Dose → Personal Task Completion
  Source: Reset Biology (peptide_doses logged)
  Destination: Notion Tasks DB (daily "Log peptides" task)
  Trigger: Automatic on dose log
  Direction: One-way (RB → Notion)
  Priority: Background, non-blocking
  Implementation: Post-hook in dose log API → Notion update

Flow 2: Workout Session → Personal Fitness Tracking
  Source: Reset Biology (WorkoutSession logged)
  Destination: Notion Workout Sessions DB + Weights/Cardio Logs
  Trigger: Automatic on session completion
  Direction: One-way (RB → Notion)
  Priority: Background
  Implementation: Post-hook in session log → Notion create

Flow 3: Nutrition Log → Personal Health Overview
  Source: Reset Biology (FoodLog entries)
  Destination: Personal health dashboard (aggregated macros)
  Trigger: On meal log
  Direction: One-way
  Priority: Background
  Implementation: API aggregation at dashboard render time

Flow 4: Ethereal Flame Render → CritFailVlogs Pipeline
  Source: Ethereal Flame (BullMQ render queue)
  Destination: CritFailVlogs (same queue, different presets)
  Trigger: User-initiated (choose which channel when creating job)
  Direction: Shared infrastructure
  Priority: User-controlled
  Implementation: Channel preset selector in render job creation

Flow 5: All Domains → Priority Stack (Home)
  Source: Every active domain
  Destination: Priority Home command center
  Trigger: On home screen load + periodic refresh (60s)
  Direction: Many-to-one aggregation
  Priority: Foreground (this IS the home screen)
  Implementation: Aggregation API endpoint that queries:
    - Notion Tasks (overdue + due today)
    - Notion Subscriptions (bills due)
    - Reset Bio protocols (doses due)
    - Visopscreen regime (if transition occurred)
    - Ethereal Flame pipeline (failures)
    - Satori/Entity compliance (approaching deadlines)
  Sorting: urgency score = overdue(100) > due_today(80) > due_soon(60) > info(20)

Flow 6: All Domains → Briefing Assembly
  Source: Every active domain
  Destination: Briefing card on Home + Chat (when briefing requested)
  Trigger: Scheduled (morning 7am, midday 12pm, evening 8pm) or on-demand
  Direction: Many-to-one aggregation
  Priority: Scheduled background job
  Implementation: Briefing API assembles from:
    - Personal: tasks, habits, calendar, bills
    - Reset Bio: compliance %, upcoming doses, workout scheduled
    - Ethereal Flame: pipeline status, publishing schedule
    - Visopscreen: regime status, market summary
    - Satori/Entity: upcoming deadlines
  Format: Structured JSON → rendered in briefing card + spoken via TTS

Flow 7: All Domains → Notification Pipeline
  Source: Every active domain (events)
  Destination: Unified notification system
  Trigger: Event-driven (real-time)
  Direction: Many-to-one
  Priority: Per-notification priority level
  Implementation: See Section 5

Flow 8: Visopscreen Regime → Trading Alerts
  Source: Visopscreen HMM regime detection
  Destination: Notification pipeline → push/email/Telegram
  Trigger: Regime transition detected
  Direction: One-way
  Priority: Important (not critical — market is not life-threatening)
  Implementation: Regime status API polled hourly; on archetype change → alert

Flow 9: Reset Bio Revenue → Financial Overview
  Source: Reset Biology Stripe (Order table)
  Destination: Personal bills & finance (revenue integration)
  Trigger: On dashboard load (aggregation query)
  Direction: One-way (RB → Personal financial view)
  Priority: Background
  Implementation: API query to Reset Bio orders + Stripe data

Flow 10: Content Analytics → Multi-Channel Summary
  Source: YouTube API, Google Sheets (Ethereal Flame + CritFailVlogs)
  Destination: Content domain dashboards
  Trigger: Periodic (every 6 hours) or on-demand
  Direction: External → Internal
  Priority: Background
  Implementation: Scheduled API fetch → cache in Turso/memory

Flow 11: Compliance Deadlines → Priority Stack
  Source: Satori Living compliance calendar + Entity Building compliance
  Destination: Priority Home (urgent items)
  Trigger: Daily check (morning)
  Direction: One-way
  Priority: Elevated when deadline < 7 days
  Implementation: Compliance query → urgency scoring → priority stack

Flow 12: Self-Improvement Rules → All Chat Interactions
  Source: Jarvis behavior_rules table (Turso)
  Destination: System prompt for every chat interaction
  Trigger: On every chat message (rules loaded from DB)
  Direction: Background injection
  Priority: Always active
  Implementation: Already built (Phase D) — rules injected into system prompt

Flow 13: Tutorial Context → Chat
  Source: notionPanelStore (current lesson, step)
  Destination: Chat system prompt
  Trigger: When user is in tutorial mode and sends a message
  Direction: One-way state injection
  Priority: Foreground (affects response quality)
  Implementation: Partially built (Phase C) — needs wiring in new UI

Flow 14: Sentinel Reports → Claude Review
  Source: Sentinel model (future)
  Destination: Self-improvement reflection loop input
  Trigger: Periodic (sentinel reports hourly, Claude reviews daily)
  Direction: Sentinel → Jarvis memory → Claude reflection
  Priority: Background
  Implementation: Future — sentinel writes to shared data store, reflection loop reads
  Status: Design space only (not built until sentinel exists)
```

---

## SECTION 5: NOTIFICATION & BRIEFING ARCHITECTURE

### Notification Pipeline

```
EVENT SOURCE                    CLASSIFICATION              DELIVERY
─────────────                   ──────────────              ────────
Task overdue          ─┐
Bill overdue          ─┤
Dose due              ─┤        ┌─────────────┐
Compliance deadline   ─┼──────▶ │  CLASSIFIER  │──▶ Critical ──▶ Push + Badge + Sound
Render failed         ─┤        │             │──▶ Important ──▶ In-app badge (batched hourly)
Regime transition     ─┤        │  (rules per │──▶ Routine  ──▶ Notification center only
Screener results      ─┤        │   domain +  │──▶ Info     ──▶ Daily digest
Streak at risk        ─┤        │   type)     │
Render complete       ─┤        └─────────────┘
Analytics milestone   ─┘              │
                                      ▼
                               ┌─────────────┐
                               │  MODE GATE   │
                               │             │
                               │ Focus: crit  │──▶ Only critical gets through
                               │ Active: imp+ │──▶ Critical + Important
                               │ Review: all  │──▶ Everything
                               │ DND: none    │──▶ Nothing (emergency override only)
                               └─────────────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │  CHANNELS    │
                               │             │
                               │ Push (phone) │
                               │ Email        │
                               │ Telegram     │
                               │ In-app badge │
                               │ In-app toast │
                               └─────────────┘
```

### Priority Classification Rules

| Domain | Event | Priority | Channels |
|--------|-------|----------|----------|
| Personal | Task overdue >24h | Critical | Push + in-app |
| Personal | Task due today | Routine | In-app badge |
| Personal | Bill overdue | Critical | Push + email |
| Personal | Bill due in 3 days | Important | In-app |
| Personal | Habit streak at risk | Important | Push |
| Reset Bio | Dose due (within 30min) | Important | Push |
| Reset Bio | Dose missed (>2 hours late) | Critical | Push |
| Reset Bio | Low inventory (<5 doses remaining) | Important | In-app + email |
| Reset Bio | New order received | Routine | In-app |
| Ethereal Flame | Render failed | Important | Push |
| Ethereal Flame | Render complete | Routine | In-app |
| Ethereal Flame | Publication complete | Info | Daily digest |
| Visopscreen | Regime transition | Important | Push + email |
| Visopscreen | Exceptional screener result | Important | Push |
| Visopscreen | Daily scan complete | Routine | In-app |
| Satori | Compliance deadline <7 days | Critical | Push + email |
| Satori | Compliance deadline <30 days | Important | In-app |
| Entity | Filing deadline <7 days | Critical | Push + email |

### Notification Modes (Auto-Switching)

```
FOCUS MODE (At hospital — 6am to 6pm weekdays)
  Only: Critical notifications
  Delivery: Silent push (no sound), badge only
  Reasoning: Between patients, can glance at phone but can't engage deeply
  Auto-trigger: Calendar shows "Hospital" OR time-based schedule

ACTIVE MODE (Available — evenings, weekends)
  Only: Critical + Important
  Delivery: Full push with sound for critical, silent for important
  Reasoning: Has time to act on important items

REVIEW MODE (Dedicated Jarvis time — user-activated)
  All: Everything including routine and info
  Delivery: Full in-app experience, digests, analytics
  Reasoning: Sitting down to manage everything

DND MODE (Sleeping — 10pm to 6am)
  Nothing except: Emergency override (defined as: compliance deadline TODAY)
  Reasoning: Sleep is sacred
```

User configures schedules in Settings → Notifications → Mode Schedule.
Modes can be manually toggled (override automatic switching).

### Briefing Architecture

```
MORNING BRIEFING (7:00 AM — before hospital shift)
  ┌─ Personal ─────────────────────────────┐
  │ Tasks due today: 5 (1 overdue from yesterday)
  │ Habits to complete: journal, breathwork, workout
  │ Bills: electric due in 2 days
  └────────────────────────────────────────┘
  ┌─ Reset Biology ────────────────────────┐
  │ Doses today: BPC-157 (8am, 8pm), TB-500 (8am)
  │ Workout: Chest/Back (Protocol Week 4, Session 2)
  │ Vision: Phase 3, Day 4 exercises ready
  └────────────────────────────────────────┘
  ┌─ Ethereal Flame ───────────────────────┐
  │ Pipeline: 2 renders complete overnight, 1 publishing at 10am
  └────────────────────────────────────────┘
  ┌─ Visopscreen ──────────────────────────┐
  │ Regime: Compression (conf: 88%) — no change
  │ Yesterday's scan: 3 winners (best: BWB ROC 11.2%)
  └────────────────────────────────────────┘
  ┌─ Compliance ───────────────────────────┐
  │ Satori: 990 filing due in 45 days
  │ Entity: No upcoming deadlines
  └────────────────────────────────────────┘

MIDDAY CHECK-IN (12:00 PM — lunch break)
  Progress: 2/5 tasks done, BPC morning dose logged, breathwork done
  Upcoming: TB-500 8pm dose, evening workout
  Alerts: Ethereal Flame render #43 failed (retry available)

EVENING WRAP (8:00 PM — end of day)
  Completed today: 4/5 tasks, 3/4 doses, workout done, meals logged
  Tomorrow preview: 3 tasks, BPC+TB-500 doses, rest day (no workout)
  Weekly progress: 78% overall compliance, 12-day habit streak

WEEKLY REVIEW (Sunday 7:00 PM — retrospective + planning)
  ┌─ Trends Across All Domains ──────────────────────┐
  │ Overall compliance: 82% (↑ from 75% last week)   │
  │ Habit streak: 12 days (longest: 18)              │
  │ Tasks completed: 28/35 (80%)                     │
  │ Doses logged: 13/14 (93%)                        │
  │ Meals logged: 18/21 (86%)                        │
  └──────────────────────────────────────────────────┘
  ┌─ Domain Highlights ──────────────────────────────┐
  │ Ethereal Flame: 4 videos published, +127 views   │
  │ Reset Biology: perfect peptide week, missed 1     │
  │   evening workout                                 │
  │ Visopscreen: regime stable (Compression), 8       │
  │   winners identified, 0 trades taken              │
  │ Personal: 2 bills paid on time, journal 5/7 days  │
  │ Satori: 990 filing deadline in 38 days            │
  └──────────────────────────────────────────────────┘
  ┌─ Self-Improvement Insights ──────────────────────┐
  │ Pattern detected: evening doses missed on         │
  │   hospital days (3/4 misses were weekday evenings) │
  │ Suggestion: "Move 8pm BPC dose to 6:30pm for     │
  │   weekdays? You're usually home by then."         │
  │                                                    │
  │ Win: morning routine compliance hit 95% this week  │
  │ Behavioral rule applied: "Congratulate streaks"    │
  └──────────────────────────────────────────────────┘
  ┌─ Next Week Preview ─────────────────────────────┐
  │ Monday: Chest/Back workout, 3 scheduled publishes │
  │ Wednesday: TB-500 dose day, Satori board meeting  │
  │ Friday: Bill due (internet), Vision Phase 3 ends  │
  └──────────────────────────────────────────────────┘
```

The Weekly Review is where the self-improvement loop (Phase D) meets the UI.
- The review surfaces patterns the evaluator detected during the week
- Jarvis suggests concrete action changes based on behavioral analysis
- User can accept/reject suggestions directly in the review card
- Review data feeds back into the reflection loop as input
- This is the "second brain" moment: not just tracking, but *understanding*

Weekly Review is accessible via:
1. Auto-generated briefing card on Sunday evening (pushed to Home)
2. Chat: "weekly review" or "how'd I do this week"
3. Dedicated route: /review (redirects to latest weekly review)
4. Notification: "Your weekly review is ready" (Active mode, Sunday 7pm)

Briefings delivered via:
1. Briefing card on Home screen (auto-refreshed)
2. Chat response when user says "briefing" or "what's up"
3. Push notification with summary (if in Active mode)
4. TTS spoken summary (if voice enabled)

### Notification Aggregation Rules

- **Batch by domain:** "Reset Biology: 3 updates" instead of 3 separate notifications
- **Collapse similar:** Multiple task reminders → "5 tasks due today"
- **Rate limit:** Max 5 push notifications per hour (except Critical)
- **Smart timing:** Don't notify for a task due at 5pm at 8am — notify at 4pm
- **Acknowledge cascade:** Dismissing a domain's notifications clears all non-critical for that domain

---

## SECTION 6: SENTINEL INTEGRATION ARCHITECTURE

### Design Principle: Additive, Not Required
The entire system works without the sentinel. The sentinel adds continuous monitoring as an enhancement layer. Every feature described here has a "without sentinel" fallback.

### Monitoring Hooks Per Domain

| Domain | What Sentinel Monitors | Frequency | Without Sentinel |
|--------|----------------------|-----------|-----------------|
| Personal | Task deadlines, habit streaks, bill due dates | Every 15 min | Briefing-only (3x daily) |
| Reset Bio | Dose schedule adherence, workout compliance | Every 15 min | Push reminders (cron-based) |
| Ethereal Flame | Render queue health, publishing schedule | Every 30 min | Manual check + n8n webhooks |
| Visopscreen | Regime status, scan results | Every 60 min | Daily cron scan only |
| Satori | Compliance calendar deadlines | Every 24 hours | Manual calendar check |
| Entity | Filing deadlines | Every 24 hours | Manual calendar check |

### Sentinel → UI Surface

```
Status Indicator (Header)
  🟢 Sentinel active (last heartbeat: 2 min ago)
  🟡 Sentinel delayed (last heartbeat: >15 min ago)
  🔴 Sentinel offline
  ⚪ Sentinel not configured

  Without sentinel: indicator hidden, system works on scheduled checks
```

### Sentinel → Notification Pipeline
Sentinel injects events into the same notification pipeline as everything else. It doesn't have its own notification channel — it generates the same event types that would otherwise come from scheduled checks, but with higher frequency and richer context.

```
Sentinel detects: "User hasn't logged BPC-157 dose, 2 hours past scheduled time"
Sentinel creates: notification event (type: dose_missed, priority: Critical)
Pipeline handles: delivery per user's mode and channel preferences
```

### Claude → Sentinel Instructions
```
Daily at midnight, Claude reflection loop generates:
{
  "monitoring_priorities": [
    { "domain": "reset-bio", "focus": "peptide_compliance", "threshold": "2_hours_late" },
    { "domain": "personal", "focus": "bill_payments", "threshold": "3_days_before" },
    { "domain": "visopscreen", "focus": "regime_changes", "threshold": "any_transition" }
  ],
  "notification_rules": [
    { "if": "missed_2_consecutive_doses", "then": "escalate_to_critical" },
    { "if": "streak_at_risk_and_after_6pm", "then": "gentle_reminder" }
  ],
  "behavioral_observations": [
    "User tends to forget evening doses on hospital days — extra reminder at 7:30pm"
  ]
}
```

### Sentinel Instruction Viewer (Settings)
```
Settings → Sentinel
  ├── Status: Active / Offline
  ├── Last heartbeat: 2 min ago
  ├── Current instructions (read-only, set by Claude):
  │   └── [list of monitoring priorities and rules]
  ├── Override: pause sentinel (manual toggle)
  └── Logs: recent sentinel actions (what it checked, what it flagged)
```

---

## SECTION 7: STATE MANAGEMENT STRATEGY

### Architecture: Domain-Scoped Zustand Stores

```
stores/
├── homeStore.ts          → Priority stack, domain health cards, briefing
├── navigationStore.ts    → Active domain, route history, context persistence
├── chatStore.ts          → Messages, panel state, context injection
├── notificationStore.ts  → Notification queue, badge counts, mode
├── settingsStore.ts      → User preferences, feature toggles
│
├── domains/
│   ├── personalStore.ts  → Tasks, habits, bills (cached from Notion)
│   ├── etherealStore.ts  → Pipeline jobs, publishing calendar
│   ├── resetBioStore.ts  → Compliance, active protocols, doses
│   ├── critfailStore.ts  → Pipeline (mirrors etherealStore pattern)
│   ├── visopStore.ts     → Regime, screener results, portfolio
│   ├── satoriStore.ts    → Compliance calendar, programs
│   └── entityStore.ts    → Entity health, milestones
│
└── shared/
    ├── complianceStore.ts → Shared compliance calendar pattern (Satori + Entity)
    └── contentStore.ts    → Shared content pipeline pattern (EF + CritFail)
```

### Data Fetching Strategy

```
HOME SCREEN (Priority):
  - Fetch all domain health in parallel (Promise.all)
  - Cache for 60 seconds (stale-while-revalidate)
  - Priority stack: server-aggregated API endpoint

DOMAIN DASHBOARDS:
  - Fetch domain data on navigation (not pre-loaded for all domains)
  - Cache indefinitely until invalidated by user action
  - Background refresh when returning to a domain after >5 minutes

DETAIL VIEWS:
  - Fetch on demand
  - No caching (always fresh for individual items)

CROSS-DOMAIN QUERIES:
  - Briefing: server-assembled (single API call returns all domain data)
  - Notification: real-time via SSE (Server-Sent Events) or polling
```

### Optimistic Updates
For quick actions (mark task done, log dose, mark bill paid):
1. Update UI immediately (assume success)
2. Send API request in background
3. If fails: revert UI, show error toast
4. If succeeds: confirm silently

### Offline Considerations
- Priority Home should render from cache even when offline
- Quick actions queue locally if offline, sync when reconnected
- "Last updated X min ago" timestamp visible when data is stale
- Critical for mobile between patients: app must be useful even with spotty connection

### Data Freshness Model (Trust Layer)

The proxy architecture means Jarvis shows data from 5+ sources with different latencies.
A green health card built on 6-hour-old data is a lie. The freshness model ensures the
user always knows how trustworthy what they're seeing is.

**Freshness Tiers:**

| Tier | Age | Visual Indicator | Behavior |
|------|-----|-----------------|----------|
| Live | <1 min | No indicator (default, trusted) | Normal display |
| Recent | 1-15 min | Subtle timestamp: "2 min ago" | Normal display |
| Stale | 15 min - 1 hr | Amber dot + "47 min ago" | Auto-refresh attempted |
| Old | 1-6 hr | Amber banner + grayed data | Manual refresh prompt |
| Unknown | >6 hr or failed | Red banner + "data may be outdated" | Retry button + stale cache |

**Per-Domain Freshness Sources:**

| Domain | Data Source | Expected Freshness | Refresh Trigger |
|--------|-----------|-------------------|----------------|
| Personal | Notion API | Live (on-demand queries) | Page load + 60s SWR |
| Ethereal Flame | Turso + R2 | Live (same infrastructure) | Page load |
| Reset Bio | MongoDB via API proxy | Recent (proxy caches 5 min) | Page load + manual |
| CritFailVlogs | Turso + R2 | Live | Page load |
| Visopscreen | External API | Stale (hourly regime check) | Hourly cron + manual |
| Satori | Turso/Notion | Live (low-frequency data) | Page load |
| Entity | Turso/Notion | Live (low-frequency data) | Page load |

**Home Screen Freshness:**
Each domain health card shows its freshness tier. The Priority Stack items include
source timestamps. If ANY domain card is in Old or Unknown tier, a subtle footer
appears: "Some data may be outdated — pull to refresh all."

**Freshness in Stores:**
Every domain store tracks `lastFetched: Date` alongside its data. The store exposes
a `freshness` getter that returns the tier. Components consume this to render
indicators automatically — no per-component freshness logic.

```typescript
// Pattern for every domain store
interface DomainStoreState {
  data: DomainData | null;
  lastFetched: Date | null;
  error: Error | null;
  freshness: 'live' | 'recent' | 'stale' | 'old' | 'unknown';
}
```

### URL-Based State
Every view is URL-addressable. Sharing a URL opens exactly that view:
- Bookmarkable: `/reset-biology/peptides` goes directly to peptide management
- Restorable: closing and reopening the app returns to last URL
- Linkable: Jarvis can send "check this: /visopscreen/regime" in a notification

---

## SECTION 8: TECHNICAL ROUTING ARCHITECTURE

### Next.js App Router Layout Structure

```
src/app/
├── layout.tsx                    → Root layout (html, body, providers)
├── (jarvis)/                     → Route group for Jarvis UI
│   ├── layout.tsx                → Jarvis shell (header, domain rail, bottom tabs)
│   │                               Wraps ALL Jarvis routes
│   │                               Contains: navigation stores, notification SSE, chat overlay
│   ├── page.tsx                  → Priority Home (/jarvis or /)
│   │
│   ├── chat/
│   │   └── page.tsx              → Full-screen chat mode
│   │
│   ├── settings/
│   │   ├── page.tsx              → Settings overview
│   │   ├── notifications/
│   │   │   └── page.tsx          → Notification preferences
│   │   ├── domains/
│   │   │   └── page.tsx          → Domain activation/management
│   │   └── sentinel/
│   │       └── page.tsx          → Sentinel status/controls
│   │
│   ├── personal/
│   │   ├── layout.tsx            → Personal domain layout (optional domain-level chrome)
│   │   ├── page.tsx              → Personal dashboard
│   │   ├── tasks/
│   │   │   ├── page.tsx          → Tasks list
│   │   │   └── [id]/
│   │   │       └── page.tsx      → Task detail
│   │   ├── habits/
│   │   │   └── page.tsx          → Habits tracker
│   │   ├── bills/
│   │   │   └── page.tsx          → Bills & finance
│   │   ├── calendar/
│   │   │   └── page.tsx          → Calendar view
│   │   ├── journal/
│   │   │   └── page.tsx          → Journal entries
│   │   ├── goals/
│   │   │   └── page.tsx          → Goals & planning
│   │   └── health/
│   │       └── page.tsx          → Health overview
│   │
│   ├── ethereal-flame/
│   │   ├── layout.tsx            → EF domain layout
│   │   ├── page.tsx              → EF dashboard
│   │   ├── pipeline/
│   │   │   └── page.tsx
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── library/
│   │   │   └── page.tsx
│   │   └── channels/
│   │       └── page.tsx
│   │
│   ├── reset-biology/
│   │   ├── layout.tsx
│   │   ├── page.tsx              → RB dashboard
│   │   ├── breathwork/
│   │   │   └── page.tsx
│   │   ├── exercise/
│   │   │   └── page.tsx
│   │   ├── vision/
│   │   │   └── page.tsx
│   │   ├── nutrition/
│   │   │   └── page.tsx
│   │   ├── peptides/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx      → Protocol detail
│   │   ├── journal/
│   │   │   └── page.tsx
│   │   ├── store/
│   │   │   └── page.tsx
│   │   └── gamification/
│   │       └── page.tsx
│   │
│   ├── critfail/
│   │   ├── layout.tsx            → (shares ContentDomainLayout with EF)
│   │   ├── page.tsx
│   │   ├── pipeline/ ...
│   │   ├── calendar/ ...
│   │   ├── analytics/ ...
│   │   ├── library/ ...
│   │   └── channels/ ...
│   │
│   ├── visopscreen/
│   │   ├── layout.tsx
│   │   ├── page.tsx              → Visopscreen dashboard
│   │   ├── regime/
│   │   │   └── page.tsx
│   │   ├── screener/
│   │   │   └── page.tsx
│   │   ├── portfolio/
│   │   │   └── page.tsx
│   │   └── alerts/
│   │       └── page.tsx
│   │
│   ├── satori/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── compliance/
│   │   │   └── page.tsx
│   │   ├── programs/
│   │   │   └── page.tsx
│   │   └── research/
│   │       └── page.tsx
│   │
│   └── entity/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── health/
│       │   └── page.tsx
│       ├── milestones/
│       │   └── page.tsx
│       └── compliance/
│           └── page.tsx
│
├── api/
│   ├── jarvis/                   → Existing Jarvis API routes (chat, briefing, etc.)
│   ├── home/
│   │   ├── priorities/route.ts   → Aggregated priority stack endpoint
│   │   ├── health/route.ts       → All domain health cards endpoint
│   │   └── briefing/route.ts     → Assembled briefing endpoint
│   ├── notifications/
│   │   ├── stream/route.ts       → SSE notification stream
│   │   ├── preferences/route.ts  → User notification prefs CRUD
│   │   └── mode/route.ts         → Get/set notification mode
│   └── domains/
│       ├── personal/route.ts     → Personal data aggregation (Notion queries)
│       ├── ethereal-flame/route.ts
│       ├── reset-biology/route.ts → Proxy to Reset Bio API
│       ├── visopscreen/route.ts  → Proxy to Visopscreen API
│       ├── satori/route.ts
│       └── entity/route.ts
```

### First-Run Experience (Onboarding Flow)

The architecture must define what happens when a user opens Jarvis for the first time
with the new multi-domain UI. This isn't styling — it's structural: what routes exist,
what data is seeded, what state is initialized.

**Route:** `/onboarding` (redirected to on first visit when `user_settings.onboarded = false`)

**Flow:**
```
Step 1: Welcome
  "Welcome to Jarvis — your multi-domain operating system."
  Brief visual showing the domain rail concept.
  [Get Started]

Step 2: Domain Selection
  Grid of all 7 domains with icons, names, and 1-line descriptions.
  Personal Life is pre-selected (cannot deselect — it's the foundation).
  User taps to activate others. Can activate 0 or more additional domains.
  "You can always add more later from Settings → Domains."
  [Continue]

Step 3: Connect Data Sources (per activated domain)
  For each activated domain, a quick connection step:
  - Personal: "Notion is already connected ✓" (existing integration)
  - Reset Biology: "Enter your Reset Biology URL" (API proxy setup)
  - Visopscreen: "Enter your Visopscreen URL" (API proxy setup)
  - Ethereal Flame: "Already connected ✓" (same codebase)
  - Others: "We'll set this up when data sources are ready" (placeholder)
  Skip-able per domain. Incomplete connections → domain shows Setup state.
  [Continue]

Step 4: Home Setup
  Show Priority Home preview with active domains.
  Offer widget selection: "Pin up to 4 widgets to your Home screen."
  Show recommended widgets based on activated domains.
  User can skip (defaults applied).
  [Continue]

Step 5: Notification Preferences
  "When are you at the hospital?"
  Quick schedule picker: hospital hours (auto-sets Focus mode).
  "When do you sleep?"
  Sleep schedule (auto-sets DND mode).
  Default: Focus 6am-6pm weekdays, Active evenings/weekends, DND 10pm-6am.
  [Continue]

Step 6: First Briefing
  Generate and display the first morning-style briefing.
  "Here's what Jarvis knows about right now."
  Shows data from connected domains (even if sparse).
  [Go to Home]
```

**After Onboarding:**
- `user_settings.onboarded = true` — never show again
- Redirect to Priority Home (`/`)
- Domain rail populated with selected domains
- Notification mode schedule active
- If domains were skipped: they appear as Setup state in Settings → Domains

**Route Structure:**
```
/onboarding
├── page.tsx          → Onboarding wizard (step-based, single page with transitions)
└── (no sub-routes — wizard is a single page with internal state)
```

### Shared Layout Components

```
JarvisShell (root layout for all Jarvis routes)
├── Header (logo, search, notifications bell, settings gear)
├── DomainRail (icon strip — horizontal mobile, vertical desktop)
├── ChatOverlay (bottom sheet mobile, side panel desktop)
├── BottomTabBar (mobile only: Home, Chat, Domains, Notifications, Settings)
├── NotificationToast (floating toast for real-time alerts)
└── CommandPalette (Cmd+K modal)
```

### Middleware
```typescript
// src/middleware.ts
// Routes jarvis.whatamiappreciatingnow.com → /jarvis routes
// Routes www.whatamiappreciatingnow.com → / (flame experience)
// Already exists — extend to handle new routes
```

### API Data Proxying Strategy
Reset Biology and Visopscreen have their own backends. Jarvis doesn't duplicate their databases — it proxies read requests through domain-specific API routes:

```
Jarvis UI → /api/domains/reset-biology → Reset Bio MongoDB (read-only)
Jarvis UI → /api/domains/visopscreen → Visopscreen regime API (read-only)
Jarvis UI → /api/domains/personal → Notion API (read/write via existing NotionClient)
```

Write operations for Reset Bio (log dose, log workout) go through Reset Bio's own API endpoints. Jarvis is the *display layer*, not a data duplication layer.

---

## SECTION 9: IMPLEMENTATION WAVE GUIDE

This section maps which parts of the architecture to build in which order, informing E-03 and E-04+ planning.

### Wave 1: Shell + Personal (Foundation)
- Onboarding flow (first-run experience)
- Jarvis shell (header, domain rail, bottom tabs, routing)
- Priority Home with pinnable widget system (widget registry + default widgets)
- Personal dashboard + tasks + habits + bills
- Chat overlay (migrate existing ChatPanel)
- Settings page (feature toggles, domain management, widget management)
- Empty state pattern (illustration + CTA — applied to all Personal screens)
- Error state pattern (stale banner + cached data — applied globally)
- Data freshness model (store pattern with `lastFetched` + freshness tiers)
- Notification foundation (in-app only)

### Wave 2: Content Domains
- Ethereal Flame dashboard + pipeline + publishing calendar
- CritFailVlogs (activate domain, shared layout)
- Content library views
- Content domain widgets (Pipeline Status)
- Empty states for content screens

### Wave 3: Reset Biology Integration
- Reset Bio dashboard
- Sub-program views (breathwork, exercise, vision, nutrition, peptides, journal)
- Cross-domain data flows (dose → task completion, etc.)
- Push notification wiring
- Reset Bio widgets (Next Dose, Daily Compliance)
- Data freshness indicators for proxied MongoDB data

### Wave 4: Investment + Compliance
- Visopscreen dashboard + regime + screener
- Satori Living compliance calendar
- Entity Building placeholders
- Financial convergence view
- Visopscreen widgets (Regime Badge, Portfolio P&L)
- Compliance widgets (Satori/Entity)

### Wave 5: Intelligence + Polish
- Briefing assembly (all domains — morning/midday/evening)
- Weekly Review (retrospective + self-improvement insights + next week preview)
- Quick Capture system (voice/text → NLP classify → route to domain)
- Command palette
- Notification mode system (Focus/Active/Review/DND)
- Tutorial system migration (MCP-B laser pointer)
- Sentinel design space (status indicator, instruction viewer)

---

---

*This architecture is the house. E-03 designs how each room looks. E-04+ builds the rooms.*
*Every navigation, hierarchy, data flow, and notification decision is made here.*
*Changes after this point get progressively more expensive.*

*v1.1 additions: Pinnable Home Widgets, Quick Capture & Route, Weekly Review,*
*First-Run Experience, Empty & Error States, Data Freshness Model.*
