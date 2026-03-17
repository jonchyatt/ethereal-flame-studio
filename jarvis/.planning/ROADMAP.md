# Roadmap: Jarvis v5.0 Agent Unification

## Milestones

- v1.0 Executive Function Partner - Phases 1-6 (shipped 2026-02-02)
- v2.0 Memory & Production - Phases 7-11 (shipped 2026-02-15)
- v3.0 Tutorial & Teaching - Phase 12 + T1-T4 (partial, 2026-02-05)
- v4.0-v4.3 Brain Swap through Academy - PAUL phases A-L (shipped 2026-03-02)
- v4.4 Guided Onboarding - paused for v5.0
- v5.0 Agent Unification - Phases 12-17 (active)

## Overview

Jarvis v5.0 transforms a conversational life assistant into a fully autonomous execution agent. The dependency chain is strict: repo migration and SDK upgrade establish the foundation, vault integration provides the security layer that browser automation requires, sub-agents and browser tools build the execution engine, approval gateway makes it safe for real-world financial actions, research-as-library enables intelligent form-filling, and Agent Zero sunset eliminates duplicate billing once all capabilities are verified. Six phases, each delivering a complete verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**
- Phases 1-11: v1-v2 milestones (GSD, complete)
- Phases A-L: v4.0-v4.3 milestones (PAUL, complete)
- Phases 12-17: v5.0 Agent Unification (GSD, active)
- Decimal phases (e.g., 13.1): Urgent insertions if needed

- [x] **Phase 12: Foundation & Migration** - Standalone repo, SDK upgrade, scheduler and research schemas (completed 2026-03-17)
- [x] **Phase 13: Vault Integration** - Bitwarden MCP with session management and credential injection (completed 2026-03-17)
- [ ] **Phase 14: Sub-Agents & Browser Engine** - Role-specialized sub-agents with Playwright browser automation
- [ ] **Phase 15: Approval Gateway & Bill Pay** - Telegram approval flow and first end-to-end bill payment
- [ ] **Phase 16: Research & Applications** - Research-as-library with grant and credit application workflows
- [ ] **Phase 17: Agent Zero Sunset** - Port remaining capabilities and decommission A0

## Phase Details

### Phase 12: Foundation & Migration
**Goal**: Jarvis runs from its own repo with the new Claude Agent SDK, flexible scheduler, and research storage schemas ready for feature work
**Depends on**: v4.3 complete (PAUL phases)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. Jarvis runs from C:\Users\jonch\Projects\jarvis with PM2 processes healthy and Cloudflare tunnel serving jarvis.whatamiappreciatingnow.com
  2. Claude Agent SDK (@anthropic-ai/claude-agent-sdk) is installed and ccodeBrain.ts calls succeed with the new API surface
  3. User can add, edit, and remove scheduled tasks via Telegram or web UI without restarting the process
  4. Research library SQLite tables exist and accept structured research entries with semantic search returning results
**Plans:** 3/3 plans complete
Plans:
- [x] 12-01-PLAN.md -- Repo migration to standalone + Claude Agent SDK swap
- [ ] 12-02-PLAN.md -- DB-driven flexible scheduler with croner
- [ ] 12-03-PLAN.md -- Research-as-library schema and store

### Phase 13: Vault Integration
**Goal**: Jarvis can retrieve credentials from Bitwarden and inject them into tool workflows without the LLM ever seeing raw secret values
**Depends on**: Phase 12
**Requirements**: VAULT-01, VAULT-02
**Success Criteria** (what must be TRUE):
  1. Bitwarden MCP server is configured as sub-agent-private MCP and responds to credential retrieval requests
  2. Vault session auto-unlocks on Jarvis startup and re-authenticates transparently when session expires mid-task
  3. A canary test confirms that no credential value appears in LLM conversation history or logs after a credential retrieval + injection cycle
**Plans:** 1/1 plans complete
Plans:
- [ ] 13-01-PLAN.md -- Vault health manager, form-filler sub-agent with private BW MCP, canary test

### Phase 14: Sub-Agents & Browser Engine
**Goal**: Jarvis can spawn role-specialized sub-agents and automate browser interactions including navigation, form filling, and screenshot verification
**Depends on**: Phase 13 (browser login flows require vault credentials)
**Requirements**: AGENT-01, AGENT-02, AGENT-03, BROWSER-01, BROWSER-02, BROWSER-03, BROWSER-04
**Success Criteria** (what must be TRUE):
  1. Sub-agents (browser-worker, researcher, form-filler) can be spawned with restricted tool sets matching their role
  2. A browser-worker sub-agent can navigate to a website, fill a form field, and capture a before/after screenshot
  3. When a site blocks automation or requires CAPTCHA/2FA, Jarvis pauses and notifies Jon via Telegram with a screenshot instead of failing silently
  4. Sub-agent context is scoped (focused prompts, not full system context) -- verified by checking sub-agent token usage stays under 15K input tokens per turn
**Plans**: TBD

### Phase 15: Approval Gateway & Bill Pay
**Goal**: Jon can trigger a bill payment through voice, Telegram, or web UI and Jarvis executes it end-to-end with mandatory human approval before any financial action
**Depends on**: Phase 14 (needs browser automation + vault)
**Requirements**: VAULT-03, VAULT-04, BILL-01, BILL-02, BILL-03
**Success Criteria** (what must be TRUE):
  1. When Jarvis is about to perform a sensitive action (payment, form submission), Jon receives a Telegram approval request with a confirmation screenshot and inline keyboard buttons
  2. The workflow pauses on approval request and resumes only after Jon approves via Telegram callback -- rejections cancel the workflow cleanly
  3. Jon can say "pay my Duke Energy bill" and Jarvis navigates to the portal, authenticates via vault, fills the payment amount, waits for approval, submits, and confirms with a receipt screenshot
  4. Payment confirmation is logged with screenshot and Notion bill status is updated
