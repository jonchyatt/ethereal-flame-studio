# Notion Panel + Tutorial System Design

**Date:** 2026-02-04
**Status:** Approved
**Author:** Claude + User collaborative design session

---

## Executive Summary

Transform Jarvis from a 5-database integration into a full **Notion Life OS companion** that:

1. **Embeds Notion** directly in the app via Playwright-controlled browser
2. **Teaches all 20+ databases** through voice-guided interactive tutorials
3. **Expands voice commands** to cover the entire Life OS template
4. **Detects usage gaps** and proactively offers to teach unused features

The system uses an 80% overlay panel with a floating Jarvis orb, three interaction modes (View/Show/Teach), and a visible curriculum organized into 6 learning clusters.

---

## Background

### Current State

Jarvis integrates with 5 Notion databases:
- Tasks, Bills, Projects, Goals, Habits

### User's Actual Template

The "Jarvis Complete Notion Life OS Bundle" contains **20+ databases** across 4 categories:

**Plan:**
- My Calendars
- Goal Setting & Yearly Planner
- Year Summaries
- P.A.R.A Dashboard

**Action:**
- Tasks & Action View
- Life Areas
- Projects
- My Website Portfolio
- Client & Content OS

**Capture:**
- Knowledge Base
- Journal
- Topics & Resources
- Notebooks
- Wish List
- CRM

**Track:**
- Budgets & Subscriptions
- Habit Tracker
- Workout Tracker
- Meal Planner
- Perspectives
- My Timesheets

### The Gap

Users own a powerful system but only use a fraction of it. Simon (template creator) has 6 onboarding videos, but users need:
- Interactive, personalized guidance
- Voice-controlled access to ALL features
- Discovery of features they're not using

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Jarvis App                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────────────────────┐  │
│  │              │  │                                         │  │
│  │   Jarvis     │  │           NotionPanel (80%)             │  │
│  │    Orb       │  │                                         │  │
│  │  (floating)  │  │   ┌─────────────────────────────────┐   │  │
│  │              │  │   │                                 │   │  │
│  │   🔵         │  │   │    Playwright Browser Session   │   │  │
│  │              │  │   │                                 │   │  │
│  │              │  │   │    (Authenticated Notion)       │   │  │
│  │              │  │   │                                 │   │  │
│  └──────────────┘  │   └─────────────────────────────────┘   │  │
│                    │                                         │  │
│                    └─────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Voice Controls                              │
└─────────────────────────────────────────────────────────────────┘
```

### NotionPanel Component

```typescript
interface NotionPanelProps {
  isOpen: boolean;
  mode: 'view' | 'show' | 'teach';
  currentPage: string | null;
  onClose: () => void;
}
```

**Behavior:**
- Slides in from right as 80% width overlay
- Contains Playwright-controlled browser iframe
- Floating Jarvis orb in bottom-left corner continues speaking
- Dismissible via swipe right, tap outside, or voice "close"

### State Management

New Zustand store `notionPanelStore`:

```typescript
interface NotionPanelState {
  // Panel state
  isOpen: boolean;
  mode: 'view' | 'show' | 'teach';
  currentPage: string | null;

  // Session state
  isAuthenticated: boolean;
  sessionExpiry: Date | null;

  // Tutorial state
  currentLesson: string | null;
  currentSegment: number;
  isPaused: boolean;

  // Progress
  completedLessons: string[];
  unlockedTools: string[];
  discoveredGaps: string[];

