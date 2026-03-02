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

topic-categories:
  getting-started: [dashboard-overview, content-library, thumbnail-planner]
  render-pipeline: [render-pipeline-overview, audio-analysis, frame-capture, ffmpeg-encoding]
  publishing-distribution: [recut-engine, multi-platform-publish]
  architecture: [presets-system, job-queue-worker, vr-rendering]

duration: ~20min
completed: 2026-03-02
---
