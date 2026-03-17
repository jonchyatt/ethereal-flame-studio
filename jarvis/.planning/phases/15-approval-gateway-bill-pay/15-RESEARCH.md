# Phase 15: Approval Gateway & Bill Pay - Research

**Researched:** 2026-03-17
**Domain:** Telegram approval flow (inline keyboards + callback queries), async workflow pause/resume, browser-based bill payment, audit trail, double-submission prevention
**Confidence:** HIGH

## Summary

Phase 15 is the most safety-critical phase in Jarvis v5.0. It introduces two interlocking systems: (1) a Telegram-based approval gateway that pauses any sensitive workflow and waits for explicit human confirmation before proceeding, and (2) a bill payment pipeline that orchestrates vault credential retrieval, browser automation, approval, payment submission, and receipt capture. The approval gateway is a reusable primitive -- Phase 16 (grant applications) also depends on it.

The core architectural challenge is pausing a running sub-agent workflow mid-execution to await human approval via Telegram. Since the Claude Agent SDK's `query()` is a streaming async iterator, the workflow cannot be literally suspended inside the iterator. Instead, the bill payment workflow must be decomposed into discrete stages: (1) navigate and authenticate, (2) fill payment details and take a pre-submission screenshot, (3) send approval request via Telegram and await callback, (4) on approval, submit the form and capture receipt. The approval pause point lives between stages 2 and 3 -- the sub-agent completes its "prepare payment" task and returns a pre-submission screenshot, then the parent agent sends the approval request and waits for the Telegram callback before spawning a new sub-agent call to complete submission.

The existing Telegram bot already uses grammY with `InlineKeyboard` and `callback_query:data` handlers (see `bot.ts` lines 10, 31-57, 519-610). The approval pattern extends this: send a photo with inline Approve/Reject buttons, store a pending approval promise keyed by a unique approval ID, and resolve/reject the promise when the callback fires. Double-submission prevention uses a `Set<string>` of processed approval IDs plus Telegram's `editMessageReplyMarkup` to remove buttons after first click.

**Primary recommendation:** Build a standalone `approvalGateway.ts` module with a `requestApproval()` function that sends a screenshot + inline keyboard to Telegram and returns a Promise that resolves on approve or rejects on reject/timeout. Wire bill payment as a multi-stage orchestration tool that calls sub-agents for browser automation stages and uses the approval gateway between the "prepare" and "submit" stages. Store all approval events and payment results in a new `payment_audit_log` SQLite table.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VAULT-03 | Telegram approval gateway for sensitive actions (payments, form submissions) with inline keyboards | grammY InlineKeyboard + callback_query pattern already proven in bot.ts; extend with approval-specific module using sendPhoto + inline Approve/Reject buttons + deferred Promise pattern |
| VAULT-04 | Async approval flow -- workflow pauses on approval request, resumes via Telegram callback | Multi-stage workflow decomposition: sub-agent prepares payment, parent sends approval request, deferred Promise resolves on callback, second sub-agent call submits. Timeout after configurable period (default 10 minutes). |
| BILL-01 | User can trigger bill payment for any bill tracked in Notion via voice, Telegram, or web UI | Existing `navigate_to_payment` tool already resolves bill name to service link URL from Notion subscriptions DB. New `pay_bill` tool orchestrates the full pipeline. Bills have `serviceLink` property in Notion. |
| BILL-02 | Jarvis navigates to billing portal, authenticates via vault, fills payment amount, submits after approval | Form-filler sub-agent (Phase 14) with Bitwarden MCP handles authentication. Browser-worker handles navigation and form filling. Approval gateway pauses between fill and submit. |
| BILL-03 | Payment confirmation captured and logged (screenshot + status update in Notion) | Post-submission screenshot via `browser_take_screenshot`, stored in screenshotStore (Phase 14). `mark_bill_paid` Notion tool already exists. New `payment_audit_log` table for structured logging. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `grammy` | `^1.39.3` | Telegram bot with inline keyboards and callback queries | Already installed and working; InlineKeyboard, callbackQuery, sendPhoto all proven in existing bot.ts |
| `@anthropic-ai/claude-code` (or `claude-agent-sdk`) | current | Sub-agent orchestration for browser automation stages | Already installed; `query()` with `agents` param for form-filler and browser-worker |
| `@playwright/mcp` | latest (via npx) | Browser automation for navigating bill portals | Already in `.mcp.json`; Playwright MCP handles navigation, form filling, screenshots |
| `@bitwarden/mcp-server` | `2026.2.0` | Credential injection for bill portal authentication | Already configured as form-filler sub-agent private MCP (Phase 13) |
| `@libsql/client` | existing | SQLite for approval requests and payment audit log | Already used for memories, evaluations, scheduled tasks |