  // Actions
  openPanel: (target: string, mode: Mode) => void;
  closePanel: () => void;
  navigateTo: (pageId: string) => void;
  startLesson: (lessonId: string) => void;
  completeSegment: () => void;
  completeLesson: () => void;
}
```

---

## Interaction Modes

### Three Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **View** | Tap dashboard item | Opens that specific page in Notion, no narration |
| **Show** | "Show me [X]" | Opens database/page, brief orientation from Jarvis |
| **Teach** | "Teach me [X]" | Opens page + Jarvis delivers full tutorial with navigation |

### Voice Command Patterns

| Pattern | Intent | Action |
|---------|--------|--------|
| "Show me [X]" | Navigate | Open database/page in panel |
| "Open [X]" | Navigate | Same as show |
| "Teach me about [X]" | Tutorial | Open + start guided lesson |
| "How do I [X]?" | Tutorial | Infer topic, start lesson |
| "What can I learn?" | Curriculum | Show curriculum card / read options |
| "Continue tutorial" | Resume | Pick up from last lesson |
| "Close" / "Hide Notion" | Dismiss | Close panel, return to orb |

### Topic Resolution

```typescript
const TOPIC_ALIASES: Record<string, string> = {
  // Daily Action
  'tasks': 'tasks-action-view',
  'to-dos': 'tasks-action-view',
  'to do': 'tasks-action-view',
  'life areas': 'life-areas',
  'areas': 'life-areas',
  'projects': 'projects',
  'habits': 'habit-tracker',

  // Financial
  'bills': 'budgets-subscriptions',
  'budget': 'budgets-subscriptions',
  'subscriptions': 'budgets-subscriptions',
  'invoices': 'budgets-subscriptions',
  'money': 'budgets-subscriptions',
  'expenses': 'budgets-subscriptions',

  // Knowledge
  'notes': 'knowledge-base',
  'knowledge': 'knowledge-base',
  'journal': 'journal',
  'contacts': 'crm',
  'crm': 'crm',
  'topics': 'topics-resources',

  // Tracking
  'workouts': 'workout-tracker',
  'exercise': 'workout-tracker',
  'gym': 'workout-tracker',
  'meals': 'meal-planner',
  'food': 'meal-planner',
  'time tracking': 'timesheets',
  'timesheets': 'timesheets',

  // Planning
  'goals': 'goal-setting',
  'yearly goals': 'goal-setting',
  'weekly review': 'weekly-review',
  'review': 'weekly-review',
  'calendar': 'my-calendars',
  'para': 'para-dashboard',

  // Business
  'clients': 'client-content-os',
  'content': 'client-content-os',
  'portfolio': 'my-website-portfolio',
};
```

---

## Playwright Integration

### Browser Session Management

```typescript
interface NotionBrowserSession {
  isAuthenticated: boolean;
  workspaceId: string;
  lastActivity: Date;
  sessionTimeout: number;  // 30 min inactivity = re-auth
}
```

### Authentication Flow

1. **First Launch:** User clicks "Connect Notion" → Playwright opens login page
2. **User Authenticates:** Normal Notion login (email/password or Google SSO)
3. **Session Persists:** Cookies maintained across app restarts
4. **Session Expired:** Jarvis detects, triggers re-auth

### Core Navigation Pattern

```
Snapshot → Find Element → Click → Wait → Snapshot → Verify
```

### Tool Mapping

| Action | Playwright MCP Tool |
|--------|---------------------|
| Open page | `browser_navigate` |
| See page state | `browser_snapshot` |
| Click element | `browser_click` |
| Scroll/hover | `browser_hover` |
| Type text | `browser_type` |
| Handle dialogs | `browser_handle_dialog` |
| Screenshot | `browser_take_screenshot` |

### Navigation Functions

```typescript
async function openNotionPage(pageId: string) {
  const url = `https://notion.so/${pageId.replace(/-/g, '')}`;
  await mcp_playwright.browser_navigate({ url });
  await mcp_playwright.browser_snapshot();
}

async function clickElement(ref: string) {
  await mcp_playwright.browser_click({ ref });
  await mcp_playwright.browser_snapshot();
}

async function teachLesson(lesson: CurriculumLesson) {
  await openNotionPage(lesson.notionPageId);

  for (const segment of lesson.segments) {
    await jarvis.speak(segment.narration);

    if (segment.action) {
      await executeAction(segment.action);
    }

    await sleep(segment.pause);

    if (segment.checkpoint) {
      await jarvis.waitForUser();
    }
  }
}
```

### Error Handling

| Error | Response |
|-------|----------|
| Element not found | Retry with fallback, graceful message |
| Auth expired | Trigger re-auth flow |
| Network error | "Having trouble connecting to Notion" |
| Page structure changed | Log for review, continue with available elements |

---

## Curriculum System

### Curriculum Card UI

```
┌─────────────────────────────────────────────┐
│  📚 Learn Your Life OS                      │
├─────────────────────────────────────────────┤
│  ● Daily Action          ████████░░  80%    │
│    Tasks, Life Areas, Projects, Habits      │
│                                             │
│  ○ Financial             ░░░░░░░░░░   0%    │
│    Budgets, Subscriptions, Invoices         │
│                                             │
│  ○ Knowledge             ░░░░░░░░░░   0%    │
│    Notes, Journal, CRM, Topics              │
│                                             │
│  ○ Tracking              ░░░░░░░░░░   0%    │
│    Workouts, Meals, Timesheets              │
│                                             │
│  ○ Planning              ░░░░░░░░░░   0%    │
│    Goals, Year Planner, Weekly Review       │
│                                             │
│  ○ Business              ░░░░░░░░░░   0%    │
│    Client OS, Content OS, Portfolio         │
│                                             │
│  ⚡ Recommended: "You have 0 habits set up" │
│     [Teach me about Habits]                 │
└─────────────────────────────────────────────┘
```

### Data Structures

```typescript
interface CurriculumCluster {
  id: string;
  name: string;
  icon: string;
  databases: string[];
  lessons: CurriculumLesson[];
  priority: number;
}

