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
