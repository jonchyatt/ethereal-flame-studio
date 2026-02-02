# Phase 8: Memory Loading & Integration - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Jarvis loads and references memory context at conversation start without breaking existing features. Users experience continuity across sessions — Jarvis knows who they are, what they're working on, and what tasks are pending.

**In scope:** Loading memories, injecting into context, referencing in responses, proactive surfacing
**Out of scope:** Explicit remember/forget commands (Phase 9), memory decay (Phase 9), guardrails (Phase 10)

</domain>

<decisions>
## Implementation Decisions

### Memory Retrieval Strategy
- Conservative loading: 5-10 memories, ~1000 token budget max
- Calendar/time-aware selection: Monday morning loads work context, Thursday 3pm surfaces therapy-related memories
- Fallback prioritization: Blend of user-flagged important items + recent activity
- Claude's discretion: Specific scoring algorithm and retrieval implementation

### Context Injection Format
- Structured list format (not narrative, not metadata)
- Each entry includes age AND source: `"Therapy: Thursdays 3pm (2 weeks ago, you told me)"`
- Human-readable for auditing ("What does Jarvis know about me?")
- Claude's discretion: Whether to group by category or keep flat list
- Claude's discretion: Placement within system prompt

### Reference Style in Responses
- Context-dependent referencing:
  - Explicit for facts: "Your therapy is at 3pm"
  - Subtle for preferences: Just acts on them without calling out
- When corrected: Acknowledge explicitly ("Got it, updating to Wednesdays")
- Claude's discretion: Time reference precision (specific vs fuzzy)
- Claude's discretion: When to hedge on potentially stale info

### Proactive Surfacing Behavior
- Frequency: Active — surface relevant memories frequently
- What to surface:
  - YES: Task follow-ups (things user committed to do)
  - YES: Work/factual context (projects, people, blockers)
  - NO: Emotional check-ins ("How did the scary thing go?")
  - NO: Unsolicited lifestyle advice ("You should exercise")
- Timing:
  - Session start: Surface pending tasks/reminders
  - Mid-conversation: Surface relevant context when topic comes up
- Multiple items: Batch briefly ("Quick hits: invoice follow-up, and Sarah's waiting on that doc")

### Core Philosophy
**Jarvis = helpful assistant, not life coach.**
Task-focused, not feelings-focused. Professional and useful without being intrusive or playing therapist.

</decisions>

<specifics>
## Specific Ideas

- Memory format example:
  ```
  User context:
  - Schedule: Therapy Thursdays 3pm with Dr. Chen (2 weeks ago, you told me)
  - Preference: Brief responses, bullet points (inferred, 3 days ago)
  - Current project: Q2 budget with Sarah (boss) (1 week ago, you told me)
  - Pending: Follow up on invoice (yesterday, you asked)
  ```

- Proactive surfacing examples (GOOD):
  - "You wanted to follow up on that invoice"
  - "Last time you mentioned the Q2 numbers were off — did that get resolved?"
  - "When you talked to Sarah last week, you were waiting on her approval"

- Proactive surfacing examples (BAD - don't do these):
  - "How did the presentation go?" (emotional check-in)
  - "You seem stressed — have you gone for a run lately?" (unsolicited life advice)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-memory-loading-integration*
*Context gathered: 2026-02-02*
