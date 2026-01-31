# Jarvis: Personal Executive Function Partner

## What This Is

A voice-enabled AI companion that integrates with Notion workspaces to help manage the overhead of life. Jarvis acts as an executive function partner - capturing ideas, providing daily briefings, maintaining time awareness during deep work, and running voice-guided triage sessions. It uses the Ethereal Flame audio orb as its visual avatar and is hosted on whatareyouappreciatingnow.com.

## Core Value

**One system that knows everything, surfaces what matters, and keeps you on track.** Ideas get captured, priorities stay clear, and nothing slips through cracks - so you can focus on doing the work instead of managing the work.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Voice capture → Notion inbox (speak ideas, they land in the right place)
- [ ] Landscape map of all current projects, ideas, commitments (built through initial brain dump)
- [ ] Daily morning briefing from Notion data (spoken summary)
- [ ] Daily midday pulse check (quick status, any pivots needed)
- [ ] Daily evening wrap (what got done, capture loose ends)
- [ ] Voice-guided task triage session (find the 3 that matter today)
- [ ] Body doubling mode (orb on screen, periodic check-ins)
- [ ] Time awareness during deep work ("time to wrap up and shift")
- [ ] Adaptive pushiness (learns when to nudge vs back off)
- [ ] Professional butler personality (calm, formal, efficient)
- [ ] Notion MCP integration for read/write access to workspaces

### Out of Scope

- Mobile native app — web-first, accessible from phone browser
- Real-time calendar sync — manual schedule awareness for v1
- Automated task completion — Jarvis advises, user executes
- Multi-user/team features — single creator workflow

## Context

**Notion Workspaces ("The Ore"):**
- Complete Notion Life OS Bundle (personal life management)
- Client & Content OS (business/creator management)
- PARA method organization (Projects, Areas, Resources, Archives)
- Existing databases: Tasks, Projects, Goals, Habits, Budgets, Content, Clients
- Automation features: AI summaries, rollups, status formulas, review reminders

**User Environment:**
- Primary device: phone (often away from computer)
- Work pattern: gets deeply absorbed, loses track of time and priorities
- Challenge: Not procrastination - *too much engagement*, forgets to shift
- Need: External system to hold the big picture while user focuses

**Ethereal Flame Integration:**
- Audio orb component becomes Jarvis's visual avatar
- Orb animates when Jarvis is speaking
- Hosted together on whatareyouappreciatingnow.com

**Focus Challenges Being Solved:**
1. Too many things → Daily triage selects what matters
2. Forgetting tasks → Everything captured, nothing slips through
3. Deep absorption → Body doubling with time awareness

## Constraints

- **Tech Stack**: Next.js (matches Ethereal Flame for shared hosting)
- **Voice**: Web Speech API for recognition, TTS for responses
- **Data Layer**: Notion API via MCP for all read/write operations
- **AI Backend**: TBD (Claude API vs OpenAI vs hybrid) — cost/capability analysis needed
- **Hosting**: whatareyouappreciatingnow.com (existing Vercel deployment)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app on existing domain | Leverage current infrastructure, accessible from any device | — Pending |
| Notion as single source of truth | User already has rich PARA system, avoid data duplication | — Pending |
| Ethereal Flame orb as avatar | Creates visual presence, reuses existing component | — Pending |
| Triage-first architecture | If triage works, everything else flows from it | — Pending |
| Adaptive pushiness | Learn patterns rather than fixed rules | — Pending |
| Brain dump as first action | Must map landscape before new ideas can be placed | — Pending |

---
*Last updated: 2026-01-31 after initialization*
