# Agent Zero — Grant Applier: Headed Browser Technical Spec

**Created:** 2026-03-15
**Purpose:** Technical implementation spec for Agent Zero filling grant applications in a visible (headed) browser that Jonathan can watch in real-time.
**Companion docs:** `grant-secretary-attack-plan.md`, `grant-entity-profiles.md`

---

## Why Headed Browser

Agent Zero runs locally on Jonathan's Utah desktop. When its browser tool opens Chrome, it opens **on that same desktop screen**. Headed mode = Jonathan can watch every click, every field fill, every form section — exactly like watching a person apply.

This is not a screen share or stream. It is literally a Chrome window opening on the desktop.

---

## How to Enable Headed Mode in Agent Zero

Agent Zero uses Playwright under the hood. The browser tool config is in:
```
agent-zero/python/tools/browser.py   (or equivalent in v0.9.8+)
```

### Step 1: Find the browser launch line
Search for `launch(` in the Agent Zero tools directory. It will look like:
```python
browser = await playwright.chromium.launch(headless=True)
```

### Step 2: Change to headed mode
```python
browser = await playwright.chromium.launch(
    headless=False,
    slow_mo=500  # 500ms delay between actions — makes it watchable
)
```

The `slow_mo` parameter is critical — without it, A0 fills forms at machine speed (too fast to watch). 500ms makes each action visible and deliberate.

### Step 3: Optional — set browser window size
```python
context = await browser.new_context(
    viewport={"width": 1280, "height": 900}
)
```

### Step 4: Persist this change in A0 settings
Once Agent Zero has a settings UI or config file for browser behavior, add `headed_mode: true` and `slow_mo_ms: 500` there so it persists across restarts. Until then, the code change is the method.

---

## The grant-applier Skill — Full Spec

### Inputs
```
entity_name:   "Satori Enterprises"        (which entity is applying)
grant_url:     "https://app.helloalice.com/..."   (exact application URL)
grant_name:    "Pilot Small Business Growth Fund"  (human-readable name)
grant_amount:  "$10,000 - $50,000"
grant_deadline: "2026-03-31"
```

### Knowledge Base Dependency
Before this skill runs, Agent Zero's `nonprofit-grants` project must have `entity-kb.md` in its memory. This is the filled `grant-entity-profiles.md` — Jonathan's actual data, not [FILL] placeholders.

**The skill cannot run if entity-kb.md has [FILL] fields.** It will detect them and abort with a list of what's missing.

---

### Execution Flow

