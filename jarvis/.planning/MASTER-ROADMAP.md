# Jarvis Master Roadmap

## How to Use This Document

- **This is the INDEX** — it links to detailed docs, not replaces them
- **Read this FIRST** in any new Jarvis session to understand the full picture
- **Update this** whenever a new concept doc, milestone, or planning artifact is created

## Current State

- **Active milestone:** v4.4 Guided Onboarding (~65% complete)
- **Active phase:** L-03 Live Walkthrough Pass 2 (in progress)
- **Next phase:** L-04 Polish + Wife Test
- **Infrastructure:** Desktop PM2 (Windows 11) + Cloudflare tunnel
- **Production URL:** https://www.whatamiappreciatingnow.com/

---

## Completed Milestones

| Version | Name | Completed | Duration | Phases | Key Deliverable |
|---------|------|-----------|----------|--------|-----------------|
| v1.0 | Executive Function Partner | 2026-02-02 | 2 days | 6 (1-6) | Voice AI + Notion Life OS integration |
| v2.0 | Memory & Production | 2026-02-15 | ~2 weeks | 5 (7-11) | Database, memory layers, production deploy |
| v3.0 | Tutorial & Teaching | 2026-02-05 | ~3 days | 5 (12, T1-T4) | Tutorial system, Notion panel, 24 lessons |
| v4.0 | Brain Swap & Personal Domain | 2026-02-27 | ~3 weeks | 7 (A-G) | SDK brain, self-improvement loop, mobile UI |
| v4.1 | Bill Payment & Beyond | 2026-02-28 | ~1 day | 2 (H-I) | Google Calendar, bill payment pipeline |
| v4.2 | Meal Planning & Kitchen Intelligence | 2026-03-01 | ~2 days | 1 (J) | 7 meal tools, smart shopping lists |
| v4.3 | Academy Engine | 2026-03-02 | ~2 days | 1 (K) | Codebase teaching engine, 28 topics |

**Detailed milestone logs:**
- v1.0: `jarvis/.planning/MILESTONES.md`
- v2.0-v3.0: `jarvis/.planning/MILESTONES.md`
- v4.0-v4.3: `jarvis/.paul/MILESTONES.md`

---

## Current Milestone: v4.4 Guided Onboarding

**Goal:** Wife can use Jarvis cold with zero help.

**Concept doc:** `.paul/concepts/guided-onboarding-v44.md`

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| L-01 | Foundation | COMPLETE (2026-03-02) | Redirect, Academy bridge, Jarvis curriculum |
| L-02 | Live Walkthrough Pass 1 | COMPLETE (2026-03-05) | 7 bugs fixed, iOS audio, routing fixes |
| L-03 | Live Walkthrough Pass 2 | IN PROGRESS | Calendar, Meals, Briefing, Chat Mastery |
| L-04 | Polish + Wife Test | NOT STARTED | End-to-end cold walkthrough |

**Phase plans:** `jarvis/.paul/phases/` (L-01 through L-04 subdirectories)
**State:** `jarvis/.paul/STATE.md`
**Roadmap:** `jarvis/.paul/ROADMAP.md`

---

## Future Concepts (Researched, Not Yet Scheduled)

### Intelligence & Self-Improvement

| Concept | Doc Location | Status | Notes |
|---------|-------------|--------|-------|
| Intelligence Evolution (5 improvements) | `.paul/concepts/intelligence-evolution-v41.md` | Concept complete | Needs live usage data first |
| Karpathy AutoResearch Pattern | `docs/karpathy-autoresearch-pattern.md` | Research complete | Requires scheduled tasks |
| Scheduled Tasks (6 tasks) | `docs/claude-code-scheduled-tasks.md` | Research complete | Enables AutoResearch |

> These three overlap significantly — unification needed before execution.

### Vision & Perception

| Concept | Doc Location | Status | Notes |
|---------|-------------|--------|-------|
| Camera Vision (Ring/local) | `.paul/concepts/jarvis-vision-research/00-SYNTHESIS.md` | Research complete | 5 sub-documents in folder |
| Screen Vision (3 tiers) | `.paul/concepts/jarvis-screen-vision.md` | Tier 1 shipped (2026-03-04) | Tier 2-3 need native wrappers |

