---
phase: D-self-improvement
plan: 01
subsystem: intelligence
tags: [self-improvement, conversation-evaluation, behavior-rules, critic, agent-zero-patterns]

requires:
  - phase: C-memory-preservation
    provides: MCP Connector, post-hook system, stable brain architecture
provides:
  - Conversation evaluator (5-dimension rubric, Haiku critic)
  - Behavior rules system (versioned, database-backed)
  - System prompt injection for behavioral rules
  - Fire-and-forget evaluation after substantive conversations
affects: [Phase D-02 reflection loop, Phase E UI settings, Phase G integration]

tech-stack:
  added: []
  patterns: [fire-and-forget evaluation, tool_choice for structured output, versioned rules]

key-files:
  created:
    - src/lib/jarvis/intelligence/evaluator.ts
    - src/lib/jarvis/intelligence/behaviorRules.ts
    - src/lib/jarvis/memory/queries/evaluations.ts
    - src/lib/jarvis/memory/queries/behaviorRules.ts
  modified:
    - src/lib/jarvis/memory/schema.ts
    - src/lib/jarvis/intelligence/chatProcessor.ts
    - src/lib/jarvis/intelligence/systemPrompt.ts
    - src/lib/jarvis/telegram/context.ts
    - src/lib/jarvis/config.ts

key-decisions:
  - "Evaluator uses its own Anthropic API call (not brain's think()) — keeps evaluation independent"
  - "Haiku as critic model — cheap (~$0.0001/eval), fast, sufficient for structured scoring"
  - "tool_choice forced to submit_evaluation — ensures structured JSON output every time"
  - "Behavior rules table starts EMPTY — rules are earned through reflection, not seeded"
  - "D-01 is foundation only — D-02 will add the reflection loop that synthesizes evaluations into rules"

patterns-established:
  - "5-dimension evaluation rubric: Completeness, Accuracy, Efficiency, Tone, Satisfaction"
  - "Every score requires evidence (specific quote or description)"
  - "Substantive conversation threshold: 2+ tools OR complex query routing"
  - "Behavior rules versioning: isActive flag + supersededAt timestamp"

duration: ~25min
started: 2026-02-25
completed: 2026-02-25
---

# Phase D Plan 01: Self-Improvement Loop Foundation Summary

**Built conversation evaluator with 5-dimension rubric (Agent Zero pattern), behavior rules system with versioning, and wired fire-and-forget evaluation into the chat flow.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25 min |
| Started | 2026-02-25 |
| Completed | 2026-02-25 |
| Tasks | 3 completed (2 auto + 1 checkpoint) |
| Files modified | 9 (4 created, 5 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Schema Extended | Pass | `conversation_evaluations` + `behavior_rules` tables added |
| AC-2: Evaluator Works | Pass | Haiku critic with tool_choice for structured JSON output |
| AC-3: Rules in System Prompt | Pass | BEHAVIORAL RULES section after LEARNED PREFERENCES, omitted when empty |
| AC-4: Evaluation Triggers | Pass | Fire-and-forget after 2+ tools or complex query, gated by enableSelfImprovement |
| AC-5: Build Passes | Pass | Zero new TS errors |

## Accomplishments

- Created `evaluator.ts` — uses Haiku with `tool_choice` forced to `submit_evaluation` for reliable structured output
- 5-dimension rubric adapted from Agent Zero: Completeness, Accuracy, Efficiency, Tone, Satisfaction
- Each score requires evidence (specific quote or description) — no inflated scores
- Created `behaviorRules.ts` + query module with CRUD and versioning (isActive + supersededAt)
- `chatProcessor.ts` triggers evaluation fire-and-forget after substantive conversations
- `systemPrompt.ts` conditionally includes BEHAVIORAL RULES section
- `context.ts` loads active rules when self-improvement enabled
- All behind `enableSelfImprovement` feature flag (off by default)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/memory/schema.ts` | Modified | 2 new tables: conversation_evaluations, behavior_rules |
| `src/lib/jarvis/memory/queries/evaluations.ts` | Created | Store/query evaluation scores |
| `src/lib/jarvis/memory/queries/behaviorRules.ts` | Created | CRUD for versioned behavioral rules |
| `src/lib/jarvis/intelligence/evaluator.ts` | Created | 5-dimension critic using Haiku with tool_choice |
| `src/lib/jarvis/intelligence/behaviorRules.ts` | Created | Load active rules for system prompt |
| `src/lib/jarvis/intelligence/chatProcessor.ts` | Modified | Fire-and-forget evaluation trigger |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Modified | BEHAVIORAL RULES section + behaviorRules context field |
| `src/lib/jarvis/telegram/context.ts` | Modified | Load behavior rules when flag enabled |
| `src/lib/jarvis/config.ts` | Modified | enableSelfImprovement flag |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Haiku as critic (not Sonnet) | ~$0.0001/eval, fast, sufficient for structured scoring | Cost-effective at scale |
| tool_choice forced | Guarantees structured JSON output, no parsing needed | Reliable evaluation data |
| Rules table starts empty | Rules are earned through reflection, not pre-seeded | Clean, honest self-improvement |
| Separate API call (not brain's think()) | Evaluation is independent — different system prompt, different purpose | Clean separation of concerns |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

Plan executed exactly as written.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Pre-existing build errors (local-agent, audio-prep) | Same as prior phases — unrelated |

## Next Phase Readiness

**Ready for D-02:**
- Evaluation data is being collected (when flag is on)
- `getRecentEvaluations()` and `getAverageScores()` ready for reflection loop
- `addRule()` and `supersedeRule()` ready for behavior evolution
- Versioning infrastructure in place

**Ready for Phase E:**
- Settings UI idea captured in memory: gear icon settings page to toggle features
- `enableSelfImprovement` is a candidate toggle for the settings page

**Note:** `drizzle-kit push` needed to create the new tables in Turso before enabling the flag.

**Blockers:** None

---
*Phase: D-self-improvement, Plan: 01*
*Completed: 2026-02-25*
