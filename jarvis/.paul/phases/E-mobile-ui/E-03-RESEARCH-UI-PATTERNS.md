# E-03 Research: Multi-Domain UI/UX Patterns for a Personal Operating System

**Research Date:** 2026-02-25
**Purpose:** Identify concrete navigation, dashboard, and interaction patterns for building Jarvis as a 7+ domain personal/business operating system, optimized for a time-constrained professional (12-hour shifts, mobile-first, 30-second scans).

---

## 1. Navigation Paradigms for Multi-Domain Apps

### Pattern 1A: Workspace Switcher (Linear Model)

**Description:** A single top-level container ("workspace") with a dropdown/sidebar switcher to move between workspaces. Within each workspace, a sidebar exposes teams, projects, views. Keyboard shortcuts (`O` then `W`) allow instant switching.

**How Linear does it:**
- Workspace is the top-level container (one per company)
- Teams are the next level (e.g., Engineering, Design, Marketing)
- Projects span multiple teams; Issues belong to one team
- Sidebar shows: joined teams, their views (Backlog, Active, Cycles), plus projects
- Sub-teams (added 2025) mirror org hierarchy
- Command menu (`Cmd+K`) lets you search/navigate anything
- Keyboard: `G` + `I` = Inbox, `G` + `V` = current cycle

**Mobile:** Linear's mobile app uses a simplified sidebar with team switching. 2-3 taps to switch context.

**Pros for Jarvis:**
- Clean mental model: each domain = a workspace or team
- Keyboard-first navigation ideal for desktop power use
- Sub-team hierarchy maps to sub-businesses (e.g., Reset Biology > Eye Healing, Breathwork)

**Cons for Jarvis:**
- Designed for teams, not life domains -- metaphor may not fit
- Workspace switching requires returning to a switcher UI (extra step)
- Mobile experience is secondary to desktop

**Recommendation:** ADAPT -- Use the sidebar-with-sections pattern and keyboard shortcuts, but replace "workspace/team" terminology with "domain/area"

---

### Pattern 1B: Nested Sidebar with Infinite Depth (Notion Model)

**Description:** A left sidebar with a tree of pages that can nest infinitely. Sections include Favorites, Shared, Private. On mobile, accessed via hamburger menu in top-left.

**How Notion does it:**
- Sidebar hierarchy: Workspace name > Search > Favorites > Shared > Private
- Pages nest infinitely (page > sub-page > sub-sub-page)
- Mobile: hamburger menu reveals full sidebar; bottom bar has Home, Search, Inbox, New Page
- Workspace switching on mobile via long-press on workspace icon
- Recent "Notion 3.0" (Sept 2025) added AI agents that navigate across connected tools

**Mobile behavior:** Hamburger menu + bottom nav bar (4 items: Home, Search, Inbox, Create). 2 taps to reach any top-level section. Deeper pages require more taps.

**Pros for Jarvis:**
- Familiar pattern (huge user base)
- Infinite nesting handles arbitrarily deep domain hierarchies
- Favorites pin frequently-accessed items regardless of depth
- Bottom nav bar on mobile keeps core actions one tap away

**Cons for Jarvis:**
- Deep nesting creates navigation disorientation (NNGroup warns: >2 levels degrades usability)
- Sidebar gets cluttered with many top-level items
- Not optimized for "quick scan" -- requires navigating into pages to see content
- Hamburger menu has low discoverability on mobile

**Recommendation:** ADAPT PARTIALLY -- Use sidebar for domain organization, but limit nesting to 2 levels max. Combine with a dashboard home for quick scanning.

---

### Pattern 1C: Workspace + Channel Sidebar (Slack Model)

**Description:** Two-level navigation: (1) workspace switcher rail on far left showing workspace icons, (2) channel sidebar within selected workspace. Users see one workspace's channels at a time.

**How Slack does it:**
- Left rail: vertical strip of workspace icons (one per org)
- Within workspace: sidebar with Channels, DMs, Apps, grouped by section
- Channels can be organized into custom sidebar sections
- Notification badges on workspace icons show unread counts across workspaces
- Keyboard: `Cmd+K` opens quick switcher for channels/DMs

**Mobile:** Workspace icon bar at top; channel list below. Swipe right from conversation to return to channel list. 2 taps to switch workspace + channel.

**Pros for Jarvis:**
- Icon rail provides always-visible domain overview
- Badge counts surface cross-domain urgency at a glance
- Familiar pattern, well-tested at scale
- Two-level model maps perfectly: domain (workspace) > sub-area (channel)

**Cons for Jarvis:**
- Slack's model is communication-centric, not task/dashboard-centric
- Icon rail takes horizontal space on mobile
- Only shows one domain's content at a time (no cross-domain overview)

