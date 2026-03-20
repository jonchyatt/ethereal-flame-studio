---
phase: 26-mcp-bridge-tool-discipline
plan: 02
subsystem: blender-scripts
tags: [blender, mcp, async, mantaflow, cycles, bpy-timers, fire-and-forget]

# Dependency graph
requires:
  - phase: 26-01
    provides: "blender/scripts directory structure and scene utilities"
provides:
  - "async_bake.py: timer-based Mantaflow bake launcher"
  - "async_render.py: INVOKE_DEFAULT non-blocking Cycles/Eevee render launcher"
  - "poll_status.py: three polling functions for monitoring async operations"
  - "blender/cache/.efs_status.json: shared status file for async operations"
affects: [26-03, 27, 28, 29, 30, 31, 32, 33]

# Tech tracking
tech-stack:
  added: [bpy.app.timers, bpy.ops.render (INVOKE_DEFAULT), OpenImageDenoise]
  patterns: [fire-and-forget + poll, status file JSON contract, save-before-operate]

key-files:
  created:
    - blender/scripts/async_bake.py
    - blender/scripts/async_render.py
    - blender/scripts/poll_status.py
  modified: []

key-decisions:
  - "0.1s timer delay ensures MCP response sent before bake starts"
  - "Single shared status file at blender/cache/.efs_status.json for all async operations"
  - "OpenImageDenoise enabled by default -- dramatically reduces required sample counts"
  - "Three polling modes: status file read, frame count, live render check"

patterns-established:
  - "Fire-and-forget pattern: bpy.app.timers.register(callback, first_interval=0.1) returns immediately to MCP"
  - "Non-blocking render: bpy.ops.render.render('INVOKE_DEFAULT') opens Blender render window without blocking"
  - "Status file contract: JSON with operation, state, detail, progress, timestamp fields"
  - "Save-before-operate: bpy.ops.wm.save_mainfile() called before all destructive operations"
  - "Cache cleanup: bpy.ops.fluid.free_all() called before baking to prevent stale cache buildup"

requirements-completed: [TOOL-02]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 26 Plan 02: Async Execution Scripts Summary

**Timer-based fire-and-forget bake/render pattern with JSON status polling for 180s MCP timeout avoidance**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T00:45:50Z
- **Completed:** 2026-03-20T00:48:00Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- async_bake.py launches Mantaflow bakes via bpy.app.timers.register() -- returns immediately to MCP caller, bake runs on Blender's main thread via timer callback
- async_render.py launches Cycles/Eevee renders via INVOKE_DEFAULT -- non-blocking operator opens Blender's render window without holding the MCP connection
- poll_status.py provides three independent polling functions: status file read (poll_status), frame directory counting (poll_render_frames), and live Blender render check (is_render_active)
- All three scripts share a single status file at blender/cache/.efs_status.json that survives MCP disconnection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create async_bake.py** - `5b479b0` (feat)
2. **Task 2: Create async_render.py and poll_status.py** - `13d580c` (feat)

## Files Created
- `blender/scripts/async_bake.py` - Timer-based Mantaflow bake launcher with cache cleanup
- `blender/scripts/async_render.py` - Non-blocking Cycles/Eevee render launcher with denoiser configuration
- `blender/scripts/poll_status.py` - Lightweight polling for async operation progress

## Decisions Made
- Used bpy.app.timers.register with first_interval=0.1 (not 0.0) to ensure the MCP response is sent before the bake callback fires
- Single shared status file rather than per-operation files -- simplifies polling and one operation runs at a time via blender-mcp
- OpenImageDenoise as default denoiser -- allows 128 samples to produce results comparable to 2048 samples without denoising
- bpy import deferred in is_render_active() since poll_status.py may be imported without bpy available for non-Blender polling

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required. These scripts are invoked via execute_blender_code through the MCP bridge.

## Next Phase Readiness
- Async patterns established for all subsequent phases that need baking or rendering
- 26-03 (Proof-of-concept Mantaflow fire orb) can now use start_bake() and start_render() safely
- poll_status() available for monitoring long-running operations in any future session

---
*Phase: 26-mcp-bridge-tool-discipline*
*Completed: 2026-03-19*