interface CurriculumLesson {
  id: string;
  title: string;
  duration: string;
  notionPageId: string;
  voiceScript: string[];
  interactions: TutorialStep[];
}

interface UserProgress {
  completedLessons: string[];
  lastLesson: string | null;
  discoveredGaps: string[];
  unlockedTools: string[];
}
```

### Cluster Priority Order

1. **Daily Action** - Tasks, Life Areas, Projects, Habits
2. **Financial** - Budgets & Subscriptions, Income, Expenses, Invoices
3. **Knowledge** - Notes, References, Topics, Journal, CRM
4. **Tracking** - Workouts, Meals, Timesheets, Perspectives
5. **Planning** - Goals, Year Planner, Weekly Review, Calendars
6. **Business** - Client OS, Content OS, Portfolio

### Gap Detection

On session start, Jarvis queries each database:

```typescript
const gaps = [];

if (await countHabits() === 0) {
  gaps.push({ type: 'no-habits', lesson: 'habits-intro' });
}

if (await countJournalEntries() === 0) {
  gaps.push({ type: 'empty-journal', lesson: 'journal-intro' });
}

if (await countLifeAreas() <= 1) {
  gaps.push({ type: 'default-areas-only', lesson: 'life-areas-setup' });
}

// ... more gap checks
```

---

## Tutorial Content Structure

### Lesson Format

```typescript
interface Lesson {
  id: string;
  cluster: ClusterId;
  title: string;
  duration: string;
  prerequisites: string[];

  notionTarget: {
    type: 'database' | 'page';
    id: string;
    view?: string;
  };

  segments: LessonSegment[];
  unlockedTools: string[];
}

