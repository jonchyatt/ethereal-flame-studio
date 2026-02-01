# Phase 5: Executive Function Core - Research

**Researched:** 2026-02-01
**Domain:** Proactive Scheduling, Visual Dashboard, Calendar Integration, Time-Based Nudges
**Confidence:** MEDIUM

## Summary

Phase 5 transforms Jarvis from a reactive assistant into a proactive executive function partner. The implementation requires: (1) a scheduling mechanism for time-based events (briefings, nudges, check-ins), (2) visual dashboard components alongside the orb, (3) calendar integration for event awareness, and (4) data aggregation across multiple Notion databases. The existing codebase provides a solid foundation with the voice pipeline, Notion tools, and orb visualization already working.

The key architectural challenge is implementing proactive triggers in a Next.js web application. Traditional cron jobs don't work in serverless environments. Instead, the client must maintain its own schedule and trigger API calls at appropriate times. The orb becomes the tap target (per CONTEXT.md), eliminating the separate mic button and simplifying the UI.

**Primary recommendation:** Implement a client-side scheduler service that tracks scheduled events (briefing times, upcoming deadlines, calendar events) and triggers nudges through the existing voice pipeline. Store schedule configuration in localStorage with sensible defaults. Use the existing Notion MCP tools to aggregate data for briefings.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 4.x | State management | Already in use for jarvisStore |
| date-fns | 3.x | Date manipulation | Lightweight, immutable, tree-shakeable |
| @notionhq/notion-mcp-server | ^2.0.0 | Notion data access | Already configured, 10 tools working |
| AWS Polly | via API | TTS for briefings | Already integrated via /api/jarvis/tts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-query / TanStack Query | 5.x | Data fetching & caching | For periodic data refresh and caching |
| Notification API | Browser | System notifications | Nudge alerts when tab unfocused |
| Web Audio API | Browser | Notification sounds | Gentle chime for nudges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client scheduler | Vercel Cron | Vercel Cron requires server endpoint; client scheduler works offline |
| localStorage | IndexedDB | IndexedDB is more complex; localStorage sufficient for schedule config |
| Custom dashboard | TailAdmin/MUI | Third-party adds bundle size; custom fits orb aesthetic better |
| Google Calendar API | Notion Calendar | Google requires OAuth setup; Notion already integrated |

**Installation:**
```bash
npm install date-fns
# react-query if data caching needed later
npm install @tanstack/react-query
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/jarvis/
├── executive/
│   ├── Scheduler.ts           # NEW: Time-based event scheduler
│   ├── BriefingBuilder.ts     # NEW: Aggregates data for briefings
│   ├── NudgeManager.ts        # NEW: Manages nudge triggers and state
│   ├── CheckInManager.ts      # NEW: Manages check-in flows
│   └── types.ts               # NEW: Schedule, briefing, nudge types
├── stores/
│   ├── jarvisStore.ts         # EXTEND: Add schedule, dashboard state
│   └── dashboardStore.ts      # NEW: Dashboard visibility, pinned items
└── notion/
    └── toolExecutor.ts        # EXTEND: Add aggregation queries

src/components/jarvis/
├── JarvisOrb.tsx              # MODIFY: Add tap-to-talk behavior
├── Dashboard/
│   ├── DashboardPanel.tsx     # NEW: Main dashboard container
│   ├── TasksList.tsx          # NEW: Today's tasks display
│   ├── CalendarEvents.tsx     # NEW: Upcoming events display
│   ├── HabitProgress.tsx      # NEW: Habit streaks display
│   └── BillsSummary.tsx       # NEW: Bills due display
├── NudgeOverlay.tsx           # NEW: Visual nudge indicator
└── PriorityIndicator.tsx      # NEW: "Needs attention" visual
```