### Agent Capabilities (Hands)

| Concept | Doc Location | Status | Notes |
|---------|-------------|--------|-------|
| Agent Capabilities (8 paradigms) | `.paul/concepts/jarvis-agent-capabilities.md` | Research complete | Browser automation approaches |
| Agent Zero Daemon | `.planning/PROJECT.md` (phases 13-16) | Concept only | Pre-dates PAUL framework |

### Academy & Teaching

| Concept | Doc Location | Status | Notes |
|---------|-------------|--------|-------|
| Academy System | `.paul/concepts/jarvis-academy.md` | Foundation shipped (v4.3) | Multi-domain teaching engine |
| T5 Remaining Lesson Content | `.planning/PROJECT.md` (backlog) | 19 lessons remaining | Low priority, incremental |

### Infrastructure & Architecture

| Concept | Doc Location | Status | Notes |
|---------|-------------|--------|-------|
| Claude Code Integration Architecture | `docs/jarvis-claude-code-integration-architecture.md` | Reference doc | Two-brain architecture spec |
| Agent Landscape 2026 | `docs/agent-landscape-2026.md` | Research complete | Competitive landscape survey |
| Atlas Integration Prep | `.planning/ATLAS-INTEGRATION-PREP.md` | Pre-Agent Zero | MacBook setup guide |

---

## Next Milestone: v4.5 Jarvis Hands

**Goal:** Jarvis becomes Jonathan's secretary on the internet. Primary use case: grant applications for nonprofit. Architecture: Jarvis orchestrates, Agent Zero executes.

**Concept docs:**
- `.paul/concepts/jarvis-hands-v45.md` — architecture + A2A design
- `.paul/concepts/grant-secretary-attack-plan.md` — full attack plan, org profile requirements, UX flow
- `.paul/concepts/grant-a0-headed-browser-spec.md` — **A0 technical spec: headed browser, form-fill algorithm, gap detection, approval gate** ← NEW
- `docs/karpathy-autoresearch-pattern.md` — quality loop philosophy (updated 2026-03-15)
- `.paul/concepts/grant-database.md` — 72+ grants across 12 tiers, all 5 ventures (SBIR updated: DEAD)
- `.paul/concepts/grant-database-deep.md` — hidden gems research (COMPLETE — 1,377 lines)
- `.paul/concepts/grant-federal-pathways.md` — federal pathways deep dive (COMPLETE — 1,483 lines, 13 sections)
- `.paul/concepts/grant-entity-profiles.md` — entity profile templates — **PARTIALLY FILLED: Satori Enterprises (med spa, Venture C) confirmed; all 5 ventures 50% female-owned confirmed; Infinity Stone Services (venture TBD) has 2025 revenue confirmed. Jonathan must fill remaining [FILL] fields before automation.**
- `.paul/concepts/grant-application-templates.md` — master application templates, all question types
- `.paul/concepts/grant-action-plan-march-2026.md` — **START HERE — prioritized action list, March 31 deadlines**
- `.paul/concepts/grant-drafts-march-2026.md` — ready-to-submit drafts for Pilot Growth Fund + Amber Grant

**Business Credit System (added 2026-03-15):**
- `.paul/concepts/business-credit-database.md` — **COMPLETE: 3×3×3 bureau-segregated card stacking strategy, freeze mechanic, all issuers with Utah-specific data, Phase 0 fintech layer, D&B establishment track, BLOC options, Round 1 execution sequence**

