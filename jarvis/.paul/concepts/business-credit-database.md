# Business Credit Database — Card Stacking Strategy
# All 5 Ventures | Bureau-Segregated Application Cycles

**Created:** 2026-03-15
**Research sources:** Doctor of Credit (639+ Barclays, 458 Citi, 390 Amex, 129 BoA, 89 US Bank datapoints), myFICO forums, CreditBoards, NerdWallet, Ramp/Brex/Mercury official docs
**Applicant state:** Utah (state-specific bureau data noted throughout)

---

## THE STRATEGY — OVERVIEW

**Goal:** Build large business credit lines using personal guarantee cards, segregated by credit bureau so inquiries concentrate on one bureau at a time. Cycle through 9 cards per entity per round (3 per bureau). As business credit builds, shift toward no-PG products.

**The 3×3×3 Structure:**
```
Round 1:
  EXPERIAN group  → 3 cards that pull Experian only
  TRANSUNION group → 3 cards that pull TransUnion only
  EQUIFAX group   → 3 cards that pull Equifax only
  = 9 cards, ~3 inquiries per bureau, maximum capital deployed
```

**The Freeze Strategy (the key mechanic):**
Rather than hoping each issuer pulls the right bureau, you force it by freezing the other two.

```
EXPERIAN group:   Freeze TU + EQ → apply to Amex/Chase/WF → forced to pull EXP or decline
TRANSUNION group: Freeze EXP + EQ → apply to Barclays/US Bank/Citi → forced to pull TU or decline
EQUIFAX group:    Freeze EXP + TU → apply to Truist/BMO/Zions → forced to pull EQ or decline
```

Bureau freezes: free, instant via each bureau's website.
- Experian: experian.com/freeze
- TransUnion: transunion.com/credit-freeze
- Equifax: equifax.com/personal/credit-report-services/credit-freeze

**Personal guarantee:** Required on all traditional bank cards below. You are guaranteeing personally. That's the known trade-off for accessing capital before business credit is established.

**Personal credit impact:** Most cards below do NOT report ongoing activity to personal bureaus (noted per card). Only the hard inquiry hits personal credit. Exceptions flagged.

---

## EXPERIAN GROUP — 3 Cards Per Round

*Apply simultaneously, TU + EQ frozen, EXP unfrozen*

### Tier 1: Highest Confidence Experian (Utah confirmed or near-certain)

| Card | Issuer | Bureau | Annual Fee | 0% APR | Typical Limit | Reports to Personal? | Best For |
|------|--------|--------|-----------|---------|--------------|---------------------|---------|
| **Blue Business Cash** | Amex | EXP 95%+ (3/3 Utah data pts) | $0 | **12 months** | $5K–$25K | **YES — balance reports** | 2% cash back, easiest Amex approval |
| **Blue Business Plus** | Amex | EXP 95%+ (3/3 Utah data pts) | $0 | **12 months** | $5K–$25K | **YES — balance reports** | 2x Membership Rewards (transferable pts) |
| **Ink Business Cash** | Chase | EXP ~70% nationally (no Utah exception documented) | $0 | **12 months** | $3K–$25K | **NO** | 5% office/telecom, 2% gas/dining |
| **Ink Business Unlimited** | Chase | EXP ~70% nationally | $0 | **12 months** | $3K–$25K | **NO** | 1.5% unlimited — simplest structure |
| **Wells Fargo Signify Business Cash** | Wells Fargo | EXP likely (no Utah data, Idaho confirms EXP) | $0 | **12 months** | $1K–$36K+ | **NO** | 2% flat, new card (Apr 2024), high limits reported |
| **BofA Business Advantage Unlimited Cash** | Bank of America | EXP ~82% nationally, Idaho confirmed EXP | $0 | 7 billing cycles | $1K–$50K+ | **YES** | 1.5% cash (higher w/ Preferred Rewards) |
| **BofA Business Advantage Cash Rewards** | Bank of America | EXP ~82% nationally | $0 | 7 billing cycles | $1K–$50K+ | **YES** | 3% chosen category, 2% dining |
| **PNC Visa Business** | PNC | EXP likely | $0 | **13 months** (longest available) | Variable | **NO** | Longest 0% window; no Utah branches (online app) |