```
STEP 1: PRE-FLIGHT CHECK
  Load entity-kb.md from project memory
  Scan for any remaining [FILL] fields
  If found → abort, return: "Cannot apply. Missing data: [list of fields]"
  If clean → proceed

STEP 2: OPEN HEADED BROWSER
  Launch Chromium headed, slow_mo=500ms
  Navigate to grant_url
  Wait for page load (wait_for_load_state: "networkidle")
  Screenshot → save as "01_initial_state.png"

STEP 3: PAGE ANALYSIS
  Read full page content
  Extract all form fields: {field_id, field_label, field_type, required: bool, word_limit: int|null}
  Identify application sections (multi-page check)
  Log: "Found N fields across M sections"

STEP 4: FIELD MAPPING
  For each field_label:
    → Search entity-kb.md for matching data
    → Confidence score: EXACT / FUZZY / INFERRED / NOT_FOUND
    → Build field_map: [{label, kb_key, value, confidence, word_count}]

  EXACT match:     Fill immediately
  FUZZY match:     Fill with note in gap_report: "Review this mapping"
  INFERRED:        Fill with "(AI-inferred)" tag for human review
  NOT_FOUND:       Add to gap_list — do NOT fill, leave blank

STEP 5: FILL FORM (headed, watchable)
  For each field in field_map where confidence != NOT_FOUND:
    Click field (Jonathan sees cursor move to field)
    Type value character by character (slow_mo makes this visible)

    For text areas with word limits:
      Count words in proposed text
      If over limit → truncate to 95% of limit
      If under minimum → flag in gap_report

    For dropdowns/radio/checkbox:
      Select correct option from entity-kb.md data

    Screenshot after each SECTION (not each field)
    → save as "02_section_legal.png", "03_section_financial.png", etc.

STEP 6: GAP REPORT GENERATION
  Compile gap_report:
    - Fields filled: N
    - Fields skipped (NOT_FOUND): M — list each with field label
    - Fields needing review (FUZZY/INFERRED): K — list each with what was filled
    - Screenshots: [list of paths]

  Send gap_report to Jarvis via webhook:
    POST /api/jarvis/agent-zero/grant-gap
    {entity, grant_name, gap_report, screenshot_paths}

STEP 7: WAIT — DO NOT SUBMIT
  Browser stays open, form filled but NOT submitted
  A0 enters wait state: "Waiting for Jonathan's approval"
  All form data saved locally as JSON backup

STEP 8: JARVIS NOTIFICATION
  Jarvis receives gap_report
  Sends Telegram to Jonathan:
    "Grant form filled: [Grant Name] for [Entity]
     ✅ [N] fields filled
     ⚠️ [M] gaps need your input: [short list]
     🔍 [K] fields need review
     Approve to submit → [Jarvis link]"

  Jarvis UI shows:
    - Grant name + amount + deadline
    - Each gap field with input box (Jonathan fills inline)
    - Screenshot gallery (review each section visually)
    - Three buttons: [Approve & Submit] [Fill Gaps] [Reject]

STEP 9: ON APPROVAL
  Jonathan fills gap fields in Jarvis → clicks "Approve & Submit"
  Jarvis sends filled gaps back to A0:
    POST /api/agent-zero/grant-submit
    {grant_id, gap_fills: [{field_label, value}]}

  A0 resumes:
    Fills remaining fields with Jonathan's gap data
    Screenshot: "final_review.png" — full form before submit
    Sends final screenshot to Jarvis: "About to submit. Here's the final form."
    Waits for explicit "go" confirmation

STEP 10: SUBMIT + AUDIT TRAIL
  On "go":
    A0 clicks Submit
    Screenshot confirmation page: "submitted_confirmation.png"
    Extract confirmation number from page

  Log to Notion:
    Grant name | Entity | Amount requested | Date submitted | Confirmation # | Screenshots

  Telegram: "✅ Submitted: [Grant Name] for [Entity]. Confirmation #[####]. Stored in Notion."
```

---

## What Jonathan Sees (The Watched Experience)

When A0 is filling a form, Jonathan sees on his Utah desktop:

1. Chrome opens at the grant URL
2. Fields highlight and fill one by one (500ms between each — readable speed)
3. Dropdowns click and select visually
4. Text areas populate with grant narrative text
5. Empty fields (gaps) remain blank — A0 moves past them without touching
6. At the end: form is filled, browser stays on the page, cursor idle

He can intervene at any point — if he sees A0 filling something wrong, he can:
- Type in the field himself to override
- Tell Jarvis via chat: "Stop, that field is wrong"
- Simply take over the keyboard/mouse

---

## Error Handling

| Error | A0 Response |
|-------|------------|
| Page won't load | Retry 3x, then abort and notify Jonathan |
| CAPTCHA detected | Stop, notify: "CAPTCHA found — needs manual solve" |
| Login required | Stop, notify: "Login required at [URL]" — Jonathan logs in, then re-triggers |
| Form changes mid-fill | Re-analyze page, continue from current position |
| Network timeout | Retry with exponential backoff (3x: 5s, 15s, 30s) |
| Confirmation page not detected | Flag: "Submit may have worked but couldn't confirm — check [URL]" |

---

## Entity KB Format for A0 Project Memory

The entity KB that A0 reads is a simplified version of `grant-entity-profiles.md` — flat key-value pairs for easy machine parsing:

