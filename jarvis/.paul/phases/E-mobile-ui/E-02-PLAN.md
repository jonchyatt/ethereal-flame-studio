---
phase: E-mobile-ui
plan: 02
type: research
wave: 1
depends_on: []
files_modified:
  - jarvis/.paul/research/phase-e-information-architecture.md
autonomous: false
---

<objective>
## Goal
Design the complete information architecture for the Jarvis multi-domain operating system — the navigation model, domain hierarchy, screen map, cross-domain data flows, notification system, briefing architecture, and sentinel integration points. This is the blueprint that every subsequent UI plan builds on.

## Purpose
The Domain Atlas (E-01) mapped every room in the house. E-02 designs how the rooms connect — the hallways, doors, elevators, and intercom system. Without this, building UI components would be like placing furniture before the walls exist. The user's directive: "conceptualize the entire structure and how it will be built, THEN understand what kind of UI will work for that."

This architecture must handle:
- 7+ top-level domains with deep sub-structure (Reset Biology alone has 6 sub-programs)
- A user who has 30 seconds to scan priorities between putting patients to sleep
- Both desktop (command center) and mobile (quick-action) as first-class citizens
- Future sentinel model (always-on monitoring ghost) integration
- Cross-domain connections (peptide timing → workout scheduling, content → publishing pipeline)

## Output
- `jarvis/.paul/research/phase-e-information-architecture.md` — the comprehensive architecture document
- Consumed by E-03 (UI System Design) and all subsequent E-04+ build plans
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Research Foundation
@.paul/research/phase-e-domain-atlas.md (complete map of all 7 domains)
@.paul/phases/E-mobile-ui/CONTEXT.md (vision, goals, constraints)

## Current UI (to understand what exists)
@src/app/jarvis/page.tsx
@src/components/jarvis/ChatPanel.tsx
@src/components/jarvis/NotionPanel.tsx
@src/components/jarvis/Dashboard/
@src/lib/jarvis/stores/
</context>

<acceptance_criteria>

## AC-1: Navigation Model Defined
```gherkin
Given the Domain Atlas documents 7+ domains with deep sub-structure
When the navigation model is designed
Then it defines:
  - How to reach any domain from any other domain in ≤2 interactions
  - How sub-programs nest within domains (e.g., Reset Bio's 6 programs)
  - How context switching works without losing state
  - How the model works on BOTH desktop (wide screen) and mobile (thumb-reachable)
  - How empty/future domains appear (placeholders that don't waste space)
```

## AC-2: Screen Architecture Mapped
```gherkin
Given all domains and their UI surface needs from the Atlas
When the screen architecture is designed
Then it defines:
  - Every distinct screen/view type in the system
  - The hierarchy: command center → domain view → detail view → action
  - Where chat lives (always available? overlay? per-domain?)
  - Where voice input is accessible
  - How deep links work (jump to a specific bill, trade, protocol)
```

## AC-3: Cross-Domain Data Flows Documented
```gherkin
Given the Atlas identifies connections between domains
When data flows are designed
Then every cross-domain connection documents:
  - Source domain and data type
  - Destination domain and how it's consumed
  - Trigger (automatic, scheduled, or user-initiated)
  - Example: "Reset Bio peptide dose logged → Notion daily task marked complete"
```

## AC-4: Notification & Briefing Architecture Designed
```gherkin
Given 7+ domains each generating notifications and briefing data
When the notification system is designed
Then it defines:
  - Unified notification pipeline (all domains → single stream)
  - Priority levels (urgent, important, routine, informational)
  - Channel routing (push, email, Telegram, in-app — configurable per domain)
  - Briefing assembly (morning/midday/evening pulling from ALL domains)
  - Aggregation rules (don't drown the user — smart batching)
  - Snooze/dismiss mechanics per notification and per domain
```

## AC-5: Sentinel Integration Points Specified
```gherkin
Given the sentinel model will be a lightweight always-on local monitor
When integration points are designed
Then the architecture documents:
  - What the sentinel monitors per domain (specific data endpoints)
  - How sentinel reports surface in the UI (status indicator, notification injection)
  - Where Claude (big brain) review results appear
  - How sentinel instructions are viewed/edited
  - How the architecture works WITHOUT the sentinel (graceful absence)
```

