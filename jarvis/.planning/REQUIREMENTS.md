# Requirements: Jarvis

**Defined:** 2026-01-31
**Core Value:** One system that knows everything, surfaces what matters, and keeps you on track

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Voice I/O

- [x] **VOI-01**: Push-to-talk voice activation (hold button to speak)
- [ ] **VOI-02**: Sub-300ms response latency target (speak to first TTS word)
- [ ] **VOI-03**: Omnipresent guide voice persona via TTS
- [ ] **VOI-04**: Context retention across conversation turns
- [ ] **VOI-05**: Streaming TTS response (start speaking before full response generated)

### Executive Function

- [ ] **EXE-01**: Daily morning briefing (spoken summary from Notion data)
- [ ] **EXE-02**: Time awareness nudges ("time to wrap up and shift")
- [ ] **EXE-03**: End-of-work-period check-in (what got done, update task status)
- [ ] **EXE-04**: Midday pulse check (quick status, any pivots needed)
- [ ] **EXE-05**: Evening wrap (capture loose ends, plan tomorrow)
- [ ] **EXE-06**: Habit progress in briefings ("You're 4/7 on meditation this week")
- [ ] **EXE-07**: Goal progress awareness (surface % complete, relate tasks to goals)
- [ ] **EXE-08**: Life area priority weighting (triage toward low-rated priority areas)
- [ ] **EXE-09**: Voice-guided weekly review session (reflection prompts)

### Notion Integration

- [ ] **NOT-01**: Connect to Notion workspaces via MCP
- [ ] **NOT-02**: Read tasks and projects (view current system state)
- [ ] **NOT-03**: Read life areas, goals, and habits
- [ ] **NOT-04**: Create tasks via voice → lands in "sort & prioritize" inbox by default
- [ ] **NOT-05**: Create task with specific timing/context if user provides it
- [ ] **NOT-06**: Update task status (complete, in progress, blocked)
- [ ] **NOT-07**: Pause/table a task (defer with context)
- [ ] **NOT-08**: Add items to project needs (sub-tasks or requirements discovered during work)
- [ ] **NOT-09**: Mark complete early and move on (close out ahead of schedule)

### Visual Presence

- [x] **VIS-01**: Ethereal Flame orb as Jarvis's visual avatar
- [x] **VIS-02**: Audio-reactive animation synced to TTS output
- [x] **VIS-03**: State indicators (listening, thinking, speaking, idle)
- [ ] **VIS-04**: Text display of current tasks/daily agenda
- [ ] **VIS-05**: Priority items "needs attention" indicator

### Intelligence

- [ ] **INT-01**: Claude API for reasoning and conversation
- [ ] **INT-02**: Tool calling for Notion operations
- [ ] **INT-03**: Conversation memory within session
- [ ] **INT-04**: Omnipresent guide personality prompt engineering

### Financial Awareness

- [ ] **FIN-01**: Read bills database (due date, amount, payee, pay link, payment method)
- [ ] **FIN-02**: Mark bill as paid via voice
- [ ] **FIN-03**: Include upcoming bills in daily briefing

### Infrastructure

- [x] **INF-01**: Web app hosted on whatareyouappreciatingnow.com
- [x] **INF-02**: Works on mobile browser (responsive design)
- [ ] **INF-03**: Secure Notion OAuth flow
- [ ] **INF-04**: API routes for backend operations

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

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOI-01 | Phase 1: Audio Foundation | Complete |
| VOI-02 | Phase 2: Voice Pipeline | Pending |
| VOI-03 | Phase 2: Voice Pipeline | Pending |
| VOI-04 | Phase 3: Intelligence Layer | Pending |
| VOI-05 | Phase 2: Voice Pipeline | Pending |
| EXE-01 | Phase 5: Executive Function Core | Pending |
| EXE-02 | Phase 5: Executive Function Core | Pending |
| EXE-03 | Phase 5: Executive Function Core | Pending |
| EXE-04 | Phase 5: Executive Function Core | Pending |
| EXE-05 | Phase 6: Advanced Executive Function | Pending |
| EXE-06 | Phase 5: Executive Function Core | Pending |
| EXE-07 | Phase 5: Executive Function Core | Pending |
| EXE-08 | Phase 6: Advanced Executive Function | Pending |
| EXE-09 | Phase 6: Advanced Executive Function | Pending |
| NOT-01 | Phase 4: Data Integration | Pending |
| NOT-02 | Phase 4: Data Integration | Pending |
| NOT-03 | Phase 4: Data Integration | Pending |
| NOT-04 | Phase 4: Data Integration | Pending |
| NOT-05 | Phase 4: Data Integration | Pending |
| NOT-06 | Phase 4: Data Integration | Pending |
| NOT-07 | Phase 4: Data Integration | Pending |
| NOT-08 | Phase 4: Data Integration | Pending |
| NOT-09 | Phase 4: Data Integration | Pending |
| VIS-01 | Phase 1: Audio Foundation | Complete |
| VIS-02 | Phase 1: Audio Foundation | Complete |
| VIS-03 | Phase 1: Audio Foundation | Complete |
| VIS-04 | Phase 5: Executive Function Core | Pending |
| VIS-05 | Phase 5: Executive Function Core | Pending |
| INT-01 | Phase 3: Intelligence Layer | Pending |
| INT-02 | Phase 3: Intelligence Layer | Pending |
| INT-03 | Phase 3: Intelligence Layer | Pending |
| INT-04 | Phase 3: Intelligence Layer | Pending |
| INF-01 | Phase 1: Audio Foundation | Complete |
| INF-02 | Phase 1: Audio Foundation | Complete |
| INF-03 | Phase 4: Data Integration | Pending |
| INF-04 | Phase 4: Data Integration | Pending |
| FIN-01 | Phase 4: Data Integration | Pending |
| FIN-02 | Phase 4: Data Integration | Pending |
| FIN-03 | Phase 5: Executive Function Core | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39/39
- Unmapped: 0

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 (Phase 1 complete - 6 requirements)*
