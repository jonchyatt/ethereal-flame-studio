# Roadmap: Jarvis

## Overview

Jarvis transforms from concept to voice-enabled executive function partner through six phases following a strict dependency chain: audio infrastructure before voice pipeline, voice before AI, AI before data integration, and data before advanced behaviors. Each phase delivers a verifiable capability that unblocks the next. The architecture prioritizes latency (sub-300ms target) and streaming-first design to ensure conversational feel.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Audio Foundation** - Browser audio capture/playback, orb integration, permission UX
- [ ] **Phase 2: Voice Pipeline** - STT + TTS integration with streaming, turn-taking state machine
- [ ] **Phase 3: Intelligence Layer** - Claude API integration, conversation context, butler personality
- [ ] **Phase 4: Data Integration** - Notion MCP connection, read/write operations, OAuth flow
- [ ] **Phase 5: Executive Function Core** - Daily briefings, time nudges, check-ins, habit/goal awareness
- [ ] **Phase 6: Advanced Executive Function** - Weekly review, life area weighting, evening wrap

## Phase Details

### Phase 1: Audio Foundation
**Goal**: User can grant microphone permission and see the orb respond to audio input
**Depends on**: Nothing (first phase)
**Requirements**: VOI-01, VIS-01, VIS-02, VIS-03, INF-01, INF-02
**Success Criteria** (what must be TRUE):
  1. User can click a button to activate microphone and see permission prompt with clear explanation
  2. User can hold push-to-talk button and see orb animate in response to their voice
  3. Orb displays distinct visual states for idle, listening, thinking, and speaking
  4. Web app loads on mobile browser with responsive layout
  5. Audio latency instrumentation is capturing timing data
**Plans**: TBD

Plans:
- [ ] 01-01: Infrastructure setup (Next.js, hosting, project structure)
- [ ] 01-02: Orb avatar integration with state indicators
- [ ] 01-03: Audio capture with push-to-talk and permission UX

### Phase 2: Voice Pipeline
**Goal**: User can speak and hear synthesized speech response (echo test)
**Depends on**: Phase 1
**Requirements**: VOI-02, VOI-03, VOI-05
**Success Criteria** (what must be TRUE):
  1. User speaks into microphone and sees real-time transcription appear
  2. User hears TTS response begin playing within 300ms of speech completion
  3. TTS voice has professional butler quality (not robotic)
  4. User can interrupt TTS playback by pressing push-to-talk (barge-in)
  5. Orb animates in sync with TTS audio output
**Plans**: TBD

Plans:
- [ ] 02-01: Deepgram STT WebSocket integration
- [ ] 02-02: ElevenLabs streaming TTS integration
- [ ] 02-03: Turn-taking state machine and barge-in detection

### Phase 3: Intelligence Layer
**Goal**: User can have natural multi-turn conversations with Jarvis
**Depends on**: Phase 2
**Requirements**: INT-01, INT-02, INT-03, INT-04, VOI-04
**Success Criteria** (what must be TRUE):
  1. User can ask questions and receive contextually relevant spoken answers
  2. User can reference previous statements ("What about that?") and Jarvis understands
  3. Jarvis maintains butler personality throughout conversation (calm, formal, efficient)
  4. Jarvis knows current time and can reference it naturally in responses
  5. Tool calling framework is ready for Notion operations (tools defined, not implemented)
**Plans**: TBD

Plans:
- [ ] 03-01: Claude API route with streaming responses
- [ ] 03-02: Conversation context management (sliding window, system prompt)
- [ ] 03-03: Butler personality prompt engineering and tool definitions

### Phase 4: Data Integration
**Goal**: Jarvis can read and write to Notion workspace
**Depends on**: Phase 3
**Requirements**: NOT-01, NOT-02, NOT-03, NOT-04, NOT-05, NOT-06, NOT-07, NOT-08, NOT-09, INF-03, INF-04
**Success Criteria** (what must be TRUE):
  1. User completes OAuth flow to connect their Notion workspace
  2. User says "What tasks do I have?" and Jarvis reads from Notion tasks database
  3. User says "Remind me to call mom" and task appears in Notion inbox
  4. User can specify timing/context ("Call mom tomorrow morning") and task captures it
  5. User can update task status via voice ("Mark 'call mom' as complete")
  6. User can pause/defer tasks via voice ("Table the website project for next week")
  7. User can add items to project needs via voice
**Plans**: TBD

Plans:
- [ ] 04-01: Notion MCP client setup and OAuth flow
- [ ] 04-02: Read operations (tasks, projects, goals, habits)
- [ ] 04-03: Write operations (create, update, pause, complete)

### Phase 5: Executive Function Core
**Goal**: Jarvis provides proactive executive function support throughout the day
**Depends on**: Phase 4
**Requirements**: EXE-01, EXE-02, EXE-03, EXE-04, EXE-06, EXE-07, VIS-04, VIS-05
**Success Criteria** (what must be TRUE):
  1. User hears morning briefing with tasks, calendar, and habit progress summary
  2. User receives gentle time nudges during work ("It's been 90 minutes, time to stretch")
  3. User gets end-of-work check-in prompting status updates
  4. User gets midday pulse check asking about progress and pivots
  5. Briefings include habit progress ("You're 4/7 on meditation this week")
  6. Briefings relate tasks to goals ("This moves you toward X goal")
  7. Current tasks and agenda display as text alongside the orb
  8. Priority items show visual "needs attention" indicator
**Plans**: TBD

Plans:
- [ ] 05-01: Morning briefing workflow (aggregate Notion data into spoken summary)
- [ ] 05-02: Time awareness and scheduled check-ins
- [ ] 05-03: Task/agenda display and priority indicators

### Phase 6: Advanced Executive Function
**Goal**: Jarvis provides comprehensive executive function partnership
**Depends on**: Phase 5
**Requirements**: EXE-05, EXE-08, EXE-09
**Success Criteria** (what must be TRUE):
  1. User can run voice-guided weekly review with reflection prompts
  2. User receives evening wrap prompts to capture loose ends and plan tomorrow
  3. Jarvis applies life area priority weighting to surface neglected areas
  4. Triage suggestions are informed by life area balance
**Plans**: TBD

Plans:
- [ ] 06-01: Evening wrap workflow
- [ ] 06-02: Life area weighting and priority triage
- [ ] 06-03: Voice-guided weekly review session

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Audio Foundation | 0/3 | Not started | - |
| 2. Voice Pipeline | 0/3 | Not started | - |
| 3. Intelligence Layer | 0/3 | Not started | - |
| 4. Data Integration | 0/3 | Not started | - |
| 5. Executive Function Core | 0/3 | Not started | - |
| 6. Advanced Executive Function | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-31*
*Requirements coverage: 28/28 mapped*
