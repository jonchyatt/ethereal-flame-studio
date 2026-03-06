# Jarvis + Claude Code Integration Architecture
# "The Life Agent" — Complete Technical Specification

## Document Purpose
This is the definitive architecture document for building Jon's autonomous life agent. Jarvis acts as the always-on orchestrator. Claude Code acts as the browser execution engine. Together they form a system that can handle real-world tasks on Jon's behalf while he works 12-14 hour hospital shifts.

**When this topic comes up again, this is the primary reference document.**

---

## 1. SYSTEM OVERVIEW

### The Two-Brain Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JON (Human)                              │
│         Telegram (phone) / Voice / Web UI                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   JARVIS (Orchestrator Brain)                   │
│                                                                 │
│  Responsibilities:                                              │
│  - Always-on (24/7 via PM2 or systemd)                         │
│  - Receives all user requests (Telegram, voice, web)           │
│  - Maintains life context (Notion, calendar, memory)           │
│  - Decides WHAT needs doing and routes to the right executor   │
│  - Manages scheduling (cron tasks, reminders, follow-ups)      │
│  - Sends approval requests to Jon via Telegram                 │
│  - Logs all actions for audit trail                            │
│  - Holds the vault master session (Bitwarden CLI)              │
│                                                                 │
│  Current Stack:                                                 │
│  - @anthropic-ai/claude-code SDK v1.0.0 (ClaudeClaw pattern)  │
│  - grammy (Telegram bot)                                       │
│  - better-sqlite3 (sessions, memory, tasks)                    │
│  - cron-parser (scheduling)                                    │
│  - Notion MCP (@notionhq/notion-mcp-server)                   │
│  - Playwright MCP (@playwright/mcp)                            │
│                                                                 │
│  Runtime: Node.js on Windows 11 (PM2 managed)                  │
│  Location: C:\Users\jonch\Projects\claudeclaw\                  │
└───────┬──────────┬──────────┬──────────┬───────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │Claude  │ │Voice   │ │Notion  │ │Vault   │
   │Code    │ │Engine  │ │/Cal    │ │(Bitwar-│
   │Browser │ │(Retell │ │(MCP)   │ │den CLI)│
   │Engine  │ │or DIY) │ │        │ │        │
   └────────┘ └────────┘ └────────┘ └────────┘
```

### Why Two Brains, Not One

| Concern | Single Agent | Two-Brain (Jarvis + Claude Code) |
|---------|-------------|----------------------------------|
| Always available | Only if custom-built | Jarvis is always on; spawns Claude Code on demand |
| Context window | Burns context on orchestration | Jarvis holds life context; Claude Code gets fresh window per task |
| Browser automation | Must build from scratch | Claude Code + Chrome extension already works |
| Cost | Every idle moment costs tokens | Jarvis is idle-cheap; Claude Code only runs during tasks |
| Credential security | One attack surface | Vault lives in Jarvis; Claude Code never touches secrets |
| Failure isolation | One failure kills everything | Browser task fails → Jarvis retries or escalates |
| Memory | Single memory store | Jarvis has life memory; Claude Code has task memory |

---

## 2. WHAT EXISTS TODAY (Inventory of Built Components)

### ClaudeClaw (THE Foundation — Already Shipped)
**Location:** `C:\Users\jonch\Projects\claudeclaw\`
**Status:** Production, running, tested from Jon's phone

| Component | File | What It Does |
|-----------|------|-------------|
| Claude Code SDK wrapper | `src/agent.ts` | Spawns Claude Code sessions via `query()`, handles events, extracts results |
| Telegram bot | `src/bot.ts` | Full two-way: text, voice, photos, docs, video |
| SQLite database | `src/db.ts` | Sessions, memories (FTS5), scheduled_tasks |
| Dual-sector memory | `src/memory.ts` | Semantic (preferences) + episodic (conversation), salience decay |
| Task scheduler | `src/scheduler.ts` | Cron-based, polls every 60s, auto-reschedules |
| Message formatting | `src/format.ts` | Markdown → Telegram HTML |
| Voice I/O | `src/bot.ts` | Groq Whisper STT → text → agent → ElevenLabs TTS |

**How the Claude Code SDK integration works (critical detail):**
```typescript
// From src/agent.ts — this is the exact pattern to extend
import { query } from '@anthropic-ai/claude-code';

const conversation = query({
  prompt: userMessage,           // What to do
  options: {
    cwd: PROJECT_ROOT,           // Working directory
    allowedTools: [              // Whitelist of tools Claude Code can use
      'Bash',
      'Read', 'Write', 'Edit',
      'Glob', 'Grep',
      'WebSearch', 'WebFetch'
    ],
    permissionMode: 'bypassPermissions',  // No interactive prompts
    resume: existingSessionId,            // Resume previous context
  },
});