### Pattern 1: Client-Side Scheduler
**What:** Service that runs on client, checks schedule, triggers events
**When to use:** All proactive behaviors (briefings, nudges, check-ins)
**Example:**
```typescript
// src/lib/jarvis/executive/Scheduler.ts

interface ScheduledEvent {
  id: string;
  type: 'morning_briefing' | 'midday_checkin' | 'evening_checkin' | 'nudge';
  time: string; // HH:mm format
  enabled: boolean;
  lastTriggered?: number; // timestamp
}

export class Scheduler {
  private events: ScheduledEvent[] = [];
  private intervalId: number | null = null;
  private onTrigger: (event: ScheduledEvent) => void;

  constructor(onTrigger: (event: ScheduledEvent) => void) {
    this.onTrigger = onTrigger;
    this.loadSchedule();
  }

  start(): void {
    // Check every minute
    this.intervalId = window.setInterval(() => this.check(), 60000);
    this.check(); // Initial check
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private check(): void {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = now.toDateString();

    for (const event of this.events) {
      if (!event.enabled) continue;

      // Check if time matches and hasn't triggered today
      if (event.time === currentTime) {
        const lastTriggeredDate = event.lastTriggered
          ? new Date(event.lastTriggered).toDateString()
          : null;

        if (lastTriggeredDate !== today) {
          event.lastTriggered = Date.now();
          this.saveSchedule();
          this.onTrigger(event);
        }
      }
    }
  }

  private loadSchedule(): void {
    const stored = localStorage.getItem('jarvis_schedule');
    if (stored) {
      this.events = JSON.parse(stored);
    } else {
      // Default schedule
      this.events = [
        { id: 'morning', type: 'morning_briefing', time: '08:00', enabled: true },
        { id: 'midday', type: 'midday_checkin', time: '12:00', enabled: true },
        { id: 'evening', type: 'evening_checkin', time: '17:00', enabled: true },
      ];
      this.saveSchedule();
    }
  }

  private saveSchedule(): void {
    localStorage.setItem('jarvis_schedule', JSON.stringify(this.events));
  }
}
```

### Pattern 2: Data Aggregation for Briefings
**What:** Collect data from multiple Notion databases in parallel
**When to use:** Morning briefing, check-ins, dashboard refresh
**Example:**
```typescript
// src/lib/jarvis/executive/BriefingBuilder.ts

interface BriefingData {
  tasks: { today: TaskProperties[]; overdue: TaskProperties[] };
  bills: { thisWeek: BillProperties[]; total: number };
  habits: { active: HabitProperties[]; streakSummary: string };
  goals: { active: GoalProperties[] };
}

export async function buildMorningBriefing(): Promise<BriefingData> {
  // Parallel queries for all data sources
  const [tasks, bills, habits, goals] = await Promise.all([
    executeNotionTool('query_tasks', { filter: 'today', status: 'pending' }),
    executeNotionTool('query_bills', { timeframe: 'this_week' }),
    executeNotionTool('query_habits', { frequency: 'all' }),
    executeNotionTool('query_goals', { status: 'active' }),
  ]);

  // Also get overdue tasks
  const overdueTasks = await executeNotionTool('query_tasks', {
    filter: 'overdue',
    status: 'pending'
  });

  return {
    tasks: {
      today: parseTasks(tasks),
      overdue: parseTasks(overdueTasks)
    },
    bills: {
      thisWeek: parseBills(bills),
      total: parseBills(bills).reduce((sum, b) => sum + b.amount, 0),
    },
    habits: {
      active: parseHabits(habits),
      streakSummary: buildStreakSummary(parseHabits(habits)),
    },
    goals: {
      active: parseGoals(goals),
    },
  };
}
```

