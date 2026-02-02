# Requirements Archive: v1 Jarvis Executive Function Partner

**Archived:** 2026-02-02
**Status:** ✅ SHIPPED

This is the archived requirements specification for v1.
For current requirements, see `.planning/REQUIREMENTS.md` (created for next milestone).

---

# Requirements: Jarvis

**Defined:** 2026-01-31
**Core Value:** One system that knows everything, surfaces what matters, and keeps you on track

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Voice I/O

- [x] **VOI-01**: Push-to-talk voice activation (hold button to speak)
- [x] **VOI-02**: Sub-300ms response latency target (speak to first TTS word)
- [x] **VOI-03**: Omnipresent guide voice persona via TTS
- [x] **VOI-04**: Context retention across conversation turns
- [x] **VOI-05**: Streaming TTS response (start speaking before full response generated)

### Executive Function

- [x] **EXE-01**: Daily morning briefing (spoken summary from Notion data)
- [x] **EXE-02**: Time awareness nudges ("time to wrap up and shift")
- [x] **EXE-03**: End-of-work-period check-in (what got done, update task status)
- [x] **EXE-04**: Midday pulse check (quick status, any pivots needed)
- [x] **EXE-05**: Evening wrap (capture loose ends, plan tomorrow)
- [x] **EXE-06**: Habit progress in briefings ("You're 4/7 on meditation this week")
- [x] **EXE-07**: Goal progress awareness (surface % complete, relate tasks to goals)
- [x] **EXE-08**: Life area priority weighting (triage toward low-rated priority areas)
- [x] **EXE-09**: Voice-guided weekly review session (reflection prompts)

### Notion Integration

- [x] **NOT-01**: Connect to Notion workspaces via MCP
- [x] **NOT-02**: Read tasks and projects (view current system state)
- [x] **NOT-03**: Read life areas, goals, and habits
- [x] **NOT-04**: Create tasks via voice → lands in "sort & prioritize" inbox by default
- [x] **NOT-05**: Create task with specific timing/context if user provides it
- [x] **NOT-06**: Update task status (complete, in progress, blocked)
- [x] **NOT-07**: Pause/table a task (defer with context)
- [x] **NOT-08**: Add items to project needs (sub-tasks or requirements discovered during work)
- [x] **NOT-09**: Mark complete early and move on (close out ahead of schedule)

### Visual Presence

- [x] **VIS-01**: Ethereal Flame orb as Jarvis's visual avatar
- [x] **VIS-02**: Audio-reactive animation synced to TTS output
- [x] **VIS-03**: State indicators (listening, thinking, speaking, idle)
- [x] **VIS-04**: Text display of current tasks/daily agenda
- [x] **VIS-05**: Priority items "needs attention" indicator

### Intelligence

- [x] **INT-01**: Claude API for reasoning and conversation
- [x] **INT-02**: Tool calling for Notion operations
- [x] **INT-03**: Conversation memory within session
- [x] **INT-04**: Omnipresent guide personality prompt engineering

### Financial Awareness

- [x] **FIN-01**: Read bills database (due date, amount, payee, pay link, payment method)
- [x] **FIN-02**: Mark bill as paid via voice
- [x] **FIN-03**: Include upcoming bills in daily briefing

### Infrastructure

- [x] **INF-01**: Web app hosted on whatareyouappreciatingnow.com
- [x] **INF-02**: Works on mobile browser (responsive design)
- [x] **INF-03**: Secure Notion OAuth flow (implemented as integration token, OAuth deferred to v2)
- [x] **INF-04**: API routes for backend operations

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Body Doubling

- **BDY-01**: Body doubling mode activation
- **BDY-02**: Periodic check-ins during focus session
- **BDY-03**: Session duration tracking
- **BDY-04**: Gentle redirection if distracted

### Voice Enhancements

- **VOI-ADV-01**: Wake word detection ("Jarvis")
- **VOI-ADV-02**: Barge-in support (interrupt while speaking)
- **VOI-ADV-03**: Multiple voice persona options

### Advanced Executive Function

