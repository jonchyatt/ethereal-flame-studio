# Grant Secretary — Full Attack Plan

**Created:** 2026-03-15
**Status:** Planning — not yet in execution
**Refs:** `jarvis-hands-v45.md`, `dual-jarvis-reliability.md`, `karpathy-autoresearch-pattern.md`

---

## The Goal

Jonathan asks Jarvis to find, research, draft, self-critique, and submit grant applications for his nonprofit — with one approval gate before anything goes out. Zero manual web navigation required.

---

## Pre-Conditions (Must Be True Before Starting)

| Pre-condition | Status | Owner |
|--------------|--------|-------|
| Agent Zero updated to v0.9.8.2 | PENDING | Jonathan (run: `irm https://ps.agent-zero.ai \| iex` in PowerShell after starting Docker Desktop) |
| Docker Desktop running on Utah desktop | PENDING | Jonathan |
| Nonprofit org profile doc drafted | PENDING | Jonathan supplies data (see below) |
| v4.4 L-04 wife test | Can run in parallel | Jonathan |
| Dual-Jarvis reliability live | Should do first | See phase breakdown |

---

## Org Profile — What Jonathan Needs to Supply

Before W-02, I need to seed Agent Zero's `nonprofit-grants` project knowledge base. Jonathan: provide or point me to:

```
1. Legal name of nonprofit + EIN
2. Mission statement (1-3 paragraphs — exact language matters)
3. Annual budget (ballpark is fine: "$150K", "$2M")
4. Geographic focus (city/state/region/national)
5. Programs/services offered (brief descriptions)
6. Past grants received: [Funder name] | [Amount] | [Year] | [Program funded]
7. Past grants rejected (if known): [Funder] | [Why rejected if known]
8. 2-3 peer orgs in your space that are funded well (for winner analysis)
9. Any specific grant opportunities already identified
10. Deadline urgency (any applications due in <60 days?)
```

This goes into Agent Zero's memory as a static knowledge document. Every grant-hunter and grant-researcher task references it automatically.

---

## Phase Breakdown

### INFRASTRUCTURE: Dual-Jarvis Reliability (~3 days, before grant work)

**Problem:** Jonathan is in Virginia. Brain is in Utah. If the Utah desktop drops, Jarvis is dark. Grant research runs overnight — can't afford a Utah outage killing a 3-hour research session.

**Solution:** Cloudflare Worker health check → routes to Utah (SDK, $0) normally → Vercel fallback (~$0.015/msg) if Utah unreachable.

| Plan | Work |
|------|------|
| DualJ-01 | Cloudflare Worker script + DNS setup (2 subdomains + worker) |
| DualJ-02 | Validate Vercel end-to-end (env vars, API mode, Telegram) |
| DualJ-03 | `X-Brain-Mode` header + status dot in Jarvis shell + morning briefing alert |

**Result:** Jarvis is always reachable. Overnight agent runs can fail over without Jonathan knowing.

---

### W-01: Scheduled Tasks Foundation (~1 day)

**Goal:** Cron jobs wired into Jarvis so Agent Zero tasks can be triggered automatically.

| Task | What |
|------|------|
| Weekly grant scan | Mon 7 AM — grant-hunter runs, results → Notion + morning briefing |
| Daily deadline alert | If any active grant deadline < 7 days → push notification |
| Post-submission tracking | After submit, polls for outcome, logs to Notion |
| Overnight research | When long research task queued, runs while Jonathan sleeps |

**Key insight:** Agent Zero already has a scheduled tasks system. W-01 adds the JARVIS side — how Jarvis triggers A0 tasks and receives results via webhook/polling.

---

### W-02: Agent Zero Web Foundation (~2 days)

**Goal:** A0 updated, `nonprofit-grants` project created, `grant-hunter` skill built and tested.