```
# entity-kb-satori-enterprises.md

entity.legal_name = Satori Enterprises
entity.dba = [FILL]
entity.type = LLC
entity.ein = [FILL]
entity.state = Utah
entity.year_formed = [FILL]
entity.naics = [FILL]

owner.1.name = [FILL]
owner.1.percent = 50
owner.1.gender = [FILL]
owner.woman_owned = true
owner.lgbtq_owned = [FILL]
owner.minority_owned = [FILL]

revenue.2023 = [FILL]
revenue.2024 = [FILL]
revenue.2025 = [FILL]
employees.fte = [FILL]
employees.pt = [FILL]

mission.short = [FILL — 1 sentence]
mission.medium = [FILL — 75 words]
mission.long = [FILL — 3 paragraphs]
elevator_pitch = [FILL — 75 words]

description.short = [FILL — 50 words]
description.medium = [FILL — 150 words]
description.long = [FILL — 300 words]

origin_story = [FILL]
target_population = [FILL]
service_area = Saint George, Utah; Washington County; regional draw from Las Vegas NV, Cedar City UT, Mesquite NV

contact.name = [FILL]
contact.title = [FILL]
contact.email = [FILL]
contact.phone = [FILL]
contact.address = [FILL], Saint George, UT 84770
contact.website = [FILL]

services.1.name = Hyperbaric Oxygen Therapy (HBOT)
services.1.description_short = [FILL]
services.1.population = Autism spectrum disorder, TBI, long COVID, chronic inflammation
services.1.cost_per_session = [FILL]

services.2.name = Photobiomodulation (PBM) Therapy
services.2.description_short = [FILL]
services.2.population = Autism, neurological conditions
services.2.cost_per_session = [FILL]

services.3.name = Hydrogen Therapy
services.3.description_short = [FILL]
services.3.population = Autism, chronic inflammation, oxidative stress
services.3.cost_per_session = [FILL]

use_of_funds.equipment = [FILL — from template]
use_of_funds.marketing = [FILL — from template]
use_of_funds.staffing = [FILL — from template]

grants.prior = None
bank_account = [FILL — bank name]
```

**A0 ingests this file as project knowledge.** Every grant task references it automatically. Fields marked [FILL] = gap detection triggers.

---

## Minimal Viable Test Run

Before applying to any real grant, test the system with:

1. A **fake/practice form** (create a Google Form with common grant field types)
2. Run grant-applier against it with entity-kb.md fully filled
3. Watch the headed browser fill it out
4. Verify: all fields filled correctly, gaps reported correctly, screenshots saved

Only after passing the test run: apply to a real grant.

**First real test: helloskip.com instant grant** — simplest possible form (name, email, business description). Low stakes, high frequency, immediate feedback.

---

## What Jonathan Must Do Before This Works

| Item | What | Urgency |
|------|------|---------|
| Fill entity-kb files | 10-15 min per entity — the [FILL] fields in entity profiles | **Before any automation** |
| Identify Infinity Stone Services venture | Confirm: Car Rental (D) or Shaved Ice (E)? | Before filing that entity's apps |
| Update Agent Zero | Run `irm https://ps.agent-zero.ai \| iex` in interactive PowerShell with Docker running | Before W-02 |
| Start Docker Desktop | Must be running before A0 update | Before A0 update |

**The single biggest unblock:** Filling the entity KB files. The automation is fully designed — it's waiting on real data.

---

## Build Phases (Revised with This Spec)

```
DONE (research/planning):
  ✅ Grant database (72+ grants)
  ✅ Deep hidden gems research
  ✅ Federal pathways
  ✅ Application templates
  ✅ March 31 draft applications
  ✅ This headed browser spec

JONATHAN (required before coding):
  □ Fill entity-kb files for all 5 ventures (~1 hr)
  □ Identify Infinity Stone Services as venture D or E
  □ Update Agent Zero (Docker + PowerShell)

CODING (in order):
  □ DualJ-01/02/03 — Cloudflare failover (can do from Virginia)
  □ W-01 — Scheduled tasks in Jarvis
  □ W-02 — A0 project setup + headed browser config + entity-kb seeding + grant-hunter skill
  □ W-03 — grant-researcher skill + intelligence brief format
  □ W-04 — grant-applicant skill (this spec) + Jarvis approval gate UI
  □ W-05 — Karpathy critic loop + resources.md accumulation
```

---

*Created: 2026-03-15. Technical spec for W-04 Agent Zero grant applier with headed browser.*
*Cross-refs: grant-secretary-attack-plan.md, grant-entity-profiles.md, grant-action-plan-march-2026.md*