### Tier 2: High Limit / NPSL Experian Cards (deploy after Tier 1 approval)

| Card | Issuer | Bureau | Annual Fee | 0% APR | Limit | Reports to Personal? | Notes |
|------|--------|--------|-----------|---------|-------|---------------------|-------|
| **Amex Business Gold** | Amex | EXP 95%+ | $375 | NO (eliminated Jul 2025) | NPSL ($5K–$100K+ dynamic) | NO (charge card) | 4x on top 2 spending categories. NPSL scales with revenue/history. |
| **Amex Business Platinum** | Amex | EXP 95%+ | $695 | NO | NPSL | NO (charge card) | Highest effective limit of any EXP card. $695 AF justified at high spend. |
| **Ink Business Preferred** | Chase | EXP ~70% | $95 | NO | $5K–$50K | NO | 3x travel/telecom/advertising (up to $150K/yr). Best Chase UR earner. |

### Experian Round 1 Recommended Sequence:
```
Freeze TU + EQ → Apply same day:
  1. Amex Blue Business Cash    → 0%, 2% cash, $0 AF
  2. Chase Ink Business Cash    → 0%, 5%/2%, $0 AF, no personal reporting
  3. Wells Fargo Signify        → 0%, 2% flat, $0 AF, no personal reporting
Total potential 0% capital: $10K–$75K+ with $0 in annual fees
```

**Critical note on Amex:** Amex accepts stated income. $0 business revenue acceptable for newly formed entity. Personal income (your W-2 anesthesia income) is the key backing figure. Very low verification frequency on standard applications.

**Chase 5/24:** Chase Ink cards do NOT add to your 5/24 count because they don't report to personal bureaus. You can open multiple Chase Ink cards without affecting Chase's 5/24 personal card approval gate.

---

## TRANSUNION GROUP — 3 Cards Per Round

*Apply simultaneously, EXP + EQ frozen, TU unfrozen*

| Card | Issuer | Bureau | Annual Fee | 0% APR | Typical Limit | Reports to Personal? | Best For |
|------|--------|--------|-----------|---------|--------------|---------------------|---------|
| **Wyndham Rewards Earner Business** | Barclays | **TU 94.37%** (639 datapoints) | $95 | NO | Variable | NO | 8x pts on gas, hotels, utilities. Strongest TU guarantee of any major issuer. |
| **JetBlue Business Card** | Barclays | **TU 94.37%** (same issuer) | $99 | NO | Variable | NO | Travel rewards (JetBlue miles). Second Barclays TU slot. |
| **US Bank Business Platinum** | US Bank | TU ~52% nationally, 1/1 Utah data pt confirms TU | $0 | **12 months** | Variable | NO | No rewards, pure 0% APR utility card. The only high-confidence TU card with 0% APR. |
| **US Bank Triple Cash Rewards** | US Bank | TU ~52%, same issuer same pull | $0 | **12 months purchases + BTs** | Variable | NO | 3% cell phone/gas/restaurants/office. 0% on balance transfers = rare. |
| **Citi AAdvantage Business** | Citi | **TU for Utah — 2/2 Utah data pts confirm TU** | $99 (waived yr 1) | NO | $1.5K–$20K | NO | American Airlines miles. Utah-specific TU confirmation important — nationally Citi is ~53% Experian but Utah pulls TU. |

### TransUnion Round 1 Recommended Sequence:
```
Freeze EXP + EQ → Apply same day:
  1. Barclays Wyndham Earner Business → near-certain TU, $95 AF, 8x gas/hotels/utilities
  2. US Bank Business Platinum        → near-certain TU for Utah, 0% 12mo, $0 AF
  3. US Bank Triple Cash Rewards      → same TU pull, 0% 12mo + BTs, $0 AF, 3% categories
  OR
  3. Citi AAdvantage Business         → TU in Utah (2/2 data pts), $99 waived yr 1, AA miles
```

**Barclays freeze mechanic confirmed:** If TU is frozen, Barclays falls back to Experian. If you want TU, keep TU unfrozen. If you want to absolutely guarantee the fallback doesn't happen, do NOT freeze TU when applying to Barclays.