**Steps:**
1. Update A0 to v0.9.8.2 (Jonathan runs the PowerShell command)
2. Create `nonprofit-grants` project in A0 UI (isolated memory: "own")
3. Seed knowledge base:
   - `org-profile.md` — Jonathan's nonprofit data
   - `grant-language-examples.md` — successful grant language from funded peers
   - `rejection-patterns.md` — known failure modes to avoid
4. Build `grant-hunter` skill:
   ```yaml
   name: grant-hunter
   goal: Find and rank grant opportunities matching org profile
   inputs: focus_area, deadline_before, min_amount, max_amount
   sources: Grants.gov, Foundation Directory, GrantStation, Candid, Google
   output: ranked list with deadline, amount, fit score, URL
   ```
5. Test: "Find healthcare grants, deadline before June 1, 2026, $50K+"

**Jarvis side:** `postAgentZero()` helper — simple HTTP call to A0's API, wraps with authentication, returns structured response.

---

### W-03: Grant Research Loop (~2 days)

**Goal:** Deep-dive research on a single grant opportunity. Produces an intelligence brief.

**`grant-researcher` skill:**
```yaml
name: grant-researcher
inputs: grant_url, grant_name, funder_name
steps:
  1. Full RFP/guidelines ingestion — every word
  2. Eligibility check against org profile
  3. Past winner research — search "[Funder] [Year] winners", "[Grant] funded projects"
     → scrape award lists, extract org size, geography, language patterns
  4. Funder vocabulary extraction — pull their words, not ours
  5. Competitive gap analysis — where do we match? where are we weak?
  6. Generate intelligence brief
output: grant_intelligence_brief.md stored in project memory
```

**Intelligence brief format:**
```
GRANT: [Name] | FUNDER: [Name] | DEADLINE: [Date] | AMOUNT: [Range]

ELIGIBILITY: ✓ Met / ✗ Gap / ? Unclear (itemized)

PAST WINNERS: [patterns — org size, geography, language themes]

FUNDER VOCABULARY: [key terms to echo in our narrative]

OUR COMPETITIVE ANGLE: [why we are a strong fit]

RISKS: [where we might be weak and how to address]

FIT SCORE: X.X / 10
```

This brief feeds directly into W-04 (application drafting) and W-05 (critic loop).

---

### W-04: Approval Gate + Execution (~2 days)

**Goal:** `grant-applicant` skill + Jarvis approval UI. Jonathan sees a draft + screenshots before anything gets submitted.

**`grant-applicant` skill:**
```yaml
name: grant-applicant
inputs: approved_plan_from_jarvis, grant_url
steps:
  1. Load intelligence brief from project memory
  2. Load approved narrative plan from Jarvis (post-approval gate)
  3. Navigate to grant portal
  4. Screenshot before touching anything
  5. Fill each field — pause on ambiguous fields, query Jarvis → wait for response
  6. Screenshot after each major section
  7. Save completed draft to Notion (BEFORE any submission)
  8. Submit ONLY after Jonathan's explicit "go ahead"
  9. Screenshot confirmation page
  10. Return audit trail (all screenshots + submission confirmation) to Jarvis
```

**Jarvis approval gate UI:**
- New modal in Jarvis: shows plan, intelligence brief, draft narrative, screenshots
- Three buttons: Approve / Modify / Reject
- Nothing moves forward without Approve
- Modifications go back to Agent Zero for revision, then re-surface

**Notification:** When research is done and draft is ready, Jarvis sends Jonathan a Telegram notification: "Grant draft ready for review: [Name], $[Amount], deadline [Date]. Score: [X.X/10]"

---

### W-05: Karpathy Loop + Memory (~1 day)

**Goal:** Critic scoring loop before Jonathan sees the draft. Self-improving quality over time.

**The rubric loop:**
```
Agent Zero draft → Jarvis critic agent scores (0-10 per dimension)
→ Total score < 8.0?
  → Identify lowest-scoring dimension
  → Modify that dimension ONLY
  → Re-score
  → < 3 iterations? → repeat
  → ≥ 8.0 or 3 iterations → surface to Jonathan with score breakdown

Jonathan sees:
  "Grant draft ready. Self-score: 8.4/10
   Strongest: Evidence (9.2) | Weakest: Budget narrative (7.1)
   Revised 2x before surfacing."
```

