# Session Handoff — 2026-03-15 — Grant Automation System

## Context Status
Context exhausted mid-session. Two background agents still running (federal pathways + application templates). Resume in fresh conversation.

## What Was Built This Session

### Planning Docs Created
- `jarvis/.paul/concepts/grant-secretary-attack-plan.md` — full execution plan, org profile requirements, UX flow
- `jarvis/.paul/concepts/grant-database.md` — 72 grants structured database, all 5 ventures
- `jarvis/docs/karpathy-autoresearch-pattern.md` — upgraded master reference (3 non-negotiable principles)
- `jarvis/.planning/MASTER-ROADMAP.md` — updated with v4.5 phase table

### Background Agents Writing Files (check these in next session)
- `jarvis/.paul/concepts/grant-database-deep.md` — deep hidden gems research (agent may have written partial)
- `jarvis/.paul/concepts/grant-federal-pathways.md` — SBIR/Medicaid/federal pathways exhaustive guide
- `jarvis/.paul/concepts/grant-entity-profiles.md` — entity profile templates for all 5 ventures
- `jarvis/.paul/concepts/grant-application-templates.md` — master application templates

## The Grant System Vision (Fully Designed)

### The Weapon
URL in → Agent Zero navigates → reads form → fills from entity KB → gaps list → Jonathan approves (60 sec) → submits → Notion audit trail

### Autonomy Ladder
- Level 1 (build first): Plan → Review → Execute (Jonathan approves gaps)
- Level 2 (after 3-5 clean runs): Auto-submit if 0 gaps, review if gaps exist
- Level 3 (full auto): Weekly digest, no touch required

### The 5 Ventures
- A = Longevity Nonprofit
- B = Mindfulness/Meditation Nonprofit
- C = Med Spa (HBOT + photobiomodulation + hydrogen, autism/disability — KEY ANGLE)
- D = Car Rental (Saint George, tourism corridor)
- E = Shaved Ice (food/bev)

## URGENT DEADLINES (DO FIRST IN NEXT SESSION)

| Grant | Deadline | Amount | Action |
|-------|----------|--------|--------|
| Hello Alice Fund Her Future | **Mar 24** (9 days) | $100K | Women-owned for-profit — needs entity choice |
| Pilot Growth Fund | **Mar 31** | $10K-$50K | For-profit with 2025 revenue |
| Amber Grant | **Mar 31** | $10K/month | Women-owned, $28 fee |

**Jonathan has NOT yet told us which entity has the cleanest revenue + woman owner — this is the first question in next session.**

## Key Strategic Insights (Don't Lose These)

1. **Gary and Mary West Foundation** = perfect fit for Longevity Nonprofit — created specifically to fund longevity organizations
2. **Fetzer Institute** = perfect fit for Mindfulness Nonprofit — created specifically for contemplative nonprofits
3. **Utah DSPD Medicaid Waiver** = more valuable than all grants for med spa — recurring reimbursement for disability services (PRIORITY #1 for Venture C)
4. **NIH SBIR Phase I** = $314K Phase I, $2.1M Phase II — photobiomodulation + autism = legitimate topic. Need Utah Tech or SUU co-PI.
5. **NGLCC certification** = unlocks Fortune 500 supplier diversity pipelines (bigger than grants)
6. **Skip.com** = grants announced TWICE WEEKLY — automate this first
7. **IFundWomen Universal App** = submit once, auto-matched to all partner grants (Visa, Comcast, etc.)
8. **Utah Small Business Credit Initiative (USBCI)** = $69M Treasury program, $3K base + $2K bonus for women/rural — found late, research further
9. **Cedar City/Iron County Small Business Grant** = up to $30K, pool $65K — research if Washington County eligible

## Build Order (Unchanged)
1. Agent Zero update (Jonathan: interactive PowerShell, Docker Desktop running)
2. DualJ-01/02/03 — Cloudflare failover
3. W-01 — Scheduled tasks + entity KB in Jarvis
4. W-02 — A0 grant-applier skill (URL → form → KB → gaps)
5. W-03 — Jarvis review UI + Telegram approval flow
6. W-04 — Submission + Notion audit trail
7. W-05 — Autonomy graduation + Karpathy loop

## Research Still Needed (Next Session)
- Check all 3 background agent output files listed above
- Deep dive: Utah USBCI program details
- Deep dive: Cedar City/Iron County grant eligibility for Washington County
- Reddit grant communities research (didn't complete)
- NCCIH specific SBIR solicitations for complementary health
- Southern Utah SBDC contact for undisclosed local programs

## First Message for Next Session
"Resume grant automation system work. Read: jarvis/.paul/handoffs/HANDOFF-2026-03-15-grant-system.md and check all 4 concept files listed there (some may have been written by background agents). Then: (1) what are the March 24/31 urgent grants status, (2) what did the background agents find."


## CRITICAL UPDATE — Federal Pathways Agent Findings (added post-context)

### NIH SBIR IS DEAD UNTIL FURTHER NOTICE
NIH SBIR/STTR authority EXPIRED Sept 30, 2025. NO active solicitations as of March 2026.
Pending Congressional reauthorization. Monitor: https://seed.nih.gov
DO NOT pursue SBIR until reauthorized. Remove from near-term plan.

### NEW #1 FEDERAL PRIORITY: DOD CDMRP Autism Research Program
- FY2026 announced, up to .75M
- Apply via eBRAP: https://ebrap.org
- Consumer advocate reviewer angle is a strong differentiator for the med spa
- Full details in: jarvis/.paul/concepts/grant-federal-pathways.md

### Other Key Findings from Federal Pathways Doc
- DSPD Medicaid waiver fully documented: CPT code 99183 (HBOT) + 97026 (PBM), 4-6 month enrollment timeline
- VA Whole Health: St. George VA clinic address/phone documented, Community Care enrollment path
- PCORI Pipeline to Proposal (00K) = best federal entry point requiring patient co-investigator
- Intermountain Health Foundation = highest-probability Utah-specific corporate health grant
- Center for Persons with Disabilities at USU = best partner for ACL/federal disability grants
- Paiute tribal population = SAMHSA tribal angle for Southern Utah

### Full federal pathways doc written to:
jarvis/.paul/concepts/grant-federal-pathways.md
