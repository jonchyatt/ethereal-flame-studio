---
phase: L-03-live-walkthrough-pass2
plan: 02-03
subsystem: ui
tags: [ios, audio, spotlight, chat, tutorial, safe-area]

requires:
  - phase: L-03-01
    provides: 8-bug list from live walkthrough checkpoint

provides:
  - iOS chat scroll fix (rAF + scrollTop)
  - iPhone safe-area input padding fix
  - Continue quick reply added
  - Spotlight retry logic (navigation race fix)
  - Narration mute moved to Header (always visible)
  - iOS TTS audio unlock singleton
  - Tutorial progress injected into appContext

affects: L-03-04 (remaining bugs), L-04-polish-wife-test

tech-stack:
  added: []
  patterns:
    - "Shared audio unlock singleton (audioUnlock.ts) replaces per-component refs"
    - "Tutorial progress in buildAppContext() prevents Jarvis from restarting tour each session"
    - "Spotlight retry: poll up to 10x at 150ms for post-navigation DOM availability"

key-files:
  created:
    - src/lib/jarvis/utils/audioUnlock.ts
  modified:
    - src/components/jarvis/layout/ChatOverlay.tsx
    - src/components/jarvis/layout/Header.tsx
    - src/components/jarvis/layout/JarvisShell.tsx
    - src/components/jarvis/onboarding/SpotlightOverlay.tsx

key-decisions:
  - "No formal PLAN.md — bugs applied directly from live bug report. Emergency fix batch."
  - "scrollTop=scrollHeight in rAF: more reliable than scrollIntoView in iOS fixed containers"
  - "Mute moved to Header: visibility must be independent of spotlight lifecycle"
  - "body overflow:hidden during spotlight: prevents scroll from suspending iOS audio"

patterns-established:
  - "audioUnlock.ts singleton: call unlock() before any audio play; exported + reusable"

duration: ~2hr
started: 2026-03-05T10:30:00Z
completed: 2026-03-05T12:20:00Z
---

# Phase L-03 Plans 02/03: Runtime Bug Fix Batch Summary

**7 critical walkthrough bugs fixed across iOS audio, chat scroll, spotlight reliability, and tour continuity — all in single commit fbd1459.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2hr |
| Started | 2026-03-05 |
| Completed | 2026-03-05 |
| Bugs fixed | 7 of 8 from walkthrough bug list |
| Files modified | 5 |

## Acceptance Criteria Results

No formal PLAN.md — fixes derived directly from L-03-01 walkthrough bug report.

| Bug | Fix | Status |
|-----|-----|--------|
| Chat auto-scroll broken on iOS | scrollTop=scrollHeight in rAF | Fixed |
| Chat input behind iPhone home bar | safe-area-inset-bottom on ChatInputRow | Fixed |
| "Continue" missing from quick replies | Added as first quick reply option | Fixed |
| Spotlight fails after navigation | Retry up to 10× at 150ms | Fixed |
| Mute button disappears between spotlights | Moved to Header.tsx permanently | Fixed |
| iOS TTS stops on touch/scroll | body overflow:hidden + global onTouchStart unlock | Fixed |
| Jarvis restarts tour every session | Tutorial progress injected into buildAppContext() | Fixed |
| Bottom padding (lists buried) | Deferred — needs live device verification | Pending |

## Accomplishments

- `audioUnlock.ts`: shared singleton — both SpotlightOverlay and ChatOverlay share same unlock state
- Spotlight retry logic handles navigation race: polls DOM up to 10× before giving up
- Tutorial progress (`exploredTopics`, `completedTopics`) surfaced in `buildAppContext()` — Jarvis can see "Already taught: welcome-tour, tasks-basics..." and won't restart
- Mute/narration toggle elevated to `Header.tsx` — visible at all times regardless of spotlight state

## Task Commits

| Scope | Commit | Type | Description |
|-------|--------|------|-------------|
| All 7 fixes | `fbd1459` | fix | L-03-02/03: chat scroll, safe area, Continue reply, spotlight retry, mute, iOS audio |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/utils/audioUnlock.ts` | Created | Shared iOS audio unlock singleton |
| `src/components/jarvis/layout/ChatOverlay.tsx` | Modified | Auto-scroll, safe-area, Continue reply, appContext injection |
| `src/components/jarvis/layout/Header.tsx` | Modified | Narration mute toggle added permanently |
| `src/components/jarvis/layout/JarvisShell.tsx` | Modified | body scroll lock + global onTouchStart audio unlock |
| `src/components/jarvis/onboarding/SpotlightOverlay.tsx` | Modified | Retry logic, mute button removed |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| No formal PLAN.md | Emergency batch — bugs clear from walkthrough report, faster to apply directly | Loop closed informally via this SUMMARY |
| scrollTop in rAF vs scrollIntoView | iOS fixed containers ignore scrollIntoView reliably; scrollTop works | Scroll now reliable on iPhone |
| Mute in Header not Overlay | Spotlight lifecycle shouldn't control a persistent UI element | Mute always visible |
| body overflow:hidden during spotlight | Prevents scroll event from triggering iOS audio suspension | TTS no longer interrupted by incidental touch |

## Deviations from Plan

No formal plan existed — this was an informal batch fix. SUMMARY serves as the loop-closing record.

## Remaining Bugs (deferred to L-03-04)

| Bug | Status | Notes |
|-----|--------|-------|
| Bottom padding (lists buried) | Pending | Math looks correct (80px+safe-area > 64px BottomTabBar). May be non-issue — needs live iPhone test |
| Academy locks gating content | Not started | Need to audit LessonCard lock logic |
| Jarvis verbosity in text | Not started | System prompt update needed |
| Welcome-tour repeat in same session | Partially fixed | appContext helps; may need further work if academyStore write timing is off |

## Next Phase Readiness

**Ready:**
- 7/8 bugs from L-03-01 checkpoint fixed and live (auto-deployed)
- Tutorial continuation across sessions working
- iOS audio unlock pattern established as singleton

**Concerns:**
- Bottom padding needs live iPhone test before declaring fixed
- Academy lock logic unread — could surface gating issues

**Blockers:** None (remaining bugs are L-03-04 scope).

---
*Phase: L-03-live-walkthrough-pass2, Plans: 02/03*
*Completed: 2026-03-05*