// Event stream processing
for await (const event of conversation) {
  if (event.type === 'system' && event.subtype === 'init') {
    sessionId = event.session_id;   // Save for later resumption
  } else if (event.type === 'result') {
    finalResult = event.result;     // The agent's final text response
  }
}
```

**Key architectural facts:**
- `query()` spawns a real Claude Code CLI process
- Each call gets a fresh context window (or resumes a previous one via `resume`)
- `allowedTools` is the security boundary — only listed tools can execute
- `permissionMode: 'bypassPermissions'` means no interactive prompts (configured in `~/.claude/settings.json`)
- Events stream back: `system`, `assistant`, `tool_use`, `tool_result`, `result`
- Session IDs enable multi-turn conversations across Telegram messages

### Jarvis v1.0 (Shipped — Production on Vercel)
**Location:** `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\`
**URL:** https://jarvis.whatamiappreciatingnow.com/
**Status:** Production, live, working

| Component | What It Does |
|-----------|-------------|
| Chat API | SSE streaming Claude Sonnet chat with tool execution |
| Task management | CRUD with Notion sync (Drizzle ORM → Turso DB) |
| Briefing engine | Daily morning briefing from Notion data |
| Voice I/O | Deepgram STT + AWS Polly TTS |
| Calendar sync | Google Calendar API integration |
| Telegram push | One-way notifications to Jon |
| YouTube pipeline | BullMQ workers for video rendering/transcription |

**Note:** Jarvis v1 uses `@anthropic-ai/sdk` (the raw API), NOT `@anthropic-ai/claude-code` (the CLI SDK). The v2 brain swap replaces the raw API with the Claude Code SDK, matching ClaudeClaw's pattern.

### Notion Life OS (Jon's Data Layer)
**Databases (all synced via Notion API):**

| Database | Notion ID | Contents |
|----------|-----------|----------|
| Tasks | `26d02093-f0b3-8223-a854-015e521cbd7d` | To-dos, deadlines, status |
| Bills | `0ab02093-f0b3-8219-99da-8722861f036b` | Recurring bills, amounts, due dates |
| Projects | `45602093-f0b3-83e7-8364-07221234b542` | Active projects, priorities |
| Goals | `d7a02093-f0b3-839e-829b-87da54174572` | Life goals, progress tracking |
| Habits | `23402093-f0b3-82ca-ac92-878c6561ea22` | Daily habits, streaks |
| Recipes | `13902093-f0b3-8244-96cd-07f874f9f93d` | Meal planning |
| Subscriptions | `56b02093-f0b3-829a-b2a7-8111339b6a14` | Active subscriptions, costs |

### MCP Servers (Already Configured in ClaudeClaw)
**File:** `C:\Users\jonch\Projects\claudeclaw\.mcp.json`

| Server | Package | Purpose |
|--------|---------|---------|
| Notion | `@notionhq/notion-mcp-server` | Read/write all Notion databases |
| Playwright | `@playwright/mcp@latest` | Browser automation (headless) |

---

## 3. THE SECURE EXECUTION BRIDGE (What Must Be Built)

This is the ONE missing piece. Everything else exists. This bridge sits between Jarvis (orchestrator) and the browser (Playwright/Chrome), handling credential injection without the LLM ever seeing plaintext.

### 3.1 Vault Layer (Bitwarden CLI)

**Installation:**
```bash
# Install Bitwarden CLI
npm install -g @bitwarden/cli

# Login (one-time)
bw login jon@example.com

# Unlock (per session — returns a session key)
export BW_SESSION=$(bw unlock --raw)

