# Jarvis Agent Capabilities — Concept & Vision

**Status:** Concept — needs research before planning
**Created:** 2026-03-04
**Owner:** Jonathan + Claude
**Priority:** Post-tutorial (v4.5 milestone)

---

## The Vision

Jarvis should be able to act in the world on Jonathan's behalf — not just answer questions, but actually do things. Jonathan works 12+ hour hospital shifts. He doesn't have time to navigate to AnnualCreditReport.com, find the dispute form, cross-reference his three bureaus, and submit corrections. But he can tell Jarvis to do it.

**Real use cases Jonathan needs:**
- Research his credit reports, identify inaccuracies, file disputes
- Freeze/unfreeze credit at all three bureaus (Experian, TransUnion, Equifax)
- Get all corporations and entities up to date (registered agents, filings, fees)
- Prep for opening a new family trust — gather what's needed, flag action items
- Order pizza by phone call ("large supreme, no onions, six breadsticks, 20 minutes")
- Book hotels, research travel options, compare and report back
- Pay bills online with confirmation
- General "go do this" task delegation

**What makes Jarvis different from generic agent demos on YouTube:**
Those bots have no brain. They can browse but they don't know anything about the person they're working for. Jarvis has memory, briefing data, financial context, calendar, goals. A Jarvis agent that books a hotel already knows Jonathan's travel preferences, budget, and schedule. A credit dispute agent already knows his address history and financial picture. The brain we've built is the differentiator — we just need to wire up the hands.

---

## The Paradigm Question (Research Required)

**Jonathan explicitly flagged this:** Don't default to Playwright. There are multiple paradigms for "seeing the web" and they have different trade-offs. This section documents what exists — research is needed to determine what's right for each task type.

### Paradigm 1: Screenshot / Vision-Based
- **How:** Take a browser screenshot → send to Claude as image → Claude decides what to click → execute action → repeat
- **Examples:** Anthropic Claude Computer Use, custom screenshot loops
- **Pros:** Most flexible, handles anything visual, no DOM access needed, works on any site
- **Cons:** Slow (screenshot per action), expensive (image tokens), fragile (pixel changes break it)
- **Best for:** Complex visual layouts, sites that block DOM access, one-off tasks

### Paradigm 2: DOM / Structure-Based
- **How:** Parse the HTML DOM tree → give Claude the structure → Claude picks selectors → execute
- **Examples:** Playwright (programmatic), Puppeteer, Selenium
- **Pros:** Fast, cheap (no image tokens), reliable selectors, scriptable
- **Cons:** Sites with dynamic JS, shadow DOM, canvas elements can be hard to parse
- **Best for:** Form-heavy sites, well-structured web apps, repeatable tasks

### Paradigm 3: Hybrid AI-Native Browser
- **How:** Libraries that combine DOM access + AI selector reasoning — AI understands intent, finds elements, acts
- **Examples:** Browser Use (Python), Stagehand (by Browserbase), Skyvern
- **Pros:** More robust than pure DOM (handles dynamic content), cheaper than pure vision
- **Cons:** Newer, less battle-tested, Python-first ecosystem mostly
- **Best for:** Modern web apps, mid-complexity tasks, where DOM is accessible but messy

### Paradigm 4: Managed Browser Infrastructure
- **How:** Someone else runs the browser instances (cloud browser providers), you send commands via API
- **Examples:** Browserbase, Steel, Bright Data Scraping Browser, Apify
- **Pros:** No sidecar to maintain, scales, handles captchas/fingerprinting, persistent sessions
- **Cons:** Cost per session, data goes through third-party, latency
- **Best for:** Production workloads, anti-bot sites, when you don't want to host your own browser

### Paradigm 5: API-First (No Browser Needed)
- **How:** Use structured APIs when they exist — skip the browser entirely
- **Examples:** Plaid (banking/credit data), Toast/Olo (restaurant ordering), OpenTable (reservations), Experian API (credit — limited), IRS e-Services
- **Pros:** Reliable, fast, no visual fragility, cheaper
- **Cons:** APIs don't exist for everything; credit bureau portals have no public API; many sites are browser-only
- **Best for:** Banking data, restaurant ordering, hotel booking (Booking.com API, Hotels.com API), whenever an API exists

### Paradigm 6: MCP Server Layer
- **How:** Claude natively uses MCP tools. Browser-control MCP servers exist (Playwright MCP, Puppeteer MCP) — Jarvis just calls them as tools
- **Examples:** @playwright/mcp, @modelcontextprotocol/server-puppeteer, custom MCP servers
- **Pros:** Natively integrated with Claude's tool use, no separate agent framework needed, fits Jarvis architecture
- **Cons:** MCP servers need to run somewhere (still need sidecar or managed host)
- **Best for:** Natural extension of Jarvis's existing tool use — lowest integration lift

