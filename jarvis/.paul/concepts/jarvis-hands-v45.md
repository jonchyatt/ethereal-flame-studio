# Jarvis Hands — v4.5 Concept

**Status:** Concept — research complete, planning next
**Created:** 2026-03-15
**Research synthesized from:** Today's strategic session (see session context for Agent Zero research, Karpathy, dual-Jarvis)
**Priority:** After v4.4 Guided Onboarding completion

---

## The One-Sentence Vision

Jarvis becomes Jonathan's secretary on the internet — finding grants, researching them, building the application, showing the plan for approval, then executing the submission. And doing the same for bills, credit, corporate filings, hotels, whatever Jonathan needs done on the web.

---

## Why This Is Achievable Now

The brain we've already built is the differentiator. Generic YouTube agent demos can browse but know nothing about who they work for. Jarvis already has:
- Jonathan's nonprofit mission, financials, goals (Notion)
- His credit, calendar, habits, context
- Memory across conversations
- Self-improving intelligence loop

We just need to wire up the hands. The research across 8 paradigms, Agent Zero, Karpathy AutoResearch, and scheduled tasks is **all complete**. This milestone connects the dots.

---

## The Architecture

```
Jonathan (Telegram/voice/web)
         │
         ▼
JARVIS (orchestrator brain)
  - Knows Jonathan's full context
  - Free brain cost (Claude Code SDK, $0)
  - Generates plans, shows approval UI
  - Stores results in Notion
  - Sends notifications
         │
         │ delegates via A2A protocol
         ▼
AGENT ZERO (executor engine)
  - Purpose-built for autonomous web work
  - browser-use + Playwright integrated
  - Sub-agents for parallel research
  - Project-scoped memory (learns over time)
  - Skills system (reusable workflows)
  - Scheduled tasks (overnight runs)
         │
         ▼
Web Targets
  - Grant databases (Grants.gov, Foundation Directory, GrantStation, Candid)
  - Government portals
  - Banking/financial sites
  - Corporate filing portals
  - General web tasks
```

**Hard sites (CAPTCHAs, anti-bot):** Route through Browserbase (managed browser cloud). No CAPTCHA solving needed on our side.

---

## The Grant Secretary Workflow

This is the primary use case that drives the whole milestone.

### Phase 1: Discovery
```
Jonathan: "Find grants for [nonprofit], focus area [X], deadline before [date]"
Jarvis: pulls org context from Notion (mission, EIN, budget, past grants)
       sends to Agent Zero via A2A with full context
Agent Zero: spawns 3-5 sub-agents in parallel:
  - Agent on Grants.gov
  - Agent on Foundation Directory Online
  - Agent on GrantStation / Candid
  - Agent on Google ("grants for [mission area] [year]")
Result: ranked list of matching grants with deadline, amount, fit score
```

### Phase 2: Intelligence Gathering (per grant)
```
Agent Zero:
  - Reads full RFP/guidelines
  - Finds past awardees (publicly posted) — scrapes winner lists
  - Identifies commonalities (org size, budget, geography, language used)
  - Searches web for "[Foundation] what they fund", "[Grant] 2025 winners"
  - Checks if our nonprofit matches each eligibility criterion
Result: grant intelligence brief per opportunity
```

### Phase 3: Plan + Approval Gate
```
Jarvis takes research → generates application plan for OUR org:
  - "Here's how we'd answer each question"
  - "Our competitive advantage for this grant is X"
  - "Risk: we don't meet criterion Y — here's how to address it"
Shows screenshots of actual grant pages
YOU APPROVE OR ADJUST — nothing moves forward without your sign-off
```

### Phase 4: Execution
```
Agent Zero fills the application:
  - Screenshots at EVERY step (full audit trail)
  - Stops at ambiguous fields → asks Jarvis → Jarvis asks Jonathan
  - Saves completed draft to Notion BEFORE any submission
  - Final submit = requires your explicit "go ahead"
```

### Phase 5: Karpathy Self-Correction Loop
```
Before showing you the plan (Phase 3), Agent Zero runs its own critique:

  Critic agent scores application draft against rubric:
  1. Mission alignment — does it match funder's stated priorities? (scraped)
  2. Value proposition — is our org's unique angle clearly stated?
  3. Completeness — every required question answered?
  4. Evidence — data, outcomes, community need cited?
  5. Budget narrative — matches the program narrative?
  6. Language match — echoes funder's own vocabulary?

  Score < threshold → agent revises and re-scores (up to 3 iterations)
  Score ≥ threshold → shows you the polished, self-evaluated draft

Metric: quality score (proxy for funded outcome)
```

This is the Karpathy principle: **let it iterate against a measurable standard before it touches submit.**

Agent Zero Hub already has Phase 4 (critic agent + behavior evolution) built. The grant rubric is the only new piece.

---

## Agent Zero Skills to Build

Three skills following the render-manager exemplar pattern already established in agent-zero-hub:

