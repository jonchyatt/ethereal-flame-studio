# Phase 5: Executive Function Core - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Jarvis provides proactive executive function support throughout the day: morning briefings that review tasks/calendar/bills/habits, time nudges for upcoming commitments, and optional midday/evening check-ins. All interactions work via voice OR text/tap for environments where voice isn't possible.

</domain>

<decisions>
## Implementation Decisions

### Morning Briefing Structure
- Jarvis presents an outline first: "Today we'll cover A, B, C, D. Ready to begin?"
- On agreement, walks through each section one at a time
- After each section: asks for questions, additions, or alterations before moving on
- When all sections complete: "Anything more? Ready to start the day?"
- **Sections included:**
  - Tasks (today's todos from Notion)
  - Calendar events
  - Bills & finances (due this week)
  - Habits & streaks
- User can skip any section on request
- Empty sections: mention briefly and move on ("No bills due this week. Moving to habits...")
- Task detail level: just the title (no context or goal links during briefing)

### Time Nudge Behavior
- **Triggers:**
  - Calendar transitions (upcoming meetings/events)
  - Task deadlines approaching
  - Bill due dates
  - Business paperwork deadlines
- **NOT triggered by:** fixed intervals or break suggestions
- **Purpose:** "Are we staying on track for upcoming commitments?"
- **Delivery:** Gentle sound + visual indicator; voice only if user engages
- **Acknowledgment:** Voice OR tap/text (multimodal — must work in operating room or similar)
- **Lead time:** Claude's discretion based on event type

### Check-in Interactions
- **Timing:** Scheduled times (noon, end-of-work), easily skippable
- **Midday check-in covers:**
  - Progress review ("You completed 3/5 tasks")
  - Reprioritization ("What's the priority for afternoon?")
  - New captures ("Anything come up to add?")
- **Evening check-in covers:**
  - Day completion status (what got done, what didn't)
  - Loose end capture ("Anything floating in your head?")
  - Tomorrow preview ("Here's what's on deck")
  - Review of ongoing goals and project issues
  - Reprioritization of projects
- **Review cadence system:** Each task/goal/project has a review frequency property (daily, every other day, weekly, etc.). Check-ins only surface items due for review based on their cadence.

### Visual Dashboard Layout
- **Default view:** Moderate — orb + today summary
- **Toggleable sections:** Tasks, calendar, habits, bills can be shown/hidden
- **Pinnable items:** Specific items or categories can be pinned to stay visible regardless of default view
- **Orb interaction:** Tap the orb to activate audio (remove separate mic button, freeing screen space)
- **Priority visual distinction:** Claude's discretion

### Multimodal Interaction
- All interactions must work via voice OR text/tap
- Voice is nice-to-have, not required
- Environment may prohibit voice (operating room, meetings)
- Buttons and text input are first-class interaction methods

### Claude's Discretion
- Lead time for calendar nudges (based on event type)
- Visual layout/positioning of dashboard elements
- Priority indicator styling (color, icons, position)
- Exact phrasing and tone of nudges and check-ins

</decisions>

<specifics>
## Specific Ideas

- "I need an agent that keeps me on track" — core design principle
- Check-ins ask about progress on what matters, not mood/energy
- Review cadence allows different items to be reviewed at different frequencies
- The orb IS the tap target — no separate microphone button

</specifics>

<deferred>
## Deferred Ideas

- Weekly review (Phase 6)
- Evening wrap (Phase 6)
- Life area weighting (Phase 6)
- Energy/mood tracking — explicitly excluded from check-ins

</deferred>

---

*Phase: 05-executive-function-core*
*Context gathered: 2026-02-01*
