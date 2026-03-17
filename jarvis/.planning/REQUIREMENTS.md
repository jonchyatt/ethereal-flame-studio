# Requirements: Jarvis v5.0 Agent Unification

**Defined:** 2026-03-16
**Core Value:** One agent with complete context across all life domains, taking autonomous actions while Jon works hospital shifts

## v5.0 Requirements

### Foundation

- [x] **FOUND-01**: Jarvis repo migrated to C:\Users\jonch\Projects\jarvis with clean git history and working PM2 processes
- [x] **FOUND-02**: Claude Agent SDK (@anthropic-ai/claude-agent-sdk) replaces claude-code SDK with native sub-agent support
- [x] **FOUND-03**: Flexible scheduler with DB-driven task CRUD (add/edit/remove tasks via Telegram or web UI)
- [x] **FOUND-04**: Research-as-library schema in SQLite for structured research storage with semantic recall

### Security & Vault

- [x] **VAULT-01**: Bitwarden MCP server integrated — credentials injected into browser without LLM exposure
- [x] **VAULT-02**: Bitwarden session management with auto-unlock and health checking (handles token expiry)
- [x] **VAULT-03**: Telegram approval gateway for sensitive actions (payments, form submissions) with inline keyboards
- [x] **VAULT-04**: Async approval flow — workflow pauses on approval request, resumes via Telegram callback

### Sub-Agents

- [x] **AGENT-01**: Sub-agent definitions with role specialization (browser-worker, researcher, form-filler)
- [x] **AGENT-02**: Sub-agents have restricted tool access (browser-worker can't access memory, researcher can't access vault)
- [x] **AGENT-03**: Context isolation — sub-agents get focused prompts, not full system context (prevent 10x token waste)

### Browser Automation

- [x] **BROWSER-01**: Playwright engine for navigating websites, clicking elements, filling forms, submitting
- [x] **BROWSER-02**: Screenshot-based verification — capture before/after screenshots for audit trail
- [x] **BROWSER-03**: Graceful failure with Telegram notification when sites block automation or require manual intervention
- [x] **BROWSER-04**: CAPTCHA/2FA pause — detect and notify Jon via Telegram for manual completion

### Bill Pay

- [x] **BILL-01**: User can trigger bill payment for any bill tracked in Notion via voice, Telegram, or web UI
- [x] **BILL-02**: Jarvis navigates to billing portal, authenticates via vault, fills payment amount, submits after approval
- [x] **BILL-03**: Payment confirmation captured and logged (screenshot + status update in Notion)

### Research & Applications

- [ ] **RESEARCH-01**: Research sub-agent can search web, read pages, and store structured findings in research library
- [ ] **RESEARCH-02**: Research library supports structured fields (eligibility, deadlines, requirements, amounts) with semantic search
- [ ] **RESEARCH-03**: Form-filler sub-agent can retrieve research findings and business profile to auto-populate application fields
- [ ] **RESEARCH-04**: Grant application workflow — research grants, verify eligibility, fill applications from stored data
- [ ] **RESEARCH-05**: Corporate credit application groundwork — research credit options, prepare business profiles, fill applications

### Agent Zero Sunset

- [ ] **SUNSET-01**: All active Agent Zero scheduled tasks ported to Jarvis flexible scheduler
- [ ] **SUNSET-02**: Visopscreen and crypto skills accessible from Jarvis (as MCP tools or sub-agent workflows)
- [ ] **SUNSET-03**: Agent Zero container and tunnel decommissioned after capability verification

## Future Requirements (v6.0+)

### Advanced Automation
- **AUTO-01**: Local LLM companion that runs continuously and reports to Claude Code SDK
- **AUTO-02**: Vision-based form understanding (screenshot → field detection → auto-fill)
- **AUTO-03**: Phone call automation via telephony integration
- **AUTO-04**: Smart home integration

### Intelligence
- **INTEL-01**: Karpathy autoresearch paradigm — agent researches how to improve itself
- **INTEL-02**: Cross-domain insight generation (connect patterns across bills, projects, health, schedule)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user support | Jarvis is Jon's personal agent only |
| Mobile native app | Web + Telegram sufficient |
| v4.4 completion | Guided onboarding paused, resume after v5.0 |
| Real-time streaming transcription | Push-to-talk sufficient |
| Smart home automation | Different domain, future milestone |
| Phone call automation | Requires telephony, future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 12 | Pending |
| FOUND-02 | Phase 12 | Pending |
| FOUND-03 | Phase 12 | Complete |
| FOUND-04 | Phase 12 | Complete |
| VAULT-01 | Phase 13 | Complete |
| VAULT-02 | Phase 13 | Complete |
| VAULT-03 | Phase 15 | Complete |
| VAULT-04 | Phase 15 | Complete |
| AGENT-01 | Phase 14 | Complete |
| AGENT-02 | Phase 14 | Complete |
| AGENT-03 | Phase 14 | Complete |
| BROWSER-01 | Phase 14 | Complete |
| BROWSER-02 | Phase 14 | Complete |
| BROWSER-03 | Phase 14 | Complete |
| BROWSER-04 | Phase 14 | Complete |
| BILL-01 | Phase 15 | Complete |
| BILL-02 | Phase 15 | Complete |
| BILL-03 | Phase 15 | Complete |
| RESEARCH-01 | Phase 16 | Pending |
| RESEARCH-02 | Phase 16 | Pending |
| RESEARCH-03 | Phase 16 | Pending |
| RESEARCH-04 | Phase 16 | Pending |
| RESEARCH-05 | Phase 16 | Pending |
| SUNSET-01 | Phase 17 | Pending |
| SUNSET-02 | Phase 17 | Pending |
| SUNSET-03 | Phase 17 | Pending |

**Coverage:**
- v5.0 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-17 after roadmap creation*