# Usage examples
bw get password "Chase Bank"              # Returns password string
bw get item "Chase Bank"                  # Returns full JSON (username, password, URLs, notes)
bw get totp "Chase Bank"                  # Returns current TOTP code
bw get item "Visa Credit Card"            # Returns card number, expiry, CVV
```

**Vault Organization (recommended structure):**
```
Bitwarden Vault
├── Folder: "Agent-Managed"           ← Only credentials the agent can access
│   ├── Login: "Experian"
│   │   ├── username: jon@email.com
│   │   ├── password: ********
│   │   ├── totp: otpauth://totp/...
│   │   └── uri: https://www.experian.com/
│   ├── Login: "Chase Bank"
│   │   ├── username: jonchyatt
│   │   ├── password: ********
│   │   ├── totp: otpauth://totp/...
│   │   └── uri: https://www.chase.com/
│   ├── Card: "Visa ending 1234"
│   │   ├── number: 4111...1234
│   │   ├── expMonth: 08
│   │   ├── expYear: 2028
│   │   ├── cvv: ***
│   │   └── cardholderName: Jonathan Hyatt
│   ├── Identity: "Jon Primary"
│   │   ├── firstName: Jonathan
│   │   ├── lastName: Hyatt
│   │   ├── ssn: ***-**-****
│   │   ├── address1: ...
│   │   ├── phone: ...
│   │   └── email: jonchyatt@gmail.com
│   └── SecureNote: "Agent Config"
│       └── notes: JSON with agent-specific settings
│
├── Folder: "Personal"                ← Agent CANNOT access this folder
│   └── (Jon's personal passwords)
└── Folder: "Work"                    ← Agent CANNOT access this folder
    └── (Work credentials)
```

**Folder-based access control:** The agent only queries items in the "Agent-Managed" folder. This is enforced in the bridge code, not Bitwarden (Bitwarden CLI has full access once unlocked). The bridge code filters by folder ID.

### 3.2 Secure Execution Bridge (Node.js Module)

**Purpose:** Receives a credential request from the orchestrator, retrieves from vault, injects directly into browser DOM, masks all evidence from logs and LLM context.

**File:** `src/secure-bridge.ts` (new file to create)

```typescript
// CONCEPTUAL IMPLEMENTATION — this is the design, not final code

import { execSync } from 'child_process';
import { Page } from 'playwright';

interface VaultItem {
  id: string;
  name: string;
  login?: { username: string; password: string; totp?: string };
  card?: { number: string; expMonth: string; expYear: string; code: string; cardholderName: string };
  identity?: { firstName: string; lastName: string; ssn: string; address1: string; phone: string; email: string };
}

interface FillRequest {
  action: 'login' | 'fill_card' | 'fill_identity' | 'fill_ssn' | 'fill_custom';
  vaultItemName: string;        // e.g., "Chase Bank"
  targetUrl: string;            // e.g., "https://www.chase.com/login"
  fieldSelectors: {             // CSS selectors for form fields
    username?: string;
    password?: string;
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    ssn?: string;
    [key: string]: string | undefined;
  };
  requiresApproval: boolean;    // Whether to ask Jon first
}

interface FillResult {
  success: boolean;
  fieldsPopulated: string[];    // e.g., ["username", "password"] — NO VALUES
  error?: string;
}

class SecureBridge {
  private bwSession: string;
  private allowedFolderId: string;   // "Agent-Managed" folder ID
  private auditLog: AuditEntry[];

  constructor() {
    // Vault session must be established before use
    this.bwSession = '';
    this.allowedFolderId = '';
    this.auditLog = [];
  }

  /**
   * Unlock the vault. Called once per Jarvis session.
   * The master password or biometric unlocks the vault.
   * The session key is stored in memory only (never written to disk or logs).
   */
  async unlockVault(masterPassword: string): Promise<void> {
    // execSync so we can capture the session key
    this.bwSession = execSync(
      `bw unlock "${masterPassword}" --raw`,
      { encoding: 'utf8', env: { ...process.env } }
    ).trim();

    // Get the "Agent-Managed" folder ID
    const folders = JSON.parse(
      execSync(`bw list folders --session ${this.bwSession}`, { encoding: 'utf8' })
    );
    const agentFolder = folders.find((f: any) => f.name === 'Agent-Managed');
    if (!agentFolder) throw new Error('Agent-Managed folder not found in vault');
    this.allowedFolderId = agentFolder.id;
  }

  /**
   * Retrieve a vault item. CRITICAL: The return value MUST NEVER be logged,
   * stored in memory, passed to the LLM, or written to any file.
   * It flows directly to the browser DOM injection and is then discarded.
   */
  private getVaultItem(itemName: string): VaultItem {
    const raw = execSync(
      `bw get item "${itemName}" --session ${this.bwSession}`,
      { encoding: 'utf8' }
    );
    const item = JSON.parse(raw);

    // SECURITY: Verify item is in the allowed folder
    if (item.folderId !== this.allowedFolderId) {
      throw new Error(`Item "${itemName}" is not in Agent-Managed folder. Access denied.`);
    }

    return item;
  }

  /**
   * Get a TOTP code for an item. Codes are time-based and expire in 30s.
   */
  private getTOTP(itemName: string): string {
    return execSync(
      `bw get totp "${itemName}" --session ${this.bwSession}`,
      { encoding: 'utf8' }
    ).trim();
  }

  /**
   * Fill form fields in a Playwright page.
   * The LLM provides: which vault item, which URL, which CSS selectors.
   * The bridge provides: the actual credential values (never seen by LLM).
   *
   * Returns ONLY a success/failure status — NEVER the values.
   */
  async fillSecureFields(page: Page, request: FillRequest): Promise<FillResult> {
    // SECURITY: Verify we're on the expected URL
    const currentUrl = page.url();
    if (!currentUrl.startsWith(request.targetUrl.split('/').slice(0, 3).join('/'))) {
      return {
        success: false,
        fieldsPopulated: [],
        error: `URL mismatch. Expected ${request.targetUrl}, got ${currentUrl}`
      };
    }

    // Retrieve credentials (NEVER LOGGED)
    const item = this.getVaultItem(request.vaultItemName);
    const filledFields: string[] = [];

    try {
      switch (request.action) {
        case 'login':
          if (request.fieldSelectors.username && item.login?.username) {
            await page.fill(request.fieldSelectors.username, item.login.username);
            filledFields.push('username');
          }
          if (request.fieldSelectors.password && item.login?.password) {
            await page.fill(request.fieldSelectors.password, item.login.password);
            filledFields.push('password');
          }
          break;

        case 'fill_card':
          if (request.fieldSelectors.cardNumber && item.card?.number) {
            await page.fill(request.fieldSelectors.cardNumber, item.card.number);
            filledFields.push('cardNumber');
          }
          if (request.fieldSelectors.expiry && item.card) {
            await page.fill(request.fieldSelectors.expiry, `${item.card.expMonth}/${item.card.expYear}`);
            filledFields.push('expiry');
          }
          if (request.fieldSelectors.cvv && item.card?.code) {
            await page.fill(request.fieldSelectors.cvv, item.card.code);
            filledFields.push('cvv');
          }
          break;

        case 'fill_identity':
          // Fill name, address, phone, email from identity
          // Similar pattern to above
          break;

        case 'fill_ssn':
          if (request.fieldSelectors.ssn && item.identity?.ssn) {
            await page.fill(request.fieldSelectors.ssn, item.identity.ssn);
            filledFields.push('ssn');
          }
          break;

        case 'fill_custom':
          // For arbitrary field mappings
          break;
      }

      // AUDIT: Log what was done, but NEVER the values
      this.auditLog.push({
        timestamp: new Date().toISOString(),
        action: request.action,
        vaultItem: request.vaultItemName,
        targetUrl: request.targetUrl,
        fieldsPopulated: filledFields,
        approved: request.requiresApproval ? 'yes' : 'auto',
      });

      return { success: true, fieldsPopulated: filledFields };

    } catch (error) {
      return {
        success: false,
        fieldsPopulated: filledFields,
        error: `Failed to fill fields: ${(error as Error).message}`
      };
    }
  }

  /**
   * Handle 2FA/TOTP. After login, if the site asks for a TOTP code,
   * the bridge can auto-generate and fill it.
   */
  async fillTOTP(page: Page, itemName: string, totpSelector: string): Promise<FillResult> {
    const code = this.getTOTP(itemName);
    await page.fill(totpSelector, code);

    this.auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'fill_totp',
      vaultItem: itemName,
      targetUrl: page.url(),
      fieldsPopulated: ['totp'],
      approved: 'auto',
    });

    return { success: true, fieldsPopulated: ['totp'] };
  }

  /**
   * Lock the vault. Called when Jarvis shuts down or on demand.
   */
  lockVault(): void {
    execSync(`bw lock`, { encoding: 'utf8' });
    this.bwSession = '';
  }

  /**
   * Get audit log (safe to show to LLM — contains no secrets).
   */
  getAuditLog(): AuditEntry[] {
    return this.auditLog;
  }
}

