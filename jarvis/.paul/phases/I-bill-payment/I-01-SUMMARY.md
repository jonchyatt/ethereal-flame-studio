---
phase: I-bill-payment
plan: 01
subsystem: payments, ui, api
tags: [notion, subscriptions, service-link, payment-portal, chat-tools]

requires:
  - phase: G-integration-polish
    provides: Executive pipeline, BriefingBuilder, personalStore, useJarvisFetch, toolExecutor
  - phase: H-google-calendar
    provides: Stable calendar integration, BriefingBuilder patterns

provides:
  - serviceLink end-to-end pipeline (Notion → UI)
  - Pay Now button in BillsList (cyan, ExternalLink icon)
  - update_bill chat tool (7 optional properties)
  - navigate_to_payment chat tool (open_payment JSON action)
  - create_bill enhanced with service_link
  - formatBillResults with [Pay here] links
  - mark_bill_paid response includes bill name

affects: [J-meal-planning, future-bill-features]

tech-stack:
  added: []
  patterns:
    - "JSON action pattern for browser actions (open_payment follows open_panel)"
    - "Partial update builder (buildBillUpdateProperties — only changed fields)"

key-files:
  created: []
  modified:
    - src/lib/jarvis/executive/types.ts
    - src/lib/jarvis/executive/BriefingBuilder.ts
    - src/lib/jarvis/stores/personalStore.ts
    - src/lib/jarvis/hooks/useJarvisFetch.ts
    - src/components/jarvis/personal/BillsList.tsx
    - src/lib/jarvis/intelligence/tools.ts
    - src/lib/jarvis/notion/schemas.ts
    - src/lib/jarvis/notion/toolExecutor.ts
    - src/lib/jarvis/intelligence/ClaudeClient.ts

key-decisions:
  - "navigate_to_payment NOT in WRITE_TOOLS — opens browser tab, no Notion mutation, avoids wasteful refresh"
  - "Chat-first bill editing via update_bill — no UI form needed"
  - "Inline property extraction in navigate_to_payment — avoids export surface changes"
  - "Pay Now button cyan bg tint (bg-cyan-500/10) — visually distinct from ghost Mark Paid"

patterns-established:
  - "Partial update builder: buildBillUpdateProperties only includes changed fields"
  - "JSON action handler: navigate_to_payment returns { action, url, title } like open_notion_panel"
  - "Coaching error messages: 'You can say update X payment link to...' guides user to resolution"

duration: ~15min
started: 2026-02-28T21:10:00Z
completed: 2026-02-28T21:25:00Z
---

# Phase I Plan 01: Bill Payment Pipeline Summary

**serviceLink threaded end-to-end from Notion to UI with Pay Now buttons, plus update_bill and navigate_to_payment chat tools**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Tasks | 3 completed |
| Files modified | 9 |
| Build | PASSES (zero type errors) |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: serviceLink flows from Notion to UI | Pass | BillSummary → BriefingBuilder → personalStore → useJarvisFetch → BillsList |
| AC-2: Pay Now button opens payment portal | Pass | Cyan bg, ExternalLink icon, window.open with noopener,noreferrer |
| AC-3: update_bill modifies bills | Pass | 7 optional props, follows mark_bill_paid pattern (name resolution, cache fallback) |
| AC-4: navigate_to_payment opens portal via chat | Pass | JSON action pattern, ClaudeClient handler calls window.open() |
| AC-5: Chat bill queries include payment links | Pass | formatBillResults adds `[Pay here](url)` for bills with Service Link |
| AC-6: create_bill accepts service_link | Pass | buildBillProperties extended, response includes "with payment link" |

## Accomplishments

- serviceLink flows end-to-end: Notion Service Link → BriefingBuilder.parseBillResults → BillSummary type → personalStore.PersonalBill → useJarvisFetch.transformBills → BillsList UI
- Pay Now button: cyan `bg-cyan-500/10`, ExternalLink icon, side-by-side with Mark Paid (flex layout, graceful fallback to full-width Mark Paid when no link)
- 2 new chat tools: `update_bill` (partial property updates) and `navigate_to_payment` (browser tab via JSON action)
- CRITICAL import fix: `SUBSCRIPTION_PROPS` + `buildBillUpdateProperties` now imported in toolExecutor.ts
- `mark_bill_paid` response now includes bill name ("Marked "Netflix" as paid.")

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/jarvis/executive/types.ts` | Modified | Added `serviceLink?: string \| null` to BillSummary |
| `src/lib/jarvis/executive/BriefingBuilder.ts` | Modified | Added extractUrl helper, extract serviceLink in parseBillResults, pass through filtered.map |
| `src/lib/jarvis/stores/personalStore.ts` | Modified | Added `serviceLink?: string \| null` to PersonalBill |
| `src/lib/jarvis/hooks/useJarvisFetch.ts` | Modified | Thread serviceLink in transformBills return object |
| `src/components/jarvis/personal/BillsList.tsx` | Modified | ExternalLink import, Pay Now button (cyan), flex layout with Mark Paid |
| `src/lib/jarvis/intelligence/tools.ts` | Modified | update_bill + navigate_to_payment definitions, service_link on create_bill, header comments updated |
| `src/lib/jarvis/notion/schemas.ts` | Modified | buildBillUpdateProperties, service_link in buildBillProperties, [Pay here] in formatBillResults |
| `src/lib/jarvis/notion/toolExecutor.ts` | Modified | SUBSCRIPTION_PROPS + buildBillUpdateProperties imports, update_bill + navigate_to_payment executors, create_bill service_link, mark_bill_paid named response, summarizeNotionContext |
| `src/lib/jarvis/intelligence/ClaudeClient.ts` | Modified | update_bill in WRITE_TOOLS, navigate_to_payment handler (open_payment JSON parse → window.open) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| navigate_to_payment NOT in WRITE_TOOLS | Opens browser tab, doesn't mutate Notion data — no need to trigger dashboard refresh | Avoids wasteful API call every "pay my Netflix" |
| Chat-first bill editing via update_bill | Covers all edit needs without building form state/validation/API routes | UI form deferred to future phase |
| Inline property extraction in navigate_to_payment | extractUrl/extractTitle are private in schemas.ts — 2-line inline casts avoid export surface changes | Keeps module boundaries clean |
| Pay Now cyan bg tint over solid button | Distinct from ghost Mark Paid, immediately visible to non-technical user (wife UX) | Visual hierarchy: Pay Now (primary) > Mark Paid (secondary) |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Bill payment pipeline complete and functional
- Phase I goal achieved: surface payment links, enable one-tap pay, update bills via chat
- Ready for git commit and phase transition

**Concerns:**
- None — clean execution

**Blockers:**
- None

---
*Phase: I-bill-payment, Plan: 01*
*Completed: 2026-02-28*