**Memory that compounds:**
- After each application cycle, log to `resources.md`:
  - Which funder responds to which language
  - Which grant dimensions were consistently weak (means: update org profile or process)
  - Outcome tracking: funded → reinforce those patterns. Rejected → flag for analysis.

After 10-20 applications, the system knows:
- "Foundation X consistently funds orgs that use outcomes-based language in section 2"
- "Our evidence section always needs revision — we need stronger data collection on program outcomes"
- "Applications submitted >2 weeks before deadline historically perform better (more revision cycles)"

---

## The Full Workflow (User Experience)

When complete, this is what Jonathan's experience looks like:

```
Monday 7 AM (automated):
  Agent Zero runs grant-hunter scan
  Finds 3 new matching opportunities
  Jarvis morning briefing: "3 new grants found. Best fit: [Name], $75K, deadline May 15."

Jonathan (in OR, on Telegram):
  "Research that $75K one"

Jarvis (overnight):
  Agent Zero runs grant-researcher
  Intelligence brief: eligibility ✓, past winners analyzed, funder vocabulary extracted
  Self-score: initial fit 7.2/10

Next morning:
  Telegram: "Research complete. [Funder X] grant: $75K. Fit score 7.2/10 (above threshold).
  Ready to draft application? I'll send it for your review before anything is submitted."

Jonathan: "Yes, draft it"

Jarvis (2-3 hours):
  Agent Zero draft → Critic scores 7.8 (below 8.0) → Revise evidence section → Re-score 8.3 ✓
  Application saved to Notion
  Telegram: "Draft ready. Score: 8.3/10. Weakest: budget narrative (7.4). Review: [link]"

Jonathan (reviews on iPhone via Jarvis):
  "Looks good, fix the budget narrative then submit"

Jarvis → Agent Zero:
  Revises budget narrative
  Screenshots confirmation page
  Stores in Notion: "Applied to [Funder X] on [date]. Confirmation #12345"
  Telegram: "Submitted. Confirmation stored. I'll alert you if outcome is posted."
```

---

## Recommended Execution Order

```
Step 0: Jonathan starts Docker Desktop + runs: irm https://ps.agent-zero.ai | iex
Step 0b: Jonathan supplies org profile data (10-item list above)
Phase:  DualJ-01/02/03 — Dual-Jarvis reliability (~3 days)
Phase:  W-01 — Scheduled tasks in Jarvis (~1 day)
Phase:  W-02 — A0 Foundation + grant-hunter (~2 days)
Phase:  W-03 — Grant research loop (~2 days)
Phase:  W-04 — Approval gate + execution (~2 days)
Phase:  W-05 — Karpathy loop + memory (~1 day)
---
Total: ~11 days of coding sessions to a fully operational grant secretary
First useful output: After W-03 (~6 days) — can research any grant and return an intelligence brief
```

---

## What CAN Happen From Virginia (vs Desktop-Required)

| Task | Desktop Required? | Notes |
|------|------------------|-------|
| Dual-Jarvis setup | No — I write the code, you push | Cloudflare Worker is serverless |
| W-01 Scheduled tasks (Jarvis side) | No — pure Next.js code | |
| W-02 A0 setup + grant-hunter skill | YES — A0 runs on desktop | Must do at desk or via Parsec |
| W-03-W-05 Agent Zero skills | YES — A0 runs on desktop | |
| Jarvis UI changes (approval gate, dashboard) | No — pure Next.js code | |
| Knowledge base seeding | YES — done through A0 UI | |

**Implication:** DualJ and W-01 can be done from anywhere. W-02+ requires the desktop running (Utah) or Parsec access from Virginia.

---

*Created: 2026-03-15. Attack plan for v4.5 Jarvis Hands, grant secretary workflow.*
