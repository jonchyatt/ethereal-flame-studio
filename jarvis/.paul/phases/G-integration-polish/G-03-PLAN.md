---
phase: G-integration-polish
plan: 03
type: execute
wave: 2
depends_on: ["G-01"]
files_modified:
  - src/lib/jarvis/hooks/useExecutiveBridge.ts
  - src/components/jarvis/layout/JarvisShell.tsx
  - src/components/jarvis/home/BriefingCard.tsx
autonomous: true
---

<objective>
## Goal
Bridge the executive functions (Scheduler, NudgeManager, briefing delivery) into the new /jarvis/app shell so it becomes a true life manager — not just a dashboard. The old /jarvis page retains voice-driven executive functions; the new shell gets text-based equivalents using the toast system and BriefingCard.

## Purpose
The integration audit revealed that ALL executive functions are orphaned in the old /jarvis page. The new shell has zero awareness of scheduled events, nudges, or briefing triggers. This plan bridges that gap with a text-first approach: Scheduler fires events → toast notifications appear → BriefingCard refreshes with live data. No voice, no interactive flows — those remain in the old page. This is the minimum bridge that makes the new shell feel alive.

## Output
- New `useExecutiveBridge` hook that initializes Scheduler + NudgeManager in the new shell
- Toast-based notifications for scheduled events (morning briefing, check-ins)
- Nudge display via toast system (overdue tasks, upcoming bills, calendar items)
- BriefingCard auto-refreshes when briefing event fires
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/STATE.md

## Prior Work
@.paul/phases/G-integration-polish/G-02-PLAN.md — Home live data (runs in parallel)

## Source Files — Executive Functions
@src/lib/jarvis/executive/Scheduler.ts — getScheduler(), ScheduledEvent, tab visibility recovery
@src/lib/jarvis/executive/NudgeManager.ts — getNudgeManager(), startPeriodicCheck(), NudgeEvent
@src/lib/jarvis/executive/BriefingClient.ts — fetchBriefingData() for nudge data source

## Source Files — New Shell
@src/components/jarvis/layout/JarvisShell.tsx — Shell layout, mounts hooks
@src/lib/jarvis/stores/toastStore.ts — toast.success/info/warning API
@src/lib/jarvis/stores/homeStore.ts — setBriefingSummary, setPriorityItems (for refresh)

## Source Files — Old Page Reference
@src/app/jarvis/page.tsx — Lines 184-232: How old page wires Scheduler + NudgeManager
</context>

<acceptance_criteria>

## AC-1: Scheduler Runs in New Shell
```gherkin
Given the user is on /jarvis/app (new shell)
When the scheduled time for morning briefing arrives (default 08:00)
Then a toast notification appears: "Good morning — your briefing is ready"
And BriefingCard refreshes with fresh data from /api/jarvis/briefing
And the toast includes a "View" action that scrolls to the briefing section
```

## AC-2: Missed Events Detected on Tab Focus
```gherkin
Given a scheduled event was missed while the tab was in background
When the user returns to the /jarvis/app tab
Then a toast appears: "You missed your [morning briefing / midday check-in]"
And BriefingCard refreshes with current data
```

## AC-3: Nudges Appear as Toasts
```gherkin
Given NudgeManager detects an upcoming calendar event or overdue task
When a nudge is triggered
Then a warning toast appears with the nudge message
And the toast auto-dismisses after 10 seconds (or on tap)
And the nudge is marked as acknowledged
```

## AC-4: No Voice Dependencies
```gherkin
Given the executive bridge runs in the new shell
When any scheduled event or nudge fires
Then no audio plays (no playNudgeSound, no speakNudge, no VoicePipeline)
And no PermissionPrompt appears
And the bridge works without microphone access
```

