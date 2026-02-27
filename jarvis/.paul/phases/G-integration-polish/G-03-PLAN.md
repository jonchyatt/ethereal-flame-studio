---
phase: G-integration-polish
plan: 03
type: execute
wave: 2
depends_on: ["G-02"]
files_modified:
  - src/lib/jarvis/stores/toastStore.ts
  - src/components/jarvis/primitives/Toast.tsx
  - src/lib/jarvis/hooks/useExecutiveBridge.ts
  - src/components/jarvis/layout/JarvisShell.tsx
  - src/components/jarvis/home/BriefingCard.tsx
autonomous: true
---

<objective>
## Goal
Make the new /jarvis/app shell feel alive by wiring the Scheduler as a proactive conversation trigger — not just a notification bell. Scheduled events surface data-driven, notification-mode-aware toasts with a "Chat" action that opens ChatOverlay with a pre-loaded prompt, turning every scheduled moment into a one-tap entry into an AI-powered executive conversation.

## Purpose
The integration audit found all executive functions orphaned from the new shell. But the old shell's approach (NudgeManager, chimes, voice flows) was designed for voice-first. Porting it would create double-fetching, unwanted audio, and redundant notifications.

The text-first insight: Priority Home with urgency-scored PriorityItems IS the nudge system. NudgeManager is redundant. What the new shell actually needs is TEMPORAL AWARENESS — Jarvis knowing what time of day it is and proactively offering help.

The genius-level insight: a toast is a dead end. A toast with a "Chat" action is a gateway to a conversation. The morning briefing toast doesn't just say "5 tasks today" — it offers one tap into "Walk me through my morning briefing" via ChatOverlay → /api/jarvis/chat, leveraging the full AI brain (Phases B-D), memory (C, F), and live data (G-02).

Every scheduled event becomes a proactive conversation trigger that ties together every prior phase.

## Output
- `warning` toast variant (amber styling for missed events)
- `useExecutiveBridge` hook — Scheduler + mode-aware data-driven toasts with "Chat" actions
- JarvisShell mounts the hook
- BriefingCard refresh fixed to use refetchJarvisData()
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/STATE.md

## Prior Work (genuine dependencies)
@.paul/phases/G-integration-polish/G-02-SUMMARY.md — refetchJarvisData(), chatStore.openWithMessage()

## Source Files — Scheduler
@src/lib/jarvis/executive/Scheduler.ts — getScheduler(onTrigger, onMissed), destroyScheduler(), singleton pattern
@src/lib/jarvis/executive/types.ts — ScheduledEvent, ScheduledEventType

## Source Files — Stores (read-only context)
@src/lib/jarvis/stores/toastStore.ts — toast.success/error/info, ToastItem variant union, action: { label, onClick }
@src/lib/jarvis/stores/chatStore.ts — openWithMessage(text): sets isPanelOpen + queuedMessage → ChatOverlay auto-sends
@src/lib/jarvis/stores/settingsStore.ts — notificationMode: 'focus'|'active'|'review'|'dnd'
@src/lib/jarvis/stores/homeStore.ts — PriorityItem with urgency/urgencyScore, lastFetched
@src/lib/jarvis/stores/personalStore.ts — tasks, habits, bills arrays

## Source Files — Shell
@src/components/jarvis/layout/JarvisShell.tsx — mounts useJarvisFetch(), useTutorialEngine()
@src/components/jarvis/primitives/Toast.tsx — variantConfig Record, ToastVariant union, action prop
@src/components/jarvis/home/BriefingCard.tsx — imports fetchBriefingData (wrong), freshness dot (correct)
@src/lib/jarvis/hooks/useJarvisFetch.ts — refetchJarvisData(silent?) standalone export
</context>

<acceptance_criteria>