### Supporting (Already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `grammy` `InputFile` | existing | Send screenshot as Telegram photo | When sending pre-submission screenshot for approval |
| `crypto` | built-in | UUID generation for approval IDs | `crypto.randomUUID()` for unique, collision-free approval identifiers |
| `notifications.ts` | Phase 14 | `sendTelegramScreenshot`, `sendTelegramAlert` | Reuse for BLOCKED notifications; extend with approval-specific helpers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deferred Promise pattern | External workflow engine (Temporal, Inngest) | Massive overkill for single-user system; adds infrastructure dependency for something a Map + Promise solves |
| Multi-stage sub-agent calls | Single long-running sub-agent with "pause" instruction | Sub-agents have no native pause mechanism; decomposing into stages is cleaner and more debuggable |
| In-memory pending approvals | Database-persisted workflow state | In-memory is simpler and sufficient -- if process restarts mid-approval, the timeout fires and workflow cancels cleanly. Payment never auto-submits on restart. |

**Installation:**
```bash
# Nothing new to install -- all packages already present
```

## Architecture Patterns

### Recommended Project Structure

```
src/lib/jarvis/
  approval/
    approvalGateway.ts      # NEW: Core approval request/response cycle
    approvalTypes.ts         # NEW: Types for approval requests and audit
    paymentAuditLog.ts       # NEW: SQLite audit trail for payments
  workflows/
    billPayWorkflow.ts       # NEW: Multi-stage bill payment orchestration
  telegram/
    bot.ts                   # MODIFIED: Add approval callback_query handlers
    notifications.ts         # EXISTING: Reuse sendTelegramScreenshot
  intelligence/
    tools.ts                 # MODIFIED: Add pay_bill tool definition
    ccodeBrain.ts            # EXISTING: Sub-agent infrastructure from Phase 14
  agents/
    subAgentRegistry.ts      # EXISTING: browser-worker, form-filler agents
  browser/
    screenshotStore.ts       # EXISTING: Screenshot management
  notion/
    toolExecutor.ts          # MODIFIED: Add pay_bill handler, extend mark_bill_paid
```

### Pattern 1: Deferred Promise Approval Gateway

**What:** A module that sends an approval request via Telegram (photo + inline keyboard) and returns a Promise that resolves when the user clicks Approve or rejects when they click Reject or the timeout expires.
**When to use:** Before any financial action or sensitive form submission.
**Why this pattern:** The approval gateway decouples the workflow from the Telegram callback mechanism. The workflow `await`s the promise; the Telegram callback handler `resolve`s or `reject`s it. Clean separation of concerns.