## AC-5: Clean Lifecycle
```gherkin
Given the user navigates away from /jarvis/app
When the shell unmounts
Then Scheduler is stopped
And NudgeManager periodic check is stopped
And no orphaned intervals remain
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create useExecutiveBridge hook</name>
  <files>src/lib/jarvis/hooks/useExecutiveBridge.ts</files>
  <action>
    Create a hook that initializes text-based executive functions for the new shell.

    **Scheduler integration:**
    1. Call getScheduler(onTrigger, onMissed) on mount
    2. Call scheduler.start()
    3. onTrigger callback:
       - 'morning_briefing': Show toast.info("Good morning — your briefing is ready", { action: { label: 'View', onClick: scrollToBriefing } }). Trigger data refresh by calling the refetch function from useHomeFetch (passed as parameter or obtained from homeStore).
       - 'midday_checkin': Show toast.info("Midday check-in: How's your day going?") — informational only, no interactive flow.
       - 'evening_checkin': Show toast.info("Evening check-in: Time to review your day") — informational only.
       - 'evening_wrap': Show toast.info("Evening wrap: Ready for tomorrow's plan?")
    4. onMissed callback:
       - Show toast.warning(`Missed: ${event.type.replace(/_/g, ' ')}`)
       - Trigger data refresh (same as morning briefing)
    5. On unmount: scheduler.stop()

    **NudgeManager integration:**
    1. Call getNudgeManager() on mount
    2. Call nudgeManager.startPeriodicCheck(fetchBriefingData)
       - fetchBriefingData from '@/lib/jarvis/executive/BriefingClient'
       - This is the same pattern the old page uses (line 226 of page.tsx)
    3. Subscribe to jarvisStore.activeNudge changes:
       - When activeNudge becomes non-null, show toast.warning(activeNudge.message, { duration: 10000 })
       - On toast dismiss: call acknowledgeNudge() on jarvisStore
    4. On unmount: nudgeManager.stopPeriodicCheck()

    **Do NOT:**
    - Import VoicePipeline, MicrophoneCapture, or any audio dependencies
    - Call playNudgeSound() or speakNudge()
    - Create any UI components (this is a hook, not a component)
    - Import CheckInManager or BriefingFlow (voice-only flows, stay in old page)

    **Hook signature:**
    ```typescript
    export function useExecutiveBridge(options?: { refetchHome?: () => void }): void
    ```
    - refetchHome: optional callback to trigger home data refresh (from useHomeFetch)
    - Returns void — side-effect only hook

    **Import from:**
    - getScheduler, destroyScheduler from '@/lib/jarvis/executive/Scheduler'
    - getNudgeManager from '@/lib/jarvis/executive/NudgeManager'
    - fetchBriefingData from '@/lib/jarvis/executive/BriefingClient'
    - toast from '@/lib/jarvis/stores/toastStore'
    - useJarvisStore for activeNudge subscription
  </action>
  <verify>TypeScript compiles via npm run build</verify>
  <done>AC-1, AC-2, AC-3, AC-4, AC-5 logic satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Mount useExecutiveBridge in JarvisShell</name>
  <files>src/components/jarvis/layout/JarvisShell.tsx, src/components/jarvis/home/BriefingCard.tsx</files>
  <action>
    **In JarvisShell.tsx:**
    1. Import useExecutiveBridge from '@/lib/jarvis/hooks/useExecutiveBridge'
    2. Call useExecutiveBridge() inside the component body (after existing hooks)
       - If useHomeFetch exposes a refetch function, pass it: useExecutiveBridge({ refetchHome: refetch })
       - If refetch isn't easily accessible here (it's in the home page, not the shell), skip the parameter — the hook should handle this gracefully by calling homeStore setters directly or by triggering a store-level refresh flag
    3. No UI changes — the hook is side-effect only (toasts render via existing ToastContainer)

    **In BriefingCard.tsx (minor enhancement):**
    1. Add a visual freshness indicator:
       - Read lastFetched from homeStore
       - If lastFetched is within 5 minutes: show small "Live" dot (green, 6px)
       - If lastFetched is 5-30 minutes ago: show "Recent" (amber)
       - If lastFetched is >30 minutes or null: show nothing (don't mislead)
    2. Add a tap/click handler that triggers data refresh:
       - Import the refresh mechanism (either via store action or event)
       - On card tap: call fetchBriefingData() → update homeStore
       - Show brief loading state during fetch

    **Do NOT:**
    - Add voice components to JarvisShell
    - Change the shell layout or chrome
    - Add new UI beyond the freshness dot on BriefingCard
    - Modify any other home components
  </action>
  <verify>npm run build passes. JarvisShell mounts hook without errors.</verify>
  <done>AC-1 through AC-5 fully satisfied: Executive bridge active in new shell with toast notifications and data refresh</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/app/jarvis/page.tsx — Old page retains its own executive function wiring
- src/lib/jarvis/executive/Scheduler.ts — Scheduler itself unchanged
- src/lib/jarvis/executive/NudgeManager.ts — NudgeManager itself unchanged
- src/lib/jarvis/executive/CheckInManager.ts — Not used in new shell (voice-only)
- src/lib/jarvis/executive/BriefingFlow.ts — Not used in new shell (voice-only)
- src/lib/jarvis/voice/* — No voice in new shell
- src/lib/jarvis/stores/toastStore.ts — Toast API already exists, not modified

## SCOPE LIMITS
- Executive bridge is notification-only — no interactive check-in flows in new shell
- Nudges show as toasts, not as dedicated overlay component
- No audio (no chimes, no TTS, no nudge sounds)
- BriefingCard refresh is the only data-refresh trigger (no deep-refresh of all widgets)
- Scheduler uses default schedule — no UI to customize times (settings page enhancement is separate work)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] useExecutiveBridge hook created with Scheduler + NudgeManager initialization
- [ ] JarvisShell mounts the hook
- [ ] Scheduler events produce toast notifications (verified via code review)
- [ ] NudgeManager periodic check starts and nudges produce toasts
- [ ] BriefingCard has freshness indicator and tap-to-refresh
- [ ] No voice/audio imports in new hook or shell
- [ ] Clean unmount: scheduler.stop() and nudgeManager.stopPeriodicCheck()
</verification>

<success_criteria>
- Scheduler fires toast notifications at scheduled times in new shell
- Missed events show toast on tab visibility recovery
- Nudges appear as warning toasts with auto-dismiss
- BriefingCard shows freshness and supports tap-to-refresh
- Zero voice dependencies — fully text-based
- Clean lifecycle management
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.paul/phases/G-integration-polish/G-03-SUMMARY.md`
</output>
