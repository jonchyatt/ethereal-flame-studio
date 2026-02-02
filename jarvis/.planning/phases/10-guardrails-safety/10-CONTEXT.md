# Phase 10: Guardrails & Safety - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Safety controls and audit trails for all Jarvis actions. Includes: confirmation dialogs before destructive operations, tool invocation logging, memory provenance tracking (explicit vs inferred), context window monitoring, and two bug fixes (Notion inbox capture, tomorrow preview).

</domain>

<decisions>
## Implementation Decisions

### Confirmation Behavior
- Only data deletion requires confirmation (not task completion, not notifications)
- Natural language acceptance: "yes", "yeah", "sure", "do it", "go ahead" all count as confirmation
- Claude's discretion: confirmation style (voice only vs voice+visual) and decline handling

### Audit Logging
- Backend only — no UI for browsing logs
- User can ask "what did you do?" and Jarvis explains from the log
- Log both successes and failures for complete debugging picture
- Claude's discretion: retention period and detail level

### Memory Provenance
- Don't distinguish explicit vs inferred when showing memories to user — just list facts
- Track source internally in database (useful for debugging, future features)
- Track confidence level for inferred memories (affects retrieval priority and decay)
- Explicit memories never decay — permanent until user says "forget"
- Only inferred memories can decay based on access patterns

### Content Filtering
- No filtering — user is only user, trusts themselves
- Allow storing sensitive data freely (passwords, SSNs, keys) — it's their assistant
- No prompt injection detection — overkill for single-user case; can undo with "forget that"

### Claude's Discretion
- Confirmation UX style (voice prompt vs voice+visual dialog)
- What to say when user declines a confirmation
- Audit log retention period
- Audit log detail level (minimal vs full parameters)

</decisions>

<specifics>
## Specific Ideas

- Natural confirmation phrases should feel conversational, not robotic
- "What did you do?" should give a clear, understandable explanation, not raw log dumps
- Memory listing should be clean — no clutter about where facts came from

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-guardrails-safety*
*Context gathered: 2026-02-02*