**Plans**: TBD

### Phase 16: Research & Applications
**Goal**: Jarvis can research topics, store structured findings, and use them to auto-populate grant and credit applications
**Depends on**: Phase 15 (needs approval gateway for form submissions + browser automation)
**Requirements**: RESEARCH-01, RESEARCH-02, RESEARCH-03, RESEARCH-04, RESEARCH-05
**Success Criteria** (what must be TRUE):
  1. A researcher sub-agent can search the web, read pages, and store structured findings (eligibility, deadlines, requirements, amounts) in the research library
  2. Jon can ask "what grants am I eligible for?" and get results from the research library with semantic search across stored findings
  3. A form-filler sub-agent can retrieve research findings and Jon's business profile to auto-populate application fields, then request approval before submission
  4. Jon can trigger a grant application workflow that researches the grant, verifies eligibility, fills the application from stored data, and submits after approval
  5. Corporate credit research is stored with business profile data ready for future application workflows
**Plans**: TBD

### Phase 17: Agent Zero Sunset
**Goal**: All Agent Zero capabilities are verified in Jarvis and the A0 container is decommissioned, eliminating duplicate API billing
**Depends on**: Phase 16 (all capabilities must be verified before decommission)
**Requirements**: SUNSET-01, SUNSET-02, SUNSET-03
**Success Criteria** (what must be TRUE):
  1. All 5 Agent Zero scheduled tasks are running in Jarvis flexible scheduler and producing expected outputs
  2. Visopscreen and crypto skills are accessible from Jarvis (as MCP tools, sub-agent workflows, or explicit deferral with documented rationale)
  3. Agent Zero container and Cloudflare tunnel are stopped and docker-compose entry removed, with no loss of functionality Jon actively uses
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 13 -> 14 -> 15 -> 16 -> 17

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 12. Foundation & Migration | 3/3 | Complete    | 2026-03-17 |
| 13. Vault Integration | 1/1 | Complete   | 2026-03-17 |
| 14. Sub-Agents & Browser Engine | 0/TBD | Not started | - |
| 15. Approval Gateway & Bill Pay | 0/TBD | Not started | - |
| 16. Research & Applications | 0/TBD | Not started | - |
| 17. Agent Zero Sunset | 0/TBD | Not started | - |

## Requirement Coverage

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| FOUND-01 | 12 | Repo migrated to standalone project with working PM2 |
| FOUND-02 | 12 | Claude Agent SDK replaces claude-code SDK |
| FOUND-03 | 12 | Flexible scheduler with DB-driven task CRUD |
| FOUND-04 | 12 | Research-as-library schema in SQLite |
| VAULT-01 | 13 | Bitwarden MCP integrated for credential injection |
| VAULT-02 | 13 | Bitwarden session management with auto-unlock |
| AGENT-01 | 14 | Sub-agent definitions with role specialization |
| AGENT-02 | 14 | Sub-agents have restricted tool access |
| AGENT-03 | 14 | Context isolation for sub-agents |
| BROWSER-01 | 14 | Playwright engine for browser automation |
| BROWSER-02 | 14 | Screenshot-based verification |
| BROWSER-03 | 14 | Graceful failure with Telegram notification |
| BROWSER-04 | 14 | CAPTCHA/2FA pause and notify |
| VAULT-03 | 15 | Telegram approval gateway for sensitive actions |
| VAULT-04 | 15 | Async approval flow with pause/resume |
| BILL-01 | 15 | Trigger bill payment via voice, Telegram, or web |
| BILL-02 | 15 | Navigate, authenticate, fill, submit after approval |
| BILL-03 | 15 | Payment confirmation captured and logged |
| RESEARCH-01 | 16 | Research sub-agent stores structured findings |
| RESEARCH-02 | 16 | Research library with structured fields and semantic search |
| RESEARCH-03 | 16 | Form-filler retrieves research + business profile for auto-populate |
| RESEARCH-04 | 16 | Grant application workflow end-to-end |
| RESEARCH-05 | 16 | Corporate credit application groundwork |
| SUNSET-01 | 17 | Agent Zero scheduled tasks ported to Jarvis |
| SUNSET-02 | 17 | Visopscreen and crypto skills accessible from Jarvis |
| SUNSET-03 | 17 | Agent Zero container and tunnel decommissioned |

**Coverage:** 26/26 v5.0 requirements mapped

## Key Dependencies

```
Phase 12: Foundation & Migration
    |  (SDK migration unblocks sub-agents)
    v
Phase 13: Vault Integration
    |  (credentials required for browser login flows)
    v
Phase 14: Sub-Agents & Browser Engine
    |  (browser automation needed for bill pay)
    v
Phase 15: Approval Gateway & Bill Pay
    |  (approval + browser needed for application submissions)
    v
Phase 16: Research & Applications
    |  (all capabilities must be verified before sunset)
    v
Phase 17: Agent Zero Sunset
```

## Research Flags

| Phase | Needs Research | Notes |
|-------|----------------|-------|
| 12 | No | SDK migration documented, schemas follow existing Drizzle conventions |
| 13 | Yes | BW_SESSION lifecycle on Windows + PM2, master password storage approach |
| 14 | Yes | Per-site bot detection, sub-agent prompt sizing, headed mode on Windows |
| 15 | Yes | Grant form structures, approval UX patterns, target bill pay site recon |
| 16 | Minimal | Research schema may need field additions after reviewing real forms |
| 17 | No | Skill audit is inventory work, translation pattern documented |

---

*Created: 2026-03-17*
*Milestone: v5.0 Agent Unification*
