---
phase: 15-approval-gateway-bill-pay
plan: 01
subsystem: approval
tags: [telegram, grammy, drizzle, sqlite, approval-gateway, inline-keyboard]

# Dependency graph
requires:
  - phase: 14-sub-agents-browser-engine
    provides: Telegram bot infrastructure (bot.ts, notifications.ts, getTelegramBot singleton)
provides:
  - Domain-agnostic requestApproval() function with Telegram inline buttons
  - handleApprovalCallback() for Telegram callback dispatch
  - approval_audit SQLite table with full lifecycle logging
  - ApprovalRequestOptions / ApprovalResult type contracts
affects: [15-02-bill-pay-workflow, 16-grant-submissions, future-sensitive-actions]

# Tech tracking
tech-stack:
  added: []
  patterns: [deferred-promise-approval, fail-safe-auto-reject, lazy-import-circular-avoidance, in-memory-pending-map]

key-files:
  created:
    - src/lib/jarvis/approval/approvalTypes.ts
    - src/lib/jarvis/approval/approvalGateway.ts
    - src/lib/jarvis/approval/approvalAudit.ts
  modified:
    - src/lib/jarvis/data/schema.ts
    - src/lib/jarvis/telegram/bot.ts

key-decisions:
  - "UUID text PK for approval_audit (generated before DB write for Telegram callback data)"
  - "Lazy import in bot.ts to avoid circular dependency with approvalGateway"
  - "Fail-safe default: timeout, send failure, missing config all auto-reject"
  - "In-memory pendingApprovals Map (cleared on restart = safe, timeout = reject)"

patterns-established:
  - "Deferred Promise pattern: requestApproval() returns Promise that resolves on Telegram callback"
  - "Approval callback prefix: approval:approve:{id} and approval:reject:{id}"
  - "Idempotency via processed boolean flag on PendingApproval"

requirements-completed: [VAULT-03, VAULT-04]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 15 Plan 01: Approval Gateway Summary

**Domain-agnostic approval gateway with Telegram inline buttons, deferred Promise workflow pausing, fail-safe auto-reject, and SQLite audit trail**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T16:21:02Z
- **Completed:** 2026-03-17T16:23:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Domain-agnostic approval system: zero imports from bills, payments, Notion, or any domain
- Telegram approval requests with photo (screenshot) or text fallback, inline Approve/Reject buttons
- Workflow pausing via deferred Promise that resolves on user response or timeout
- Full audit trail in approval_audit SQLite table (pending, approved, rejected, timeout, error)
- Fail-safe invariant: every ambiguous state results in rejection
- Idempotent callback handling (processed flag + button removal)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create approval types, Drizzle schema, and audit trail module** - `8af35ef` (feat)
2. **Task 2: Create approval gateway engine and wire Telegram callback handlers** - `7e9bf7a` (feat)

## Files Created/Modified
- `src/lib/jarvis/approval/approvalTypes.ts` - Domain-agnostic type contracts (ApprovalStatus, ApprovalRequestOptions, ApprovalResult, PendingApproval)
- `src/lib/jarvis/approval/approvalGateway.ts` - Core engine: requestApproval(), handleApprovalCallback(), getPendingApprovalCount()
- `src/lib/jarvis/approval/approvalAudit.ts` - SQLite audit trail: logApprovalEvent(), updateApprovalStatus(), getApprovalHistory()
- `src/lib/jarvis/data/schema.ts` - Added approvalAudit Drizzle table with UUID PK and lifecycle columns
- `src/lib/jarvis/telegram/bot.ts` - Wired approval callback handlers with lazy import before existing action/task handlers

## Decisions Made
- UUID text primary key for approval_audit table (ID generated before DB write, needed in Telegram callback data)
- Lazy `await import()` in bot.ts to break circular dependency (bot.ts imports getTelegramBot, approvalGateway imports getTelegramBot)
- Fail-safe default on all error paths: timeout, send failure, missing TELEGRAM_OWNER_ID all result in auto-reject
- In-memory pendingApprovals Map (process restart clears it, which is safe because timeout = reject)
- Approval callbacks checked FIRST in bot.ts dispatch chain (most time-sensitive, a workflow is blocked waiting)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Uses existing TELEGRAM_BOT_TOKEN and TELEGRAM_OWNER_ID env vars.

## Next Phase Readiness
- Approval gateway ready for any workflow to call `requestApproval()`
- Phase 15-02 (bill-pay workflow) can import and use the gateway immediately
- Phase 16 (grant submissions) and any future sensitive-action workflow can reuse the same gateway

---
*Phase: 15-approval-gateway-bill-pay*
*Completed: 2026-03-17*
