# Requirements: Jarvis v2.0 Memory & Production

**Milestone:** v2.0
**Created:** 2026-02-02
**Status:** Roadmap Created

---

## v2.0 Requirements

### Memory System

- [ ] **MEM-01**: User can have facts persist across browser sessions
- [ ] **MEM-02**: User can explicitly tell Jarvis to remember something ("Remember I have therapy Thursdays")
- [ ] **MEM-03**: User can explicitly tell Jarvis to forget something ("Forget that preference")
- [ ] **MEM-04**: User can ask what Jarvis remembers ("What do you know about me?")
- [ ] **MEM-05**: User can delete all stored memories
- [ ] **MEM-06**: Jarvis loads relevant memory context at session start
- [ ] **MEM-07**: Jarvis references previous conversations naturally ("Yesterday you mentioned...")
- [ ] **MEM-08**: Jarvis logs daily session events to persistent storage
- [ ] **MEM-09**: Jarvis learns user communication preferences over time (brevity vs detail)
- [ ] **MEM-10**: Jarvis decays unused memories to prevent bloat (intelligent forgetting)
- [ ] **MEM-11**: Jarvis proactively surfaces relevant memories in context

### Production Deployment

- [ ] **PROD-01**: Jarvis deployed to jarvis.whatareyouappreciatingnow.com
- [ ] **PROD-02**: All API keys stored securely (not exposed to client)
- [ ] **PROD-03**: Production database configured (Turso)
- [ ] **PROD-04**: Custom domain with HTTPS configured

### Bug Fixes

- [ ] **FIX-01**: Captured items during check-ins reach Notion inbox
- [ ] **FIX-02**: Tomorrow preview in evening check-in shows real data

### Guardrails & Safety

- [ ] **GUARD-01**: Destructive actions (delete, complete) require explicit confirmation
- [ ] **GUARD-02**: All tool invocations logged with timestamp and parameters
- [ ] **GUARD-03**: Memory entries tagged with source (user-explicit vs inferred)
- [ ] **GUARD-04**: Malicious content in memory entries detected and rejected
- [ ] **GUARD-05**: Context window utilization monitored to prevent instruction drift

---

## Future Requirements (v2.1+)

### Deferred from v2.0

- Telegram messaging gateway (mobile access)
- Memory visualization UI (view/edit memories)
- Wake word detection
- Body doubling mode
- Adaptive pushiness
- Semantic search for memories (embeddings)
- Multi-device sync

---

## Out of Scope

- Mobile native app -- web-first approach works
- Calendar write access -- read sufficient, writing adds risk
- Multi-user accounts -- single creator workflow
- Offline mode -- requires LLM, always needs internet
- Automated task execution -- Jarvis advises, user executes

---

## Requirement Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| MEM-01 | 7 | -- | Pending |
| MEM-02 | 9 | -- | Pending |
| MEM-03 | 9 | -- | Pending |
| MEM-04 | 9 | -- | Pending |
| MEM-05 | 9 | -- | Pending |
| MEM-06 | 8 | -- | Pending |
| MEM-07 | 8 | -- | Pending |
| MEM-08 | 7 | -- | Pending |
| MEM-09 | 9 | -- | Pending |
| MEM-10 | 9 | -- | Pending |
| MEM-11 | 8 | -- | Pending |
| PROD-01 | 11 | -- | Pending |
| PROD-02 | 11 | -- | Pending |
| PROD-03 | 11 | -- | Pending |
| PROD-04 | 11 | -- | Pending |
| FIX-01 | 10 | -- | Pending |
| FIX-02 | 10 | -- | Pending |
| GUARD-01 | 10 | -- | Pending |
| GUARD-02 | 10 | -- | Pending |
| GUARD-03 | 10 | -- | Pending |
| GUARD-04 | 10 | -- | Pending |
| GUARD-05 | 10 | -- | Pending |

---

*22 requirements across 4 categories*
*All requirements mapped to phases 7-11*
*Generated: 2026-02-02*
