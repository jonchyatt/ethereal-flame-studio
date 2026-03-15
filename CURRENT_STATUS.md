# Jarvis Desktop — Current Status

**Date:** 2026-03-12
**Local:** http://localhost:3001
**External:** https://jarvis.whatamiappreciatingnow.com
**Working Directory:** `C:/Users/jonch/Projects/ethereal-flame-studio`

---

## Status: FULLY OPERATIONAL

All infrastructure migrated from laptop to desktop. 44/45 automated tests passing.
Chat, CRUD, tunnel, all personal pages — everything works.

---

## What's Running (PM2)

| Process | Purpose | Status |
|---------|---------|--------|
| jarvis-web | Next.js app on :3001 | Online |
| jarvis-mcp | MCP tool server (stdio) | Online |
| jarvis-cron | Daily reflection + backfill | Online |
| jarvis-tunnel | Cloudflare tunnel → external URL | Online |

---

## What Was Fixed (This Migration)

1. **CLAUDECODE env var leak** — PM2 inherits Claude Code's env, breaking the SDK brain. Fixed: `CLAUDECODE: ''` in ecosystem.config.js + clean env build in start-web.js + strip from ccodeBrain.ts
2. **API key format** — `.env.local` had trailing `\n` in ANTHROPIC_API_KEY
3. **Academy 401** — `academyStore.ts` was using raw `fetch()` without `X-Jarvis-Secret` header. Fixed: use `getJarvisAPI`/`postJarvisAPI`
4. **Tunnel 502** — Stale connections from laptop. Fixed: `cloudflared tunnel cleanup jarvis` + restart
5. **Test script** — Fixed chat selectors (ChatOverlay vs old ChatPanel), networkidle timeouts, DOM re-render detachment
6. **Onboarding** — Temporarily disabled for testing, now re-enabled

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Jarvis Web App (Next.js 15)                        │
│  ├── /jarvis/app          → JarvisShell + pages     │
│  ├── /jarvis/app/personal → Tasks, Bills, Habits... │
│  ├── /jarvis/app/academy  → Guided tutorials        │
│  ├── /jarvis/app/settings → Domain toggles, modes   │
│  └── /api/jarvis/*        → API routes              │
├─────────────────────────────────────────────────────┤
│  Brain: Claude Code SDK (ccodeBrain.ts)             │
│  Uses Max subscription ($0 cost)                    │
│  MCP tools: Notion, Calendar, local DB              │
├─────────────────────────────────────────────────────┤
│  Data Sources                                       │
│  ├── Notion API → tasks, bills, meals, goals, habits│
│  ├── Google Calendar API → events                   │
│  └── Turso SQLite → local state, academy progress   │
├─────────────────────────────────────────────────────┤
│  Infrastructure                                     │
│  ├── PM2 → process management (4 processes)         │
│  └── Cloudflare Tunnel → external HTTPS access      │
└─────────────────────────────────────────────────────┘
```

---

## Key Directories

| Path | What It Is |
|------|-----------|
| `src/components/jarvis/` | All Jarvis UI components |
| `src/lib/jarvis/` | Stores, API helpers, intelligence, MCP |
| `src/lib/jarvis/intelligence/` | Brain implementations (ccodeBrain.ts) |
| `src/lib/jarvis/stores/` | Zustand stores (chat, shell, academy, etc.) |
| `src/app/jarvis/` | Next.js pages and API routes |
| `jarvis/` | PM2 config, scripts, MCP server, planning docs |
| `scripts/` | Test scripts (Playwright headed) |

---

## Next: Making Jarvis a Genius-Level Agent

### What Jarvis Can Do Now
- Chat via text (Claude Code SDK brain)
- View/toggle tasks, bills, habits, calendar, meals, goals, health, journal
- Create tasks via chat (Notion CRUD)
- Mark bills as paid
- Guided academy tutorials
- Morning briefing
- Domain health monitoring

### What Jarvis Needs to Become a Life Management AI

**Intelligence Tier:**
- Proactive insights (pattern recognition across tasks/habits/bills)
- Cross-domain reasoning ("you have a bill due Friday and no calendar events — schedule payment")
- Memory across conversations (persistent context, not just chat history)
- Goal tracking with milestone decomposition
- Daily/weekly reviews with actionable recommendations

**Capability Tier:**
- Web browsing and research (external API access)
- Email integration
- SMS/push notifications for urgent items
- Voice input (orb page exists but audio pipeline needs work)
- Automated recurring task management (leapfrog scheduling)
- Financial tracking and budget awareness

**Autonomy Tier:**
- Background cron intelligence (not just reflection — actual planning)
- Auto-triage incoming tasks by urgency/importance
- Suggest schedule blocks based on goals + calendar
- Detect and alert on missed habits, overdue bills, stale goals
- Self-improving: learn from your corrections and preferences

---

## Strategic Direction (2026-03-15)

### Immediate: Finish v4.4 (L-03 → L-04 → Wife Test)
Don't add scope. The wife test is the product readiness gate.

### After v4.4: Dual-Jarvis Reliability
3 plans. Cloudflare Worker routes to desktop-primary / Vercel-fallback.
Concept doc: `jarvis/.paul/concepts/dual-jarvis-reliability.md`

### v4.5: Jarvis Hands (Grant Secretary + Agent Zero)
Full web agent architecture. Jarvis orchestrates, Agent Zero executes via A2A.
Primary use case: find grants → research → plan → approve → submit.
Also handles: corporate filings, bills, travel, credit disputes.
Concept doc: `jarvis/.paul/concepts/jarvis-hands-v45.md`

### Agent Zero on Desktop
One-line install: `irm https://ps.agent-zero.ai | iex`
Update to v0.9.8.2 immediately (we're on ~v0.9.7).
Skills to build: grant-hunter, grant-researcher, grant-applicant.

---

## How to Resume Work

```bash
cd C:/Users/jonch/Projects/ethereal-flame-studio

# Verify everything is running
pm2 list

# If not running
pm2 start jarvis/ecosystem.config.js && pm2 save

# Run tests
node scripts/test-full-functionality.mjs

# After code changes
npm run build && pm2 restart jarvis-web --update-env
```
