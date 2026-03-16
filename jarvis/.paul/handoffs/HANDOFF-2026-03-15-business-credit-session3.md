# Session Handoff — 2026-03-15 — Business Credit + Grant System Session 3

## Session Summary
Resumed grant system context, answered Jonathan's entity questions, researched business credit card stacking strategy via 3 parallel agents, synthesized into full database.

---

## What Was Built This Session

### New Docs
- `jarvis/.paul/concepts/business-credit-database.md` — **COMPLETE**: Full 3×3×3 bureau-segregated card stacking database with Utah-specific data, freeze strategy, Phase 0 fintechs, BLOCs, D&B track, Round 1 execution sequence
- `jarvis/.paul/concepts/grant-a0-headed-browser-spec.md` — A0 headed browser technical spec (headless=False, slow_mo=500, 10-step fill algorithm, gap detection, approval gate)
- `MASTER-ROADMAP.md` — Updated with business credit system reference + grant system corrections

### Entity Info Confirmed
- **Venture C (Med Spa)** = Satori Enterprises
- **Another entity with >$5K 2025 revenue** = Infinity Stone Services (venture type D or E — Jonathan did not confirm which)
- **All 5 ventures** = 50% female-owned (unlocks: Amber Grant, Fund Her Future, Galaxy, IFundWomen, Visa She's Next)

---

## Business Credit Database — Key Findings

### EXPERIAN group (freeze TU+EQ before applying):
1. Amex Blue Business Cash — 95%+ EXP, 0% 12mo, $0 AF, 2% cash
2. Chase Ink Business Cash/Unlimited — EXP likely Utah, 0% 12mo, $0 AF, does NOT report to personal credit
3. Wells Fargo Signify Business Cash — EXP likely, 0% 12mo, $0 AF, does NOT report to personal credit

### TRANSUNION group (freeze EXP+EQ before applying):
1. Barclays Wyndham Earner Business — **94.37% TU** (639 datapoints), near-certain
2. US Bank Business Platinum — TU in Utah (confirmed), 0% 12mo, $0 AF
3. US Bank Triple Cash Rewards — TU Utah, 0% 12mo + BTs, $0 AF

### EQUIFAX group (freeze EXP+TU before applying):
1. Truist Business Card — EQ primary (medium-high confidence)
2. BMO Business Platinum — EQ primary (medium confidence)
3. **CALL FIRST**: Zions Bank (801-524-4787) + MACU + America First — Utah-based, unknown bureau, will tell you if asked

### SKIP:
- Capital One = pulls ALL 3 bureaus (every card, every time)
- Discover = reports to personal credit bureaus

### Phase 0 (no personal inquiry):
- Mercury IO: $500 avg balance, no PG, no personal pull
- Ramp: $25K balance, no PG, no personal pull
- BILL Divvy: $20K balance, soft pull only

### Important nuance on inquiry removal:
Authorized business card inquiry disputes succeed ~5-15% only. Prevention (no-PG fintechs, bureau segregation) beats remediation. Inquiries fall off at 24 months automatically.

---

## Open Questions (Jonathan Has Not Answered)

| Question | Why Needed |
|----------|-----------|
| Which venture is Infinity Stone Services? Car rental (D) or shaved ice (E)? | Grant draft assignment |
| Personal credit score ballpark (all guarantors)? | Determines realistic card limits in Round 1 |
| Does Venture E (Shaved Ice) have a named entity? | Amber Grant F&B month (March 31 deadline!) |
| Legal names + EINs for all 5 ventures? | Must fill entity-kb files before any automation |

---

## URGENT — March 31 Deadlines Still Pending

| Grant | Status | Need From Jonathan |
|-------|--------|-------------------|
| Pilot Growth Fund ($10K-$50K) | Draft ready in grant-drafts-march-2026.md | Satori Enterprises has revenue — apply with this entity. Fill [FILL] fields in draft. |
| Amber Grant ($10K, F&B month) | Draft ready | Is Venture E (shaved ice) woman-owned with a named entity? Apply before March 31. |
| helloskip.com Round #193 | Closes March 17 (TOMORROW) | 10 min application, any entity, live draw |

---

## First Message for Next Session

"Resume work. Read: jarvis/.paul/handoffs/HANDOFF-2026-03-15-business-credit-session3.md. Priority questions: (1) which venture is Infinity Stone Services, (2) personal credit score ballpark, (3) have March 31 grants been submitted. Then continue building the business credit system or start entity KB fill."

---
*Created: 2026-03-15, session 3.*
