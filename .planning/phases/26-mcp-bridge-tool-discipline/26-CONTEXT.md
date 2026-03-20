# Phase 26: MCP Bridge + Tool Discipline - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase installs blender-mcp, establishes the Claude-to-Blender MCP connection, validates async patterns for long operations (sim bakes, Cycles renders), and produces a proof-of-concept Mantaflow fire orb. All tool discipline (screenshot token management, save-before-operate, cache directory) is established before any VFX work.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — pure infrastructure phase.

Key constraints from research:
- 180-second MCP timeout requires async patterns (bpy.app.timers.register for bakes, INVOKE_DEFAULT for renders)
- Screenshot tokens ~2,765 per 1080p PNG — use get_scene_info/get_object_info (text) primarily
- Mantaflow cache can reach 30-180+ GB — dedicated blender/cache/ directory from day one
- Blender version decision: 4.5 LTS recommended for stability (5.0 if volume grids needed)
- blender-mcp v1.5.5+ via `claude mcp add blender uvx blender-mcp`
- CLI-Anything v1.0.0 via pip install (optional — provisional maturity)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- PreAnalyzer.ts — already produces FrameAudioData with frame, time, amplitude, bass, mid, high, isBeat
- Audio FFT analysis pipeline in src/lib/audio/
- Existing render queue infrastructure (Turso + R2 + Modal) — untouched in v4.0

### Established Patterns
- File structure follows src/ for web app, new blender/ directory for Python scripts and Blender files
- Zustand for state management, Tailwind for styling — web app side untouched

### Integration Points
- The ONLY touch to existing code: add JSON export function to PreAnalyzer.ts (Phase 27, not this phase)
- blender-mcp runs as MCP server alongside Claude Code — no web app integration needed
- blender/ directory is entirely new — gitignore renders and cache

</code_context>

<specifics>
## Specific Ideas

- Vision doc specifies Wave 0 structure: install blender-mcp, verify connection, proof-of-concept fire orb
- Resolution ladder: 64 prototype / 128 test / 256 production / 512 premium
- Scene state management: always save .blend before destructive operations
- blender-mcp GitHub issues to watch: #50 (timeout), #52 (Windows ProactorEventLoop), #96 (print output)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
