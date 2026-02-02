# Phase 6: Advanced Executive Function - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Voice-guided executive function rituals: evening wrap workflow, life area priority weighting for triage, and weekly review session. Builds on Phase 5's briefings and check-ins by adding end-of-day closure, area balance awareness, and structured weekly planning.

Requirements: EXE-05 (evening wrap), EXE-08 (life area weighting), EXE-09 (weekly review)

</domain>

<decisions>
## Implementation Decisions

### Evening Wrap Flow
- Comprehensive flow with multiple sections: day review, task updates, new captures, tomorrow preview, week summary, finance check
- Day review: completed + incomplete tasks — factual outline, not a scorecard
- Tomorrow preview: read the list (keep it short), but Jarvis speaks up if something important seems neglected or at risk
- Week preview: tomorrow's tasks + high-level week summary (busy days, light days)
- New task capture: infer project/timing from context, ask only if unclear
- Finance: bills due soon (existing Notion data)
- Ending: open-ended — "Anything else on your mind?" to invite more conversation
- Duration: flexible based on how much happened that day

### Life Area Weighting
- Weights set via both: user sets baseline priorities, Jarvis adjusts based on activity tracking
- Influence on triage: gentle nudge only ("Health has been quiet this week") — awareness, not aggressive prioritization
- When mentioned: morning briefing, evening wrap, and weekly review
- Neglect threshold: relative to user's baseline activity pattern for that area (not fixed days)

### Weekly Review Structure
- Structure: very brief retrospective, then mostly forward planning
- Retrospective: factual outline only — tasks completed, bills paid, project progress (no scorecard, no judgment, no emotional prompts)
- Forward planning: upcoming week + horizon scan (notable items in next 2-4 weeks)
- Interactivity: checkpoints — Jarvis pauses at key points to ask "Anything to add?"
- Duration: flexible based on content

### Trigger & Timing
- Evening wrap: scheduled prompt at configured time (late evening default), can be manually triggered anytime, schedule is user-adjustable
- Weekly review: reminder that it's due + user starts manually when ready
- Missed prompts: gentle follow-up next interaction ("We skipped evening wrap yesterday")
- Weekly review day: configurable by user (no default imposed)

### Claude's Discretion
- Exact phrasing of prompts and transitions
- How to structure the checkpoint pauses
- How to calculate "relative to baseline" for area neglect
- Order of sections within each workflow

</decisions>

<specifics>
## Specific Ideas

- Evening wrap should feel like closing out the day, not an interrogation
- Weekly review retrospective should be brief and factual — "not scorecard, not judgment, not therapy"
- Jarvis should be concise by default but proactive when something important might be missed
- Life area nudges are awareness, not directives — user decides what to do with the information

</specifics>

<deferred>
## Deferred Ideas

- **Moltbot integration** — User mentioned integrating a "Moltbot variation" to give Jarvis full power. This is a significant capability expansion — own phase.
- **Business filings tracking** — User wants upcoming business filings in finance review. Requires new Notion data source.
- **Investment/trade tracking** — User wants investment and trade review. Requires new Notion data source.

</deferred>

---

*Phase: 06-advanced-executive-function*
*Context gathered: 2026-02-01*