## AC-1: Scheduler Fires Data-Driven Toasts with Chat Action
```gherkin
Given the user is on /jarvis/app and notification mode is 'active'
When the scheduled morning_briefing time arrives (default 08:00)
Then refetchJarvisData() runs to ensure stores have fresh data
And a toast appears with a data-driven summary from store state
  e.g. "Good morning — 5 tasks today, 2 overdue, 1 bill due"
And the toast includes a "Chat" action button
And tapping "Chat" opens ChatOverlay with "Walk me through my morning briefing"
And the AI backend receives this message and responds conversationally
```

## AC-2: Each Event Type Has a Contextual Chat Prompt
```gherkin
Given a scheduled event fires and notification mode allows it
When the toast appears with a "Chat" action
Then the chat prompt is contextual to the event type:
  morning_briefing → "Walk me through my morning briefing"
  midday_checkin → "How's my day going? Walk me through my progress"
  evening_checkin → "Help me review my day and plan tomorrow"
  evening_wrap → "Let's do my evening wrap — what got done and what's tomorrow?"
  weekly_review → "Time for my weekly review — walk me through it"
```

## AC-3: Notification Mode Gates Toast Delivery
```gherkin
Given the notification mode is 'focus' (hospital shift)
When any scheduled event fires
Then refetchJarvisData still runs silently (data stays fresh)
But NO toast appears for midday/evening/wrap events
And morning_briefing toast DOES appear (the ONE event that breaks through focus)
```

## AC-4: DND and Review Suppress All Toasts
```gherkin
Given the notification mode is 'dnd' or 'review'
When any scheduled event fires
Then refetchJarvisData still runs silently
And no toast appears
And the user sees current data when they next check the dashboard
```

## AC-5: Missed Events Show Warning Toast
```gherkin
Given a scheduled event was missed while the tab was backgrounded
When the user returns to the tab and mode allows notification
Then a warning toast (amber) appears: "Missed: Morning Briefing"
And the warning toast ALSO has a "Chat" action with the event's chat prompt
And refetchJarvisData() runs to catch up on stale data
```

## AC-6: No Voice, Audio, or Double-Fetch
```gherkin
Given the executive bridge runs in the new shell
When any scheduled event fires
Then no audio plays (no NudgeManager, no playNudgeSound, no VoicePipeline)
And no separate /api/jarvis/briefing fetch cycle exists (no NudgeManager.startPeriodicCheck)
And no PermissionPrompt for microphone appears
```

## AC-7: Clean Lifecycle
```gherkin
Given the user navigates away from /jarvis/app
When the shell unmounts
Then Scheduler is stopped and destroyed
And no orphaned intervals remain
```