```typescript
// approval/approvalGateway.ts
import { InlineKeyboard, InputFile } from 'grammy';
import { getTelegramBot } from '../telegram/bot';
import * as fs from 'fs/promises';

interface ApprovalRequest {
  id: string;
  action: string;           // Human-readable description: "Pay Duke Energy $162.00"
  screenshotPath?: string;   // Pre-submission screenshot
  amount?: number;
  billName?: string;
  resolve: (approved: boolean) => void;
  timer: NodeJS.Timeout;
  messageId?: number;        // Telegram message ID for button removal
  processed: boolean;        // Double-submission guard
}

const pendingApprovals = new Map<string, ApprovalRequest>();

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function requestApproval(opts: {
  action: string;
  screenshotPath?: string;
  amount?: number;
  billName?: string;
  timeoutMs?: number;
}): Promise<boolean> {
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!ownerId) throw new Error('TELEGRAM_OWNER_ID not set');

  const id = crypto.randomUUID();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<boolean>(async (resolve) => {
    // Set timeout -- auto-reject if no response
    const timer = setTimeout(() => {
      const req = pendingApprovals.get(id);
      if (req && !req.processed) {
        req.processed = true;
        pendingApprovals.delete(id);
        removeApprovalButtons(ownerId, req.messageId, 'Timed out -- payment cancelled.');
        resolve(false);
      }
    }, timeoutMs);

    const approval: ApprovalRequest = {
      id, action: opts.action,
      screenshotPath: opts.screenshotPath,
      amount: opts.amount, billName: opts.billName,
      resolve, timer, processed: false,
    };
    pendingApprovals.set(id, approval);

    // Build inline keyboard
    const keyboard = new InlineKeyboard()
      .text('Approve', `approval:approve:${id}`)
      .text('Reject', `approval:reject:${id}`);

    const bot = getTelegramBot();
    const caption = `APPROVAL REQUIRED\n\n${opts.action}\n\nThis action requires your explicit approval.`;

    try {
      let msg;
      if (opts.screenshotPath) {
        const buffer = await fs.readFile(opts.screenshotPath);
        msg = await bot.api.sendPhoto(ownerId,
          new InputFile(buffer, 'pre-submission.png'),
          { caption: caption.slice(0, 1024), reply_markup: keyboard }
        );
      } else {
        msg = await bot.api.sendMessage(ownerId, caption, {
          reply_markup: keyboard,
        });
      }
      approval.messageId = msg.message_id;
    } catch (err) {
      // If we can't send the approval request, auto-reject
      clearTimeout(timer);
      pendingApprovals.delete(id);
      resolve(false);
    }
  });
}

export function handleApprovalCallback(approvalId: string, approved: boolean): boolean {
  const req = pendingApprovals.get(approvalId);
  if (!req || req.processed) return false; // Already processed or unknown

  req.processed = true;
  clearTimeout(req.timer);
  pendingApprovals.delete(approvalId);
  req.resolve(approved);
  return true;
}

async function removeApprovalButtons(
  chatId: string, messageId?: number, newText?: string
): Promise<void> {
  if (!messageId) return;
  try {
    const bot = getTelegramBot();
    await bot.api.editMessageReplyMarkup(chatId, messageId, {
      reply_markup: { inline_keyboard: [] },
    });
    // Optionally update caption/text
  } catch { /* ignore -- message may have been deleted */ }
}
```

### Pattern 2: Multi-Stage Bill Payment Workflow

**What:** A workflow function that orchestrates multiple sub-agent calls with an approval checkpoint between "prepare" and "submit" stages.
**When to use:** When `pay_bill` tool is called by the parent agent.
**Why multi-stage:** Sub-agents cannot be paused mid-execution. The workflow decomposes the payment into prepare (navigate + authenticate + fill) and submit (click pay button + capture receipt) stages.

```typescript
// workflows/billPayWorkflow.ts

interface BillPayResult {
  success: boolean;
  screenshotPath?: string;
  error?: string;
  auditId?: string;
}

export async function executeBillPayment(opts: {
  billName: string;
  amount: number;
  serviceLink: string;
  notionBillId: string;
}): Promise<BillPayResult> {
  // Stage 1: Navigate, authenticate, fill payment amount
  // → Form-filler sub-agent (has vault access + browser)
  // → Returns pre-submission screenshot path

  // Stage 2: Request human approval via Telegram
  // → requestApproval() with screenshot
  // → Blocks until approved/rejected/timeout

  // Stage 3: Submit payment (only if approved)
  // → Browser-worker sub-agent clicks submit button
  // → Takes post-submission screenshot (receipt)

  // Stage 4: Log and update Notion
  // → Insert audit record
  // → Call mark_bill_paid
}
```

