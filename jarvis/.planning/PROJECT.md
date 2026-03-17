# Jarvis: Autonomous Life Agent

## What This Is

Jarvis is Jonathan's autonomous personal AI life agent — a unified intelligence layer that manages his entire life: bills, businesses, research, applications, scheduling, and decision-making. It runs locally on Windows 11 via Claude Code SDK (free on Max plan), with mobile access through Telegram and a Next.js web UI exposed via Cloudflare tunnel at jarvis.whatamiappreciatingnow.com.

## Core Value

One agent with complete context across all of Jon's life domains — personal finance, businesses, projects, health, scheduling — making connections and taking autonomous actions that siloed tools never could, while Jon works 12-14hr hospital shifts.

## Current Milestone: v5.0 Agent Unification

**Goal:** Absorb Agent Zero's unique capabilities, add battle-tested browser automation for bill pay, grant applications, and corporate credit, and sunset A0 to eliminate duplicate API billing.

**Target features:**
- Repo migration to standalone project (C:\Users\jonch\Projects\jarvis)
- Sub-agent spawning with role specialization (from Agent Zero)
- Bitwarden vault integration for credential injection (LLM never sees passwords)
- Browser automation engine (navigate, authenticate, fill forms, submit)
- Bill pay workflows (personal bills via browser automation)
- Research-as-library (research → store structured findings → recall during form-filling)
- Grant application research and form-filling
- Corporate credit application groundwork
- Flexible scheduled task system (add/remove/edit as configuration)
- Port Agent Zero scheduled tasks and skills
- Agent Zero sunset

## Requirements

### Validated

<!-- Shipped and confirmed valuable across v1-v4.4 -->

- ✓ Push-to-talk voice activation — v1
- ✓ Claude integration with omnipresent guide personality — v1
- ✓ Notion MCP integration (tasks, bills, projects, goals, habits, recipes, meals, shopping, pantry) — v1+v4.2
- ✓ Morning briefing, midday/evening check-ins, weekly review — v1
- ✓ Persistent memory system (facts, preferences, session logs, decay) — v2
- ✓ Self-improvement loop (evaluation, reflection, behavior rules) — v2+v4.0
- ✓ Production deployment with auth — v2
- ✓ Tutorial system (13 modules, 6 tools) — v3
- ✓ Claude Code SDK brain (free on Max plan) — v4.0
- ✓ Mobile-first domain OS UI — v4.0
- ✓ Vector memory with dual retrieval (BM25 + semantic) — v4.0
- ✓ Google Calendar integration — v4.1
- ✓ Bill payment navigation (pay now links) — v4.1
- ✓ Meal planning pipeline (7 tools, smart shopping) — v4.2
- ✓ Academy engine (7 tools, 28 topics, multi-project) — v4.3
- ✓ Guided onboarding with spotlight overlays — v4.4 (in progress)
- ✓ Telegram bot with voice, commands, inline keyboards — v4.0
- ✓ Voice I/O (Deepgram STT + AWS Polly TTS) — v4.0
- ✓ PM2 local deployment with Cloudflare tunnel — v4.0
- ✓ Scheduled cron tasks (reflection, memory decay) — v4.0

### Active

<!-- v5.0 milestone scope -->

- [ ] Repo migration to standalone project
- [ ] Sub-agent spawning with role specialization
- [ ] Bitwarden vault integration for credential injection
- [ ] Browser automation engine (navigate, authenticate, fill forms, submit)
- [ ] Bill pay workflows via browser automation
- [ ] Research-as-library (structured research storage with recall)
- [ ] Grant application research and form-filling
- [ ] Corporate credit application groundwork
- [ ] Flexible scheduled task system (CRUD configuration)
- [ ] Port Agent Zero Visopscreen + crypto skills
- [ ] Agent Zero sunset (decommission container + tunnel)

### Out of Scope

- Agent Zero continued development — sunsetting, not enhancing
- Phone call automation — requires telephony, future milestone
- Physical world automation (smart home) — different domain
- Multi-user support — Jarvis is Jon's personal agent only
- Mobile native app — web + Telegram sufficient
- v4.4 completion (guided onboarding) — pause, resume after v5.0

## Context

- Jon works 12-14hr hospital shifts in healthcare — needs autonomous task handling
- Jarvis currently nested at ethereal-flame-studio/jarvis, causing Claude context confusion (repeatedly tries to modify parent project files)
- Agent Zero runs on Anthropic API (separate per-token billing) — duplicate cost for same capability
- Agent Zero's unique capabilities to absorb: multi-agent orchestration, 9 agent profiles, 20+ skills, FAISS memory, 5 scheduled tasks
- Jarvis is already more capable in most areas: 40+ MCP tools, Notion, Telegram, voice, self-improvement, calendar
- Prior research exists: agent-capabilities.md, jarvis-claude-code-integration-architecture.md, agent-landscape-2026.md
- secure-bridge.ts pattern (Bitwarden CLI + Playwright page.fill) previously identified as key missing piece
- Grant research already started: 3 urgent grants due March 31 (Verizon Digital Ready, Pilot Growth Fund, Amber Grant)
- ClaudeClaw (Telegram → Claude Code SDK bridge) is running reference implementation

## Constraints

- **Cost**: Must run on Max plan (Claude Code SDK) — no additional API billing
- **Security**: LLM must NEVER see raw credentials — vault injection only
- **Approval**: Sensitive actions (payments, submissions) require Telegram approval before execution
- **Platform**: Windows 11, Docker Desktop, PM2, Node.js/TypeScript
- **Migration**: Repo move must not break running PM2 processes or Cloudflare tunnel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude Code SDK over custom API | Same brain, free on Max, handles tool loop natively | ✓ Good (v4.0) |
| Sunset Agent Zero | Duplicate billing, Jarvis absorbs all unique capabilities | — Pending |
| Own repo for Jarvis | Context confusion when nested in ethereal-flame-studio | — Pending |
| Bitwarden for credentials | Free, CLI-accessible, LLM-safe vault injection | — Pending |
| GSD framework for v5.0 | Parallel subagents + 1M context = surgical execution | — Pending |
| Research-as-library pattern | Structured retrieval for form-filling (grants, credit apps) | — Pending |
| Unified agent over project isolation | One agent with full life context > 6 siloed agents | — Pending |

---
*Last updated: 2026-03-16 after milestone v5.0 initialization*
