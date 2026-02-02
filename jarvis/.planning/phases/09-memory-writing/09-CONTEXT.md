# Phase 9: Memory Writing & Tools - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Voice commands that let users explicitly manage what Jarvis remembers — adding facts, removing facts, querying stored memories, and bulk-deleting all data. Also includes automatic preference learning from observed behavior.

</domain>

<decisions>
## Implementation Decisions

### Remember Command
- Trigger on explicit phrases ("Remember that...", "Don't forget...") AND soft hints ("I always...", "Every Thursday I...")
- Store extracted facts, normalized for searchability (not verbatim quotes, not full context)
- Always verbally confirm when storing: "Got it, I'll remember..."
- Jarvis should confirm even for soft-hint inferences

### Forget Targeting
- Natural language targeting: "Forget what I said about therapy" — Jarvis matches by relevance
- Always confirm which fact before deleting (no silent deletes)
- Support category bulk delete: "Forget everything about my health"
- When multiple matches: list them and let user pick which to forget
- Soft delete with 30-day recovery window — "undo forget" works within that period

### Memory Recall Format
- Response mode: Speak highlights + show visual list on screen
- Visual list organized by category (Schedule, Preferences, People, etc.)
- Support natural topic queries ("What do you know about my schedule?") AND full list
- Verbosity is context-aware: brief summary if many memories, detailed if few
- Each memory shows date added/last referenced

### Preference Learning
- Broad scope: communication style, scheduling patterns, topics of interest, workflow patterns
- Quick learner: store preference after 2-3 consistent observations
- Fully transparent: inferred preferences appear in memory list, tagged as "Learned" (vs "You told me")
- Full user control: can delete, edit, or correct any inference

### Claude's Discretion
- Category taxonomy for organizing memories
- Specific matching algorithm for forget requests
- Decay rate for unused memories (MEM-10)
- How to handle conflicts between inferred and explicit preferences

</decisions>

<specifics>
## Specific Ideas

- Memory list UI should show clear distinction between "You told me" and "Learned" items
- Soft delete creates a "Recently Deleted" recoverable state (like iOS photos)
- Category bulk delete should require explicit confirmation: "This will forget 5 items about health. Proceed?"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-memory-writing*
*Context gathered: 2026-02-02*