### Pattern 3: Approval Callback Wiring in Telegram Bot

**What:** Add callback query handlers for `approval:approve:*` and `approval:reject:*` patterns in the existing `bot.ts` callback handler.
**When to use:** The bot's `callback_query:data` handler already dispatches on data prefix patterns.

```typescript
// In bot.ts callback_query:data handler, add before the catch-all:

if (data.startsWith('approval:approve:')) {
  const approvalId = data.replace('approval:approve:', '');
  const handled = handleApprovalCallback(approvalId, true);
  if (handled) {
    await ctx.answerCallbackQuery({ text: 'Approved! Processing payment...' });
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* ignore */ }
  } else {
    await ctx.answerCallbackQuery({ text: 'This approval has already been processed.' });
  }
  return;
}

if (data.startsWith('approval:reject:')) {
  const approvalId = data.replace('approval:reject:', '');
  const handled = handleApprovalCallback(approvalId, false);
  if (handled) {
    await ctx.answerCallbackQuery({ text: 'Rejected. Payment cancelled.' });
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* ignore */ }
  } else {
    await ctx.answerCallbackQuery({ text: 'This approval has already been processed.' });
  }
  return;
}
```

### Pattern 4: Payment Audit Log (SQLite)

**What:** A dedicated table for tracking all payment attempts, approvals, and outcomes.
**When to use:** Every payment workflow execution creates an audit record.