### Pattern 3: Nudge Delivery with Sound + Visual
**What:** Gentle notification using audio and visual indicator
**When to use:** Time nudges for calendar, deadlines, bills
**Example:**
```typescript
// src/lib/jarvis/executive/NudgeManager.ts

export class NudgeManager {
  private audioContext: AudioContext | null = null;
  private notificationSound: AudioBuffer | null = null;

  async playNudgeSound(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      // Load gentle chime sound
      const response = await fetch('/sounds/gentle-chime.mp3');
      const arrayBuffer = await response.arrayBuffer();
      this.notificationSound = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.notificationSound;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

  showVisualNudge(message: string): void {
    // Update store to show nudge overlay
    useJarvisStore.getState().setActiveNudge({
      message,
      timestamp: Date.now(),
      acknowledged: false,
    });
  }

  // For voice delivery (when user engages)
  async speakNudge(message: string): Promise<void> {
    // Use existing voice pipeline
    const pipeline = new VoicePipeline();
    // TTS will handle orb state transitions
    await pipeline.speak(message);
  }
}
```

### Pattern 4: Dashboard State Management
**What:** Zustand store for dashboard visibility and configuration
**When to use:** Managing which sections are visible, pinned items
**Example:**
```typescript
// src/lib/jarvis/stores/dashboardStore.ts

interface DashboardState {
  isVisible: boolean;
  sections: {
    tasks: { visible: boolean; expanded: boolean };
    calendar: { visible: boolean; expanded: boolean };
    habits: { visible: boolean; expanded: boolean };
    bills: { visible: boolean; expanded: boolean };
  };
  pinnedItems: string[]; // page IDs
  defaultView: 'minimal' | 'moderate' | 'full';
}

export const useDashboardStore = create<DashboardState & DashboardActions>((set) => ({
  isVisible: true,
  sections: {
    tasks: { visible: true, expanded: true },
    calendar: { visible: true, expanded: false },
    habits: { visible: true, expanded: false },
    bills: { visible: true, expanded: false },
  },
  pinnedItems: [],
  defaultView: 'moderate',

  toggleSection: (section) => set((s) => ({
    sections: {
      ...s.sections,
      [section]: { ...s.sections[section], visible: !s.sections[section].visible }
    }
  })),

  pinItem: (pageId) => set((s) => ({
    pinnedItems: [...s.pinnedItems, pageId]
  })),

  unpinItem: (pageId) => set((s) => ({
    pinnedItems: s.pinnedItems.filter(id => id !== pageId)
  })),
}));
```

### Anti-Patterns to Avoid
- **Server-side cron in serverless:** Don't try to run node-cron in Vercel - process dies between requests
- **Polling too frequently:** 1-minute intervals are enough for schedule checks
- **Blocking the main thread:** Use requestIdleCallback for non-urgent dashboard updates
- **Over-fetching Notion data:** Cache briefing data, refresh only when stale or on user request
- **Modal interruptions:** Nudges should be subtle overlays, not modal dialogs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date/time parsing | Manual string parsing | date-fns | Timezone handling, relative dates |
| Notification sounds | Raw Web Audio oscillator | Pre-made audio files | Sound design is hard, use gentle chimes |
| Data fetching state | Manual loading/error state | TanStack Query or SWR | Caching, deduplication, retry logic |
| Speech synthesis | Browser TTS directly | Existing SpeechClient | Already has Polly integration, orb sync |
| Orb state management | Manual setState calls | Existing OrbStateManager | Already handles transitions, colors |

**Key insight:** The existing codebase has excellent patterns for voice pipeline, orb animation, and Notion integration. Extend these, don't rebuild them.

## Common Pitfalls

### Pitfall 1: Scheduler Drift in Background Tabs
**What goes wrong:** Browser throttles setInterval when tab is unfocused, schedule drift occurs
**Why it happens:** Browsers reduce timer frequency to save battery
**How to avoid:** Use visibilitychange event to catch up when tab regains focus; use timestamps not intervals for "time since last check"
**Warning signs:** Briefings triggering late or being skipped

### Pitfall 2: Overwhelming with Nudges
**What goes wrong:** Too many nudges annoy user, they disable the feature
**Why it happens:** Nudging for every small thing
**How to avoid:** Per CONTEXT.md - only nudge for calendar transitions, deadlines, bills, business deadlines. NOT for breaks or general reminders
**Warning signs:** User feedback about being bothered

