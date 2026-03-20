---
phase: 26-mcp-bridge-tool-discipline
plan: 01
subsystem: infra
tags: [blender, mcp, bpy, mantaflow, vfx, python]

# Dependency graph
requires: []
provides:
  - blender/ directory structure with scripts/, scenes/, cache/, renders/, masks/
  - scene_utils.py with save-before-operate, idempotent object creation, full scene info, cache management
  - connection_test.py for MCP bridge validation
  - BLENDER_SETUP.md with Windows installation guide
  - gitignore rules for Blender binary outputs (cache, renders, masks, .blend)
affects: [26-02, 26-03, 27, 28, 29, 30, 31, 32, 33]

# Tech tracking
tech-stack:
  added: [bpy, blender-mcp]
  patterns: [save-before-operate, idempotent-object-creation, full-scene-info, cache-management]

key-files:
  created:
    - blender/scripts/scene_utils.py
    - blender/scripts/connection_test.py
    - docs/BLENDER_SETUP.md
    - blender/.gitkeep
    - blender/scripts/.gitkeep
    - blender/scenes/.gitkeep
    - blender/cache/.gitkeep
    - blender/renders/.gitkeep
    - blender/masks/.gitkeep
  modified:
    - .gitignore

key-decisions:
  - "Force-add .gitkeep files in gitignored directories (git add -f) since negation rules alone do not override parent directory ignores on initial add"

patterns-established:
  - "save-before-operate: Always save .blend file before destructive MCP operations (addresses Pitfall 3)"
  - "idempotent-object-creation: get_or_create_object prevents duplicates on script re-run (addresses Pitfall 3)"
  - "full-scene-info: Use full_scene_info() instead of blender-mcp's 10-object-capped get_scene_info (addresses Pitfall 11)"
  - "cache-management: clean_cache before re-baking, check_disk_space_gb before starting (addresses Pitfall 4)"
  - "sys.path.insert pattern: All scripts insert blender/scripts into sys.path for scene_utils import"

requirements-completed: [TOOL-01]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 26 Plan 01: Directory Structure + Scene Utilities Summary

**Blender project directory with gitignored binary outputs, 6 scene utility functions enforcing save/idempotent/cache discipline, MCP connection test script, and Windows setup documentation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T00:45:55Z
- **Completed:** 2026-03-20T00:49:19Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Created blender/ directory tree with 5 subdirectories (scripts, scenes, cache, renders, masks) all preserved via .gitkeep
- Built scene_utils.py with 6 helper functions addressing Pitfalls 3, 4, and 11 from research
- Built connection_test.py that validates full MCP round-trip (bpy import, object creation, scene info, disk space, cleanup)
- Created BLENDER_SETUP.md with complete Windows installation path including troubleshooting for timeout, tokens, and ProactorEventLoop
- Added gitignore rules blocking cache (30-180+ GB), renders, masks, .blend files, and binary formats (.uni, .vdb, .openexr, .exr)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create blender/ directory structure and gitignore rules** - `5b479b0` (chore)
2. **Task 2: Create scene_utils.py, connection_test.py, and BLENDER_SETUP.md** - `c3e6f2f` (feat)

## Files Created/Modified
- `blender/scripts/scene_utils.py` - 6 helper functions: save_before_operate, get_or_create_object, full_scene_info, clean_cache, check_disk_space_gb, set_cache_directory
- `blender/scripts/connection_test.py` - MCP bridge validation script (6 tests, JSON output, self-cleaning)
- `docs/BLENDER_SETUP.md` - Windows setup guide with uv, blender-mcp, addon install, troubleshooting
- `.gitignore` - Blender VFX pipeline rules for cache, renders, masks, .blend, binary formats
- `blender/{.gitkeep, scripts/.gitkeep, scenes/.gitkeep, cache/.gitkeep, renders/.gitkeep, masks/.gitkeep}` - Directory structure preservation

## Decisions Made
- Force-added .gitkeep files in gitignored directories using `git add -f` since git's negation rules (`!blender/cache/.gitkeep`) do not override parent directory ignores on initial add. Subsequent operations will respect the negation rules normally.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Git rejected staging .gitkeep files in cache/, renders/, and masks/ because those directories matched the new gitignore rules. Resolved by using `git add -f` for the initial add only. The `!` negation rules ensure future operations (git status, etc.) will track these files correctly.

## User Setup Required

None - no external service configuration required. Blender and blender-mcp installation is documented in docs/BLENDER_SETUP.md but is a prerequisite for Plan 26-03 (proof-of-concept), not this plan.

## Next Phase Readiness
- Directory structure ready for async bake/render scripts (Plan 26-02)
- scene_utils.py importable from any future Blender script via sys.path pattern
- connection_test.py ready to validate MCP bridge once Blender + addon are installed
- All pitfall mitigations built into the utility module from day one

## Self-Check: PASSED

All 9 created files exist. Both task commits (5b479b0, c3e6f2f) verified in git log. SUMMARY.md exists at expected path.

---
*Phase: 26-mcp-bridge-tool-discipline*
*Completed: 2026-03-20*
