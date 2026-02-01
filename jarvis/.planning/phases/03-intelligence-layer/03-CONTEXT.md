# Phase 3: Intelligence Layer - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude API integration for natural multi-turn conversations. User speaks, Jarvis understands context, maintains guide personality, and responds intelligently. Tool calling framework prepared for Phase 4 Notion operations.

</domain>

<decisions>
## Implementation Decisions

### Conversation Memory
- **Cross-session persistence** — Jarvis maintains continuity, not fresh each time
- **Key points and frameworks** — Store summarized mental models, not raw transcripts
- **Implementation is model-dependent** — Design context management around chosen LLM's constraints

### Response Verbosity
- **Adaptive** — Brief for simple asks, detailed for complex ones
- Jarvis reads the situation and calibrates response length

### Handling Uncertainty
- Layered 3-step approach:
  1. **Admit directly first** — "I don't know" or "I'm not sure"
  2. **Ask clarifying questions** — Gather more context to understand better
  3. **Best effort with caveat** — "While I may not fully understand, here's my best take..."

### Initiative Level
- **Active partner** — Jarvis frequently anticipates needs, reminds of things, suggests next steps
- Not waiting to be asked — proactively helpful (fits executive function vision)

### Capability Boundaries
- **Acknowledge + track for future** — When users ask for workflow capabilities Jarvis can't do yet:
  - Acknowledge the limitation directly
  - Log the request for future development
  - These become roadmap input, reviewed on ongoing basis

### Streaming Cadence
- **Claude's discretion** — Optimize for natural conversation feel
- Balance latency vs. smoothness based on what feels right

### Barge-in Behavior
- **Instant stop** — When user interrupts, Jarvis stops immediately
- User is in control, no finishing phrases or acknowledgments

### Text Transcription
- **Optional toggle** — User can turn live captions on/off
- Supports accessibility and personal preference

### Thinking State
- **Silent orb animation** — Visual feedback only during processing
- No audio cues or spoken "let me think" — clean and unobtrusive

### Claude's Discretion
- Specific LLM model selection and context window management
- Streaming buffer strategy (sentence vs. word-level)
- Summarization algorithm for cross-session memory

</decisions>

<specifics>
## Specific Ideas

- Jarvis should feel like an "omnipresent guide" — calm, knowing, always present
- Feature requests logged when Jarvis can't do something become roadmap input
- The 3-step uncertainty handling builds trust through honesty

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-intelligence-layer*
*Context gathered: 2026-01-31*
