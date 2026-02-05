---
created: 2026-02-04T15:30
title: Notion Panel + Tutorial System
area: feature
files:
  - src/components/jarvis/Dashboard/DashboardPanel.tsx
  - src/components/jarvis/Dashboard/TasksList.tsx
  - src/lib/jarvis/tutorial/TutorialManager.ts
  - src/lib/jarvis/tutorial/tutorialTools.ts
  - jarvis/.planning/JARVIS-TUTORIAL-FRAMEWORK.md
---

## Problem

Jarvis currently only integrates with 5 Notion databases (Tasks, Bills, Projects, Goals, Habits), but the user owns the complete "Jarvis Complete Notion Life OS Bundle" which contains 20+ databases across multiple clusters:

- **Plan**: Calendars, Goal Setting, Year Summaries, P.A.R.A Dashboard
- **Action**: Tasks, Life Areas, Projects, Portfolio, Client & Content OS
- **Capture**: Knowledge Base, Journal, Topics, Notebooks, Wish List, CRM
- **Track**: Budgets & Subscriptions, Habits, Workouts, Meals, Perspectives, Timesheets
- **Business**: Client OS, Content OS, Portfolio

The user wants:
1. An embedded Notion panel in the Jarvis app that slides open (80% overlay)
2. Playwright-controlled browser to show actual Notion workspace
3. Tutorial system that teaches ALL template features through live navigation
4. Three interaction modes: Tap (view), Voice "show me" (navigate), Voice "teach me" (tutorial)
5. Visible curriculum list showing what can be learned
6. Personalized discovery (detect what user isn't using, offer to teach)

## Solution

### Architecture

**NotionPanel Component:**
- 80% overlay sliding from right
- Playwright-controlled browser session (authenticated to Notion)
- Floating Jarvis orb in corner continues speaking
- Dismiss via swipe, tap outside, or voice "close"

**Three Modes:**
| Mode | Trigger | Behavior |
|------|---------|----------|
| View | Tap dashboard item | Opens that page in Notion, no narration |
| Show | "Show me [X]" | Opens database/page, brief Jarvis orientation |
| Teach | "Teach me [X]" | Opens + full tutorial narration with navigation |

**Curriculum System:**
- Visible list in UI (dashboard card or dedicated section)
- 6 clusters in priority order:
  1. Daily Action (Tasks, Life Areas, Projects, Habits)
  2. Financial (Budgets & Subscriptions, Income, Expenses, Invoices)
  3. Knowledge (Notes, References, Topics, Journal, CRM)
  4. Tracking (Workouts, Meals, Timesheets, Perspectives)
  5. Planning (Goals, Year Planner, Weekly Review, Calendars)
  6. Business (Client OS, Content OS, Portfolio)

**Tutorial Content:**
- Mirror Simon's 6 onboarding videos (voice-interactive with live data)
- Go deeper into advanced features not fully covered
- Personalized gap detection ("I notice you have 0 habits tracked...")

**State Management:**
New `notionPanelStore` with:
- `isOpen`, `mode`, `currentPage`, `tutorialState`, `curriculum`, `userProgress`

### Implementation Phases

1. **Phase 1**: NotionPanel component + Playwright session management
2. **Phase 2**: View mode (tap to open Notion page)
3. **Phase 3**: Show mode (voice command navigation)
4. **Phase 4**: Curriculum UI + progress tracking
5. **Phase 5**: Teach mode (full tutorial content for Daily Action cluster)
6. **Phase 6+**: Expand tutorials to remaining clusters

### Database Discovery Required

Need to discover all database IDs for the 20+ databases in the Life OS template using Playwright to navigate and extract IDs, similar to how we discovered Tasks/Bills/Projects/Goals/Habits.

### Key Technical Decisions

- Use Playwright MCP for browser automation (already documented in MEMORY.md)
- Maintain persistent auth session across app restarts
- Tutorial content stored as structured modules (extend existing TutorialManager)
- Progress persisted to localStorage/memory system