- **EXE-ADV-01**: Voice-guided triage session
- **EXE-ADV-02**: Adaptive pushiness (learns patterns)
- **EXE-ADV-03**: Absorption detection ("you've been on this for 2 hours")
- **EXE-ADV-04**: Multi-workspace intelligence (Life OS + Client OS)

### Landscape Mapping

- **MAP-01**: Full brain dump session workflow
- **MAP-02**: Project/idea categorization assistant
- **MAP-03**: Priority matrix visualization

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first approach, browser works fine on mobile |
| Calendar write access | Read calendar is enough for briefings, writing adds risk |
| Multi-user accounts | Single creator workflow |
| Automated task execution | Jarvis advises, user executes |
| Real-time streaming transcription | Push-to-talk sufficient for v1 |
| Offline mode | Requires LLM, always needs internet |
| Client & Content OS | Personal first, add Client OS in v2 |
| Full budget tracking | Bill reminders in v1, spending categorization/analysis in v2 |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOI-01 | Phase 1: Audio Foundation | Complete |
| VOI-02 | Phase 2: Voice Pipeline | Complete |
| VOI-03 | Phase 2: Voice Pipeline | Complete |
| VOI-04 | Phase 3: Intelligence Layer | Complete |
| VOI-05 | Phase 2: Voice Pipeline | Complete |
| EXE-01 | Phase 5: Executive Function Core | Complete |
| EXE-02 | Phase 5: Executive Function Core | Complete |
| EXE-03 | Phase 5: Executive Function Core | Complete |
| EXE-04 | Phase 5: Executive Function Core | Complete |
| EXE-05 | Phase 6: Advanced Executive Function | Complete |
| EXE-06 | Phase 5: Executive Function Core | Complete |
| EXE-07 | Phase 5: Executive Function Core | Complete |
| EXE-08 | Phase 6: Advanced Executive Function | Complete |
| EXE-09 | Phase 6: Advanced Executive Function | Complete |
| NOT-01 | Phase 4: Data Integration | Complete |
| NOT-02 | Phase 4: Data Integration | Complete |
| NOT-03 | Phase 4: Data Integration | Complete |
| NOT-04 | Phase 4: Data Integration | Complete |
| NOT-05 | Phase 4: Data Integration | Complete |
| NOT-06 | Phase 4: Data Integration | Complete |
| NOT-07 | Phase 4: Data Integration | Complete |
| NOT-08 | Phase 4: Data Integration | Complete |
| NOT-09 | Phase 4: Data Integration | Complete |
| VIS-01 | Phase 1: Audio Foundation | Complete |
| VIS-02 | Phase 1: Audio Foundation | Complete |
| VIS-03 | Phase 1: Audio Foundation | Complete |
| VIS-04 | Phase 5: Executive Function Core | Complete |
| VIS-05 | Phase 5: Executive Function Core | Complete |
| INT-01 | Phase 3: Intelligence Layer | Complete |
| INT-02 | Phase 3: Intelligence Layer | Complete |
| INT-03 | Phase 3: Intelligence Layer | Complete |
| INT-04 | Phase 3: Intelligence Layer | Complete |
| INF-01 | Phase 1: Audio Foundation | Complete |
| INF-02 | Phase 1: Audio Foundation | Complete |
| INF-03 | Phase 4: Data Integration | Complete (OAuth deferred) |
| INF-04 | Phase 4: Data Integration | Complete |
| FIN-01 | Phase 4: Data Integration | Complete |
| FIN-02 | Phase 4: Data Integration | Complete |
| FIN-03 | Phase 5: Executive Function Core | Complete |

**Coverage:**
- v1 requirements: 39 total
- Shipped: 39/39
- Adjusted: 1 (INF-03 - OAuth deferred, integration token works)
- Dropped: 0

---

## Milestone Summary

**Shipped:** 39 of 39 v1 requirements
**Adjusted:** INF-03 (Notion OAuth) - using integration token instead, OAuth deferred to v2 for better UX
**Dropped:** None

---
*Archived: 2026-02-02 as part of v1 milestone completion*