### 1. `grant-hunter`
```yaml
name: grant-hunter
description: Discovers and ranks grant opportunities matching org profile and focus area
scope: project (nonprofit-grants project)
```
Tasks:
- Parse org profile from Jarvis context
- Parallel search across grant databases
- Filter by eligibility, deadline, amount
- Rank by fit score + success probability
- Return structured list to Jarvis

### 2. `grant-researcher`
```yaml
name: grant-researcher
description: Deep-dives a single grant — past winners, requirements, success patterns
scope: project (nonprofit-grants project)
```
Tasks:
- Full RFP/guidelines ingestion
- Past winner analysis (scrape + pattern extract)
- Eligibility check against our org profile
- Generate competitive intelligence brief
- Store findings in project memory (accumulates over time)

### 3. `grant-applicant`
```yaml
name: grant-applicant
description: Fills grant applications with screenshot-at-each-step and approval gates
scope: project (nonprofit-grants project)
```
Tasks:
- Load approved plan from Jarvis
- Execute form filling with screenshots
- Handle interruption/approval gates
- Save draft to designated location
- Return audit trail to Jarvis

---

## Agent Zero Project Setup

New Agent Zero project: `nonprofit-grants`
- Isolated memory ("own") — learns grant patterns over time
- Knowledge base pre-seeded with:
  - Org profile, mission statement, EIN, budget, past grant history
  - Successful grant language (examples from funded peers)
  - Common rejection patterns and how to address them
- Scheduled tasks:
  - Weekly: new grant discovery scan (Mon 7 AM)
  - Daily: deadline alerts for active applications
  - Post-submission: outcome tracking

---

## Jarvis Side: What to Build

Jarvis needs to be the **interface and orchestration layer** for this workflow. Additions:
1. **Grant dashboard** — new Personal domain page showing active grants, deadlines, status
2. **A2A bridge to Agent Zero** — `postAgentZero()` helper wrapping the A2A protocol call
3. **Approval gate UI** — show plan with screenshots before execution (modal with approve/modify/reject)
4. **Notion integration** — store grant research and application drafts in Jarvis Life OS

---

## Expansion: Other "Secretary on the Internet" Use Cases

Same architecture handles everything else Jonathan needs:

| Task | Paradigm | Notes |
|------|---------|-------|
| Credit report + disputes | Managed browser (Browserbase) | CreditKarma has API; bureaus don't — use Browserbase |
| Corporate filings (annual reports) | DOM/Playwright | State portal sites are structured |
| Bill payment | DOM/Playwright or API | Most billers have APIs — prefer API |
| Hotel research + booking | API first (Booking.com, Expedia API) | Skip browser when API exists |
| Grant applications (govt) | Managed browser | Grants.gov has API for search, portal for submission |
| Banking account monitoring | **API only (Plaid)** | Never use browser bots on banks — ToS violation + detection |

**Banking rule:** Use Plaid or official bank APIs for financial data. Never Playwright on banking sites. This is both safer and more reliable.

---

## Agent Zero on Desktop (Setup Plan)

One-line install — run from PowerShell on the desktop:
```
irm https://ps.agent-zero.ai | iex
```
This installs Docker (if not present) and launches Agent Zero at localhost:50001.

**Volume mounts to add to docker-compose.yml:**
```yaml
- C:/Users/jonch/Projects/ethereal-flame-studio:/home/user/projects/ethereal-flame:ro
- C:/Users/jonch/Visopscreen:/home/user/projects/visopscreen:ro
```
(Same mounts as the laptop hub, just new machine paths.)

**Update to v0.9.8.2 immediately** — we're behind. Significant improvements in skills loading (5 at a time vs 1), context window optimization, claude-sonnet-4-6 as default.

---

## Phase Breakdown for v4.5 Execution

| Phase | Name | Goal | Pre-req |
|-------|------|------|---------|
| W-01 | Scheduled Tasks Foundation | Cron jobs in Jarvis (reflection + new tasks) | v4.4 complete |
| W-02 | Agent Zero Web Foundation | Update A0, nonprofit project, grant-hunter skill | W-01 |
| W-03 | Grant Research Loop | Deep research + intelligence + critic scoring | W-02 |
| W-04 | Approval Gate + Execution | Form filling with approval UI in Jarvis | W-03 |
| W-05 | Karpathy Loop + Memory | Self-improving application quality over time | W-04 |

**Gate before starting v4.5:** v4.4 L-04 wife test must pass. Non-negotiable. Finish what's in flight.

---

## Notes on Agent Zero Version Gap

Current hub is running ~v0.9.7. v0.9.8 changes that matter:
- Skills load 5 at a time (was 1) — grant workflow has 3 skills, needs this
- Default model shifted to claude-sonnet-4-6 (current best)
- Complete UI redesign with process step detail modals
- Context window optimization (critical for long grant research sessions)

Update before any new skill development.

---

*Created: 2026-03-15. Context preserved from strategic session on Agent Zero, Karpathy AutoResearch, and grant secretary architecture.*
