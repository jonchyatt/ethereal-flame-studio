# Phase 6: Advanced Executive Function - Research

**Researched:** 2026-02-01
**Domain:** Voice-guided executive function workflows (evening wrap, weekly review, life area weighting)
**Confidence:** HIGH

## Summary

Phase 6 extends the existing executive function infrastructure (Scheduler, BriefingFlow, CheckInManager) with three new capabilities: comprehensive evening wrap workflow, life area priority weighting for triage, and voice-guided weekly review sessions.

The codebase already has robust patterns for multi-section voice flows (BriefingFlow), phase-based check-ins (CheckInManager), scheduled events with localStorage persistence (Scheduler), and parallel Notion data fetching (BriefingBuilder). Phase 6 builds directly on these patterns rather than introducing new architectural approaches.

Key insight: The existing CheckInManager evening check-in is a lightweight version of the evening wrap. Phase 6 expands it into a full "EveningWrapFlow" with more sections (day review, tomorrow preview, week summary, finance, capture) while maintaining the same skippable, checkpoint-based interaction pattern.

**Primary recommendation:** Create EveningWrapFlow and WeeklyReviewFlow as new flow classes following the BriefingFlow pattern, add LifeAreaTracker as a new service for weighting calculations, and store life area activity history in localStorage with rolling window aggregation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | ^4.x | State management with persist middleware | Already used throughout codebase (jarvisStore, dashboardStore) |
| date-fns | ^3.x | Date manipulation and formatting | Already used in Scheduler, BriefingBuilder |
| Notion MCP | Latest | Notion data access | Established in Phase 4 via NotionClient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/middleware | ^4.x | localStorage persistence | Store life area weights and activity history |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage | IndexedDB | More complex, overkill for small config data |
| Rolling window in memory | SQL window functions | No database, localStorage is sufficient |
| XState | Custom flow classes | XState is powerful but overkill; existing BriefingFlow pattern works well |

**Installation:**
```bash
# No new dependencies required - use existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/jarvis/executive/
  BriefingBuilder.ts       # Existing - add life area activity query
  BriefingFlow.ts          # Existing - morning briefing pattern
  CheckInManager.ts        # Existing - reference for phase-based flow
  EveningWrapFlow.ts       # NEW - comprehensive evening wrap
  WeeklyReviewFlow.ts      # NEW - weekly review session
  LifeAreaTracker.ts       # NEW - activity tracking & weight calculation
  Scheduler.ts             # Existing - add evening_wrap, weekly_review events
  types.ts                 # Existing - extend with new types
```

### Pattern 1: Multi-Section Voice Flow (Existing)

**What:** State machine pattern for voice-guided multi-step workflows
**When to use:** Any workflow with multiple sections, checkpoints, and user response handling
**Example:**
```typescript
// Source: BriefingFlow.ts (existing pattern)
class EveningWrapFlow {
  private static readonly SECTION_ORDER: EveningWrapSection[] = [
    'outline',        // "Tonight we'll cover day review, tomorrow preview..."
    'dayReview',      // Completed + incomplete tasks (factual)
    'taskUpdates',    // "Want to update any task statuses?"
    'newCaptures',    // "Anything to capture before tomorrow?"
    'tomorrowPreview', // Tomorrow's tasks (brief)
    'weekSummary',    // High-level week overview
    'financeCheck',   // Bills due soon
    'closing',        // "Anything else on your mind?"
    'complete',
  ];

  async advanceToNext(): Promise<void> {
    // Find next non-skipped, non-empty section
    // Present section content
    // Set isWaitingForResponse = true
  }

  async handleUserResponse(response: string): Promise<void> {
    // Skip/continue/capture logic
  }
}
```

### Pattern 2: Rolling Window Activity Tracking

