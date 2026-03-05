# L-02-05-01 Summary — Tutorial Curriculum Fix

**Status:** COMPLETE
**Commit:** 4196320
**Date:** 2026-03-05

## What Was Done

### Task 1: Fixed bills-4-mark-paid step
- Replaced `bills-4-mark-paid` (store verification against `personalStore.bills.some(b => b.status === "paid")`) with `bills-4-understand-totals`
- New step: route verification (stay on bills page = success) + spotlight on `bills-list` + observation instruction
- Removed the stale `bills` storeVerifier entry from `verificationEngine.ts` (no longer referenced)

### Task 2: Added 45s step timeout
- Added `stepTimeoutRef` separate from `timerRef` (which is used for other timers)
- Added `clearStepTimeout` helper, wired into `cleanup()`
- 45s timeout fires in `beginStep()` after polling starts: injects "Let's move on" teaching message then calls `advanceToNextStep`
- Cleared automatically whenever `cleanup()` is called (step advance, lesson exit)

### Task 3: Floated Continue button to shell level
- Added `TutorialContinueButton` component to `JarvisShell.tsx` — renders above bottom tab bar at `z-[10002]`
- Visible whenever tutorial is active (`engine.isActive`) OR between lessons (`suggestedNext` set)
- Removed duplicate Continue chips from `ChatActionsRow` in `ChatOverlay.tsx`
- Removed unused `ChevronRight`, `getLesson` imports from ChatOverlay

## Acceptance Criteria Met
- [x] AC-1: Bills lesson advances without requiring mark-paid
- [x] AC-2: Continue chip visible at all times during tutorial
- [x] AC-3: 45s timeout prevents permanent stall
- [x] AC-4: Full 4-lesson chain can now complete (bills no longer blocks)

## Build
`npm run build` passes with zero errors.