```sql
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id TEXT PRIMARY KEY,                    -- UUID
  bill_name TEXT NOT NULL,
  bill_notion_id TEXT,                    -- Notion page ID
  amount REAL,
  service_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, timeout, submitted, confirmed, failed
  pre_screenshot_path TEXT,               -- Path to pre-submission screenshot
  post_screenshot_path TEXT,              -- Path to receipt/confirmation screenshot
  approval_requested_at TEXT,             -- ISO timestamp
  approval_responded_at TEXT,             -- ISO timestamp
  submitted_at TEXT,                      -- ISO timestamp
  error_message TEXT,                     -- If failed, why
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Anti-Patterns to Avoid

- **Auto-submitting on process restart:** If the process restarts while an approval is pending, the in-memory Map is cleared. The payment should NOT auto-submit. A clean restart means timeout behavior (cancel). This is the SAFE default.
- **Single sub-agent call for entire payment flow:** Do not try to make one sub-agent call handle navigate + authenticate + fill + await approval + submit. Sub-agents have no pause mechanism. Decompose into stages.
- **Approval without screenshot:** Never send an approval request without showing Jon exactly what is about to be submitted. The screenshot IS the confirmation.
- **Fire-and-forget for payment submission:** Unlike notifications, payment submission MUST be awaited and its result captured. Never fire-and-forget financial actions.
- **Storing approval state in database for resume:** For a single-user local system, in-memory is simpler and safer. If the process dies mid-approval, the payment is cancelled -- this is the correct safety behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inline keyboard buttons | Custom Telegram API HTTP calls | grammY `InlineKeyboard` class | Already used in bot.ts; handles button layout, callback data encoding |
| Callback query dispatch | Custom webhook parser | grammY `bot.callbackQuery()` or `bot.on('callback_query:data')` | Already have the pattern working for task actions, voice confirmation |
| Photo with caption + buttons | Custom multipart upload | grammY `bot.api.sendPhoto()` with `reply_markup` + `caption` | Standard Telegram API; grammY handles encoding |
| Button removal after click | Custom message editing | `ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })` | Standard Telegram pattern to prevent re-clicks |
| UUID generation | Custom ID schemes | `crypto.randomUUID()` | Built-in, cryptographically random, collision-free |
| Bill lookup from name | Custom search logic | Existing `findBillByTitle()` from `recentResults.ts` | Already handles fuzzy matching against cached Notion data |
| Credential injection | Custom clipboard/paste | Form-filler sub-agent with Bitwarden MCP | Phase 13 pattern; LLM never sees credentials |
| Mark bill as paid | Custom Notion update | Existing `mark_bill_paid` tool | Already builds correct Notion property update |

**Key insight:** The approval gateway is the only genuinely new primitive. Everything else -- browser automation, vault credentials, Telegram notifications, Notion bill updates, screenshot management -- is already built in Phases 13-14. Phase 15 is primarily orchestration and safety glue.

## Common Pitfalls

### Pitfall 1: Double Approval Callback

**What goes wrong:** Jon presses "Approve" twice quickly (or network retry sends duplicate callback). Payment submits twice.
**Why it happens:** Telegram can deliver duplicate callback queries; grammY does not deduplicate.
**How to avoid:** The `processed: boolean` flag on `ApprovalRequest` ensures the first callback wins. Second callback gets "already processed" response. Button removal via `editMessageReplyMarkup` removes the UI affordance for re-clicking.
**Warning signs:** Two payment submissions in audit log for the same bill within seconds.

### Pitfall 2: Promise Never Resolves (Memory Leak)

**What goes wrong:** If `requestApproval()` fails to send the Telegram message, the Promise hangs forever, blocking the workflow.
**Why it happens:** Network failure, Telegram API down, invalid TELEGRAM_OWNER_ID.
**How to avoid:** The try/catch around `bot.api.sendPhoto` auto-rejects on send failure. The timeout timer is the ultimate backstop -- even if something unexpected happens, the Promise resolves (with `false`) within the timeout period. Always clear the timer on resolution to prevent late fires.
**Warning signs:** Workflow hangs indefinitely; no Telegram message received by Jon.

### Pitfall 3: Sub-Agent Completes "Prepare" Stage But Clicks Submit

**What goes wrong:** The form-filler sub-agent, instructed to "fill the payment form", also clicks the Submit button without waiting for approval.
**Why it happens:** LLMs are eager helpers; the sub-agent sees a "Pay Now" button and clicks it.
**How to avoid:** Explicit prompt engineering in the sub-agent's task instruction: "Fill the payment amount field. Take a screenshot of the filled form. DO NOT click Submit, Pay, or any confirmation button. Return the screenshot path and stop." Also consider limiting `maxTurns` for the prepare stage to prevent extra actions.
**Warning signs:** Payment submitted without Jon seeing an approval request. Audit log shows "submitted" without "approved".

### Pitfall 4: Bill Portal Detects Automation

**What goes wrong:** Duke Energy (or other billing portal) serves a CAPTCHA, blocks the login, or redirects to a bot detection page.
**Why it happens:** Playwright in headed mode on Windows is less suspicious than headless, but utility portals vary in their bot detection sophistication.
**How to avoid:** This is already handled by BROWSER-03/BROWSER-04 from Phase 14. The sub-agent detects BLOCKED patterns and notifyIfBlocked sends a Telegram alert. The bill payment workflow should catch this and record it in the audit log as "failed" with the reason. Jon can then complete the payment manually.
**Warning signs:** Repeated failures for the same biller. CAPTCHA screenshots in Telegram.

### Pitfall 5: Amount Mismatch Between Notion and Portal

**What goes wrong:** Notion says Duke Energy bill is $162, but the actual portal shows $178.43 (because of a recent usage spike).
**Why it happens:** Bill amounts in Notion are approximate or from last month. The actual amount is on the billing portal.
**How to avoid:** The pre-submission screenshot is critical here -- Jon reviews the actual amount on the portal before approving. The approval message should include both the Notion amount and a note that the screenshot shows the actual amount. Consider having the sub-agent extract the displayed amount from the page for the approval message.
**Warning signs:** Jon approves based on the text description without looking at the screenshot carefully.

### Pitfall 6: Stale BW_SESSION During Payment

**What goes wrong:** The form-filler sub-agent tries to get credentials but BW_SESSION has expired since Jarvis started.
**Why it happens:** Long uptime without vault activity; Bitwarden server-side session invalidation.
**How to avoid:** `ensureVaultUnlocked()` from Phase 13 vaultHealth.ts checks and re-unlocks. The `buildSubAgents()` function calls this before constructing the form-filler agent. But if the session expires DURING a payment workflow, the sub-agent will fail. Handle gracefully: catch vault errors, report to Jon via Telegram, log in audit as "failed".
**Warning signs:** Form-filler reports "vault is locked" mid-workflow.

### Pitfall 7: Telegram Bot Not Running When Approval Needed

**What goes wrong:** Payment is triggered via web UI but the Telegram bot isn't polling (PM2 process crashed). Approval request cannot be sent.
**Why it happens:** PM2 process restart, network issues, token invalidation.
**How to avoid:** The `requestApproval()` function catches send failures and auto-rejects. The workflow records "failed to send approval" in the audit log. Jon sees the failure in the web UI response. Consider adding a health check for Telegram connectivity before starting a payment workflow.
**Warning signs:** Audit log shows failures with "TELEGRAM_OWNER_ID not set" or send errors.

## Code Examples

### Sending Photo with Inline Keyboard (grammY)

```typescript
// Source: grammY docs (https://grammy.dev/plugins/keyboard) + existing bot.ts pattern
import { InlineKeyboard, InputFile } from 'grammy';
import * as fs from 'fs/promises';

