# Phase 1: Audio Foundation - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

User can grant microphone permission and see the orb respond to audio input. Establishes browser audio capture, push-to-talk interaction, and orb visual states. Voice recognition (STT), AI responses, and Notion integration are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Personality Correction
- **NOT** "professional butler" — update all docs
- **IS** "omnipresent guide voice" — calm, knowing, always present

### Orb State Colors
- User-selectable per state with sensible defaults
- Default progression (cool → warm):
  - Idle = blue
  - Listening = cyan
  - Thinking = amber
  - Speaking = warm orange
- Settings UI for customizing state colors (future phase or this one TBD)

### Orb Intensity
- Baseline intensity at 1.7 (matches current Ethereal Flame level)
- Intensity INCREASES when Jarvis perceives issue as important
- Audio reactivity ALSO increases with importance
- Creates emotional signaling through visual urgency

### Orb Animation by State
- Both movement speed AND particle behavior vary per state
- **Idle:** Slow drift, particles dispersed as cloud
- **Listening:** Particles draw inward (keep motion visible, NOT frozen still)
- **Thinking:** Gentle pulse + swirl motion
- **Speaking:** Audio-reactive + particles expand outward

### State Transitions
- Transitions are DYNAMIC based on emotional intensity
- Faster transitions (~200ms) = more urgent/intense moments
- Slower transitions (~500ms+) = calmer, less intense moments
- Jarvis's "emotional read" determines transition speed

### Claude's Discretion
- Permission UX flow (first-time explanation, error states)
- Push-to-talk button placement and interaction pattern
- Mobile layout specifics (orb size, control positions)
- Exact particle counts and performance tuning

</decisions>

<specifics>
## Specific Ideas

- Reuse existing Ethereal Flame orb component from `src/components/visualizers/`
- Current rotating rainbow color should be replaceable with state-specific colors
- "Importance" signal affects BOTH intensity AND audio reactivity — double emphasis

</specifics>

<deferred>
## Deferred Ideas

- Settings UI for customizing state colors — may belong in later phase
- "Importance" scoring system — depends on Intelligence Layer (Phase 3)

</deferred>

---

*Phase: 01-audio-foundation*
*Context gathered: 2026-01-31*