### Pitfall 3: Briefing Too Long for Voice
**What goes wrong:** TTS takes 5+ minutes, user disengages
**Why it happens:** Reading every task, every bill, every habit
**How to avoid:** Per CONTEXT.md - just titles, skip empty sections, checkpoint after each section. Let user skip
**Warning signs:** Briefing exceeds 2-3 minutes

### Pitfall 4: Calendar Integration OAuth Complexity
**What goes wrong:** Complex OAuth flow for Google Calendar deters users
**Why it happens:** Trying to integrate external calendars
**How to avoid:** Start with Notion Calendar integration (already available via Notion API). Add external calendars later as optional
**Warning signs:** Setup abandonment

### Pitfall 5: Dashboard Blocks Orb Interaction
**What goes wrong:** Dashboard overlay intercepts taps meant for orb
**Why it happens:** CSS stacking, pointer events wrong
**How to avoid:** Dashboard should be beside orb, not over it. Orb z-index highest. Test on mobile
**Warning signs:** "Can't tap the orb" bug reports

### Pitfall 6: Review Cadence Property Missing
**What goes wrong:** Can't implement "surface items due for review based on their cadence"
**Why it happens:** Notion database doesn't have review cadence property
**How to avoid:** Check if property exists, provide graceful fallback (review everything), suggest adding property
**Warning signs:** "Property does not exist" errors

## Code Examples

### Briefing Flow State Machine
```typescript
// src/lib/jarvis/executive/BriefingFlow.ts

type BriefingSection = 'outline' | 'tasks' | 'calendar' | 'bills' | 'habits' | 'complete';

interface BriefingFlowState {
  currentSection: BriefingSection;
  data: BriefingData | null;
  skippedSections: Set<BriefingSection>;
}

export class BriefingFlow {
  private state: BriefingFlowState;
  private voicePipeline: VoicePipeline;

  constructor(voicePipeline: VoicePipeline) {
    this.voicePipeline = voicePipeline;
    this.state = {
      currentSection: 'outline',
      data: null,
      skippedSections: new Set(),
    };
  }

  async start(): Promise<void> {
    // Fetch all data
    this.state.data = await buildMorningBriefing();

    // Present outline
    const sections = this.getAvailableSections();
    const outline = `Good morning. Today we'll cover ${sections.join(', ')}. Ready to begin?`;
    await this.voicePipeline.speak(outline);
    // Wait for user confirmation (via voice or tap)
  }

  async advanceToNext(): Promise<void> {
    const order: BriefingSection[] = ['tasks', 'calendar', 'bills', 'habits', 'complete'];
    const currentIndex = order.indexOf(this.state.currentSection);

    // Find next non-skipped, non-empty section
    for (let i = currentIndex + 1; i < order.length; i++) {
      const section = order[i];
      if (!this.state.skippedSections.has(section) && this.hasSectionData(section)) {
        this.state.currentSection = section;
        await this.presentSection(section);
        return;
      }
    }

    // All done
    await this.voicePipeline.speak("That's everything. Anything else before we start the day?");
  }

  skipCurrentSection(): void {
    this.state.skippedSections.add(this.state.currentSection);
    this.advanceToNext();
  }

  private async presentSection(section: BriefingSection): Promise<void> {
    const data = this.state.data!;
    let script = '';

    switch (section) {
      case 'tasks':
        const taskCount = data.tasks.today.length + data.tasks.overdue.length;
        if (data.tasks.overdue.length > 0) {
          script = `You have ${data.tasks.overdue.length} overdue tasks. `;
        }
        script += `Today: ${data.tasks.today.map(t => t.title).slice(0, 5).join(', ')}.`;
        if (data.tasks.today.length > 5) {
          script += ` Plus ${data.tasks.today.length - 5} more.`;
        }
        break;

      case 'bills':
        if (data.bills.thisWeek.length === 0) {
          script = 'No bills due this week. Moving on.';
        } else {
          script = `${data.bills.thisWeek.length} bills due this week, $${data.bills.total.toFixed(0)} total.`;
        }
        break;

      case 'habits':
        script = data.habits.streakSummary || 'Your habits are on track.';
        break;

      case 'complete':
        script = "That covers everything. Ready to start the day?";
        break;
    }

    await this.voicePipeline.speak(script);
    // Then: "Any questions about this section, or shall we continue?"
  }

  private hasSectionData(section: BriefingSection): boolean {
    const data = this.state.data!;
    switch (section) {
      case 'tasks': return data.tasks.today.length > 0 || data.tasks.overdue.length > 0;
      case 'bills': return true; // Always mention, even if empty
      case 'habits': return data.habits.active.length > 0;
      default: return true;
    }
  }

  private getAvailableSections(): string[] {
    const sections = [];
    if (this.state.data?.tasks.today.length || this.state.data?.tasks.overdue.length) {
      sections.push('tasks');
    }
    sections.push('calendar'); // Always include
    if (this.state.data?.bills.thisWeek.length) {
      sections.push('bills');
    }
    if (this.state.data?.habits.active.length) {
      sections.push('habits');
    }
    return sections;
  }
}
```

### Dashboard Component Structure
```typescript
// src/components/jarvis/Dashboard/DashboardPanel.tsx