**What:** Track activity per life area over rolling time window for baseline calculation
**When to use:** Calculating "relative to baseline" neglect detection
**Example:**
```typescript
// Source: Research synthesis from rolling window algorithms
interface LifeAreaActivity {
  areaId: string;
  areaName: string;
  activityCounts: {
    [dateISO: string]: number;  // e.g., "2026-02-01": 3
  };
  userBaseline: number;         // User-set expected activity (tasks/week)
  calculatedBaseline: number;   // Rolling 4-week average
}

function calculateNeglect(area: LifeAreaActivity): number {
  const recentActivity = sumLast7Days(area.activityCounts);
  const baseline = area.userBaseline || area.calculatedBaseline;
  return (baseline - recentActivity) / baseline;  // 0-1, higher = more neglected
}
```

### Pattern 3: Checkpoint Pause Pattern

**What:** Pause at key points for user input, with configurable timeout
**When to use:** Weekly review interactivity, evening wrap capture phases
**Example:**
```typescript
// Source: CheckInManager.ts (existing pattern)
private async presentCheckpoint(section: string, message: string): Promise<void> {
  await this.speak(message);
  this.state.isWaitingForResponse = true;

  // Auto-continue after timeout if no response
  this.checkpointTimer = setTimeout(() => {
    this.advanceToNext();
  }, this.config.checkpointTimeout);  // e.g., 15 seconds
}

handleResponse(response: string): void {
  clearTimeout(this.checkpointTimer);
  if (this.isAddContent(response)) {
    // User is adding content, stay in this section
    this.captureContent(response);
  } else {
    this.advanceToNext();
  }
}
```

### Pattern 4: Zustand Persist for User Preferences

**What:** Persist user-configurable settings to localStorage with Zustand middleware
**When to use:** Evening wrap time, weekly review day, life area weights
**Example:**
```typescript
// Source: Zustand documentation
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LifeAreaStore {
  weights: Record<string, number>;  // areaId -> weight (0-1)
  activityHistory: LifeAreaActivity[];
  setWeight: (areaId: string, weight: number) => void;
  recordActivity: (areaId: string) => void;
}

export const useLifeAreaStore = create<LifeAreaStore>()(
  persist(
    (set, get) => ({
      weights: {},
      activityHistory: [],
      setWeight: (areaId, weight) =>
        set(state => ({
          weights: { ...state.weights, [areaId]: weight }
        })),
      recordActivity: (areaId) => {
        const today = new Date().toISOString().split('T')[0];
        // Update activity count for area on today's date
      },
    }),
    {
      name: 'jarvis-life-areas',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Anti-Patterns to Avoid
- **Monolithic flow class:** Don't put all workflow logic in one giant class. Separate EveningWrapFlow and WeeklyReviewFlow.
- **Hardcoded section order:** Allow sections to be optional/skipped based on content availability.
- **Blocking state checks:** Don't query Notion on every section transition; fetch all data upfront like BriefingBuilder.
- **Complex neglect algorithms:** Keep baseline calculation simple; rolling average is sufficient.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State persistence | Custom localStorage wrapper | Zustand persist middleware | Handles serialization, hydration, SSR edge cases |
| Date arithmetic | Manual date math | date-fns functions | Edge cases around month boundaries, DST |
| Notion queries | Raw fetch calls | Existing callMCPTool + BriefingBuilder | MCP protocol, response unwrapping already handled |
| Scheduled events | Custom setInterval | Existing Scheduler class | Handles tab visibility, missed events, persistence |

**Key insight:** Phase 5 built all the infrastructure. Phase 6 is composition, not construction.

## Common Pitfalls

### Pitfall 1: Forgetting SSR Hydration for localStorage

**What goes wrong:** Next.js server-renders with default values, client hydrates with localStorage values, causing UI flash.
**Why it happens:** Zustand persist loads async after initial render.
**How to avoid:** Use `skipHydration` option or show loading state until hydrated.
**Warning signs:** UI elements "flash" on page load, console warnings about hydration mismatch.

```typescript
// Prevention pattern
const useLifeAreaStore = create<LifeAreaStore>()(
  persist(
    // ... store definition
    {
      name: 'jarvis-life-areas',
      skipHydration: true,  // Manually trigger hydration
    }
  )
);