### Paradigm 7: Agent Frameworks
- **How:** Use an existing agent framework that handles planning, memory, tool use, and browser control — Jarvis becomes the brain that routes to the framework
- **Examples:** Agent Zero (Docker-based, file system + browser + code execution), Open Interpreter (local computer control), LangChain agents, CrewAI, Agno
- **Pros:** Proven task completion loops, handles multi-step planning, community tooling
- **Cons:** Another system to integrate, may conflict with Jarvis's existing intelligence, latency
- **Best for:** If we want to "bolt on" agent capability fast without building from scratch

### Paradigm 8: Telephony (Phone Calls)
- **How:** AI-powered outbound calling — Jarvis triggers a call, AI voice navigates phone menus, talks to staff, reports back
- **Examples:** Bland.ai, Vapi.ai, Retell.ai, Twilio + ElevenLabs
- **Pros:** Real phone calls to real businesses, pizza ordering, doctor appointments, etc.
- **Cons:** ~$0.10-0.20/minute, some businesses hate it, IVR navigation can be tricky
- **Best for:** Pizza ordering, reservations, anything that requires a live phone call

---

## Architecture Sketch (Needs Research to Finalize)

```
Jonathan: "Freeze my credit at all three bureaus"
        ↓
Jarvis Brain (Vercel) — interprets intent, has context
        ↓ tool call: execute_agent_task(task, params)
        ↓
Agent Layer (to be determined — sidecar? managed? MCP?)
  ├── Browser session opens
  ├── Navigates to Experian → logs in (credentials from vault)
  ├── Finds credit freeze section
  ├── Screenshots confirmation page
  ├── Reports back: "Frozen at Experian. Proceeding to TransUnion..."
  └── Final: "All three bureaus frozen. Screenshots attached."
        ↓
Jarvis Brain: confirmation + memory entry logged
        ↓
Jonathan: notification on phone
```

**Key open questions for research:**
1. Where does the agent run? Vercel can't (60s limit, no persistent browser). Options: Fly.io sidecar, Browserbase, Railway, VPS
2. Which paradigm for which task? Credit disputes need vision (complex portals). Pizza ordering needs telephony. Hotel booking might have APIs.
3. Credential security model — how does Jarvis store and use Jonathan's logins? (Browser profiles? Bitwarden API? OS keychain on sidecar?)
4. Confirmation gates — what requires Jonathan's explicit "go" before acting? (anything financial, anything irreversible)
5. Long-running task model — a credit dispute could take 20 minutes. How does Jarvis report back when Jonathan isn't in the chat?

---

## Use Case Priority (Jonathan's stated needs)

### High Priority (real blockers in Jonathan's life)
1. **Credit report audit + dispute filing** — multiple errors, needs fixing before trust opening
2. **Corporate/entity status check** — all corps up to date? Annual reports filed? Registered agents current?
3. **Family trust prep** — what does Jonathan need to gather? What filings are pending?
4. **Bill payment** — review + pay with confirmation

### Medium Priority
1. **Research + synthesis** — "What are the steps to freeze credit?" → actually do them
2. **Hotel/travel booking** — compare options, book with approval
3. **Appointment scheduling** — doctor, service appointments

### Fun but Real
1. **Pizza ordering by phone** — legitimately useful, proves the paradigm
2. **General "go find out X"** research tasks

---

## What Needs Research (Before Planning)

- [ ] Benchmark: Playwright vs Browser Use vs Stagehand vs Browserbase — speed, cost, reliability, Node.js support
- [ ] Experian/TransUnion/Equifax portals specifically — do any have APIs? What does browser navigation look like?
- [ ] AnnualCreditReport.com — structure, login, dispute flow
- [ ] Credential vault options — how to securely store and use Jonathan's logins on a sidecar
- [ ] Long-running task notification — webhook → push notification to phone?
- [ ] Agent Zero / Open Interpreter evaluation — is it worth adopting vs building own loop?
- [ ] Bland.ai vs Vapi.ai — which is better for restaurant/business calls?
- [ ] Cost modeling — what does 10 agent tasks/week actually cost at each paradigm?
- [ ] MCP browser server options — what's production-ready today?

---

## Jonathan's Key Insight

"Worse comes to worse we will make our own Open Claw or Agent Zero to go and do tasks that Jarvis tells it to do."

This is the right framing. Jarvis is the brain. The agent is the hands. Whether we use an existing framework (Agent Zero, Open Interpreter) or build our own Playwright/Browser Use loop, Jarvis routes the task and receives the result. The brain-hands separation means we can swap the hands later.

---

## Relationship to Current Work

- **v4.4 (now):** Tutorial + curriculum — get the UX right first
- **v4.5 — Jarvis Hands:** Agent capabilities milestone
  - Phase 1: Research + paradigm selection (above open questions)
  - Phase 2: Read-only browser agent (research, report back, no form submission)
  - Phase 3: Phone calls (Bland.ai/Vapi)
  - Phase 4: Form submission with confirmation gates (credit freeze, entity filings)
  - Phase 5: Credential management + long-running task notifications

---

*Concept doc — research required before any planning. Do not execute until research is complete.*