interface LessonSegment {
  narration: string;
  action?: {
    type: 'click' | 'scroll' | 'highlight' | 'wait';
    target: string;
  };
  pause: number;
  checkpoint?: string;
}
```

### Example Lesson

```typescript
const habitFirstHabitLesson: Lesson = {
  id: 'habits-first-habit',
  cluster: 'daily-action',
  title: 'Adding Your First Habit',
  duration: '3 min',
  prerequisites: ['habits-intro'],

  notionTarget: {
    type: 'database',
    id: 'habit-tracker-id',
    view: 'All Habits'
  },

  segments: [
    {
      narration: "This is your Habit Tracker. Each habit you want to build lives here.",
      pause: 2000
    },
    {
      narration: "Let's add your first habit. I'll click New for you.",
      action: { type: 'click', target: 'button "New"' },
      pause: 1500
    },
    {
      narration: "Give it a name - something you want to do regularly. Like 'Morning meditation' or 'Read 20 pages'.",
      action: { type: 'highlight', target: 'title input' },
      pause: 3000,
      checkpoint: "What habit would you like to track?"
    },
    {
      narration: "Set how often you want to do it. 7 means daily, 3 means three times a week.",
      action: { type: 'click', target: 'property "Frequency"' },
      pause: 2000
    },
    {
      narration: "That's it. Now you can tell me 'I did my meditation today' and I'll log it for you.",
      pause: 2000
    }
  ],

  unlockedTools: ['log_habit_completion']
};
```

### Tool Unlocking

Tutorials progressively unlock voice commands:

| After Learning | User Can Now Say |
|----------------|------------------|
| Habits intro | "Log my meditation", "How's my exercise streak?" |
| Workouts intro | "Log a workout - 30 min running" |
| Journal intro | "Add a journal entry" |
| Budget intro | "How much have I spent this month?" |

---

## Expanded Tool Set

### New Claude Tools - Panel Control

```typescript
const notionPanelTools = [
  {
    name: 'open_notion_panel',
    description: 'Open the Notion panel to show a specific database or page',
    parameters: {
      target: 'string',
      mode: "'view' | 'show' | 'teach'",
    }
  },
  {
    name: 'close_notion_panel',
    description: 'Close the Notion panel',
  },
  {
    name: 'navigate_notion',
    description: 'Navigate within the open Notion panel',
    parameters: {
      action: "'click' | 'scroll' | 'back'",
      target: 'string',
    }
  },
  {
    name: 'get_curriculum_status',
    description: 'Get user progress across all tutorial clusters',
  },
  {
    name: 'start_lesson',
    description: 'Begin a specific tutorial lesson',
    parameters: {
      lessonId: 'string',
    }
  },
];
```

### New Tools by Cluster

**Cluster 1: Daily Action** (extends existing)
| Tool | Description |
|------|-------------|
| `query_life_areas` | List all life areas with activity status |
| `get_life_area_status` | Detailed view of one area |
| `query_project_tasks` | Tasks within a specific project |
| `add_project_task` | Add task linked to project |
| `update_project_status` | Change project status |
| `log_habit_completion` | Mark habit done today |
| `query_habit_streak` | Get streak count for habit |
| `skip_habit_today` | Skip without breaking streak |

**Cluster 2: Financial**
| Tool | Description |
|------|-------------|
| `query_subscriptions` | List active subscriptions |
| `add_subscription` | Add new subscription |
| `cancel_subscription` | Mark subscription cancelled |
| `query_expenses` | Query expenses by timeframe |
| `log_expense` | Add new expense |
| `query_income` | Query income by timeframe |
| `log_income` | Add income entry |
| `create_invoice` | Create new invoice |
| `mark_invoice_paid` | Mark invoice as paid |
| `get_monthly_summary` | Financial summary for month |

**Cluster 3: Knowledge**
| Tool | Description |
|------|-------------|
| `query_notes` | Search notes by topic/keyword |
| `create_note` | Add new note |
| `query_journal` | Get journal entries by date |
| `add_journal_entry` | Add journal entry |
| `query_contacts` | Search CRM contacts |
| `add_contact` | Add new contact |
| `add_to_topic` | Link item to a topic |

**Cluster 4: Tracking**
| Tool | Description |
|------|-------------|
| `log_workout` | Log workout session |
| `query_workouts` | Get workout history |
| `get_workout_records` | Personal bests and records |
| `log_meal` | Log meal |
| `query_meals` | Get meal history |
| `start_timesheet` | Start tracking time |
| `stop_timesheet` | Stop tracking time |
| `query_timesheets` | Get time logs |

**Cluster 5: Planning**
| Tool | Description |
|------|-------------|
| `query_goals_detailed` | Goals with progress metrics |
| `update_goal_progress` | Update goal completion |
| `query_year_summary` | Year overview stats |
| `start_weekly_review` | Begin weekly review flow |
| `add_calendar_event` | Add to Notion calendar |

**Cluster 6: Business**
| Tool | Description |
|------|-------------|
| `query_clients` | List clients from CRM |
| `add_client` | Add new client |
| `update_client_status` | Update client relationship |
| `query_content` | Content pipeline items |
| `create_content_item` | Add content to pipeline |

---

## Implementation Phases

### Phase T1: Panel Foundation
**Scope:** Infrastructure and basic panel

- [ ] `NotionPanel` component (80% overlay, slide animation)
- [ ] `notionPanelStore` (Zustand state management)
- [ ] Playwright MCP session management
- [ ] First-time Notion authentication flow
- [ ] Basic open/close via voice ("open Notion" / "close")

**Deliverable:** Panel opens, shows authenticated Notion workspace

---

### Phase T2: View Mode + Dashboard Integration
**Scope:** Tap-to-view functionality

- [ ] Tap-to-open from dashboard items (tasks, habits, bills)
- [ ] Database ID discovery for all 20+ databases
- [ ] URL mapping (item → Notion page)
- [ ] Back button / navigation within panel
- [ ] Loading states and error handling

**Deliverable:** Tap any dashboard item → see it in Notion

---

### Phase T3: Curriculum UI + Progress Tracking
**Scope:** Learning interface

- [ ] `CurriculumCard` component in dashboard
- [ ] 6 clusters with lesson counts
- [ ] Progress persistence (localStorage + memory system)
- [ ] "What can I learn?" voice command
- [ ] Gap detection queries (empty databases → recommendations)
- [ ] Recommended lesson surfacing

**Deliverable:** Visible curriculum, tracks what user has learned

---

### Phase T4: Teach Mode + Daily Action Tutorials
**Scope:** First cluster tutorials

- [ ] Lesson execution engine (narration + Playwright actions)
- [ ] Full tutorial content for Cluster 1:
  - Tasks & Action View (5 lessons)
  - Life Areas (3 lessons)
  - Projects (4 lessons)
  - Habits (3 lessons)
- [ ] Checkpoint system ("Got it?" pauses)
- [ ] Tool unlocking after lessons
- [ ] Resume from last position

**Deliverable:** "Teach me about habits" → full guided tutorial

---

### Phase T5: Daily Action Tools Expansion
**Scope:** Voice control for Cluster 1

- [ ] Life Areas tools: `query_life_areas`, `get_life_area_status`
- [ ] Projects tools: `query_project_tasks`, `add_project_task`, `update_project_status`
- [ ] Habits tools: `log_habit_completion`, `query_habit_streak`, `skip_habit_today`
- [ ] Integration with existing task tools
- [ ] Tool documentation for Claude

**Deliverable:** Full voice control of Daily Action cluster

---

### Phase T6: Financial Cluster
**Scope:** Cluster 2 complete

- [ ] Database discovery (Budgets, Subscriptions, Income, Expenses)
- [ ] Tutorial content (4 lessons covering Simon's Video 5 content)
- [ ] New tools:
  - `query_subscriptions`, `add_subscription`, `cancel_subscription`
  - `query_expenses`, `log_expense`
  - `query_income`, `log_income`
  - `create_invoice`, `mark_invoice_paid`
  - `get_monthly_summary`

**Deliverable:** Full Financial cluster with tutorials + voice control

---

### Phase T7: Knowledge + Tracking Clusters
**Scope:** Clusters 3 and 4

- [ ] Knowledge: Notes, Journal, CRM, Topics
- [ ] Tracking: Workouts, Meals, Timesheets, Perspectives
- [ ] Tutorial content (~12 lessons total)
- [ ] All tools for both clusters
- [ ] Cross-database queries (e.g., "what did I work on last week?")

**Deliverable:** Middle clusters complete

---

### Phase T8: Planning + Business Clusters
**Scope:** Clusters 5 and 6

- [ ] Planning: Goals, Year Planner, Weekly Review, Calendars
- [ ] Business: Client OS, Content OS, Portfolio
- [ ] Advanced tutorial content
- [ ] Full tool coverage
- [ ] Integration with existing briefing/review systems

**Deliverable:** All 6 clusters complete, full Life OS integration

---

## Database Discovery

### Required Database IDs

Each database needs discovery via Playwright navigation:

| Cluster | Database | Status |
|---------|----------|--------|
| Daily Action | Tasks | ✅ Known |
| Daily Action | Life Areas | ❌ Need ID |
| Daily Action | Projects | ✅ Known |
| Daily Action | Habits | ✅ Known |
| Financial | Budgets & Subscriptions | ❌ Need ID |
| Financial | Income | ❌ Need ID |
| Financial | Expenses | ❌ Need ID |
| Knowledge | Knowledge Base | ❌ Need ID |
| Knowledge | Journal | ❌ Need ID |
| Knowledge | CRM | ❌ Need ID |
| Knowledge | Topics | ❌ Need ID |
| Tracking | Workout Tracker | ❌ Need ID |
| Tracking | Meal Planner | ❌ Need ID |
| Tracking | Timesheets | ❌ Need ID |
| Planning | Goals | ✅ Known |
| Planning | Year Planner | ❌ Need ID |
| Planning | Calendars | ❌ Need ID |
| Business | Client OS | ❌ Need ID |
| Business | Content OS | ❌ Need ID |
| Business | Portfolio | ❌ Need ID |

### Discovery Process

1. Navigate to each database via Playwright
2. Extract database ID from URL
3. Use `databases.retrieve()` to get `data_source_id`
4. Map property names for each database
5. Store in configuration file

---

## Future Considerations

### Knowledge Hub Integration (Captured as Separate Todo)

After core system is complete, add:
- NotebookLM integration for AI synthesis
- Google Drive for file storage
- Intelligent routing: "Save this article for my project" → routes to correct destinations
- Cross-platform queries: "What do I know about X?" → queries Notion + NotebookLM

### Progressive Enhancement

- Offline lesson caching (pre-capture common tutorial paths)
- Voice-only mode (no panel, pure narration for mobile)
- Custom lesson creation (user defines their own tutorials)
- Multi-language support for narration

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Panel load time | < 2 seconds |
| Tutorial completion rate | > 60% start → finish |
| Features discovered via gaps | 3+ per user |
| Voice command success rate | > 90% |
| Databases with full tool coverage | 20+ |

---

## Appendix: Voice Command Examples

```
# View Mode
"Show me my tasks"
"Open my habits"
"Let me see my budget"

# Teach Mode
"Teach me about life areas"
"How do I track workouts?"
"What can I learn?"
"Continue my tutorial"

# Action Mode (after learning)
"Log my morning meditation"
"Add a journal entry - today was productive"
"Log a workout - 30 minutes running"
"How much have I spent this month?"
"Start tracking time on website project"
"Add Sarah as a contact - she's a potential client"

# Navigation
"Go back"
"Close Notion"
"Show me more"
```

---

*Design approved: 2026-02-04*
