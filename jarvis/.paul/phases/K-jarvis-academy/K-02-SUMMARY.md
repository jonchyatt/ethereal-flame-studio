---
phase: K-jarvis-academy
plan: 02
subsystem: academy
tags: [curriculum, teaching, visopscreen, tools]

requires:
  - phase: K-01
    provides: Academy engine (GitHub reader, 5 tools, project registry)
provides:
  - CurriculumTopic data model for structured teaching
  - 16 Visopscreen topics across 5 categories with file mappings and teaching notes
  - academy_list_topics tool for curriculum browsing
  - Topic hints in academy_explore_project for contextual learning
affects: [K-03 (creator-workflow curriculum), K-04 (academy UI + progress tracking)]

tech-stack:
  added: []
  patterns: [curriculum-as-data (static topic manifests in project registry)]

key-files:
  modified:
    - src/lib/jarvis/academy/projects.ts
    - src/lib/jarvis/academy/academyTools.ts
    - src/lib/jarvis/academy/toolExecutor.ts
    - src/lib/jarvis/academy/index.ts

key-decisions:
  - "16 topics (exceeded 12-15 target) — comprehensive coverage without filler"
  - "Stars notation (filled/empty) for difficulty display in tool responses"
  - "Topic hints only on subdirectory exploration (not root) to avoid noise"

patterns-established:
  - "CurriculumTopic interface: reusable across all projects (K-03 will add creator-workflow topics)"
  - "Category grouping with prerequisite chains: enables learning path suggestions"

duration: ~15min
completed: 2026-03-01
---

# Phase K Plan 02: Deep Visopscreen Curriculum Summary

**CurriculumTopic data model + 16 structured Visopscreen teaching topics + academy_list_topics tool + topic hints in explore**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Completed | 2026-03-01 |
| Tasks | 2 completed |
| Files modified | 4 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Curriculum Data Model | Pass | CurriculumTopic with id, name, category, difficulty, description, teachingNotes, keyFiles, prerequisites, conceptsIntroduced |
| AC-2: Visopscreen Curriculum Content | Pass | 16 topics across 5 categories (exceeded 12+ target) |
| AC-3: List Topics Tool | Pass | academy_list_topics with project + optional category filter, stars + prerequisites |
| AC-4: Enhanced Explore with Topic Hints | Pass | Related Topics appended when exploring subdirectories with matching keyFiles |
| AC-5: Build Passes | Pass | Zero errors, zero warnings |

## Accomplishments

- CurriculumTopic interface added to ProjectConfig (optional `curriculum` field) — reusable for all projects
- 16 Visopscreen topics: Getting Started (3), Core Concepts (4), Screeners (4), Analysis & Research (3), Architecture (2)
- Each topic has 3-5 keyFiles with explanations, teaching notes with "aha moments", and correct prerequisite chains
- academy_list_topics tool groups by category, shows difficulty stars, displays prerequisite names (not IDs)
- academy_explore_project appends Related Topics section when browsing subdirectories that match keyFile paths

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1+2 | `7ed3769` | feat | CurriculumTopic model, 16 topics, list_topics tool, explore topic hints |

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/academy/projects.ts` | Modified | CurriculumTopic interface, curriculum field on ProjectConfig, 16 Visopscreen topics, empty array on creator-workflow |
| `src/lib/jarvis/academy/academyTools.ts` | Modified | academy_list_topics tool definition (project + category params) |
| `src/lib/jarvis/academy/toolExecutor.ts` | Modified | handleListTopics function, Related Topics in handleExploreProject, switch case routing |
| `src/lib/jarvis/academy/index.ts` | Modified | CurriculumTopic and ProjectConfig type exports |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | K-01 correctness improvements bundled into commit |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Essential fixes, no scope creep

### Auto-fixed Issues

**1. Schema correctness: line_start/line_end typed as string instead of number**
- **Found during:** Pre-execution K-01 audit
- **Issue:** academyTools.ts had `type: 'string'` for line_start/line_end, parsed via `parseInt()` in executor
- **Fix:** Changed to `type: 'number'`, executor uses `Number()` instead of `parseInt()`
- **Files:** academyTools.ts, toolExecutor.ts
- **Verification:** Build clean

**2. Semantic clarity: creator-workflow basePath empty string**
- **Found during:** Pre-execution K-01 audit
- **Issue:** `basePath: ''` is falsy in JS, so treated as "no basePath" — works by accident
- **Fix:** Removed `basePath` field entirely (undefined = no basePath, by design)
- **Files:** projects.ts

## Issues Encountered

None

## Next Phase Readiness

**Ready:**
- CurriculumTopic interface ready for creator-workflow topics (K-03)
- academy_list_topics tool ready for any project with curriculum data
- Topic hints in explore work automatically for any project with curriculum

**Concerns:**
- Visopscreen keyFile paths are best-effort (based on project config descriptions, not verified against actual repo) — will validate when GitHub PAT is configured

**Blockers:**
- GitHub PAT still needed for Academy to function in production (GITHUB_TOKEN + GITHUB_OWNER in Vercel)

---
*Phase: K-jarvis-academy, Plan: 02*
*Completed: 2026-03-01*