**Known Entity Names (confirmed 2026-03-15):**
- Venture C (Med Spa): **Satori Enterprises**
- Venture D or E: **Infinity Stone Services** (venture type TBD — Jonathan to confirm)
- All 5 ventures: **50% female-owned** (unlocks Amber, Fund Her Future, Galaxy, IFundWomen, Visa She's Next)

**Pre-conditions:**
1. Agent Zero updated to v0.9.8.2 — Jonathan runs `irm https://ps.agent-zero.ai | iex` in interactive PowerShell after Docker Desktop shows "Engine running"
2. Fill entity KB files for all 5 ventures — the [FILL] fields in `grant-entity-profiles.md` (~1 hr, Jonathan)
3. Dual-Jarvis reliability live (do as first phases below)

| Phase | Name | Goal | Desktop Required? |
|-------|------|------|------------------|
| DualJ-01 | Cloudflare Worker + DNS | Health check + auto-failover routing | No |
| DualJ-02 | Vercel Validation | Confirm API mode end-to-end | No |
| DualJ-03 | Status Indicator | Brain mode dot in UI + morning alert | No |
| W-01 | Scheduled Tasks | Cron triggers in Jarvis, A0 webhook receiver | No |
| W-02 | A0 Foundation | nonprofit-grants project, grant-hunter skill | YES |
| W-03 | Grant Research Loop | grant-researcher skill + intelligence brief | YES |
| W-04 | Approval Gate | grant-applicant + Jarvis approval UI | YES |
| W-05 | Karpathy Loop | Critic scoring + resources.md accumulation | YES |

**Timeline:** ~11 coding sessions. First useful output (intelligence brief on real grant) after ~6 sessions.

---

## Infrastructure: Dual-Jarvis Reliability

**Problem:** Jonathan accesses Jarvis from Virginia, brain runs in Utah. If desktop sleeps, crashes, or Cloudflare tunnel drops — Jarvis is down.

**Solution (planned, not yet built):**

| Mode | Where | Cost | When |
|------|-------|------|------|
| Primary | Desktop (Utah) | $0 brain (SDK) | Always |
| Fallback | Vercel | ~$0.015/message (API) | When desktop unreachable |

The `providerRouter.ts` already supports both modes (`claude-code-sdk` and `anthropic-api`). The Vercel deployment already exists.

**What needs building:**
1. Cloudflare Worker health check — pings desktop tunnel, auto-routes DNS to Vercel on failure
2. Keep Vercel deployment alive (it's still there, just not primary DNS target)
3. Status indicator in Jarvis UI showing which brain is active

**Concept doc:** `.paul/concepts/dual-jarvis-reliability.md` (to be created)

This is an infrastructure concern — can be done as a small phase before or during v4.5.

---

## Ideas Without Docs (Parking Lot)

- Domain expansion (6 empty domains in registry)
- Voice pipeline convergence (PushToTalk + ChatOverlay unification)
- Progressive UI unlocking (features reveal as user completes lessons)
- Email/SMS/push notifications
- Cross-domain proactive reasoning
- Auto-triage incoming tasks
- Telegram integration improvements
- Shell convergence (remove old /jarvis route)

---

## Dependency Map

```
Scheduled Tasks ──→ AutoResearch ──→ Intelligence Evolution
                                         │
Agent Capabilities research ──→ Credit/financial task execution
                                         │
Screen Vision Tier 1 (shipped) ──→ Tier 2 (needs native wrapper)
                                         │
v4.4 Completion ═══════════════→ ALL post-onboarding work
       │
       └──→ Wife Test pass = product readiness gate
```

---

## Document Locations Reference

| Location | Contents |
|----------|----------|
| `jarvis/.planning/` | GSD framework files: PROJECT, STATE, ROADMAP, MILESTONES, phase plans |
| `jarvis/.paul/` | PAUL framework files: PROJECT, STATE, ROADMAP, MILESTONES (v4.0+) |
| `jarvis/.paul/concepts/` | Deep concept documents and vision research |
| `jarvis/.paul/phases/` | Phase execution plans (L-01 through L-04) |
| `jarvis/.paul/handoffs/` | Session handoff files |
| `jarvis/docs/` | Reference documentation, research, and integration guides |
| `CURRENT_STATUS.md` (project root) | Infrastructure status (desktop PM2, tunnel) |
| `jarvis/CLAUDE.md` | Jarvis personality and tool reference |

---

*Last updated: 2026-03-15*