const keyboard = new InlineKeyboard()
  .text('Approve', `approval:approve:${approvalId}`)
  .text('Reject', `approval:reject:${approvalId}`);

const buffer = await fs.readFile(screenshotPath);
const msg = await bot.api.sendPhoto(
  ownerId,
  new InputFile(buffer, 'pre-submission.png'),
  {
    caption: `APPROVAL REQUIRED\n\nPay Duke Energy $162.00\n\nReview the screenshot and tap Approve to proceed.`,
    reply_markup: keyboard,
  }
);
// msg.message_id used later for button removal
```

### Callback Query with Specific Data Prefix

```typescript
// Source: Existing pattern in bot.ts (lines 519-610) + grammY docs
bot.callbackQuery(/^approval:approve:(.+)$/, async (ctx) => {
  const approvalId = ctx.match![1];
  const handled = handleApprovalCallback(approvalId, true);
  await ctx.answerCallbackQuery({
    text: handled ? 'Approved!' : 'Already processed.',
  });
  if (handled) {
    // Remove buttons to prevent re-click
    await ctx.editMessageReplyMarkup({
      reply_markup: { inline_keyboard: [] },
    }).catch(() => {});
  }
});
```

Note: grammY supports regex patterns in `callbackQuery()` for cleaner routing than string prefix matching.

### Deferred Promise Pattern

```typescript
// The core mechanism for pausing workflow execution
function createDeferredApproval(): {
  promise: Promise<boolean>;
  resolve: (value: boolean) => void;
} {
  let resolve!: (value: boolean) => void;
  const promise = new Promise<boolean>((res) => { resolve = res; });
  return { promise, resolve };
}

// In workflow:
const { promise, resolve } = createDeferredApproval();
pendingApprovals.set(approvalId, { resolve, /* ... */ });
const approved = await promise; // Workflow pauses here
if (approved) {
  // Continue with submission
}
```

### SQLite Audit Log Query

```typescript
// Source: Existing libsql pattern from memory/schema.ts
import { getDbClient } from '../data/db';