// In component
useEffect(() => {
  useLifeAreaStore.persist.rehydrate();
}, []);
```

### Pitfall 2: Missed Event Detection Window Too Small

**What goes wrong:** User closes browser for 2 hours, comes back, missed events not detected.
**Why it happens:** Current Scheduler checks 1-hour window for missed events.
**How to avoid:** Extend window for evening wrap (could be missed by hours) or track "last completed" separately.
**Warning signs:** Users report missing evening wrap prompts after extended absence.

### Pitfall 3: Life Area Activity Double-Counting

**What goes wrong:** Completing a task increments activity for its life area, but also increments again when task status changes to "Completed".
**Why it happens:** Multiple code paths that could trigger activity recording.
**How to avoid:** Activity recording should be idempotent per (taskId, date) pair.
**Warning signs:** Activity counts seem inflated compared to actual work.

### Pitfall 4: Weekly Review Timing Ambiguity

**What goes wrong:** User configures "weekly review on Sunday" but system treats it as midnight Sunday (start of week) vs end of Sunday.
**Why it happens:** Ambiguous interpretation of "on Sunday".
**How to avoid:** Explicitly document and implement as "reminder appears Sunday morning, user initiates when ready".
**Warning signs:** Weekly review prompts at unexpected times.

### Pitfall 5: Evening Wrap Duration Creep

**What goes wrong:** Evening wrap takes 15+ minutes, user starts skipping it entirely.
**Why it happens:** Too many sections, too much detail per section.
**How to avoid:** Per CONTEXT.md: "Duration: flexible based on how much happened that day" - empty/light days should be very short.
**Warning signs:** User feedback about evening wrap being tedious.

## Code Examples

Verified patterns from existing codebase:

### Evening Wrap Data Structure
```typescript
// Extend BriefingData for evening wrap
interface EveningWrapData extends BriefingData {
  dayReview: {
    completedTasks: TaskSummary[];
    incompleteTasks: TaskSummary[];
    completionRate: number;  // 0-1
  };
  tomorrow: {
    tasks: TaskSummary[];
    events: CalendarEvent[];
  };
  weekSummary: {
    busyDays: string[];      // ["Monday", "Wednesday"]
    lightDays: string[];     // ["Thursday", "Friday"]
    upcomingDeadlines: TaskSummary[];
  };
  lifeAreaInsights: {
    neglectedAreas: LifeAreaNeglect[];  // Areas below baseline
    activeAreas: string[];               // Areas at or above baseline
  };
}

interface LifeAreaNeglect {
  areaId: string;
  areaName: string;
  neglectScore: number;      // 0-1, higher = more neglected
  suggestedMessage: string;  // "Health has been quiet this week"
}
```

### Weekly Review Section Order
```typescript
// Per CONTEXT.md: "very brief retrospective, then mostly forward planning"
const WEEKLY_REVIEW_SECTIONS: WeeklyReviewSection[] = [
  'intro',           // "Let's do our weekly review. Ready?"
  'retrospective',   // Brief: tasks completed, bills paid, project progress
  'checkpoint1',     // "Anything to add about this week?"
  'upcomingWeek',    // Next 7 days tasks and events
  'checkpoint2',     // "Anything to adjust?"
  'horizonScan',     // Notable items 2-4 weeks out
  'checkpoint3',     // "Anything to add?"
  'lifeAreas',       // Surface neglected areas
  'closing',         // "Weekly review complete. Anything else?"
  'complete',
];
```

### Life Area Weight Configuration
```typescript
// Life areas from Notion (via Area relation)
// User sets baseline weights in settings
interface LifeAreaConfig {
  id: string;
  name: string;
  userPriority: number;      // User-set importance (1-5)
  expectedActivityPerWeek: number;  // User-set baseline
  color?: string;            // For visual display
}