interface AuditEntry {
  timestamp: string;
  action: string;
  vaultItem: string;
  targetUrl: string;
  fieldsPopulated: string[];
  approved: string;
}
```

### 3.3 Approval Gateway (Telegram Inline Buttons)

**Purpose:** Before any sensitive action, Jarvis sends Jon a Telegram message with approve/deny buttons. Jon taps one. The action proceeds or is cancelled.

```typescript
// CONCEPTUAL — approval flow via Telegram

interface ApprovalRequest {
  id: string;                    // Unique request ID
  action: string;                // "login", "fill_card", "purchase", etc.
  description: string;           // Human-readable: "Log into Chase Bank"
  targetUrl: string;             // "https://www.chase.com"
  vaultItem: string;             // "Chase Bank" (name only, no secrets)
  estimatedCost?: string;        // "$51.25" for purchases
  urgency: 'immediate' | 'can_wait';
}

// Jarvis sends to Telegram:
// ┌─────────────────────────────────────────┐
// │ 🔐 Approval Required                    │
// │                                         │
// │ Action: Log into Chase Bank             │
// │ Site: chase.com                         │
// │ Credential: Chase Bank (from vault)     │
// │                                         │
// │ [✅ Approve]  [❌ Deny]  [⏸ Later]     │
// └─────────────────────────────────────────┘

// Approval tiers (configurable):
const APPROVAL_TIERS = {
  // ALWAYS require approval (no exceptions)
  'tier_1_always': [
    'purchase',              // Any financial transaction
    'fill_card',             // Credit card entry
    'fill_ssn',              // SSN entry
    'send_email',            // Sending email on Jon's behalf
    'post_public',           // Posting anything publicly
    'delete_account',        // Account deletion
    'change_password',       // Password changes
    'cancel_subscription',   // Cancelling paid services
  ],

  // Approve once per session (then auto-approve for same site)
  'tier_2_session': [
    'login',                 // Site login (approve once, session cookies persist)
    'fill_identity',         // Name/address/phone (approve per site)
  ],

  // Auto-approve (low risk, fully reversible)
  'tier_3_auto': [
    'search',                // Web searches
    'read_page',             // Reading page content
    'navigate',              // Going to a URL
    'fill_nonsensitive',     // Non-sensitive form fields
    'screenshot',            // Taking screenshots
    'draft_email',           // Drafting (not sending) email
  ],
};
```

### 3.4 Data Flow — Complete Request Lifecycle

Here is exactly what happens when Jon says "Dispute the Capital One late payment on my Experian report":

```
STEP 1: User Input
────────────────────────────────────────────────────────
Jon (Telegram): "Dispute the Capital One late payment on my Experian report"
  ↓
ClaudeClaw bot receives message
  ↓
Memory system loads context:
  - Semantic: "Jon is doing credit repair", "Experian login is in vault"
  - Episodic: "Last week we pulled credit reports"

STEP 2: Orchestration (Jarvis/ClaudeClaw Brain)
────────────────────────────────────────────────────────
Claude Code SDK processes the request via query():
  - Understands: need to log into Experian, navigate to disputes, file dispute
  - Plans multi-step workflow:
    1. Open browser to experian.com
    2. Request vault login (→ approval gateway)
    3. Navigate to dispute center
    4. Find Capital One entry
    5. Fill dispute form
    6. Submit dispute (→ approval gateway)
    7. Capture confirmation number
    8. Report back to Jon

STEP 3: Browser Session Start
────────────────────────────────────────────────────────
Playwright launches browser (headless or headed):
  - Uses persistent browser context (cookies from previous sessions)
  - Navigates to https://www.experian.com/disputes
  - If already logged in (session cookie valid) → skip to step 5
  - If login required → step 4