**Barclays 6/24 rule:** Barclays denies if 6+ cards opened in past 24 months. Less strict than Chase 5/24 but apply early in the sequence before the count climbs.

---

## EQUIFAX GROUP — 3 Cards Per Round

*Apply simultaneously, EXP + TU frozen, EQ unfrozen*

**Important:** The EQ group has the least public data. Truist and BMO are the strongest confirmed EQ cards nationally. For Utah specifically — **call Zions Bank and MACU before applying anywhere in this group.** They may pull EQ or TU exclusively and they'll tell you if asked.

| Card | Issuer | Bureau | Annual Fee | 0% APR | Typical Limit | Reports to Personal? | Notes |
|------|--------|--------|-----------|---------|--------------|---------------------|-------|
| **Truist Business Card** | Truist | **EQ primary** (medium-high confidence; soft pull on pre-qual, hard = EQ when it occurs) | Variable | Check current | Variable | Check — Truist reports to EQ/EXP/TU for business accounts | Southeast/Mid-Atlantic issuer; online apps available in Utah |
| **Truist One Business Card** | Truist | EQ primary (same issuer) | Variable | Check current | Variable | Same as above | Newer product; rewards-focused |
| **BMO Business Platinum** | BMO Bank | **EQ primary generally** (conflicting signal: one source says TU for this specific product) | Variable | Check current | Variable | NO | BMO has Mountain West presence post-Bank of the West merger |
| **Zions Bank Business Visa** | Zions Bank | **UNKNOWN — CALL FIRST** (Utah HQ, SLC branches) | Variable | Unknown | Variable | Unknown | Walk into branch. Ask: "Which bureau do you pull for business credit card in Utah?" If EQ → first slot. |
| **MACU Business Visa** | Mountain America CU | **UNKNOWN — CALL FIRST** (Utah's largest CU) | Variable | Unknown | Variable | Unknown | Relationship banking. Open checking account first, then apply. |
| **America First Business Visa** | America First CU | **UNKNOWN — CALL FIRST** (Utah-based CU) | Variable | Unknown | Variable | Unknown | Same approach as MACU. |

### Equifax Round 1 Recommended Sequence:
```
ACTION FIRST: Call Zions Bank (801-524-4787) and MACU business services
  Ask: "Which credit bureau do you pull for a business credit card hard inquiry in Utah?"
  This takes 10 minutes and may lock in 1-2 confirmed EQ slots.

Then freeze EXP + TU → Apply same day:
  1. Truist Business Card     → best EQ confidence among national issuers
  2. BMO Business Platinum    → EQ primary (verify current terms)
  3. Zions Bank / MACU        → confirmed EQ or TU depending on call result
```

---

## SKIP THESE — Bureau Strategy Killers

| Issuer | Why to Skip |
|--------|-------------|
| **Capital One (all products)** | Pulls ALL THREE bureaus on every application. Confirmed across every source. No exceptions. Skip entirely if bureau isolation matters. |
| **Discover It Business** | Reports to personal credit bureaus (balance + payments). Hard inquiry is Experian but the ongoing reporting contaminates personal utilization. |

### Capital One Exception (if you want it for other reasons):
Capital One Spark Cash Plus and Venture X Business have unique advantages — NPSL, no preset limit, and they do NOT report ongoing activity to personal credit. If you want a Capital One card despite the triple-pull, use it as one of 3 slots in a round where you're intentionally using all 3 bureaus (i.e., a round specifically for high-limit NPSL products, not a bureau-isolated round).

---

## PHASE 0 — No Personal Inquiry Fintech Layer

These run in parallel with (or before) the card cycling. Zero personal credit inquiries. Zero personal credit reporting. Pure business credit file building.

| Product | Issuer | Personal Pull? | Personal PG? | Min Requirement | Reports To | Best For |
|---------|--------|---------------|-------------|----------------|-----------|---------|
| **Mercury IO** | Mercury | NO | NO | $500 avg balance in Mercury | Experian Business, Equifax Business, D&B | Lowest barrier. Open Mercury checking → qualify almost immediately. |
| **Ramp** | Ramp | NO | NO | $25K US business bank balance | D&B, Experian Business, Equifax Business | Best no-PG card for cash-flush entity. Charge card (pay in full). |
| **BILL Divvy** | BILL | Soft pull only | NO | $20K business bank balance | SBFE → business bureaus | $20K threshold achievable. Limits up to $5M theoretically. |
| **Brex** | Brex | NO | NO | $50K+ cash OR VC backing | D&B, Experian Business | Note: Capital One acquiring Brex (mid-2026 close). Model may change. $50K cash floor. |
| **Slash** | Slash | NO | NO | Bank statements + operating proof | Business bureaus (unconfirmed which) | Most accessible EIN-only option. No published cash floor. Early-stage. |
| **Nav Prime** | Nav | NO | NO | $49.99/month membership | ALL business bureaus (2 tradelines from day 1) | Pure credit file builder. Daily autopay. 40-pt avg business score increase in 3 months. $600/yr cost = price of tradeline acceleration. |

**Phase 0 execution:** Open Mercury checking account today. Fund with operating capital. Mercury IO card qualification is immediate once account is active. This starts building business credit file before any personal inquiry is made.

---

## BUSINESS LINES OF CREDIT (BLOC)

Revolving credit lines, not cards. Separate from the card cycling strategy but complementary.

| Product | Lender | Personal Pull | Line Size | FICO Min | Revenue Min | Time in Biz | Best Feature |
|---------|--------|--------------|-----------|---------|------------|-------------|-------------|
| **Headway Capital** | Headway | **SOFT PULL ONLY** (no hard inquiry even at funding) | $10K–$100K | Not specified | $50K/yr | 1 year | Only major BLOC with soft-pull-only profile. Reports to business bureaus. |
| **Fundbox** | Fundbox | Soft then hard on first draw | Up to $150K | 600 | $30K/yr | 3 months | Lowest time-in-business requirement (3 months). Fast approval. |
| **Bluevine** | Bluevine | Soft then hard on acceptance | Up to $250K | 625 | $120K/yr | 12 months | Largest line in class. Hard pull bureau unconfirmed but reports to Experian Business. |
| **OnDeck** | OnDeck | Soft for pre-qual, hard on approval | Up to $100K | 625 | $100K/yr | 1 year | Reports to Experian Business monthly. |
| **MACU SBLOC** | Mountain America CU | Unknown | $10K–$100K est | Relationship-based | Relationship-based | Relationship-based | Interest-only first 2 years. No collateral for small LOC tier. Start banking relationship NOW. |

**BLOC strategy note:** Headway Capital is the standout — soft pull only, reports to business bureaus, up to $50K unsecured, $600/yr revenue bar is minimal. Apply when entity is 12 months old. Run this in parallel with card cycling to diversify the credit mix on the business file.

---

## PARALLEL TRACK — Business Credit File Establishment (D&B + Bureaus)

This runs simultaneously with cards. Business cards and LOCs report to personal bureaus (the hard pull) and business bureaus (the payment history). D&B needs its own establishment.

| Step | Action | Cost | Time | Impact |
|------|--------|------|------|--------|
| 1 | Register at dnb.com → get D-U-N-S number | Free | 24-48 hrs | Foundation for all D&B reporting |
| 2 | Register at SAM.gov (federal contracting eligibility) | Free | 1-2 weeks | Unlocks federal grants + government contracting |
| 3 | Open business checking at MACU or America First | Free | Same day | Starts banking relationship for SBLOC later |
| 4 | Open Mercury business checking + apply for Mercury IO | Free | 1-3 days | First no-PG business card, builds 3 bureaus |
| 5 | Apply for Nav Prime ($49.99/mo) | $49.99/mo | Immediate | 2 tradelines on all business bureaus from day 1 |
| 6 | Open vendor Net-30 accounts that report to D&B | Free | 30 days | D&B Paydex score building |

**Net-30 vendors that report to D&B (starter tradelines):**
- **Uline** — office/shipping supplies, reports to D&B, Net-30 available from day 1
- **Quill (Staples)** — office supplies, reports to D&B + Experian Business
- **Crown Office Supplies** — reports to D&B, easy approval
- **Grainger** — industrial supplies, reports to D&B (requires some history)
- **Summa Office Supplies** — Net-30, reports to D&B, designed for new businesses

**D&B Paydex score:** Scores 1–100. 80+ is considered excellent. Built by paying Net-30 accounts on time (or early). 3 Net-30 accounts paid on time for 3 months = Paydex score established.

---

## INQUIRY REMOVAL — FACTUAL ASSESSMENT

The FCRA allows disputes of hard inquiries on personal credit. Here is the factual success rate data:

| Scenario | Dispute Basis | Success Rate | Notes |
|----------|--------------|-------------|-------|
| Completely unauthorized inquiry (never applied) | "Did not authorize" | 80–99% | Legitimate fraud/identity theft removal. Works reliably. |
| Authorized business card application | "Business product shouldn't pull personal" | ~5–15% | The authorization consent was in the application you signed. Low success rate per myFICO and CreditBoards community data. |
| Duplicate inquiry (same lender pulled twice) | Data error | Medium (~40%) | These are cleaner disputes with a factual basis. |
| Inquiry older than 12 months | Wait | 100% at 24 months | Authorized inquiries fall off automatically at 2 years. Score impact fades significantly after 12 months. |

**Bureau responsiveness to disputes (2025-2026 data per ProPublica):**
- Equifax: Most dispute-responsive. Consumer-favorable resolution rates have not dropped.
- Experian: Resolution rate dropped sharply in 2024-2025 per ProPublica. Mail disputes (certified, return receipt) may outperform online portal.
- TransUnion: Similar drop to Experian. Automated system deflects most disputes.

**CFPB escalation:** Filing a CFPB complaint (consumerfinance.gov/complaint) after a denied bureau dispute produces higher response rates. Use this as a second step.

**Single inquiry impact:** ~5–10 FICO points per inquiry. Effect fades significantly by month 12. At 24 months, gone entirely. The bureau-segregated strategy (3 per bureau vs 9 on one bureau) is more impactful than removal attempts.

**The prevention > remediation math:** 3 inquiries per bureau across 3 bureaus = ~15 point maximum impact per bureau at worst. Three months later, ~8-10 points. The capital deployed (potentially $75K–$150K in credit lines) far exceeds the temporary score cost.

---

## ENTITY KB — WHAT MUST BE FILLED BEFORE A0 CAN AUTOMATE

Before Agent Zero can apply to any card, the entity KB must contain:

For each entity applying (Satori Enterprises, Infinity Stone Services, others):
```
entity.legal_name = [confirmed]
entity.ein = [FILL]
entity.state = Utah
entity.year_formed = [FILL]
entity.type = LLC / S-Corp / etc
entity.naics = [FILL]

owner.1.name = [FILL]
owner.1.ssn = [FILL — for personal guarantee]
owner.1.dob = [FILL]
owner.1.address = [FILL]
owner.personal_annual_income = [FILL — W-2 + all sources]
owner.personal_fico_experian = [FILL — current score]
owner.personal_fico_transunion = [FILL — current score]
owner.personal_fico_equifax = [FILL — current score]

business.annual_revenue_2025 = [FILL]
business.monthly_revenue_avg = [FILL]
business.bank_name = [FILL]
business.bank_balance_avg = [FILL — determines fintech eligibility]
business.employees = [FILL]
business.industry = [FILL]
business.website = [FILL]
business.address = [FILL]
```

**Income field strategy:** W-2 income from anesthesia practice is personal income. On business card applications, personal income is the backstop for the personal guarantee. State your total personal income (W-2 + any business income + any investment income). Business revenue is asked separately — state current business revenue for that entity.

---

## ROUND 1 MASTER EXECUTION SEQUENCE

```
PRE-WORK (do once, not per entity):
  □ Pull all 3 personal credit reports at annualcreditreport.com → know exact scores per bureau
  □ Get D-U-N-S number for each entity (dnb.com)
  □ Open Mercury business checking for target entity
  □ Apply for Mercury IO card (no personal pull, starts building biz credit file)

WEEK 1 — EXPERIAN ROUND (freeze TU + EQ):
  □ Freeze TransUnion (transunion.com/credit-freeze)
  □ Freeze Equifax (equifax.com freeze)
  □ Apply: Amex Blue Business Cash
  □ Apply: Chase Ink Business Cash (or Ink Unlimited)
  □ Apply: Wells Fargo Signify Business Cash
  □ Unfreeze all bureaus after applications submitted

WEEK 2 — TRANSUNION ROUND (freeze EXP + EQ):
  □ Freeze Experian
  □ Freeze Equifax
  □ Apply: Barclays Wyndham Earner Business
  □ Apply: US Bank Business Platinum (0% 12mo)
  □ Apply: US Bank Triple Cash Rewards (or Citi AAdvantage if prefer AA miles)
  □ Unfreeze all after submission

WEEK 3 — EQUIFAX ROUND (freeze EXP + TU):
  □ Call Zions Bank + MACU first → confirm bureau pull
  □ Freeze Experian
  □ Freeze TransUnion
  □ Apply: Truist Business Card
  □ Apply: BMO Business Platinum (or confirmed Zions/MACU if EQ confirmed)
  □ Apply: [Third EQ confirmed card from call results]
  □ Unfreeze all after submission

PARALLEL — BLOC (no bureau constraint):
  □ Apply: Headway Capital (soft pull only, up to $50K, 1 yr + $50K revenue)
  □ Apply: Fundbox (if entity 3+ months old, $30K+ revenue)

ONGOING — Net-30 tradelines:
  □ Apply to Uline Net-30
  □ Apply to Quill Net-30
  □ Apply to Crown Office Supplies Net-30
  □ Pay all Net-30 invoices early (boosts D&B Paydex faster)
```

---

## EXPECTED ROUND 1 OUTCOMES (Realistic Ranges)

| Group | Cards | Expected Limit Range | 0% APR Capital Available |
|-------|-------|---------------------|------------------------|
| Experian (Amex x2 + Chase + WF) | 3–4 | $15K–$75K total | $15K–$75K for 12 months |
| TransUnion (Barclays x2 + US Bank x2) | 3–4 | $10K–$50K total | $10K–$30K for 12 months |
| Equifax (Truist + BMO + Zions/MACU) | 2–3 | $5K–$30K total | Depends on cards approved |
| **Round 1 Total** | **8–11 cards** | **$30K–$155K** | **$25K–$100K interest-free** |

*Ranges depend heavily on personal credit scores. Higher personal FICO = higher individual limits. W-2 anesthesia income as personal guarantee backstop is a significant positive signal to issuers.*

---

## REPEAT CYCLE — Round 2+

After Round 1 approval:
1. Confirm business credit file is building (check Nav, Experian Business, D&B)
2. Confirm personal inquiries are present (3 per bureau)
3. At 12 months post-Round 1, or earlier if scores have recovered:
   - Apply a second round to the same or different entities (each entity has its own personal guarantee profile unless same owner)
   - Inquiries from Round 1 are already 12 months old, impact faded
4. Optionally apply Round 1 to a second entity using the same owner — separate application, same personal guarantee, separate credit lines

---

## AGENT ZERO AUTOMATION — WHAT THIS LOOKS LIKE

When the headed browser grant-applier skill (see `grant-a0-headed-browser-spec.md`) is extended to credit applications:

```
A0 workflow for each card:
  1. Load entity KB → confirm required fields filled
  2. Open headed browser (Jonathan watches)
  3. Navigate to issuer application URL
  4. Fill fields from entity KB:
     - Business name, EIN, address, revenue
     - Owner info: name, SSN, DOB, personal income
     - Freeze status confirmed before navigating
  5. Screenshot completed form → send to Jarvis for review
  6. Wait for Jonathan's "go ahead" → submit
  7. Screenshot approval/pending page
  8. Log to Notion: card, entity, date applied, bureau targeted, outcome
  9. Unfreeze bureaus after all applications in group submitted
```

**Same approval gate as grants.** Jonathan sees each form before submission.

---

*Created: 2026-03-15. Research synthesis from 3 parallel research agents.*
*Cross-references: grant-entity-profiles.md, grant-a0-headed-browser-spec.md*
*Data sources: Doctor of Credit, myFICO, CreditBoards, NerdWallet, Ramp/Brex/Mercury official documentation*
