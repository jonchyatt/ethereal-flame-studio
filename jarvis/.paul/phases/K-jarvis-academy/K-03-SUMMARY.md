---
phase: K-jarvis-academy
plan: 03
subsystem: academy
tags: [curriculum, creator-workflow, multi-domain, dynamic-registry]

requires:
  - phase: K-02
    provides: CurriculumTopic model, 16 Visopscreen topics, list_topics tool
provides:
  - 12 Creator Workflow curriculum topics across 4 categories
  - Dynamic project options in all 6 academy tool descriptions (registry-driven)
  - Dynamic project listing in system prompt ACADEMY + CAPABILITIES sections
  - Zero-touch multi-domain: add one ACADEMY_PROJECTS entry → tools, prompt, curriculum all auto-discover
affects: [K-04 (academy UI + progress tracking)]

tech-stack:
  added: []
  patterns: [registry-driven-tool-descriptions, dynamic-system-prompt-from-data]

key-files:
  modified:
    - src/lib/jarvis/academy/projects.ts
    - src/lib/jarvis/academy/academyTools.ts
    - src/lib/jarvis/intelligence/systemPrompt.ts

key-decisions:
  - "12 Creator Workflow topics verified against actual codebase file paths (not plan approximations)"
  - "projectOptions() as function call (not const) for defensive future-proofing"
  - "CAPABILITIES section also made dynamic (not just ACADEMY block) — both referenced project names"
  - "CROSS-PROJECT AWARENESS example text left as-is (illustrative, not a project listing)"

patterns-established:
  - "Dynamic tool descriptions: getProjectIds() drives all 6 tool option strings"
  - "Dynamic system prompt: getAllProjects().map(p => p.name) builds project list at prompt-build time"
  - "Adding a new project = one ACADEMY_PROJECTS entry → entire Academy auto-discovers it"

duration: ~20min
completed: 2026-03-02
---

# Phase K Plan 03: Creator Workflow Curriculum + Dynamic Multi-Domain

**12 Creator Workflow teaching topics with verified keyFile paths, plus registry-driven project discovery across all tools and system prompt — adding a new project is now a single registry entry.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Creator Workflow Has Comprehensive Curriculum | Pass | 12 topics across 4 categories, each with 3-4 keyFiles, prerequisites, teaching notes with aha moments |
| AC-2: Tool Descriptions Are Registry-Driven | Pass | All 6 tool descriptions use `projectOptions()` — grep returns 0 hard-coded matches |
| AC-3: System Prompt Is Registry-Driven | Pass | ACADEMY + CAPABILITIES sections both use `getAllProjects().map()` — grep returns 0 hard-coded matches |
| AC-4: Build Passes | Pass | `npm run build` exits 0, no TypeScript errors |

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1+2 (combined) | `3eef5a2` | 12 curriculum topics + dynamic tool descriptions + dynamic system prompt |

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/academy/projects.ts` | Modified | Added 12 CurriculumTopic entries to creator-workflow config |
| `src/lib/jarvis/academy/academyTools.ts` | Modified | Added `getProjectIds` import + `projectOptions()` function, replaced 6 hard-coded option strings |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Modified | Added `getAllProjects` import, made CAPABILITIES + ACADEMY sections dynamic |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Scope additions | 1 | Essential — CAPABILITIES line was also hard-coded |

**1. CAPABILITIES section also made dynamic**
- Plan only mentioned the ACADEMY section, but the CAPABILITIES section (line 313) also had "Visopscreen and Creator Workflow" hard-coded
- Fixed alongside ACADEMY section for consistency
- No impact on scope — same pattern, one extra template string

**2. Import path difference**
- Plan suggested `import { getAllProjects } from '../academy'` (barrel)
- Implemented as `import { getAllProjects } from '../academy/projects'` (direct)
- Both work; direct import avoids potential circular dependency through barrel

## Topic Categories (Creator Workflow)

| Category | Topics | Difficulty Range |
|----------|--------|-----------------|
| Getting Started | dashboard-overview, content-library, thumbnail-planner | 1-2 |
| Render Pipeline | render-pipeline-overview, audio-analysis, frame-capture, ffmpeg-encoding | 2-4 |
| Publishing & Distribution | recut-engine, multi-platform-publish | 3 |
| Architecture | presets-system, job-queue-worker, vr-rendering | 3-5 |

## Next Phase Readiness

**Ready:**
- Both projects now have full curriculum (Visopscreen: 16 topics, Creator Workflow: 12 topics)
- All project references are registry-driven — K-04 can build UI without hard-coded assumptions
- Adding Reset Biology, Satori Living, etc. is one ACADEMY_PROJECTS entry away

**Blockers:**
- GitHub PAT still needed for Academy to function in production (GITHUB_TOKEN + GITHUB_OWNER in Vercel)

---
*Phase: K-jarvis-academy, Plan: 03*
*Completed: 2026-03-02*