STEP 4: Credential Injection (Secure Bridge)
────────────────────────────────────────────────────────
Agent detects login form on page.
Agent calls: secureBridge.fillSecureFields(page, {
  action: 'login',
  vaultItemName: 'Experian',
  targetUrl: 'https://www.experian.com/login',
  fieldSelectors: {
    username: '#username',
    password: '#password'
  },
  requiresApproval: true        // First login of session
})

  ↓ APPROVAL GATEWAY ↓

Telegram notification to Jon:
  "🔐 Approval Required
   Action: Log into Experian
   Site: experian.com
   Credential: Experian (from vault)
   [✅ Approve]  [❌ Deny]"

Jon taps ✅ (5 seconds between patients)

  ↓ APPROVED ↓

Secure Bridge:
  1. Calls: bw get item "Experian" --session $BW_SESSION
  2. Receives: { login: { username: "jon@...", password: "..." } }
  3. Calls: page.fill('#username', username)
  4. Calls: page.fill('#password', password)
  5. Credential variables are garbage collected (never stored)
  6. Returns to LLM: { success: true, fieldsPopulated: ["username", "password"] }
  7. LLM sees ONLY: "✓ Login fields populated from vault"

Agent clicks "Sign In" button.

STEP 4b: 2FA Handling
────────────────────────────────────────────────────────
If Experian shows TOTP prompt:
  Agent calls: secureBridge.fillTOTP(page, 'Experian', '#totp-code')
  Bridge generates TOTP from stored seed: bw get totp "Experian"
  Bridge fills the code field directly
  LLM sees: "✓ TOTP code populated"

If Experian sends SMS/email verification:
  Telegram to Jon: "Experian sent a verification code to your phone/email.
                    Please reply with the code."
  Jon replies: "847293"
  Agent fills the code field with Jon's reply

STEP 5: Navigation & Data Extraction
────────────────────────────────────────────────────────
Agent navigates dispute center (standard browser automation):
  - Clicks "Start a Dispute"
  - Searches for Capital One entry
  - Reads account details, payment history
  - LLM analyzes: "Found Capital One account, late payment reported 2025-08"
  - All of this is standard page reading — no credentials involved

STEP 6: Form Filling
────────────────────────────────────────────────────────
Agent fills dispute form:
  - Reason: "Payment was not late" (selected from dropdown)
  - Explanation: LLM drafts FCRA-compliant dispute text
  - Supporting docs: If Jon previously uploaded proof, agent attaches it
  - All non-sensitive fields — LLM fills directly

STEP 7: Submission (Approval Required)
────────────────────────────────────────────────────────
Before clicking "Submit Dispute":

Telegram to Jon:
  "📋 Ready to Submit
   Action: File dispute with Experian
   Item: Capital One late payment (Aug 2025)
   Reason: Payment was not late
   [✅ Submit]  [❌ Cancel]  [👁 Preview]"

If Jon taps 👁 Preview:
  Agent takes screenshot of filled form, sends to Telegram

Jon taps ✅ Submit

Agent clicks submit button.

STEP 8: Confirmation & Follow-Up
────────────────────────────────────────────────────────
Agent captures:
  - Confirmation number: "EXP-2026-0304-XXXX"
  - Expected resolution date: "April 4, 2026"
  - Screenshot of confirmation page

Telegram to Jon:
  "✅ Dispute Filed
   Confirmation: EXP-2026-0304-XXXX
   Expected resolution: April 4, 2026
   I've scheduled a follow-up check for April 5."

Agent actions:
  - Saves confirmation to Notion Tasks database
  - Creates scheduled task: "Check Experian dispute status" on April 5
  - Logs action to audit trail
  - Stores in memory: "Filed Experian dispute for Capital One, conf# EXP-..."

STEP 9: Session Cleanup
────────────────────────────────────────────────────────
Browser context saved (cookies persist for next session).
Playwright browser closed.
Claude Code session ID saved for context resumption.
Vault remains unlocked (until Jarvis shutdown or manual lock).
```

---

## 4. APPROVAL GATEWAY — DETAILED SPECIFICATION

### 4.1 Approval Request Format

Every approval request sent to Telegram follows this structure:

```
┌─────────────────────────────────────────────────┐
│ {ICON} {TITLE}                                  │
│                                                 │
│ Action: {human-readable description}            │
│ Site: {domain only, no path}                    │
│ Credential: {vault item name} (from vault)      │
│ Cost: {amount, if applicable}                   │
│ Risk: {LOW | MEDIUM | HIGH}                     │
│                                                 │
│ [✅ Approve]  [❌ Deny]  [{EXTRA}]              │
└─────────────────────────────────────────────────┘
```

Icons by risk level:
- 🔐 = Credential operation (login, TOTP)
- 💳 = Financial operation (payment, card entry)
- 📧 = Communication (email, message)
- 📋 = Form submission (dispute, application)
- ⚠️ = Destructive operation (cancel, delete)

### 4.2 Timeout Behavior

| Scenario | Timeout | Action |
|----------|---------|--------|
| Jon doesn't respond | 10 minutes | Remind once |
| Still no response | 30 minutes | Cancel action, notify "Timed out" |
| Jon taps "Later" | Queued | Re-ask at next check-in or when Jon messages |
| Jon taps "Deny" | Immediate | Cancel action, ask if alternative approach wanted |

### 4.3 Approval Persistence

Once Jon approves a login for a site in a session:
- That site's login is auto-approved for the rest of the session
- Session = until Jarvis restarts or vault is locked
- Financial actions (purchases, card entry) are NEVER auto-approved
- Jon can revoke session approvals via Telegram: "/revoke chase.com"

---

## 5. BROWSER SESSION MANAGEMENT

### 5.1 Persistent Browser Profiles

Each service gets its own isolated browser profile to prevent cross-site cookie leakage:

```
C:\Users\jonch\.jarvis\browser-profiles\
  ├── experian\          # Experian cookies, localStorage
  ├── chase\             # Chase cookies, localStorage
  ├── amazon\            # Amazon cookies, localStorage
  ├── gmail\             # Gmail cookies, localStorage
  ├── dominoes\          # Domino's cookies, localStorage
  └── default\           # For one-off browsing