## AC-8: BriefingCard Refresh Fixed
```gherkin
Given the user taps the refresh icon on BriefingCard
When the refresh completes
Then both homeStore and personalStore are repopulated with fresh data
And the freshness dot updates to reflect the new fetch time
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Add warning toast variant + create useExecutiveBridge hook</name>
  <files>
    src/lib/jarvis/stores/toastStore.ts,
    src/components/jarvis/primitives/Toast.tsx,
    src/lib/jarvis/hooks/useExecutiveBridge.ts
  </files>
  <action>
    **Part A — Warning toast variant (surgical edits):**

    1. `toastStore.ts` line 3: Add 'warning' to the variant union:
       ```typescript
       variant: 'success' | 'error' | 'info' | 'warning';
       ```
    2. `toastStore.ts`: Add `toast.warning()` convenience method (same pattern as the others):
       ```typescript
       warning: (message: string, opts?: Omit<AddToastOpts, 'variant' | 'message'>) =>
         useToastStore.getState().addToast({ variant: 'warning', message, ...opts }),
       ```
    3. `Toast.tsx` line 4: Add `AlertTriangle` to the lucide-react import.
    4. `Toast.tsx` line 6: Add 'warning' to `ToastVariant` union.
    5. `Toast.tsx` variantConfig: Add warning entry:
       ```typescript
       warning: { icon: AlertTriangle, borderColor: 'border-l-amber-500', iconColor: 'text-amber-400', progressColor: 'bg-amber-500/40' },
       ```

    **Part B — useExecutiveBridge hook (~130 lines):**

    Create `src/lib/jarvis/hooks/useExecutiveBridge.ts`:

    ```
    'use client';
    ```

    **Imports:**
    - `useEffect` from react
    - `getScheduler`, `destroyScheduler` from `@/lib/jarvis/executive/Scheduler`
    - `refetchJarvisData` from `@/lib/jarvis/hooks/useJarvisFetch`
    - `toast` from `@/lib/jarvis/stores/toastStore`
    - `useChatStore` from `@/lib/jarvis/stores/chatStore`
    - `useSettingsStore` from `@/lib/jarvis/stores/settingsStore`
    - `useHomeStore` from `@/lib/jarvis/stores/homeStore`
    - `usePersonalStore` from `@/lib/jarvis/stores/personalStore`
    - `type ScheduledEvent` from `@/lib/jarvis/executive/types`

    **Constants — human-readable labels + chat prompts:**
    ```typescript
    const EVENT_CONFIG: Record<string, { label: string; chatPrompt: string }> = {
      morning_briefing: {
        label: 'Morning Briefing',
        chatPrompt: 'Walk me through my morning briefing',
      },
      midday_checkin: {
        label: 'Midday Check-in',
        chatPrompt: "How's my day going? Walk me through my progress",
      },
      evening_checkin: {
        label: 'Evening Check-in',
        chatPrompt: 'Help me review my day and plan tomorrow',
      },
      evening_wrap: {
        label: 'Evening Wrap',
        chatPrompt: "Let's do my evening wrap — what got done and what's tomorrow?",
      },
      weekly_review_reminder: {
        label: 'Weekly Review',
        chatPrompt: 'Time for my weekly review — walk me through it',
      },
    };
    ```

    **Notification mode gate — pure function:**
    ```typescript
    function shouldNotify(mode: string, eventType: string): boolean {
      if (mode === 'dnd') return false;
      if (mode === 'review') return false;
      if (mode === 'focus') return eventType === 'morning_briefing';
      return true; // 'active' — all events
    }
    ```
    Rationale:
    - `dnd`: Nothing breaks through.
    - `review`: Toasts suppressed — data refreshes silently, user reviews at their pace.
    - `focus` (hospital): Only morning briefing breaks through. Jonathan checks Jarvis before his shift — this is the ONE toast that matters.
    - `active` (evenings at home): All toasts fire normally.

    **Data-driven message builder — pure function:**
    ```typescript
    function buildEventMessage(eventType: string): string {
      const priorities = useHomeStore.getState().priorityItems;
      const tasks = usePersonalStore.getState().tasks;

      if (eventType === 'morning_briefing') {
        const overdue = priorities.filter(i => i.urgency === 'critical').length;
        const todayTasks = tasks.filter(t => !t.completed && !t.overdue).length;
        const bills = priorities.filter(i => i.id.startsWith('bill-')).length;
        const parts: string[] = [];
        if (todayTasks > 0) parts.push(`${todayTasks} task${todayTasks !== 1 ? 's' : ''} today`);
        if (overdue > 0) parts.push(`${overdue} overdue`);
        if (bills > 0) parts.push(`${bills} bill${bills !== 1 ? 's' : ''} due`);
        return parts.length > 0
          ? `Good morning — ${parts.join(', ')}`
          : 'Good morning — clear day ahead';
      }

      if (eventType === 'midday_checkin') {
        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        if (total === 0) return 'Midday — no tasks tracked today';
        const pct = Math.round((completed / total) * 100);
        if (pct >= 80) return `Midday — ${completed}/${total} done, crushing it`;
        if (pct <= 20 && total > 3) return `Midday — ${completed}/${total} done. Focus on the critical ones`;
        return `Midday — ${completed} of ${total} tasks done`;
      }

      if (eventType === 'evening_checkin') {
        return 'Evening — time to review your day';
      }

      if (eventType === 'evening_wrap') {
        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        return total > 0
          ? `Evening wrap — ${completed}/${total} tasks completed today`
          : 'Evening wrap — ready for tomorrow?';
      }

      const config = EVENT_CONFIG[eventType];
      return config?.label ?? eventType.replace(/_/g, ' ');
    }
    ```
    This reads from zustand stores synchronously AFTER refetchJarvisData() has populated them. The morning briefing tells Jonathan exactly what his day looks like. The midday has personality — "crushing it" or "focus on the critical ones" — based on completion rate. These are contextual messages, not dumb alarms.

    **Chat action builder — pure function:**
    ```typescript
    function openChat(eventType: string): void {
      const config = EVENT_CONFIG[eventType];
      if (config) {
        useChatStore.getState().openWithMessage(config.chatPrompt);
      }
    }
    ```
    Uses the existing chatStore.openWithMessage → ChatOverlay auto-send → /api/jarvis/chat SSE pipeline. The AI backend receives the prompt and responds conversationally with full system prompt, memory, and tools. One tap turns a notification into a full executive conversation.

    **Hook body:**
    ```typescript
    export function useExecutiveBridge(): void {
      useEffect(() => {
        destroyScheduler(); // singleton safety on hot reload

        const handleTrigger = async (event: ScheduledEvent) => {
          // Primary action: refresh data — ALWAYS runs regardless of mode
          await refetchJarvisData(true).catch(() => {});

          // Secondary action: mode-gated toast with chat action
          const mode = useSettingsStore.getState().notificationMode;
          if (!shouldNotify(mode, event.type)) return;

          const message = buildEventMessage(event.type);
          toast.info(message, {
            duration: 10000,
            action: { label: 'Chat', onClick: () => openChat(event.type) },
          });
        };

        const handleMissed = async (event: ScheduledEvent) => {
          await refetchJarvisData(true).catch(() => {});

          const mode = useSettingsStore.getState().notificationMode;
          if (!shouldNotify(mode, event.type)) return;

          const config = EVENT_CONFIG[event.type];
          const label = config?.label ?? event.type;
          toast.warning(`Missed: ${label}`, {
            duration: 8000,
            action: { label: 'Chat', onClick: () => openChat(event.type) },
          });
        };

        const scheduler = getScheduler(handleTrigger, handleMissed);
        scheduler.start();

        return () => { destroyScheduler(); };
      }, []);
    }
    ```

    Key design points:
    - `refetchJarvisData(true)` ALWAYS runs — mode only gates the TOAST, not the fetch. Data stays fresh for when Jonathan checks between patients.
    - `.catch(() => {})` ensures await resolves even if API fails — toast uses whatever store data exists (fresh or stale, better than nothing).
    - `buildEventMessage()` runs AFTER refetch — reads populated stores for accurate counts.
    - Toast duration 10s (longer than normal 4s) — gives time to read AND tap "Chat" if desired.
    - Missed events use `toast.warning` (amber) to visually distinguish from normal info toasts.
    - Both normal and missed events include the "Chat" action — every toast is a gateway to conversation.
    - async handlers: Scheduler calls onTrigger synchronously, async function returns a promise Scheduler doesn't await. Fire-and-forget is correct — matches existing Scheduler behavior.
    - `destroyScheduler()` on BOTH mount (hot reload safety) and unmount (clean lifecycle).
    - Everything inside the useEffect with [] deps — no stale closures because zustand getState() always returns current values.

    **Do NOT:**
    - Import NudgeManager, VoicePipeline, MicrophoneCapture, or any audio modules
    - Import BriefingFlow, CheckInManager, EveningWrapFlow, WeeklyReviewFlow
    - Call fetchBriefingData() directly — useJarvisFetch's refetchJarvisData handles the data cycle
    - Create any UI components — this is a side-effect hook, toasts render via existing ToastContainer
    - Add React state — all state lives in zustand stores, hook reads via getState()
  </action>
  <verify>npm run build passes with zero errors. useExecutiveBridge has no NudgeManager or voice imports. Toast action calls chatStore.openWithMessage.</verify>
  <done>AC-1 through AC-7 satisfied: Scheduler delivers data-driven, mode-aware toasts with proactive chat actions. No voice/audio/double-fetch. Clean lifecycle.</done>
</task>

<task type="auto">
  <name>Task 2: Mount hook in JarvisShell + fix BriefingCard refresh</name>
  <files>src/components/jarvis/layout/JarvisShell.tsx, src/components/jarvis/home/BriefingCard.tsx</files>
  <action>
    **1. JarvisShell.tsx — one-line addition:**
    - Add import: `import { useExecutiveBridge } from '@/lib/jarvis/hooks/useExecutiveBridge';`
    - Add hook call on the line AFTER `useJarvisFetch()` (line 36):
      ```typescript
      useJarvisFetch(); // Central data pipeline — populates homeStore + personalStore
      useExecutiveBridge(); // Scheduler → mode-aware toasts + proactive chat triggers
      ```
    - No other changes. The hook is side-effect only — toasts render via existing ToastContainer.

    **2. BriefingCard.tsx — fix the refresh wiring:**
    - Replace the import on line 8:
      FROM: `import { fetchBriefingData } from '@/lib/jarvis/executive/BriefingClient';`
      TO: `import { refetchJarvisData } from '@/lib/jarvis/hooks/useJarvisFetch';`
    - In handleRefresh, replace the try body with a single call:
      ```typescript
      const handleRefresh = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (refreshing) return;
        setRefreshing(true);
        try {
          await refetchJarvisData();
        } catch {
          // Silent — user sees stale data indicator via freshness dot
        } finally {
          setRefreshing(false);
        }
      }, [refreshing]);
      ```
    - This replaces fetchBriefingData() (fetched data into void) with refetchJarvisData() (fetches AND populates BOTH homeStore and personalStore). The freshness dot, briefing summary, and all personal sub-pages update immediately on manual refresh.
    - Remove the stale TODO comment block (lines 33-39 in original).

    **Do NOT:**
    - Change BriefingCard layout, freshness dot, or expand/collapse behavior (G-02 got this right)
    - Add new UI to JarvisShell
    - Modify any other components or stores
  </action>
  <verify>npm run build passes. BriefingCard imports refetchJarvisData (not fetchBriefingData). JarvisShell calls useExecutiveBridge().</verify>
  <done>AC-8 satisfied: BriefingCard refresh populates both stores. Shell mounts executive bridge.</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/app/jarvis/page.tsx — Old page retains its own executive + voice wiring independently
- src/lib/jarvis/executive/Scheduler.ts — Scheduler class unchanged (proven code, just wire it)
- src/lib/jarvis/executive/NudgeManager.ts — NOT USED in new shell (voice-era, causes double-fetch + sound)
- src/lib/jarvis/executive/CheckInManager.ts — NOT USED (voice-only interactive flows)
- src/lib/jarvis/executive/BriefingFlow.ts — NOT USED (voice-only)
- src/lib/jarvis/executive/EveningWrapFlow.ts — NOT USED (voice-only)
- src/lib/jarvis/executive/WeeklyReviewFlow.ts — NOT USED (voice-only)
- src/lib/jarvis/voice/* — No voice in new shell
- src/lib/jarvis/hooks/useJarvisFetch.ts — Already correct from G-02
- src/lib/jarvis/stores/homeStore.ts — Read-only (getState for message building)
- src/lib/jarvis/stores/personalStore.ts — Read-only (getState for message building)
- src/lib/jarvis/stores/settingsStore.ts — Read-only (check mode)
- src/lib/jarvis/stores/chatStore.ts — Call openWithMessage only (existing pattern from QuickActionsBar)

## SCOPE LIMITS
- NudgeManager intentionally excluded — Priority Home with urgency-scored items IS the text-first nudge system
- No interactive check-in flows — toast → chat prompt → AI handles the conversation
- No audio of any kind — fully silent text-first paradigm
- Scheduler uses persisted localStorage schedule — no UI to customize times (Settings enhancement is separate)
- Notification mode automatic switching (time-based via notificationSchedule) is future work — uses manual toggle
- Chat prompts are simple strings — the AI backend's system prompt + memory handles the intelligence

## DESIGN RATIONALE

**Why no NudgeManager:**
- startPeriodicCheck() calls fetchBriefingData() every 5 min — duplicates useJarvisFetch
- triggerNudge() calls playNudgeSound() — unwanted audio in text-first shell
- Nudges items already visible in PriorityStack (overdue=100, bills=70, calendar=20)
- In text-first, data visibility IS the notification

**Why toast → Chat action:**
- A toast is a dead end — user reads it, done
- A toast with "Chat" is a gateway to a full AI conversation
- chatStore.openWithMessage() → ChatOverlay auto-sends → /api/jarvis/chat SSE
- AI backend has full system prompt, memory, Notion tools — handles briefing/check-in/review conversationally
- One tap turns a notification into an executive walkthrough
- Uses existing infrastructure: no new APIs, no new components

**Why notification mode gating:**
- Jonathan is an anesthesia provider doing 12-hour shifts, 5 days/week
- During shifts (focus): only morning briefing toast — data still refreshes silently
- Evenings at home (active): all toasts fire normally
- DND: total silence, data refreshes in background
- Review: digest mode — no live pings, data refreshes silently

**Forward compatibility:**
- toast.info() → Notification API (browser push) is a future swap-in
- Manual mode toggle → automatic switching via notificationSchedule is planned
- Chat prompts → can evolve to include context (passing task counts to AI for richer response)
- Scheduler event types → can add custom reminders without architecture change

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] toastStore: 'warning' in union + toast.warning() convenience method
- [ ] Toast.tsx: AlertTriangle icon, amber border/icon/progress for warning variant
- [ ] useExecutiveBridge: Scheduler init with destroy-before-init pattern
- [ ] useExecutiveBridge: shouldNotify() gates toasts by notification mode
- [ ] useExecutiveBridge: buildEventMessage() reads stores for data-driven, personality-aware messages
- [ ] useExecutiveBridge: refetchJarvisData(true) ALWAYS runs (mode only gates toast)
- [ ] useExecutiveBridge: toast action calls chatStore.openWithMessage() with event-specific prompt
- [ ] useExecutiveBridge: both normal and missed event toasts have "Chat" action
- [ ] useExecutiveBridge: zero NudgeManager/voice/audio imports
- [ ] useExecutiveBridge: clean unmount via destroyScheduler()
- [ ] JarvisShell: useExecutiveBridge() mounted after useJarvisFetch()
- [ ] BriefingCard: imports refetchJarvisData (not fetchBriefingData)
- [ ] BriefingCard: manual refresh populates both stores
</verification>

<success_criteria>
- Scheduler fires data-driven toasts with personality ("crushing it" / "focus on the critical ones")
- Every toast has a "Chat" action → one tap opens ChatOverlay with contextual AI prompt
- Notification mode respected: focus=morning only, dnd=nothing, review=nothing, active=all
- Data refresh is unconditional — mode only gates the toast, never the fetch
- Missed events show warning toast (amber) with "Chat" action
- Zero voice/audio — no NudgeManager, no sound, no mic permission
- Single data cycle — no double-fetch
- Clean lifecycle: destroy-before-init + cleanup on unmount
- BriefingCard refresh populates both stores
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.paul/phases/G-integration-polish/G-03-SUMMARY.md`
</output>
