---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Cinema VFX Pipeline
status: ready_to_plan
last_updated: "2026-03-19T20:00:00.000Z"
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Phone to published video without touching a computer
**Current focus:** Phase 26 -- MCP Bridge + Tool Discipline (ready to plan)

---

## Current Position

Phase: 26 of 33 (MCP Bridge + Tool Discipline)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-19 -- v4.0 roadmap created (8 phases, 38 requirements mapped)

Progress: [░░░░░░░░░░] 0%

---

## Performance Metrics

**v1.0:** 35+ plans completed across 5 phases
**v2.0:** 18 plans completed across 7 phases
**v3.0 (parallel):** 3/17 plans (Phase 19 complete, Phases 20-25 queued)
**v4.0:** 0 plans, 8 phases queued (26-33)

---

## Accumulated Context

### Decisions

- blender-mcp for Claude-Blender bridge (TCP:9876, 180s timeout)
- Async patterns mandatory: `bpy.app.timers.register()` for bakes, `INVOKE_DEFAULT` for renders
- Audio JSON bridge: browser export once, never re-analyze in Python
- Keyframe Flow objects, not Domain parameters (Blender T72812 workaround)
- Resolution ladder: 64 prototype, 128 test, 256 production, 512 if hardware allows
- Phase 7 (v1.0) superseded by v4.0 Phases 26-33

### Critical Pitfalls (from research)

- 180s MCP timeout kills bakes/renders silently -- async from day one
- Mantaflow cache explosion (30-180+ GB) -- dedicated cache dir, start at resolution 64
- Screenshot tokens compound ($5-15/day without discipline) -- use text feedback primarily
- Mantaflow Domain keyframing broken (T72812) -- keyframe Flow objects only
- Cycles + Mantaflow fire = corrupted frames (T77678) -- verify every test render frame-by-frame

### Blockers

None identified.

---

## Session Continuity

Last session: 2026-03-19
Stopped at: v4.0 roadmap created, ready to plan Phase 26
Resume with: `/gsd:plan-phase 26`
Resume file: .planning/ROADMAP.md

---

*Last updated: 2026-03-19 -- v4.0 roadmap created*