```

**Benefits:**
- Login sessions persist across agent invocations (no re-login needed)
- CAPTCHAs trigger less frequently (consistent browser fingerprint)
- One compromised site can't access another site's cookies
- Each profile can be independently cleared or reset

### 5.2 Browser Launch Configuration

```typescript
// Playwright browser context creation
const context = await browser.newContext({
  storageState: `browser-profiles/${siteName}/state.json`,
  userAgent: CONSISTENT_USER_AGENT,     // Same UA every time
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
});

// After session, save state
await context.storageState({ path: `browser-profiles/${siteName}/state.json` });
```

### 5.3 CAPTCHA Handling

```
Priority 1: Avoid CAPTCHAs entirely
  → Persistent browser profiles with consistent fingerprint
  → Same user agent, viewport, locale every time
  → Don't clear cookies unnecessarily

Priority 2: If CAPTCHA appears
  → Take screenshot
  → Send to Jon via Telegram: "Please solve this CAPTCHA"
  → Wait for Jon to reply with solution (or solve on his phone)
  → Type the solution into the field
  → Continue workflow

Priority 3: Accessibility alternatives
  → Some sites offer audio CAPTCHA (can be transcribed)
  → Some sites offer email/SMS verification instead
  → Prefer these when available

Priority 4: Skip and retry later
  → If Jon doesn't respond, save browser state
  → Retry later (often CAPTCHAs are rate-limited, not permanent)
```

---

## 6. VOICE AGENT INTEGRATION (Phone Calls)

### 6.1 Architecture

```
Jarvis (orchestrator)
  → Decides: "Need to call Experian at 1-888-397-3742"
  → Composes call script:
      - Purpose: "Request credit freeze"
      - Expected menu: "Press 1 for English, 3 for credit freeze"
      - Information to provide: Name, SSN (last 4), DOB, address
      - Fallback: "If asked something unexpected, say 'please hold' and escalate to Jon"
  → Spawns voice agent session

Voice Agent (Retell AI or Twilio + ElevenLabs):
  → Dials 1-888-397-3742
  → Navigates IVR menu (DTMF tones for "Press 1", "Press 3")
  → When connected to human:
      - States purpose: "I'm calling to request a credit freeze for Jonathan Hyatt"
      - Provides info from vault (SSN last 4, DOB, address — injected, not in LLM)
      - Listens for confirmation
      - Captures confirmation number
  → Escalation: If conversation goes off-script
      - "One moment please" → patches Jon in via Telegram voice call
      - OR: "I'll need to call back" → hangs up, reports to Jon

Jarvis (post-call):
  → Logs call result
  → Sends Jon summary via Telegram
  → Creates follow-up if needed
```

### 6.2 Recommended Platform: Retell AI

| Feature | Detail |
|---------|--------|
| Latency | ~600ms (industry best) |
| Compliance | HIPAA, SOC2 Type II, GDPR |
| Languages | 31+ with native quality |
| IVR navigation | Built-in DTMF tone generation |
| Call recording | Optional, for audit trail |
| API | REST + WebSocket for real-time control |
| Cost | $0.07-0.31/min depending on features |
| Setup | No-code dashboard + API |

### 6.3 Sensitive Data During Phone Calls

Same vault pattern applies:
- Agent script says: "My Social Security number is [VAULT:SSN_LAST_4]"
- At speech synthesis time, vault injects real value into audio stream
- LLM transcript shows: "My Social Security number is [REDACTED]"
- Call recording (if enabled) contains real values — stored encrypted, access-controlled

---

## 7. SCHEDULING & AUTONOMOUS OPERATION

### 7.1 Task Types

```typescript
interface ScheduledTask {
  id: string;
  name: string;                           // "Check Experian dispute status"
  prompt: string;                         // Full instruction for Claude Code
  schedule: string;                       // Cron expression: "0 9 * * 1" (Monday 9am)
  nextRun: Date;
  lastRun?: Date;
  lastResult?: string;                    // Summary of what happened
  status: 'active' | 'paused' | 'completed';
  requiresApproval: boolean;              // Whether to ask Jon before executing
  notifyOnComplete: boolean;              // Whether to send Telegram notification
  maxRetries: number;                     // How many times to retry on failure
  retryCount: number;
  tags: string[];                         // ["credit", "financial", "recurring"]
}
```

### 7.2 Example Scheduled Tasks

| Task | Schedule | Approval | Notification |
|------|----------|----------|-------------|
| Morning briefing | `0 6 * * *` (6am daily) | No | Yes |
| Check credit score | `0 9 * * 1` (Monday 9am) | Login only | Yes |
| Pay electric bill | `0 10 1 * *` (1st of month) | Yes (financial) | Yes |
| Check dispute status | `0 9 5 4 *` (April 5, one-time) | Login only | Yes |
| Reorder contacts | `0 9 1 */3 *` (quarterly) | Yes (purchase) | Yes |
| Check package tracking | `0 12,18 * * *` (noon & 6pm) | No | Only if delivered |

### 7.3 Proactive Intelligence

Beyond cron schedules, Jarvis should proactively identify tasks:

```
Trigger: Notion bill due date approaching
  → Jarvis notices: "Electric bill due in 3 days"
  → Telegram: "Your electric bill ($142.50) is due March 8. Should I pay it?"
  → Jon: "Yes"
  → Claude Code opens utility site → vault login → pays bill → confirms