export async function logPaymentAttempt(entry: {
  id: string;
  billName: string;
  billNotionId?: string;
  amount?: number;
  serviceLink?: string;
  status: string;
  preScreenshotPath?: string;
}): Promise<void> {
  const db = getDbClient();
  await db.execute({
    sql: `INSERT INTO payment_audit_log
          (id, bill_name, bill_notion_id, amount, service_link, status, pre_screenshot_path, approval_requested_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [entry.id, entry.billName, entry.billNotionId || null,
           entry.amount || null, entry.serviceLink || null,
           entry.status, entry.preScreenshotPath || null],
  });
}

export async function updatePaymentStatus(
  id: string,
  status: string,
  extra?: { postScreenshotPath?: string; errorMessage?: string }
): Promise<void> {
  const db = getDbClient();
  const sets = ['status = ?', "updated_at = datetime('now')"];
  const args: (string | null)[] = [status];

  if (extra?.postScreenshotPath) {
    sets.push('post_screenshot_path = ?');
    args.push(extra.postScreenshotPath);
  }
  if (extra?.errorMessage) {
    sets.push('error_message = ?');
    args.push(extra.errorMessage);
  }
  if (status === 'approved' || status === 'rejected' || status === 'timeout') {
    sets.push("approval_responded_at = datetime('now')");
  }
  if (status === 'submitted' || status === 'confirmed') {
    sets.push("submitted_at = datetime('now')");
  }

  args.push(id);
  await db.execute({
    sql: `UPDATE payment_audit_log SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual bill pay (Jon opens browser, types credentials) | AI-orchestrated with human approval checkpoint | Phase 15 (new) | Jon says "pay Duke Energy" and just taps Approve |
| `navigate_to_payment` opens browser tab for Jon to do manually | `pay_bill` orchestrates full end-to-end with sub-agents | Phase 15 (new) | Jon only needs to approve, not navigate/login/fill |
| No approval mechanism | Telegram inline keyboard approve/reject | Phase 15 (new) | Safety gate before any financial action |
| No audit trail for payments | SQLite `payment_audit_log` with screenshots | Phase 15 (new) | Full traceability of every payment attempt |

**Deprecated/outdated:**
- `navigate_to_payment` tool: Still works (opens browser tab) but will be superseded by `pay_bill` for automated flows. Keep as fallback for bills without automation support.
- Static bill amounts in `staticBills.ts`: The automation reads actual amounts from the billing portal. Static amounts are just for Notion display.

## Open Questions

1. **Which billers to target first**
   - What we know: Jon has ~25 bills in Notion. Many are credit cards (Capital One, Navy Federal, Amazon, etc.) and utilities (Duke Energy, Dixie Power). The `serviceLink` property in Notion stores the payment portal URL.
   - What's unclear: Which specific billers have the most automation-friendly portals. Credit card portals (Capital One, Navy Federal) often have strong bot detection. Utility portals (Duke Energy, Dixie Power) may be simpler.
   - Recommendation: Start with ONE biller for the proof-of-concept. Choose based on Jon's preference and portal simplicity. Duke Energy is explicitly called out in the success criteria, so target it first. If Duke Energy blocks automation, pivot to another biller for the initial demo.

2. **Headless vs headed for payment automation**
   - What we know: Phase 14 uses headed mode (visible browser window). For payments, Jon might be at the hospital and unable to see the desktop.
   - What's unclear: Whether headed mode is required for bot detection evasion or if headless would work.
   - Recommendation: Use headed mode by default (less suspicious). If Jon triggers a payment remotely (Telegram), the browser window opens on his desktop at home but Playwright operates it autonomously. Jon gets the screenshot via Telegram regardless.

3. **Payment amount source: Notion vs portal-displayed**
   - What we know: Notion has approximate amounts. The actual billing portal shows the real amount.
   - What's unclear: Whether to trust Notion amount or require sub-agent to extract the displayed amount.
   - Recommendation: The sub-agent should extract the actual amount from the portal during the "prepare" stage and include it in the approval message. If it cannot reliably extract the amount, fall back to the Notion amount with a disclaimer. The screenshot is always the source of truth.

4. **Approval timeout duration**
   - What we know: Jon works 12-14 hour shifts. He may not respond immediately.
   - What's unclear: Whether 10 minutes is appropriate or too short.
   - Recommendation: Default 10 minutes for the initial implementation. This can be configured. If Jon is in surgery, the payment simply times out and can be retried later. Better to timeout and retry than to leave a payment workflow hanging indefinitely.

5. **Error recovery: retry vs manual**
   - What we know: Browser automation can fail for many reasons (CAPTCHA, session expired, network issue, portal redesign).
   - What's unclear: Whether to implement automatic retry or just report failure.
   - Recommendation: No automatic retry for Phase 15. If the workflow fails, Jon gets a Telegram alert with details and can retry manually ("pay Duke Energy again") or handle it himself. Retry logic is a Phase 15.1 enhancement.

## Sources

### Primary (HIGH confidence)
- grammY documentation: [InlineKeyboard](https://grammy.dev/ref/core/inlinekeyboard), [Keyboard plugin](https://grammy.dev/plugins/keyboard), [CallbackQuery](https://grammy.dev/ref/types/callbackquery) -- inline keyboard construction, callback query handling, sendPhoto with reply_markup
- Existing codebase: `src/lib/jarvis/telegram/bot.ts` -- working InlineKeyboard + callback_query:data pattern, getTelegramBot() singleton, TELEGRAM_OWNER_ID pattern
- Existing codebase: `src/lib/jarvis/notion/toolExecutor.ts` -- `navigate_to_payment` handler, `mark_bill_paid` handler, bill lookup via `findBillByTitle()`
- Existing codebase: `src/lib/jarvis/notion/schemas.ts` -- `SUBSCRIPTION_PROPS` with `serviceLink`, `SubscriptionProperties` interface
- Phase 14 Research (`14-RESEARCH.md`) -- Sub-agent registry, browser-worker/form-filler definitions, screenshot store, Telegram notification helpers
- Phase 13 Research (`13-RESEARCH.md`) -- Vault session management, form-filler sub-agent with private BW MCP, credential isolation pattern

### Secondary (MEDIUM confidence)
- [Telegram Bot API](https://core.telegram.org/bots/api) -- sendPhoto, InlineKeyboardMarkup, CallbackQuery, answerCallbackQuery
- [Cloudflare Agents human-in-the-loop pattern](https://developers.cloudflare.com/agents/guides/human-in-the-loop/) -- Deferred promise pattern for approval workflows
- [OpenAI Agents SDK human-in-the-loop guide](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/) -- RunToolApprovalItem pattern, workflow pausing on approval request

### Tertiary (LOW confidence)
- Duke Energy portal automation compatibility -- No public information about bot detection. Needs live testing. Playwright headed mode on Windows should be less suspicious than headless.
- Credit card portal automation -- Capital One, Navy Federal, Amazon are known to have strong bot detection. May require CAPTCHA intervention. Covered by existing BROWSER-04 handler.

## Metadata

**Confidence breakdown:**
- Approval gateway: HIGH -- grammY InlineKeyboard + callback_query pattern is proven in existing bot.ts; deferred Promise is standard JS pattern
- Bill payment orchestration: HIGH -- Multi-stage workflow with sub-agents is well-understood from Phase 14 research; all building blocks exist
- Audit trail: HIGH -- SQLite pattern matches existing memory/evaluation tables in the project
- Bot detection evasion: LOW -- No data on specific billing portal behavior; needs live testing
- Amount extraction from portal: MEDIUM -- Sub-agent can attempt to read the amount from accessibility snapshot, but portal HTML varies

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain; Telegram API and grammY are mature)