**Recommendation:** USE (modified) -- The icon rail + content sidebar is the strongest candidate for domain switching. Replace channel list with domain-specific views (dashboard, tasks, settings).

---

### Pattern 1D: Command Palette as Primary Navigation (Superhuman Model)

**Description:** A single keyboard shortcut (`Cmd+K`) opens a searchable command palette that is the primary way to access any feature, navigate anywhere, or execute any action.

**How Superhuman does it:**
- `Cmd+K` is the universal entry point -- accessible from anywhere
- Palette shows every command with its keyboard shortcut alongside
- Users learn shortcuts passively (see them in palette, then memorize)
- Vim-style navigation: J/K for up/down, H/L for left/right
- 50ms response time target -- speed is the product
- White-glove onboarding teaches the palette workflow

**Key design principles (from Superhuman's blog):**
1. One shortcut to rule them all -- never split commands across multiple palettes
2. The palette enables unlimited features without screen real-estate cost
3. Users prefer searching over menu navigation
4. Passive shortcut learning: show the shortcut next to every command

**Mobile:** Command palette translates poorly to mobile -- typing is slower, no keyboard shortcuts. Superhuman mobile relies on gestures and swipe instead.

**Pros for Jarvis:**
- Infinite scalability -- any number of domains/features without UI crowding
- Power users navigate at thought speed
- Perfect for "I know what I want" moments
- Desktop experience is unmatched

**Cons for Jarvis:**
- Mobile-hostile (no hardware keyboard on phone)
- Requires learning curve -- not "glanceable"
- Cannot provide cross-domain overview or quick status scan
- Discoverable only if user knows to press Cmd+K

**Recommendation:** USE AS SECONDARY -- Implement Cmd+K command palette for desktop power navigation, but it cannot be the primary pattern. Combine with visual navigation.

---

### Pattern 1E: Areas + Projects Hierarchy (Things 3 Model)

**Description:** Two-level organizational hierarchy: Areas (permanent life domains) contain Projects (finite, completable goals) which contain Tasks. Areas never "complete" -- they represent ongoing responsibilities.

**How Things 3 does it:**
- Areas: permanent, top-level groupings (Work, Personal, Finance, Health, etc.)
- Projects: time-bound goals living inside Areas (e.g., "Kitchen Renovation" inside "Home")
- Tasks: atomic actions inside Projects or standalone inside Areas
- Sidebar shows: Inbox, Today, Upcoming, Anytime, Someday, then Areas with nested Projects
- "Today" view aggregates urgent tasks across all areas
- Tags add cross-cutting context (e.g., @phone, @errand)

**Real-world usage example:**
- Personal (errands, household)
- Business (operations, marketing, accounting)
- Client Support (maintenance requests)
- Client Projects (active builds)
- Travel (ideas, upcoming plans)
- Routines & Templates (repeating tasks)

**Mobile:** Full-featured iPad/iPhone app. Sidebar on iPad; bottom tab + list views on iPhone. 1-2 taps to any area.

**Pros for Jarvis:**
- Perfect mental model for life domains -- Areas = Jarvis domains
- "Today" view solves the cross-domain priority scan problem
- Clean distinction between permanent areas and temporary projects
- Proven for personal + business organization
- Mobile-first design (Apple Design Award winner)

**Cons for Jarvis:**
- Pure task management -- no dashboard/analytics/monitoring capability
- No "workspace context" switching (all areas visible simultaneously)
- Simple hierarchy insufficient for business intelligence needs
- No notification aggregation or status monitoring

**Recommendation:** USE THE MENTAL MODEL -- "Areas" as permanent domains with "Today" as cross-domain priority view is the strongest conceptual foundation for Jarvis. Layer dashboard/analytics capability on top.

---

### Pattern 1F: Calendar Sets (Fantastical Model)

**Description:** Named groups of calendars that toggle on/off as a unit. Users create "sets" (e.g., "Work", "Personal", "Family") and switch between them to see only relevant events.

**How Fantastical does it:**
- Calendar Sets = named groups of visible/hidden calendars
- One-click switching between sets (or keyboard shortcut)
- Each set has its own default calendar for new events
- Auto-switching by location (arrive at office -> Work set activates)
- Sets can overlap (a calendar can appear in multiple sets)

**Pros for Jarvis:**
- Context-aware auto-switching is brilliant for a time-constrained user
- "Set" concept maps to domain views (show only this domain's data)
- Overlap capability allows cross-domain items to appear where relevant

**Cons for Jarvis:**
- Calendar-specific -- doesn't generalize to tasks/dashboards/analytics
- No hierarchical organization within sets
- Binary show/hide is too simple for complex domain views

**Recommendation:** ADAPT THE AUTO-SWITCHING CONCEPT -- Location/time-based automatic domain context switching is valuable. Apply to Jarvis: morning = personal briefing; at hospital = minimal mode; evening = business review.

---

### Synthesis: Recommended Navigation Architecture for Jarvis

| Layer | Pattern | Source |
|-------|---------|--------|
| Domain switching | Icon rail on left (always visible) | Slack |
| Domain organization | Areas (permanent) > Projects (finite) | Things 3 |
| Within-domain navigation | Sidebar sections with 2-level max nesting | Notion + Linear |
| Power navigation | Cmd+K command palette (desktop) | Superhuman |
| Cross-domain overview | "Today" / priority dashboard home screen | Things 3 + CEO dashboards |
| Context auto-switching | Time/location-based domain defaults | Fantastical |
| Mobile primary | Bottom tab bar (4-5 items) + domain switcher | Notion mobile |

---

## 2. Mobile-First Complex Navigation

### Pattern 2A: Bottom Tab Bar (3-5 Core Actions)

**Description:** Persistent bottom bar with 3-5 icons representing the most important sections. The standard for mobile apps.

**Best practice:** 3-5 items maximum. Beyond 5, use a "More" tab or alternative pattern.

**How banking apps do it:**
- Bottom tabs: Home/Accounts, Transfers, Cards, Investing, More
- Account overview: swipeable cards showing each account
- Drill-down: tap account -> transactions -> detail
- Quick actions: floating action button or prominent transfer button

**Pros for Jarvis:**
- Universally understood pattern
- Always accessible (1 tap)
- Works perfectly for: Home/Dashboard, Chat, Domains, Notifications, Settings

**Cons for Jarvis:**
- 5-item limit means 7+ domains cannot each have a tab
- "More" tab hides important features
- Doesn't solve domain switching

**Recommendation:** USE -- Bottom tab bar for app-level navigation (Dashboard, Chat, Domains, Notifications, Profile/Settings). Domain switching happens within the Domains tab or via icon rail.

---

### Pattern 2B: Hub and Spoke

**Description:** A central home screen (hub) from which users navigate into focused views (spokes). Returning to a different area always requires going back to the hub.

**Best for:** Task-based apps where users focus on one thing at a time. iOS home screen is the canonical example.

**How it works:**
- Hub shows all available domains/sections as cards or icons
- Tap a domain -> enter that domain's focused view
- "Back" or "Home" returns to hub
- No cross-domain navigation without returning to hub

**Pros for Jarvis:**
- Minimal cognitive load -- one domain at a time
- Hub serves as the "30-second scan" dashboard
- Clean mental model for a time-constrained user
- Works well on mobile

**Cons for Jarvis:**
- Extra tap to switch domains (always via hub)
- Hub page is pure navigation chrome, not content
- Poor for users who work across domains simultaneously

**Recommendation:** ADAPT -- Use hub-and-spoke as the MOBILE pattern, with the hub being the priority dashboard. Desktop can use parallel views.

---

### Pattern 2C: Swipeable Context Cards

**Description:** Horizontal swipe to move between top-level contexts. Each swipe reveals a different domain or section.

**How banking apps use it:**
- Swipe between account cards on home screen
- Each card shows balance, recent transactions, quick actions
- Pagination dots indicate position

**Pros for Jarvis:**
- Zero taps to scan multiple domains
- Natural mobile gesture
- Works brilliantly for the "30-second scan" -- swipe through domain status cards

**Cons for Jarvis:**
- Only shows one domain at a time (no overview)
- Users may not discover they can swipe (low discoverability)
- Pagination dots don't scale past 5-7 items
- Gesture conflicts with system navigation on modern phones

**Recommendation:** USE FOR DOMAIN STATUS CARDS -- On the dashboard home screen, show swipeable domain summary cards. Each card = one domain's health at a glance. Combine with pagination dots or domain name strip.

---

### Pattern 2D: Bottom Sheet / Drawer

**Description:** A panel that slides up from the bottom of the screen, revealing additional content or navigation. Can be partially open (peek) or fully expanded.

**Examples:** Apple Maps (drag up for details), Google Maps (bottom sheet with search), iOS share sheet

**Pros for Jarvis:**
- Preserves context -- current view stays visible behind the sheet
- Supports progressive disclosure (peek -> half -> full)
- Natural thumb zone on mobile
- Can house secondary navigation, settings, domain details

**Cons for Jarvis:**
- Not suitable for primary navigation
- Can feel clunky if overused
- Competes with bottom tab bar for space

**Recommendation:** USE FOR DETAIL/ACTION PANELS -- When user taps a notification, task, or domain card, slide up a bottom sheet with details. Keep primary navigation in the tab bar.

---

### Pattern 2E: Adaptive/Responsive Navigation

**Description:** Navigation pattern changes based on screen size. Mobile gets bottom tabs + hamburger; tablet gets sidebar + content; desktop gets full sidebar + command palette + multi-panel.

**Pros for Jarvis:**
- Both desktop and mobile are first-class
- Each form factor gets the optimal pattern
- Single codebase, responsive breakpoints

**Cons for Jarvis:**
- More engineering complexity
- Must design and test three layouts
- State management across breakpoints

**Recommendation:** USE (mandatory) -- Jarvis must be adaptive. The navigation architecture must define mobile, tablet, and desktop layouts.

---

### Synthesis: Mobile Navigation Architecture

```
MOBILE LAYOUT:
+-------------------------------------------+
|  [Domain Icon Rail - horizontal, top]     |  <- Swipe to see all 7+ domains
|  [Active Domain Name]  [Notification Bell]|
+-------------------------------------------+
|                                           |
|  [CONTENT AREA]                           |
|  - Dashboard: swipeable domain cards      |
|  - Domain view: specific domain content   |
|  - Chat: conversation interface           |
|                                           |
+-------------------------------------------+
|  [Home] [Chat] [Domains] [Alerts] [More]  |  <- Bottom tab bar (5 items)
+-------------------------------------------+

TABLET LAYOUT:
+--------+----------------------------------+
| Domain |                                  |
| Icons  |  CONTENT AREA                    |
| (rail) |                                  |
|        |  (wider cards, more visible)     |
| ----   |                                  |
| [+]    |                                  |
+--------+----------------------------------+

DESKTOP LAYOUT:
+--------+----------+----------------------+
| Domain | Sidebar  |                      |
| Icons  | (context)|  MAIN CONTENT        |
| (rail) |          |  (dashboard, domain, |
|        | Views    |   or chat panel)     |
| ----   | Filters  |                      |
| [+]    | Actions  |  [Cmd+K palette]     |
+--------+----------+----------------------+
```

---

## 3. Command Center / Dashboard Patterns

### Pattern 3A: Bento Grid Dashboard

**Description:** A grid of cards ("bento boxes") where each card shows a different metric, chart, or status indicator. Cards are of varying sizes based on importance.

**Used by:** Domo, Geckoboard, ClickUp, Apple's iOS widget grid, most CEO dashboard tools

**Key principles:**
- Limit to 5-6 cards in initial view (cognitive load research)
- Largest cards = most important metrics
- F-pattern or Z-pattern scanning (top-left gets most attention)
- Each card is a self-contained unit with title, metric, trend indicator

**Pros for Jarvis:**
- Each domain gets a card = natural mapping
- Glanceable in <10 seconds
- Supports progressive disclosure (card summary -> tap for detail)
- Responsive: cards reflow on mobile

**Cons for Jarvis:**
- Can feel generic/dashboard-y rather than personal
- 7+ cards requires scrolling, which breaks "single screen" principle
- Hard to show enough detail per domain in a small card

**Recommendation:** USE -- The bento grid is the strongest candidate for the Jarvis home dashboard. Each domain = one card showing health/status. Tap card to enter domain.

---

### Pattern 3B: Priority Stack / "Today" View

**Description:** A single vertical list showing the most important items across all domains, ranked by urgency/importance. Items are pulled from all sources into one prioritized feed.

**Used by:** Things 3 "Today", Apple Reminders "Today", Google Assistant briefings, Notion "My Tasks"

**Algorithm considerations:**
- Overdue items first (red)
- Due today (amber)
- Upcoming deadlines
- Unread notifications by priority
- Stale items needing attention

**Pros for Jarvis:**
- Answers "what matters RIGHT NOW?" in one glance
- Perfect for 30-second scan between patients
- No domain switching needed
- Works on any screen size

**Cons for Jarvis:**
- Requires a priority algorithm (complex to build well)
- Loses domain context (items from different domains interleaved)
- Can become overwhelming if too many items

**Recommendation:** USE -- "Today" / "Priority" view should be the default home screen, above the bento grid. Show top 5-10 items across all domains.

---

### Pattern 3C: Status Indicator Matrix

**Description:** A grid showing the health of each system/domain using color-coded status indicators (green/yellow/red or similar). Military and medical monitoring systems use this pattern extensively.

**Used by:** Palo Alto Cortex XSIAM Command Center, server monitoring dashboards (Datadog, Grafana), hospital bed management boards

**Medical dashboard principles (directly relevant to user context):**
- Clear color cues turn complex data into fast, confident decisions
- Minimize clicks; surface the next logical action
- Design for high-stress, low-time scenarios
- Progress indicators show where you are in a process
- High-contrast, accessibility-first color (never rely on color alone)

**Pros for Jarvis:**
- Instant comprehension: green = fine, yellow = needs attention, red = urgent
- Scales to any number of domains
- The user (anesthesia provider) already thinks in this pattern daily
- Extremely fast to scan

**Cons for Jarvis:**
- Oversimplifies complex states
- Requires clear definitions of what "green" and "red" mean per domain
- Can cause alarm fatigue if too many yellow/red states

**Recommendation:** USE -- Status indicators per domain are essential. Show on the icon rail (colored dots), on dashboard cards (header color/icon), and in the priority stack (urgency tags).

---

### Pattern 3D: CEO Multi-Business Dashboard

**Description:** A single screen showing KPIs from multiple business units with drill-down capability into departmental dashboards.

**Key principles from Atlassian/Domo/ClickUp:**
- Position strategic goals centrally
- Group related metrics (revenue + growth, expenses + budget)
- Drill-down: overview -> department -> detail (3 levels)
- Auto-updating real-time data
- Chart type matching: single-value indicators with trend arrows for KPIs, line charts for trends, bar charts for comparison

**Essential KPI categories per domain:**
- Financial health (revenue, expenses, cash flow)
- Growth metrics (subscribers, views, leads)
- Customer/audience metrics
- Strategic goal progress

**Pros for Jarvis:**
- Directly maps to user's multi-business reality
- Drill-down supports progressive disclosure
- Real-time updates keep dashboard fresh

**Cons for Jarvis:**
- Requires data integrations for each domain (YouTube API, Stripe, etc.)
- Complex to build and maintain
- Overwhelming if all domains shown simultaneously

**Recommendation:** USE SELECTIVELY -- Each domain should have its own KPI dashboard accessible via drill-down. The home view shows only status indicators and top-priority items, not full analytics.

---

### Synthesis: Dashboard Architecture

```
HOME SCREEN (30-second scan):
+-------------------------------------------+
| Good morning, Jonathan.        [gear] [bell]
| 2 items need attention. 4 domains healthy.
+-------------------------------------------+
| PRIORITY STACK (top 5 items)              |
| ! [red]  Reset Bio: SSL cert expires tmrw |
| ! [amber] Entity Building: filing due Fri |
| * [blue]  Ethereal Flame: video scheduled |
| * [gray]  Visopscreen: no updates         |
| * [gray]  Personal: groceries reminder    |
+-------------------------------------------+
| DOMAIN HEALTH (bento grid)                |
| [Ethereal]  [Reset Bio]  [CritFail]      |
| 12.4K subs   $2.1K MRR   3 scripts       |
|  +2.3%        -0.5%      due Fri          |
|                                           |
| [Visop]     [Entity]     [Satori]         |
| $45K port    3 entities   501c3 ok        |
|  +1.2%       1 pending    next: Q2 filing |
|                                           |
| [Personal]                                |
| 3 tasks due  2 habits     next appt 4pm   |
+-------------------------------------------+
```

---

## 4. Notification Aggregation

### Pattern 4A: Unified Notification Center

**Description:** A single in-app location where all notifications from all domains are stored, organized, and accessible. The notification center is the single source of truth.

**Key principles (from Smashing Magazine research):**
- All notifications anchor to one center regardless of source
- Navigate from notification center to the source
- Consolidate multiple notifications into singles (e.g., "3 new YouTube comments" not 3 separate notifications)

**Pros for Jarvis:**
- One place to check everything
- Reduces notification sprawl
- Can show unread count on tab bar icon
- Familiar pattern (iOS/Android notification center)

**Cons for Jarvis:**
- Can become a dumping ground if not well-organized
- Requires grouping/filtering to be useful

**Recommendation:** USE -- Jarvis must have a notification center tab accessible from bottom bar.

---

### Pattern 4B: Smart Batching / Grouped Notifications

**Description:** Instead of individual notifications, group related items and batch them by time or domain.

**How Slack adapts:**
- Silent channels: notify on every message
- Active channels: notify only on @mentions
- Automatic frequency adjustment based on activity level

**Batching strategies:**
- By domain: "Ethereal Flame: 3 updates" (expandable)
- By time: morning digest, evening summary
- By urgency: critical = immediate push, normal = batched, low = digest only

**Pros for Jarvis:**
- Prevents notification overload
- Respects the user's time constraints (12-hour shifts)
- Morning/evening digests align with natural workflow

**Recommendation:** USE -- Implement three tiers: (1) Critical = immediate (SSL expiry, payment failure), (2) Important = batched hourly, (3) Informational = daily digest.

---

### Pattern 4C: Predefined Notification Modes

**Description:** Instead of granular per-notification toggles, offer preset modes that users can switch between.

**Modes for Jarvis:**
- **Focus Mode** (at hospital): Only critical alerts, no domain updates
- **Active Mode** (available): All important notifications, real-time
- **Review Mode** (evening): Full digest, all updates, analytics summaries
- **DND** (sleeping): Nothing except true emergencies

**Auto-switching:** Based on time of day, calendar events, or location (like Fantastical calendar sets).

**Pros for Jarvis:**
- Dramatically reduces notification fatigue
- Auto-switching respects work schedule without manual toggle
- Simple mental model (4 modes vs. 50 individual toggles)

**Recommendation:** USE -- This is essential for an anesthesia provider. Build notification modes that auto-activate based on schedule.

---

### Pattern 4D: Notification Priority Levels

**Description:** Three-tier classification system for all notifications.

**From Smashing Magazine research:**
| Level | Examples | Delivery |
|-------|----------|----------|
| High (red) | Errors, security alerts, payment failures, deadlines <24h | Push notification + badge + sound |
| Medium (amber) | Task due this week, new comment, content published | In-app badge + notification center |
| Low (gray) | Analytics update, FYI, habit completion | Notification center only, daily digest |

**User control:** Users can promote/demote notification types. "Stop showing me YouTube comment notifications as Medium."

**Recommendation:** USE -- Three tiers is the right number. Map every notification type to a tier with user override capability.

---

## 5. Progressive Disclosure for Complex Systems

### Pattern 5A: Domain Activation Pattern

**Description:** Domains start as inactive/empty with an inviting setup flow. Users "activate" a domain when ready, which reveals its full interface.

**How SaaS products do it:**
- Empty state shows explanation + single CTA ("Set up Ethereal Flame")
- Checklist guides through activation steps (connect YouTube, set schedule, etc.)
- Companies using onboarding checklists see 40%+ activation rates (vs 25-30% industry norm)
- Notion's first-use empty state includes a checklist with instructions
- Slack's empty workspace redesign transformed drop-off points into engagement

**For Jarvis (7 domains):**
```
DOMAIN GRID (home screen):
[Ethereal Flame]  [Reset Bio]    [CritFail]
  ACTIVE (live)    ACTIVE (live)   SETUP (3/5)

[Visopscreen]     [Entity Bldg]  [Satori]
  ACTIVE (live)    SETUP (1/5)    INACTIVE

[Personal]
  ACTIVE (live)
```

**Pros for Jarvis:**
- User isn't overwhelmed by 7 domains on day one
- Each domain activates when the user is ready
- Empty states communicate what the domain WILL do (building anticipation)
- Progressive complexity: start with 2-3 domains, grow over time

**Cons for Jarvis:**
- Must design both empty and active states for every domain
- Risk of "I'll set it up later" inertia

**Recommendation:** USE -- This is critical for Jarvis. Start with Personal + Ethereal Flame active, others in "Setup" or "Inactive" state with clear activation paths.

---

### Pattern 5B: Two-Level Disclosure Maximum

**Description:** NNGroup research shows that beyond 2 levels of progressive disclosure, users get lost. Complex apps should limit to: Overview -> Detail (2 levels), not Overview -> Category -> Detail -> Sub-detail.

**For Jarvis:**
- Level 1: Home dashboard (all domains at a glance)
- Level 2: Domain view (full domain with its dashboard, tasks, settings)
- AVOID Level 3: Don't make users drill into sub-pages within domain views

**Exception:** Command palette (Cmd+K) can shortcut to any depth without the user feeling "lost" because they explicitly chose to navigate there.

**Recommendation:** USE -- Strictly limit visual hierarchy to 2 levels. Use command palette and search for deeper access.

---

### Pattern 5C: Contextual Feature Revelation

**Description:** Features and controls appear only when relevant to the current context. Like text formatting options appearing only when text is selected.

**Examples:**
- Domain-specific actions appear only when viewing that domain
- Analytics charts appear after enough data is collected
- Advanced settings reveal via "Show advanced" toggle
- Batch actions appear when multiple items are selected

**Pros for Jarvis:**
- Keeps interface clean by default
- Advanced users discover features naturally
- Reduces cognitive load for daily use

**Recommendation:** USE -- Every domain view should show only contextually relevant actions. Settings should have basic/advanced split.

---

## 6. The "30-Second Scan" Problem

### Pattern 6A: Time-to-Answer Validation

**Description:** Measure how long it takes a user to extract the answer they need. If >30 seconds, the information hierarchy needs revision.

**Key metric:** A time-constrained user (between patients) should be able to answer "What needs my attention right now?" in under 10 seconds.

**Design rules:**
- F-pattern scanning: top-left quadrant gets the most attention
- Limit visible elements to ~5 (cognitive load research)
- Use sparklines (tiny inline charts) instead of full charts for trends
- Delta indicators: arrows + percentage change communicate direction instantly
- Binary status (healthy/needs attention) before nuanced metrics

**Recommendation:** USE -- This should be the primary validation criterion for every Jarvis screen.

---

### Pattern 6B: Glanceable Status Indicators

**Description:** Color-coded, icon-enhanced status indicators that communicate state without requiring reading.

**Medical/military precedent:**
- Triage colors: red (critical), yellow (urgent), green (stable), black (inactive)
- The user already operates in this mental model daily as an anesthesia provider
- Accessibility: always pair color with icon/shape (colorblind users)

**Implementation for Jarvis:**
| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Critical | Red | ! | Requires immediate action |
| Needs attention | Amber/Yellow | Warning triangle | Action needed this week |
| On track | Green | Checkmark | No action needed |
| Inactive | Gray | Dash | Domain not active or no data |
| Positive momentum | Blue | Up arrow | Growing/improving |

**Recommendation:** USE -- This is the foundation of the quick scan. Every domain gets a status indicator visible from the home screen.

---

### Pattern 6C: Progressive Detail (Summary -> Domain -> Detail)

**Description:** Three zoom levels of information, each progressively more detailed.

**Level 1 - Home Dashboard (10-second scan):**
- Domain name + status color + one-line summary
- "Ethereal Flame: 12.4K subs (+2.3%) -- video scheduled for Thursday"
- "Reset Biology: needs attention -- SSL cert expires tomorrow"

**Level 2 - Domain View (30-second scan):**
- Full dashboard for one domain
- KPIs with sparklines and trends
- Active tasks and upcoming deadlines
- Recent activity feed
- Quick actions

**Level 3 - Detail View (deep dive when time allows):**
- Full analytics charts
- Complete task lists
- Settings and configuration
- Historical data

**Recommendation:** USE -- This three-level progressive detail structure should be the core information architecture.

---

### Pattern 6D: Real-Time Dashboard Trust Patterns

**Description:** Patterns that build user trust in dashboard data.

**From Smashing Magazine research on real-time dashboards:**
- **Data freshness indicators:** "Last updated 2 min ago" + manual refresh button
- **Skeleton UIs:** Show loading placeholders instead of spinners
- **Cached snapshots:** When real-time data unavailable, show last known state with timestamp
- **Micro-animations:** Subtle 200-400ms animations when values change (pulse, fade-in)
- **`prefers-reduced-motion` respect:** Always honor accessibility preferences

**Recommendation:** USE -- Data freshness and loading states are essential for a dashboard the user will check multiple times daily.

---

## Summary: Recommended Architecture

### Navigation Model
```
JARVIS PERSONAL OS -- NAVIGATION ARCHITECTURE

PRIMARY NAVIGATION:
  Mobile:  Bottom tab bar [Home | Chat | Domains | Alerts | Settings]
  Desktop: Left sidebar with domain icon rail + context sidebar + Cmd+K palette

DOMAIN SWITCHING:
  Mobile:  Horizontal icon rail at top of screen (swipeable)
  Desktop: Vertical icon rail on far left (always visible)
  Both:    Cmd+K / search for instant jump

HOME SCREEN:
  1. Priority stack (top 5 urgent items across all domains)
  2. Domain health grid (bento cards with status colors)
  3. Quick actions (most common tasks)

DOMAIN VIEW:
  1. Domain dashboard (KPIs, sparklines, status)
  2. Active tasks/projects
  3. Recent activity
  4. Domain-specific actions

NOTIFICATIONS:
  3 tiers: Critical (push), Important (batched), Informational (digest)
  4 modes: Focus, Active, Review, DND (auto-switching by schedule)
  Unified notification center accessible from any screen

PROGRESSIVE DISCLOSURE:
  - Domains activate when ready (empty state -> setup -> active)
  - 2-level max visual hierarchy (home -> domain)
  - Command palette for depth without disorientation
  - Contextual features appear when relevant
```

### Key Design Principles for Jarvis
1. **10-second rule:** Home screen answers "What needs attention?" in 10 seconds
2. **2-tap rule:** Any domain reachable in 2 taps on mobile
3. **Status-first:** Color-coded health indicators before detailed metrics
4. **Notification respect:** Auto-muting during work hours, smart batching
5. **Progressive activation:** Start simple, activate domains as needed
6. **Adaptive layout:** Different patterns for mobile/tablet/desktop, all first-class
7. **Command palette:** Desktop power users get Cmd+K for everything
8. **Trust signals:** Data freshness, loading states, last-updated timestamps

---

## Sources

### Navigation Paradigms
- [Linear Guide: Setup & Best Practices](https://www.morgen.so/blog-posts/how-to-use-linear-setup-best-practices-and-hidden-features)
- [Linear Conceptual Model Docs](https://linear.app/docs/conceptual-model)
- [Linear Workspaces Docs](https://linear.app/docs/workspaces)
- [Notion Sidebar Navigation Help](https://www.notion.com/help/navigate-with-the-sidebar)
- [Notion Workspaces on Mobile](https://www.notion.com/help/workspaces-on-mobile)
- [UI Breakdown of Notion's Sidebar](https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d)
- [Superhuman: How to Build a Remarkable Command Palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- [Superhuman: Speed as the Product (Design Study)](https://blakecrosley.com/en/guides/design/superhuman)
- [Organizing My Life With Things 3](https://block81.com/blog/organizing-my-life-with-things-3)
- [How I Use Things 3 To Organize My Life](https://birchtree.me/blog/how-i-use-things-3-to-organize-my-life/)
- [Fantastical Calendar Sets Help](https://flexibits.com/fantastical/help/calendar-sets)

### Mobile Navigation
- [Basic Patterns for Mobile Navigation (NNGroup)](https://www.nngroup.com/articles/mobile-navigation-patterns/)
- [Mobile Navigation Patterns: Pros and Cons (UXPin)](https://www.uxpin.com/studio/blog/mobile-navigation-patterns-pros-and-cons/)
- [Mobile Navigation UX Best Practices 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Hub and Spoke Navigation (IxDF)](https://www.interaction-design.org/literature/article/show-me-the-way-to-go-anywhere-navigation-for-mobile-applications)
- [Bottom Navigation Bar Complete Guide 2025](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- [Gesture-Based Navigation: Future of Mobile Interfaces](https://medium.com/@Alekseidesign/gesture-based-navigation-the-future-of-mobile-interfaces-ae0759d24ad7)

### Dashboard Design
- [Dashboard Design UX Patterns (Pencil & Paper)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [UX Strategies for Real-Time Dashboards (Smashing Magazine)](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [Dashboard Design Patterns (Academic)](https://dashboarddesignpatterns.github.io/)
- [How to Build a CEO Dashboard (Atlassian)](https://www.atlassian.com/data/business-intelligence/how-to-build-a-ceo-dashboard)
- [Effective Dashboard Design Principles 2025 (UXPin)](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [30 Dashboard Design Principles (AufaitUX)](https://www.aufaitux.com/blog/dashboard-design-principles/)

### Notifications
- [Design Guidelines For Better Notifications UX (Smashing Magazine)](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)
- [Notification UX: How To Design (Userpilot)](https://userpilot.com/blog/notification-ux/)
- [Notification System Design: Architecture & Best Practices](https://www.magicbell.com/blog/notification-system-design)
- [Comprehensive Guide to Notification Design (Toptal)](https://www.toptal.com/designers/ux/notification-design)

### Progressive Disclosure
- [Progressive Disclosure (NNGroup)](https://www.nngroup.com/articles/progressive-disclosure/)
- [What is Progressive Disclosure? (IxDF)](https://www.interaction-design.org/literature/topics/progressive-disclosure)
- [Progressive Disclosure Examples (Userpilot)](https://userpilot.com/blog/progressive-disclosure-examples/)
- [Progressive Disclosure: Simplifying Complexity (Shopify)](https://www.shopify.com/partners/blog/progressive-disclosure)

### Empty States & Onboarding
- [Empty State in SaaS Applications (Userpilot)](https://userpilot.com/blog/empty-state-saas/)
- [Designing Empty States in Complex Applications (NNGroup)](https://www.nngroup.com/articles/empty-state-interface-design/)
- [Empty State UX: Turn Blank Screens Into Revenue](https://www.saasfactor.co/blogs/empty-state-ux-turn-blank-screens-into-higher-activation-and-saas-revenue)

### Healthcare/Medical UX
- [Best Practices in Healthcare Dashboard Design](https://www.thinkitive.com/blog/best-practices-in-healthcare-dashboard-design/)
- [Healthcare Dashboard UI UX Best Practices](https://www.aufaitux.com/blog/healthcare-dashboard-ui-ux-design-best-practices/)
- [50 Healthcare UX/UI Design Trends](https://www.koruux.com/50-examples-of-healthcare-UI/)

### Executive Dashboards
- [CEO Dashboard: New-Age Executive Reporting](https://www.intellicus.com/ceo-dashboard-the-new-age-executive-reporting-tool/)
- [Executive Dashboards for CEOs (Klipfolio)](https://www.klipfolio.com/resources/dashboard-examples/executive)
- [Mobile Banking App Design UX 2026](https://www.purrweb.com/blog/banking-app-design/)