Trigger: Email arrives (if email integration added)
  → Jarvis notices: "Email from Experian: Your dispute has been resolved"
  → Telegram: "Experian resolved your dispute! The Capital One entry has been updated."
  → Saves result to Notion

Trigger: Calendar event approaching
  → Jarvis notices: "Car inspection due Saturday"
  → Telegram: "Your car inspection is Saturday. Want me to check for appointment availability?"
  → Jon: "Yes, somewhere near the hospital"
  → Claude Code searches, books appointment, sends confirmation
```

---

## 8. AUDIT & LOGGING

### 8.1 Audit Log Schema

Every action the agent takes is logged. This log is:
- Queryable by Jon at any time ("what did you do this week?")
- Never contains credential values
- Stored in SQLite alongside ClaudeClaw's existing database

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,                -- ISO 8601
  action_type TEXT NOT NULL,              -- 'login', 'fill_card', 'navigate', 'click', 'submit', etc.
  target_url TEXT,                        -- URL where action occurred
  vault_item TEXT,                        -- Vault item name used (if any)
  fields_populated TEXT,                  -- JSON array: ["username", "password"]
  approval_status TEXT,                   -- 'approved', 'denied', 'auto', 'timed_out'
  approval_time_ms INTEGER,              -- How long Jon took to approve
  result TEXT,                            -- 'success', 'failed', 'partial'
  error_message TEXT,                     -- Error details if failed
  session_id TEXT,                        -- Claude Code session ID
  task_id TEXT,                           -- Scheduled task ID (if from scheduler)
  user_request TEXT,                      -- Original user message that triggered this
  screenshot_path TEXT                    -- Path to screenshot (if taken)
);
```

### 8.2 Weekly Summary

Every Sunday, Jarvis generates a weekly summary:

```
📊 Weekly Agent Activity (Feb 28 — Mar 5)

Actions taken: 23
  - 8 web searches
  - 5 form fills
  - 4 logins (3 auto-approved, 1 manual)
  - 3 emails sent (all approved)
  - 2 purchases ($51.25 + $18.99, both approved)
  - 1 phone call (Experian credit freeze)

Approvals: 6 requested, 6 approved, 0 denied
Average approval time: 45 seconds

Scheduled tasks: 7 ran, 7 succeeded, 0 failed
Next week: 8 tasks scheduled

Notable:
  - Experian dispute filed (conf #EXP-2026-0304-XXXX)
  - Electric bill paid ($142.50)
  - Car inspection booked (Saturday 10am)
```

---

## 9. IMPLEMENTATION ROADMAP

### Phase 0: Foundation (Prerequisites)
**Estimated effort:** 1-2 hours
**Dependencies:** None

- [ ] Install Bitwarden CLI: `npm install -g @bitwarden/cli`
- [ ] Create Bitwarden account (if not existing) or use existing
- [ ] Create "Agent-Managed" folder in vault
- [ ] Add first test credential (e.g., a throwaway test account)
- [ ] Verify CLI works: `bw login`, `bw unlock`, `bw get password "Test Account"`
- [ ] Create browser profiles directory: `mkdir -p ~/.jarvis/browser-profiles/`

### Phase 1: Secure Bridge MVP
**Estimated effort:** 3-4 sessions
**Dependencies:** Phase 0

- [ ] Create `src/secure-bridge.ts` in ClaudeClaw project
- [ ] Implement vault unlock/lock lifecycle
- [ ] Implement `fillSecureFields()` for login action
- [ ] Implement TOTP generation
- [ ] Implement folder-based access control
- [ ] Create audit log table in existing SQLite database
- [ ] Write tests with mock vault data
- [ ] Test with a real low-stakes login (e.g., a test account on a demo site)

### Phase 2: Approval Gateway
**Estimated effort:** 2-3 sessions
**Dependencies:** Phase 1

- [ ] Create approval request/response flow in Telegram bot
- [ ] Implement inline keyboard buttons (Approve/Deny/Later)
- [ ] Implement timeout logic (10min remind, 30min cancel)
- [ ] Implement session-based approval caching
- [ ] Implement approval tiers (always/session/auto)
- [ ] Create `/revoke` command for revoking session approvals
- [ ] Test full flow: request → Telegram notification → tap → action proceeds

### Phase 3: Browser Integration
**Estimated effort:** 3-4 sessions
**Dependencies:** Phase 2

