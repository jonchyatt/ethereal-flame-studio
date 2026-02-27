---
phase: G-integration-polish
plan: 03
subsystem: ui
tags: [scheduler, toasts, executive-bridge, notification-mode, chat-trigger]

requires:
  - phase: G-02
    provides: refetchJarvisData(), chatStore.openWithMessage(), live data pipeline
provides:
  - useExecutiveBridge hook — Scheduler wired to mode-aware toasts with Chat actions
  - warning toast variant (amber styling)
  - BriefingCard refresh fix (refetchJarvisData replaces fetchBriefingData)
affects: [G-04-production-verification]

tech-stack:
  added: []
  patterns: [proactive-conversation-trigger, notification-mode-gating, data-driven-toast-messages]

key-files:
  created: [src/lib/jarvis/hooks/useExecutiveBridge.ts]
  modified: [src/lib/jarvis/stores/toastStore.ts, src/components/jarvis/primitives/Toast.tsx, src/components/jarvis/layout/JarvisShell.tsx, src/components/jarvis/home/BriefingCard.tsx]

key-decisions:
  - "Skip NudgeManager — voice-era artifact, redundant with PriorityStack"
  - "Scheduler as proactive conversation trigger — toast Chat → chatStore.openWithMessage → AI"
  - "Notification mode gates toasts not data — refetchJarvisData always runs"
  - "Data-driven messages with personality — 'crushing it' / 'focus on the critical ones'"

patterns-established:
  - "Toast → Chat action pattern: any notification can become a full AI conversation"
  - "Mode gating: dnd=silent, review=silent, focus=morning only, active=all"
  - "buildEventMessage reads stores synchronously after refetch for accurate counts"

duration: ~15min
completed: 2026-02-27
---

# Phase G Plan 03: Executive Bridge Summary

**Scheduler wired as proactive conversation trigger — mode-aware, data-driven toasts with one-tap Chat action into ChatOverlay AI conversations.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Completed | 2026-02-27 |
| Tasks | 2 completed |
| Files modified | 5 (1 created, 4 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Scheduler fires data-driven toasts with Chat action | Pass | Morning briefing shows task counts, overdue, bills; Chat → openWithMessage |
| AC-2: Each event type has contextual chat prompt | Pass | 5 event types mapped in EVENT_CONFIG with specific prompts |
| AC-3: Focus mode gates — morning only breaks through | Pass | shouldNotify returns true only for morning_briefing in focus mode |
| AC-4: DND and Review suppress all toasts | Pass | shouldNotify returns false for both modes |
| AC-5: Missed events show warning toast | Pass | handleMissed uses toast.warning (amber) + Chat action |
| AC-6: No voice, audio, or double-fetch | Pass | Zero NudgeManager/voice/audio imports verified |
| AC-7: Clean lifecycle | Pass | destroyScheduler on mount + unmount |
| AC-8: BriefingCard refresh fixed | Pass | refetchJarvisData replaces fetchBriefingData |

## Accomplishments

- useExecutiveBridge hook (~130 lines): Scheduler → refetchJarvisData → mode-gated data-driven toasts → Chat action → ChatOverlay → AI conversation
- Warning toast variant: amber border/icon/progress for missed events, toast.warning() convenience method
- BriefingCard refresh properly populates both homeStore and personalStore via refetchJarvisData()

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/hooks/useExecutiveBridge.ts` | Created | Scheduler hook — event config, mode gating, message builder, chat trigger, lifecycle |
| `src/lib/jarvis/stores/toastStore.ts` | Modified | Added 'warning' to variant union + toast.warning() convenience |
| `src/components/jarvis/primitives/Toast.tsx` | Modified | AlertTriangle icon, amber variant config, 'warning' in ToastVariant |
| `src/components/jarvis/layout/JarvisShell.tsx` | Modified | Import + mount useExecutiveBridge after useJarvisFetch |
| `src/components/jarvis/home/BriefingCard.tsx` | Modified | refetchJarvisData replaces fetchBriefingData; removed stale TODO block |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| NudgeManager excluded | Voice-era: double-fetch, sound, redundant with PriorityStack | Cleaner architecture, no audio in text-first shell |
| Toast → Chat pattern | Dead-end notification becomes gateway to AI conversation | Every scheduled moment is one tap from executive walkthrough |
| Mode gates toast, not fetch | Jonathan needs fresh data between patients even in focus mode | Data always current; silence is about interruption, not staleness |
| 10s toast duration | Longer than default 4s — time to read AND tap Chat | Better UX for actionable notifications |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- All executive functions wired in new shell (G-01 brain, G-02 data, G-03 scheduler)
- G-04 (Production Verification) is the final smoke test
- OPENAI_API_KEY + CRON_SECRET in Vercel — next push activates vector search + reflection

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: G-integration-polish, Plan: 03*
*Completed: 2026-02-27*
