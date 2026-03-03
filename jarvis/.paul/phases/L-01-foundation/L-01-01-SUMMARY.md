---
phase: L-01-foundation
plan: 01
subsystem: ui
tags: [middleware, academy, curriculum, onboarding, redirect]

# Dependency graph
requires:
  - phase: K-04
    provides: Academy framework, CurriculumTopic interface, ACADEMY_PROJECTS registry
provides:
  - Front door redirect (/jarvis → /jarvis/app)
  - Jarvis self-teaching curriculum (8 topics, Tier 0-1)
  - OnboardingWizard → Academy handoff
  - CurriculumTopic interface extended with spotlightTargets + verificationSteps
affects: [L-01-02 spotlight bridge, L-02 live walkthrough]

# Tech tracking
tech-stack:
  added: []
  patterns: [same-origin curriculum with spotlightTargets, verificationSteps on CurriculumTopic]

key-files:
  created: []
  modified:
    - src/middleware.ts
    - src/lib/jarvis/academy/projects.ts
    - src/components/jarvis/onboarding/OnboardingWizard.tsx

key-decisions:
  - "basePath: 'src' (not 'jarvis/src/components/jarvis') — matches how toolExecutor resolves paths via GitHub API"
  - "startTour() is pass-through to finishOnboarding() — Plan 02 will differentiate with spotlight behavior"
  - "Both 'Start Tour' and 'Skip' paths set activeProject to 'jarvis' — Academy always available"

patterns-established:
  - "Same-origin curriculum uses basePath: 'src' with full relative paths from repo root"
  - "spotlightTargets array on CurriculumTopic maps to data-tutorial-id DOM attributes"
  - "verificationSteps array enables route/store/action checks for same-origin teaching"

# Metrics
duration: ~25min
started: 2026-03-02T21:00:00-05:00
completed: 2026-03-02T21:25:00-05:00
---

# Phase L-01 Plan 01: Foundation — Redirect, Curriculum, Onboarding Handoff

**Wired the front door redirect, registered 8-topic Jarvis self-teaching curriculum in Academy, and connected OnboardingWizard completion to Academy handoff.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25min |
| Started | 2026-03-02T21:00-05:00 |
| Completed | 2026-03-02T21:25-05:00 |
| Tasks | 3 completed |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Front Door Redirect | Pass | Subdomain root rewrites `/` → `/jarvis/app`; main domain redirects `/jarvis` → `/jarvis/app` |
| AC-2: Jarvis Academy Curriculum | Pass | 8 topics (2 Tier 0 + 6 Tier 1), CurriculumTopic extended with spotlightTargets + verificationSteps |
| AC-3: Onboarding → Academy Handoff | Pass | Both "Start Tour" and "Skip" paths call `academyStore.setActiveProject('jarvis')` |

## Accomplishments

- `/jarvis` no longer a dead end — redirects to `/jarvis/app` on both subdomain and main domain
- Jarvis curriculum registered with 8 topics across "First Contact" (2) and "Your First Day" (6) categories
- OnboardingWizard completion flows into Academy with jarvis as active project
- Self-audit caught and fixed 5 data accuracy bugs in curriculum keyFile paths before commit

## Task Commits

All 3 tasks committed atomically:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Redirect middleware | `6a025ef` | feat | Subdomain rewrite + main domain redirect to /jarvis/app |
| Task 2: Jarvis curriculum | `6a025ef` | feat | 8 CurriculumTopics, interface extensions, path-verified |
| Task 3: Onboarding handoff | `6a025ef` | feat | academyStore.setActiveProject('jarvis') on wizard completion |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/middleware.ts` | Modified | Subdomain root rewrite `/` → `/jarvis/app`; main domain redirect `/jarvis` → `/jarvis/app` |
| `src/lib/jarvis/academy/projects.ts` | Modified | Added 'jarvis' to ACADEMY_PROJECTS with 8 curriculum topics; extended CurriculumTopic with spotlightTargets + verificationSteps |
| `src/components/jarvis/onboarding/OnboardingWizard.tsx` | Modified | Import useAcademyStore; set activeProject to 'jarvis' on both Start Tour and Skip paths |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| basePath: 'src' (not 'jarvis/src/components/jarvis') | No `jarvis/` subdir exists; toolExecutor resolves from repo root via GitHub API | All keyFile paths use full relative paths from src/ |
| startTour() = pass-through to finishOnboarding() | Plan 02 will differentiate with spotlight behavior | Keeps clean separation between Plan 01 (data) and Plan 02 (interactivity) |
| useTutorialStore import kept | Plan 02 needs it for spotlight bridge | No dead import — intentional forward reference |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 5 | Essential data accuracy — paths were wrong |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** Essential fixes, no scope creep. Without self-audit, all 12 keyFile references would have been wrong in production.

### Auto-fixed Issues

**1. [Data Accuracy] basePath incorrect**
- **Found during:** Task 2 (Jarvis curriculum)
- **Issue:** Plan specified `basePath: 'jarvis/src/components/jarvis'` but no `jarvis/` directory exists in repo
- **Fix:** Changed to `basePath: 'src'` — matches how toolExecutor resolves paths via GitHub API
- **Files:** `src/lib/jarvis/academy/projects.ts`
- **Verification:** All 12 keyFile paths verified against real files on disk
- **Commit:** `6a025ef` (part of task commit)

**2. [Data Accuracy] 4 individual keyFile paths wrong**
- **Found during:** Self-audit after Task 2
- **Issue:** 4 keyFile paths didn't match actual file locations:
  - `CommandPalette.tsx` → `components/jarvis/layout/CommandPalette.tsx`
  - `chat/ChatOverlay.tsx` → `components/jarvis/layout/ChatOverlay.tsx`
  - `brain/tools/briefing.ts` (fabricated) → `app/api/jarvis/briefing/route.ts`
  - `stores/personalStore.ts` → `lib/jarvis/stores/personalStore.ts`
- **Fix:** Corrected all 4 paths to match actual disk locations
- **Files:** `src/lib/jarvis/academy/projects.ts`
- **Verification:** All 12 keyFile paths individually verified with `ls`
- **Commit:** `6a025ef` (part of task commit)

## Issues Encountered

None — execution was clean after self-audit corrections.

## Next Phase Readiness

**Ready:**
- Front door redirects work — new users land on /jarvis/app
- Jarvis curriculum data ready for Academy to render
- spotlightTargets defined on topics — Plan 02 can wire DOM highlighting
- verificationSteps defined — Plan 02 can implement same-origin validation
- OnboardingWizard hands off to Academy — flow is connected

**Concerns:**
- spotlightTargets reference `data-tutorial-id` attributes that may not exist on target elements yet (Plan 02 scope)
- startTour() currently equals finishOnboarding() — needs differentiation in Plan 02

**Blockers:**
- None

---
*Phase: L-01-foundation, Plan: 01*
*Completed: 2026-03-02*