- [ ] Extend ClaudeClaw's `allowedTools` to include Playwright MCP
- [ ] Create persistent browser profile management
- [ ] Implement browser session save/restore
- [ ] Implement CAPTCHA escalation flow (screenshot → Telegram → user solves)
- [ ] Integrate secure bridge with browser automation
- [ ] Test end-to-end: "Log into [test site]" → vault → browser → success
- [ ] Test with real site (low-stakes: checking a tracking number, etc.)

### Phase 4: Real-World Task Templates
**Estimated effort:** 2-3 sessions per task type
**Dependencies:** Phase 3

- [ ] Credit bureau login + dispute filing (Experian, Equifax, TransUnion)
- [ ] Utility bill payment flow
- [ ] Amazon ordering flow
- [ ] Email composition and sending (Gmail)
- [ ] Food ordering (Domino's, DoorDash, etc.)
- [ ] Subscription management (cancel/modify)
- [ ] Document each as a reusable workflow template

### Phase 5: Voice Agent
**Estimated effort:** 4-5 sessions
**Dependencies:** Phase 3

- [ ] Set up Retell AI account (or Twilio + ElevenLabs)
- [ ] Build call scripting engine
- [ ] Implement IVR navigation (DTMF)
- [ ] Implement vault integration for phone calls (SSN, DOB injection)
- [ ] Implement escalation to Jon (patch-in or "call back later")
- [ ] Test with real call: "What are your hours?" to a business
- [ ] Test with structured call: appointment booking

### Phase 6: Proactive Intelligence
**Estimated effort:** 2-3 sessions
**Dependencies:** Phase 4

- [ ] Notion bill due date monitoring → auto-pay prompts
- [ ] Calendar event preparation (booking appointments, etc.)
- [ ] Follow-up scheduler (dispute status checks, etc.)
- [ ] Weekly activity summary generation
- [ ] Smart suggestions based on patterns

---

## 10. SECURITY CHECKLIST

Before going live with real credentials:

### Code Security
- [ ] Vault session key NEVER written to disk, logs, or sent to LLM
- [ ] Credential values NEVER stored in variables beyond immediate use
- [ ] All vault calls wrapped in try/catch with secure error messages (no leaked data)
- [ ] Audit log stores action descriptions, NEVER credential values
- [ ] Browser profiles stored with appropriate file permissions
- [ ] No credential values in Git history (check with `git log -p`)

### Operational Security
- [ ] Bitwarden master password is strong (20+ chars) and unique
- [ ] 2FA enabled on Bitwarden account itself
- [ ] "Agent-Managed" folder contains ONLY credentials the agent should access
- [ ] Jon can lock vault instantly from phone: `bw lock` or Bitwarden app
- [ ] Browser profiles directory is excluded from backups/cloud sync
- [ ] Telegram bot token is secured (not in Git)
- [ ] ClaudeClaw process runs under a limited user account (not admin)

### Testing Protocol
- [ ] Test with throwaway accounts first (never real credentials in testing)
- [ ] Verify LLM context does NOT contain credential values (check event stream)
- [ ] Verify audit log does NOT contain credential values
- [ ] Verify browser profile isolation (site A cookies not visible to site B)
- [ ] Verify approval gateway works when phone has no internet (timeout behavior)
- [ ] Verify vault lock kills all agent access immediately
- [ ] Penetration test: have LLM try to extract credentials via prompt injection
- [ ] Penetration test: navigate to malicious site that tries to exfiltrate via JS

---

## 11. COST ANALYSIS

### Monthly Operating Cost (Estimated)

| Component | Cost | Notes |
|-----------|------|-------|
| Claude API (Sonnet) | $5-20/mo | Depends on usage volume |
| Bitwarden | $0/mo | Free tier, or $10/yr for premium |
| Retell AI | $5-15/mo | Based on ~50-100 min of calls |
| Telegram | $0/mo | Free |
| Notion | $0/mo | Already paying |
| Playwright | $0/mo | Open source, runs locally |
| Windows electricity | ~$5/mo | Always-on PC for ClaudeClaw |
| **Total** | **$15-40/mo** | |

**Comparison:** A human personal assistant costs $500-2000/mo.

---

## 12. QUICK REFERENCE — WHAT TO TELL JARVIS

When showing this to Jarvis (or starting a session in the ethereal-flame-studio repo), the key points are:

1. **ClaudeClaw is the base** — it already has the Claude Code SDK integration, Telegram bot, memory, scheduler. Don't rebuild from scratch.

2. **The brain swap for Jarvis v2 was already planned** — replace `@anthropic-ai/sdk` with `@anthropic-ai/claude-code` SDK (same pattern as ClaudeClaw's `agent.ts`).

3. **The secure bridge is the NEW work** — `secure-bridge.ts` that wraps Bitwarden CLI and Playwright `page.fill()`. This is the only genuinely novel code.

4. **Browser automation already works** — Playwright MCP is already in ClaudeClaw's `.mcp.json`. Just needs to be wired to the secure bridge.

5. **Approval gateway is a Telegram enhancement** — Add inline keyboard buttons to the existing grammy bot. Not a new system.

6. **Start with Phase 0 + 1** — Get vault working, get one test login working end-to-end. Everything else builds on that.

---

*Created: 2026-03-05*
*Updated: 2026-03-05*
*Author: Claude Code (Opus 4.6) + Jon*
*Purpose: Complete technical specification for Jarvis + Claude Code life agent integration*
*Location: Claude Code auto-memory — primary reference for life agent discussions*
