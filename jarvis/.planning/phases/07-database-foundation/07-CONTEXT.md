# Phase 7 Context: Database Foundation

**Phase Goal:** Jarvis has a persistent storage layer that survives browser sessions and works on serverless

**Requirements:** MEM-01, MEM-08

**Created:** 2026-02-02

---

## Locked Decisions

### Memory Entry Structure

**Decision:** Contextually useful facts at medium granularity

Store facts that help Jarvis do its job (briefings, nudges, check-ins):
- Personal scheduling facts: "Therapy on Thursdays at 2pm"
- Important dates: "Partner's birthday March 15"
- Communication preferences: "Prefers brief responses during work hours"
- Work patterns: "Most productive in mornings"

Do NOT store:
- Trivia unrelated to executive function ("likes oat milk")
- Data already in Notion (tasks, projects, goals, habits)

**Rule:** If it could change a briefing, nudge, or check-in, store it.

---

### Session Boundaries

**Decision:** 30-minute inactivity gap OR natural day boundary

Session ends when:
- 30+ minutes of inactivity
- Explicit close ("goodnight", "goodbye")
- Browser/tab closed

New session starts when:
- User returns after gap
- Morning briefing triggered (always new session)
- Explicit greeting after closure

No requirement for explicit greetings to start interaction.

---

### Deduplication Behavior

**Decision:** Hash-based dedup with silent timestamp update

- Normalize and hash fact content for comparison
- If identical fact exists: update `last_accessed` timestamp, no duplicate
- If substantially different: create new entry
- Never prompt user about duplicates

User should not need to remember what they've told Jarvis.

---

### Daily Log Granularity

**Decision:** Significant events + topic markers (not verbatim transcripts)

**Log these events:**
- `session_start` — timestamp, source (morning briefing, user-initiated, etc.)
- `session_end` — timestamp, duration, trigger (timeout, explicit, browser close)
- `tool_invocation` — tool name, success/failure, brief context
- `topic_change` — new topic label when conversation shifts
- `user_state` — when user expresses sentiment ("feeling overwhelmed", "good day")

**Do NOT log:**
- Every utterance verbatim
- Routine acknowledgments ("okay", "thanks")
- Jarvis's full responses

**Purpose:** Enough to reconstruct day's arc for weekly review and cross-session continuity.

---

## Technical Decisions (from research)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | Drizzle | Type-safe, lightweight, serverless-friendly |
| Database client | @libsql/client | Works locally (SQLite) and serverless (Turso) |
| Production DB | Turso | Free tier sufficient, libsql compatible |
| Memory layers | 3-layer | JARVIS_MEMORY.md (curated) + daily_logs (events) + memory_entries (searchable) |

---

## Schema Direction

Based on decisions above, schema should include:

**memory_entries**
- id, content, content_hash (for dedup)
- category (preference, fact, pattern)
- source (user_explicit, jarvis_inferred)
- created_at, last_accessed

**sessions**
- id, started_at, ended_at
- end_trigger (timeout, explicit, browser_close)
- summary (optional, for weekly review)

**daily_logs**
- id, session_id, event_type
- event_data (JSON)
- timestamp

---

## Deferred Ideas

None captured during discussion.

---

## Next Steps

1. `/gsd:plan-phase 7` — Create execution plan
2. Or `/gsd:research-phase 7` — If more technical research needed (likely not needed given prior research)

---

*Discussed: 2026-02-02*
