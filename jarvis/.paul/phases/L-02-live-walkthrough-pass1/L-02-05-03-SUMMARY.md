---
phase: L-02-live-walkthrough-pass1
plan: 05-03
status: complete
date: 2026-03-05
commit: 429e476
---

## What Was Done

Fixed content being hidden behind the floating TutorialContinueButton during the tutorial walkthrough.

**Root cause:** TutorialContinueButton sits at `bottom: calc(5rem + safe-area + 0.75rem)` = 92px + safe-area. Button height ≈ 40px, so its top edge is at ~132px + safe-area from screen bottom. But `<main>` pb was only 80px + safe-area — leaving 52px of content hidden.

**Fix applied to `JarvisShell.tsx`:**
1. Added `suggestedNext` selector from `useTutorialStore` (zero new imports — hook already imported)
2. Computed `continueBtnVisible = tutorialEngine.isActive || !!suggestedNext`
3. Made `<main>` pb conditional: `10rem + safe-area` when button visible, `5rem + safe-area` otherwise
4. `md:pb-4` desktop override unchanged

## Deviations

None. Executed exactly as planned.

## Verification

- `npm run build` passed clean (42 static pages, zero TS errors)
- All grep checks confirmed
- Committed 429e476, pushed to master → auto-deploy triggered

## AC Status

- AC-1 ✓ Content visible above Continue button when tutorial active
- AC-2 ✓ Normal padding when tutorial not running
- AC-3 ✓ Desktop md:pb-4 unchanged