## AC-6: Architecture Document Enables E-03
```gherkin
Given the architecture document is complete
When E-03 (UI System Design) begins
Then the architect can design components, layouts, and responsive strategies
  without making any navigation or hierarchy decisions —
  those are all resolved in this document
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Research multi-domain UI patterns and navigation paradigms</name>
  <files>
    (research output — informs Task 2, not a standalone file)
  </files>
  <action>
    Use a web research agent to study how the best multi-domain applications handle:

    **Navigation Paradigms to Research:**
    - **Workspace switching** — How Linear, Slack, Discord switch between contexts
    - **Sidebar navigation** — How Notion, Monday.com handle deep hierarchies
    - **Command palette** — How Superhuman, Linear, Raycast provide keyboard-first navigation
    - **Tab-based** — How browsers, VS Code manage many contexts
    - **Mobile OS patterns** — How iOS/Android handle app switching, widgets, notifications
    - **Hub-and-spoke** — How banking apps handle multiple accounts
    - **Progressive disclosure** — How complex apps reveal depth without overwhelming

    **Specific Questions to Answer:**
    1. What pattern works best for 7+ top-level domains with sub-structure?
    2. How do mobile-first apps handle deep navigation (3+ levels)?
    3. How do notification aggregation systems work at scale (multiple sources)?
    4. What patterns exist for cross-domain quick actions?
    5. How do dashboard/command center patterns work across industries?
    6. How do the best apps handle "I have 30 seconds — show me what matters"?

    **Research Sources:**
    - Web search for "multi-domain dashboard UX patterns"
    - Web search for "mobile-first complex navigation patterns 2025 2026"
    - Web search for "notification aggregation UX design patterns"
    - Web search for "command center dashboard design multi-context"
    - Study: Linear.app, Notion, Slack, Superhuman, Things 3, Fantastical, Copilot (finance)

    Return structured findings organized by pattern type with pros/cons for our use case.
  </action>
  <verify>Research agent returns structured findings covering all 6 questions with cited patterns</verify>
  <done>Research informs navigation and notification decisions in Task 2</done>
</task>

<task type="auto">
  <name>Task 2: Design and write the complete information architecture document</name>
  <files>
    jarvis/.paul/research/phase-e-information-architecture.md
  </files>
  <action>
    Synthesize the Domain Atlas + UI research + user constraints into a comprehensive
    information architecture document. This is the BLUEPRINT for the entire system.

    **The document MUST contain these sections:**

    ## Section 1: Navigation Model
    - Primary navigation paradigm (with rationale from research)
    - Domain switching mechanism (desktop + mobile)
    - Sub-program navigation within domains
    - Context persistence (switching domains preserves state)
    - Deep linking scheme (URL structure for every addressable view)
    - Keyboard shortcuts / command palette design
    - Mobile gesture navigation (swipe between domains?)
    - The "30-second scan" — what you see when you open the app

    ## Section 2: Domain Hierarchy
    Map every domain → sub-domain → view → action:
    ```
    Personal Life
    ├── Dashboard (today's priorities, habits, bills due)
    ├── Tasks (Notion Tasks DB)
    ├── Habits (streaks, daily tracking)
    ├── Bills & Finance (subscriptions, budgets, income/expenses)
    ├── Calendar & Schedule
    ├── Health & Wellness (links to Reset Bio data if applicable)
    ├── Journal (Notion Journal DB)
    └── Goals & Planning

    Ethereal Flame
    ├── Pipeline Status (rendering, encoding, publishing)
    ├── Publishing Calendar (scheduled content per platform)
    ├── Analytics (views, subscribers, engagement per platform)
    ├── Content Library (rendered videos, templates)
    └── Channel Management (YouTube, TikTok, Instagram settings)

    Reset Biology
    ├── Business Dashboard (revenue, subscribers, churn)
    ├── Breathwork (exercises, sessions, compliance)
    ├── Exercise (protocols, sessions, readiness)
    ├── Vision Training (enrollment, progress, exercises)
    ├── Nutrition (meal plans, food logging, macros)
    ├── Peptides (protocols, doses, inventory, education)
    ├── Journaling (entries, mood, weight)
    ├── Gamification (points, streaks, deposits)
    └── Store & Orders (products, inventory, fulfillment)

    CritFailVlogs
    ├── (mirrors Ethereal Flame structure with different presets)
    └── ...

    Visopscreen
    ├── Regime Status (current archetype, confidence, history)
    ├── Daily Screener Results (top candidates)
    ├── Portfolio (open positions, P&L)
    ├── Alerts & Signals
    └── Quick Link → Full Visopscreen App

    Satori Living
    ├── Compliance Calendar (filings, deadlines, renewals)
    ├── Programs (PINNACLE, CATALYST enrollments)
    ├── Donations (when payment processing added)
    └── Research Projects

    Entity Building
    ├── Entity Health (credit scores, filing status)
    ├── Milestones & Tasks
    └── Compliance Calendar (shared pattern with Satori)
    ```

    For EACH leaf node, specify:
    - What data it displays (source: Notion DB? MongoDB? API? LocalStorage?)
    - What actions are available (CRUD? toggle? navigate?)
    - What notifications it can generate
    - Whether it's built now, built later, or placeholder

    ## Section 3: Screen Architecture
    Define the screen types:
    - **Command Center** — cross-domain priority dashboard
      - What appears? (urgent items from ALL domains, not just one)
      - How is priority determined? (due date? domain weight? user config?)
      - Quick actions available (mark done, snooze, navigate to detail)
    - **Domain View** — per-domain dashboard
      - Standard layout pattern (all domains follow same structure)
      - Domain-specific widgets
    - **Detail View** — individual item (task, trade, protocol, video, etc.)
    - **Action Sheets** — quick-add, quick-log (e.g., log dose, mark task done)
    - **Chat** — where does it live? Overlay? Bottom sheet? Persistent sidebar?
    - **Settings** — gear icon, feature toggles, notification preferences, domain config

    ## Section 4: Cross-Domain Data Flows
    Document every cross-domain connection as a flow:
    ```
    Flow: Peptide Dose → Task Completion
    Source: Reset Biology (peptide_doses table)
    Destination: Notion (Tasks DB — daily peptides task)
    Trigger: Automatic on dose log
    Direction: One-way
    Priority: Background (non-blocking)
    ```
    Must cover at minimum:
    - Reset Bio ↔ Notion (health data ↔ tracking)
    - Ethereal Flame ↔ CritFailVlogs (shared pipeline)
    - All domains → Notification pipeline
    - All domains → Briefing assembly
    - All domains → Command Center priorities
    - Visopscreen regime → alerts
    - Financial data convergence (Notion + Stripe + Schwab)

    ## Section 5: Notification & Briefing Architecture
    - Notification pipeline diagram (sources → processing → delivery)
    - Priority classification rules per domain
    - Briefing types (morning, midday, evening, weekly) with content sources
    - Aggregation rules (max N notifications per hour, smart batching)
    - Channel routing (which notifications go to push vs email vs in-app)
    - User preference model (per-domain, per-type controls)
    - "Do Not Disturb" and scheduling (no alerts during OR shifts)

    ## Section 6: Sentinel Integration Architecture
    - Monitoring endpoints per domain
    - Report format (what sentinel sends to Claude)
    - Instruction format (what Claude sends to sentinel)
    - UI surfaces: sentinel status, instruction viewer, report viewer
    - Graceful degradation: everything works without sentinel (it's additive)
    - Hook points: where sentinel injects nudges into the notification pipeline

    ## Section 7: State Management Strategy
    - Per-domain data stores vs. unified store
    - Cache invalidation strategy
    - Optimistic updates for quick actions
    - Offline-capable actions (mobile between patients)
    - URL-based state (shareable deep links)

    ## Section 8: Technical Routing Architecture
    - Next.js App Router layout structure
    - Route hierarchy mapping to domain hierarchy
    - Middleware for domain context
    - API route organization for multi-domain data

    **Design Principles (enforce throughout):**
    - 30-second scan: most critical info visible immediately
    - 2-tap maximum to reach any domain from any other domain
    - Mobile-first: every screen designed for thumb-reach, then enhanced for desktop
    - Empty rooms don't waste space: future domains are hidden until activated
    - Consistent patterns: all domains follow the same layout grammar
    - Voice-first where hands aren't free

    **Write for the APPLY executor:** The document should be detailed enough that E-03
    can proceed without asking clarifying questions about navigation, hierarchy, or data flows.
  </action>
  <verify>
    Document contains all 8 sections. Every domain's hierarchy is fully specified.
    Cross-domain flows are enumerated. Navigation model makes a clear, reasoned choice.
    Notification architecture is concrete (not hand-wavy).
  </verify>
  <done>AC-1 through AC-6 satisfied: complete information architecture ready for E-03</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Complete information architecture for the Jarvis multi-domain operating system:
    - Navigation model (how to move between 7+ domains on both desktop and mobile)
    - Full domain hierarchy (every domain → sub-domain → view → action)
    - Screen architecture (command center, domain views, detail views, chat, settings)
    - Cross-domain data flows (every connection documented with source/destination/trigger)
    - Notification & briefing architecture (unified pipeline, priority levels, channel routing)
    - Sentinel integration points (monitoring hooks, reporting, graceful absence)
    - State management strategy (stores, caching, offline, URLs)
    - Technical routing architecture (Next.js layout structure)
  </what-built>
  <how-to-verify>
    Review the architecture document at:
    jarvis/.paul/research/phase-e-information-architecture.md

    Key questions to validate:
    1. Does the navigation model feel right for your workflow? Can you get anywhere in ≤2 taps?
    2. Is the domain hierarchy complete? Any missing sub-programs or views?
    3. Do the cross-domain flows capture the real connections between your businesses?
    4. Does the notification system respect your time constraints (OR shifts, limited windows)?
    5. Does the sentinel integration make sense as an additive layer?
    6. Does this feel like THE house you want to live in?

    This is the last chance to reshape the architecture before UI design begins.
    Changes here are cheap. Changes after E-03 are expensive. Changes after E-04+ are painful.
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to E-03, or describe what needs changing</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/intelligence/* (self-improvement system is Phase D, complete)
- src/lib/jarvis/notion/* (Notion integration is stable, just documenting its surfaces)
- src/lib/jarvis/memory/* (memory system is stable)
- .paul/research/phase-e-domain-atlas.md (input document, don't modify)

## SCOPE LIMITS
- This plan produces ARCHITECTURE DOCUMENTATION, not code
- No component design (that's E-03)
- No visual design (colors, fonts, spacing — that's E-03)
- No implementation decisions about specific React libraries (that's E-03)
- Do not design individual screen layouts — design the STRUCTURE of screens
- Sentinel model: design integration POINTS only, not the sentinel itself

</boundaries>

<verification>
Before declaring plan complete:
- [ ] Navigation model makes a clear choice (not "we could do X or Y")
- [ ] Every domain from the Atlas has a full hierarchy (no missing domains)
- [ ] Cross-domain flows are specific (source, destination, trigger — not vague arrows)
- [ ] Notification architecture has concrete rules (not "prioritize important things")
- [ ] Sentinel integration is specified but optional (system works without it)
- [ ] Document is detailed enough for E-03 to proceed without ambiguity
- [ ] Mobile and desktop both addressed in every section
- [ ] User has approved the architecture at checkpoint
</verification>

<success_criteria>
- Architecture document written with all 8 sections
- Navigation model makes a definitive choice backed by research
- All 7 domains fully hierarchied with leaf-level data sources and actions
- Cross-domain flows enumerated (minimum 10 flows documented)
- Notification system concrete enough to implement
- User approves architecture at checkpoint
- E-03 can begin immediately from this document
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-02-SUMMARY.md`
</output>