'use client';

import { useDashboardStore } from '@/lib/jarvis/stores/dashboardStore';
import { TasksList } from './TasksList';
import { CalendarEvents } from './CalendarEvents';
import { HabitProgress } from './HabitProgress';
import { BillsSummary } from './BillsSummary';

interface DashboardPanelProps {
  data: BriefingData | null;
  loading: boolean;
}

export function DashboardPanel({ data, loading }: DashboardPanelProps) {
  const { sections, isVisible } = useDashboardStore();

  if (!isVisible) return null;

  return (
    <aside className="fixed right-4 top-4 bottom-4 w-80
                      bg-black/60 backdrop-blur-md rounded-2xl
                      border border-white/10 overflow-y-auto
                      pointer-events-auto z-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <h2 className="text-white/80 text-sm font-medium">Today</h2>

        {/* Tasks Section */}
        {sections.tasks.visible && (
          <TasksList
            tasks={data?.tasks.today || []}
            overdue={data?.tasks.overdue || []}
            loading={loading}
            expanded={sections.tasks.expanded}
          />
        )}

        {/* Calendar Events */}
        {sections.calendar.visible && (
          <CalendarEvents
            loading={loading}
            expanded={sections.calendar.expanded}
          />
        )}

        {/* Habits */}
        {sections.habits.visible && (
          <HabitProgress
            habits={data?.habits.active || []}
            loading={loading}
            expanded={sections.habits.expanded}
          />
        )}

        {/* Bills */}
        {sections.bills.visible && (
          <BillsSummary
            bills={data?.bills.thisWeek || []}
            total={data?.bills.total || 0}
            loading={loading}
            expanded={sections.bills.expanded}
          />
        )}
      </div>
    </aside>
  );
}
```

### Priority "Needs Attention" Indicator
```typescript
// src/components/jarvis/PriorityIndicator.tsx

interface PriorityIndicatorProps {
  type: 'overdue' | 'urgent' | 'deadline_near';
  pulsing?: boolean;
}