// Weights stored in localStorage
const defaultWeights: Record<string, LifeAreaConfig> = {
  'health': { id: 'health', name: 'Health', userPriority: 5, expectedActivityPerWeek: 7 },
  'work': { id: 'work', name: 'Work', userPriority: 4, expectedActivityPerWeek: 20 },
  'relationships': { id: 'relationships', name: 'Relationships', userPriority: 4, expectedActivityPerWeek: 5 },
  // ... etc
};
```

### Scheduler Event Type Extension
```typescript
// Extend existing ScheduledEvent type
type ScheduledEventType =
  | 'morning_briefing'
  | 'midday_checkin'
  | 'evening_checkin'
  | 'evening_wrap'      // NEW: comprehensive evening wrap (Plan 06-01)
  | 'weekly_review_reminder'  // NEW: reminder that review is due (Plan 06-03)
  | 'nudge';

interface ScheduledEvent {
  id: string;
  type: ScheduledEventType;
  time: string;           // HH:mm format
  enabled: boolean;
  lastTriggered?: number;
  dayOfWeek?: number;     // NEW: for weekly_review_reminder (0=Sun, 6=Sat)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Complex XState machines | Simple class-based flows | Phase 5 | BriefingFlow pattern works well, no need for XState complexity |
| Server-side state | Client-side localStorage | Phase 5 | Scheduler uses localStorage, extend for life areas |
| Fixed check-in structure | Flexible section ordering | Phase 5 | CheckInManager adapts based on data availability |

**Deprecated/outdated:**
- None for this phase - we're extending established patterns

## Open Questions

Things that couldn't be fully resolved:

1. **Life Area Discovery from Notion**
   - What we know: Projects, Goals, Habits all have "Area" relation property
   - What's unclear: Is there a dedicated "Life Areas" database, or are areas just unique values from relations?
   - Recommendation: Query for unique area values across databases; if a Life Areas database exists, use it. Otherwise, derive from relation values.

2. **Baseline Activity Calculation Window**
   - What we know: Rolling window is the right approach
   - What's unclear: Optimal window size (2 weeks? 4 weeks? 6 weeks?)
   - Recommendation: Start with 4-week rolling window; configurable if needed.

3. **Missed Prompt Follow-up Timing**
   - What we know: Per CONTEXT.md, "gentle follow-up next interaction" for missed prompts
   - What's unclear: How long to wait before considering a prompt "missed"?
   - Recommendation: If evening wrap not completed by bedtime (configurable, default 11pm), mark as missed. Follow up next morning.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `BriefingFlow.ts`, `CheckInManager.ts`, `Scheduler.ts`, `BriefingBuilder.ts`
- 06-CONTEXT.md user decisions
- Zustand official documentation: [Persisting store data](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)

### Secondary (MEDIUM confidence)
- Rolling window algorithms: [Milvus AI Quick Reference](https://milvus.io/ai-quick-reference/what-is-a-rolling-window-in-time-series-analysis)
- GTD Weekly Review best practices: [Forte Labs](https://fortelabs.com/blog/the-weekly-review-is-an-operating-system/), [Asian Efficiency](https://www.asianefficiency.com/productivity/gtd-weekly-review/)
- XState workflow patterns: [Stately.ai docs](https://stately.ai/docs/xstate) (determined overkill for this use case)

### Tertiary (LOW confidence)
- None - all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing libraries only
- Architecture: HIGH - Extending established BriefingFlow/CheckInManager patterns
- Life area weighting: MEDIUM - Algorithm is sound, Notion schema for areas needs discovery
- Pitfalls: HIGH - Based on actual codebase patterns and known Next.js/Zustand issues

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable patterns, no rapidly changing dependencies)