export function PriorityIndicator({ type, pulsing = true }: PriorityIndicatorProps) {
  const colors = {
    overdue: 'bg-red-500',
    urgent: 'bg-orange-500',
    deadline_near: 'bg-yellow-500',
  };

  return (
    <span className={`
      inline-flex h-2 w-2 rounded-full ${colors[type]}
      ${pulsing ? 'animate-pulse' : ''}
    `} />
  );
}
```

## Calendar Integration Strategy

### Current State
- Notion MCP provides access to databases with Date properties
- Tasks have "Do Dates" property
- No direct Google Calendar integration

### Recommended Approach (Phase 5)
1. **Use Notion Calendar sync**: Notion Calendar can sync with Google Calendar. Query Notion databases for date properties.
2. **Query date-based events**: Use existing `query_tasks` with date filters
3. **Add calendar events database**: If user has a separate Events/Calendar database, add query tool

### Future Enhancement (Post Phase 5)
- Google Calendar API direct integration requires OAuth flow
- Consider as optional feature for users without Notion Calendar

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side cron | Client-side scheduler + Vercel Cron | 2023+ | Works in serverless |
| Modal notifications | Subtle overlays + sound | User preference | Less intrusive |
| Pull-based data | Combination pull/push | 2024+ | Better UX |
| Single voice response | Structured flows with checkpoints | CONTEXT.md decision | User control |

**Deprecated/outdated:**
- Server-side setInterval in serverless: Process dies between requests
- Notification sound property: No browser support, use Web Audio instead
- Fixed briefing scripts: Use dynamic, data-driven content

## Open Questions

1. **Notification sound file source**
   - What we know: Need gentle chime, not jarring alert
   - What's unclear: License-free sound file to use
   - Recommendation: Use royalty-free chime from Freesound, or synthesize simple tone with Web Audio

2. **Calendar events data source**
   - What we know: User mentioned calendar in briefing sections
   - What's unclear: Is there a separate Calendar/Events database in Notion, or use Task due dates?
   - Recommendation: Query Tasks with dates; add separate calendar tool if database exists

3. **Review cadence property format**
   - What we know: CONTEXT.md mentions "review frequency property (daily, every other day, weekly)"
   - What's unclear: Exact property name and format in user's Notion setup
   - Recommendation: Discovery during implementation; document expected schema

4. **Mobile responsiveness**
   - What we know: Dashboard beside orb on desktop
   - What's unclear: How to handle on mobile where screen width is limited
   - Recommendation: Collapsible dashboard drawer on mobile, orb stays visible

5. **Background tab behavior**
   - What we know: Need to trigger briefings at specific times
   - What's unclear: How aggressive should catch-up be when tab regains focus?
   - Recommendation: Check if scheduled event was missed in last hour; if so, ask user if they want it now

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis - jarvisStore.ts, VoicePipeline.ts, toolExecutor.ts, schemas.ts
- 05-CONTEXT.md - User decisions on briefing structure, nudge behavior, dashboard layout
- 04-RESEARCH.md - Notion MCP patterns, tool definitions

### Secondary (MEDIUM confidence)
- [Web Notifications API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) - Notification patterns
- [Vercel Next.js Cron](https://github.com/vercel/next.js/discussions/33989) - Serverless scheduling options
- [Notion MCP Supported Tools](https://developers.notion.com/docs/mcp-supported-tools) - Available Notion operations
- [Google Calendar API JS](https://developers.google.com/calendar/api/quickstart/js) - Future calendar integration reference

### Tertiary (LOW confidence)
- [TailAdmin React Dashboard](https://tailadmin.com/react-components) - Dashboard component patterns
- [Inngest Next.js Background Jobs](https://www.inngest.com/blog/run-nextjs-functions-in-the-background) - Alternative scheduling approach

## Metadata

**Confidence breakdown:**
- Scheduler pattern: MEDIUM - Client-side approach proven but browser throttling adds complexity
- Dashboard components: HIGH - Standard React patterns, existing codebase has good examples
- Briefing flow: HIGH - Follows CONTEXT.md decisions exactly
- Calendar integration: LOW - Depends on user's Notion setup, may need discovery
- Nudge delivery: MEDIUM - Sound implementation straightforward, timing logic needs testing

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - patterns stable, browser APIs stable)
