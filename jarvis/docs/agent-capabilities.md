# AI Agent Capabilities & Autonomous Life Management

## Purpose
Jon works 12-14 hour hospital shifts and needs an AI agent that can handle real-world tasks autonomously — like delegating to a personal assistant. This document captures what's possible today, what's coming, and the architecture to make it happen securely.

## The Vision
A fully autonomous life agent that can:
- Handle financial tasks (credit repair, bill pay, disputes)
- Communicate on Jon's behalf (email, forms, letters)
- Order things online (food, supplies, services)
- Manage accounts and subscriptions
- Research and execute multi-step real-world tasks
- Run 24/7 with minimal human intervention
- Notify Jon only when approval is needed

---

## Current Capabilities: Claude Code + Chrome Extension

### What Works Today (No Build Required)
- Browse any website, click, scroll, read content
- Fill out non-sensitive forms (contact forms, applications, search)
- Send emails via Gmail/Outlook (with per-message approval)
- Research anything on the web
- Write documents, letters, dispute templates
- Interact with any web application in Chrome
- Read and extract data from pages
- Take screenshots and record GIFs of actions
- Execute code locally (Python, Node.js, shell)
- Manage files and projects on the local machine

### Hard Limits (Anthropic-Level, Cannot Be Changed)
- Will NOT enter passwords, SSN, credit card, bank account numbers
- Will NOT create accounts on user's behalf
- Will NOT bypass CAPTCHAs or bot detection
- Will NOT make purchases without explicit per-transaction approval
- Will NOT handle sensitive financial data even if user requests it
- Session-based only — no 24/7 autonomous operation from Claude Code itself

### Workarounds Available Today
- **Session persistence**: Log in yourself once, then Claude Code operates within that session
- **ClaudeClaw**: Jon's Telegram→Claude Code bridge enables on-demand sessions from phone
- **Template + handoff**: Claude Code drafts everything, Jon does the 30-second sensitive part

---

## The Vault-Backed Agent Architecture (For Jarvis v2)

### Core Concept
The LLM never sees sensitive data. A secure vault injects credentials directly into browser fields at execution time, completely bypassing the AI's context window.

### Flow
```
Jon (Telegram / voice / browser)
  → Agent (Claude Code SDK / Jarvis)
    → Decides: "I need to log into Experian"
    → Calls: vault.get("experian_credentials")
    → Vault returns credentials to a SECURE EXECUTION LAYER (not the LLM)
    → Secure layer injects values directly into browser DOM
    → LLM only sees: "✓ Login fields populated from vault"
    → LLM continues navigating the authenticated session
```

### Vault Options
| Vault | Type | Best For |
|-------|------|----------|
| **Bitwarden CLI** (`bw`) | Self-hosted or cloud | Full password manager, free tier, CLI-native |
| **1Password CLI** (`op`) | Cloud | Polished, `op run` injects env vars |
| **HashiCorp Vault** | Self-hosted | Enterprise-grade, overkill for personal use |
| **Age/SOPS encrypted files** | Local files | Simplest, just encrypted JSON |
| **OS Keychain** (Windows Credential Manager) | Built-in | Zero setup, Windows-native |

### Recommended: Bitwarden CLI
- Free, open source, self-hostable
- CLI can retrieve any credential by name
- Can store passwords, credit cards, identities, secure notes
- Example: `bw get password "Chase Bank"` → returns password only
- Can be locked/unlocked with master password or biometrics

### Implementation Layers
```
Layer 1: Vault (Bitwarden CLI)
  - Stores all credentials, cards, identities
  - Unlocked once per session with master password or biometric
  - Agent calls vault API, never stores results in memory

Layer 2: Secure Execution Bridge
  - Receives vault output
  - Injects into browser DOM (Playwright page.fill())
  - Masks values in all logs and LLM context
  - Similar to Agent Zero's {{secret()}} pattern

Layer 3: LLM Agent (Claude API via SDK)
  - Orchestrates the workflow
  - Sees only "[REDACTED]" or "✓ field populated"
  - Makes decisions about WHAT to do, not HOW to authenticate
  - No sensitive data ever enters the context window

Layer 4: Approval Gateway
  - Configurable per-action-type approval requirements
  - Financial transactions: always require approval
  - Logins: approve once per session
  - Form fills: auto-approve non-sensitive, prompt for sensitive
  - Notifications via Telegram with approve/deny buttons
```

### Sensitive Data Categories & Handling
| Category | Example | Vault Field | Auto-Fill? |
|----------|---------|-------------|------------|
| Passwords | Chase login | `password` | Yes, via vault |
| Credit Cards | Visa ending 1234 | `card` | Yes, with approval |
| SSN | xxx-xx-xxxx | `identity.ssn` | Yes, with approval |
| Bank Account/Routing | Direct deposit | `custom_field` | Yes, with approval |
| 2FA/TOTP Seeds | Authenticator codes | `totp` | Yes, auto-generate |
| Personal Info | Name, address, phone | `identity` | Yes, auto |

---

## Solving Each Limitation

### 1. Passwords & Credentials → Vault Pattern (above)
- Agent never sees plaintext
- Bitwarden CLI retrieves, secure bridge injects
- Session cookies persist so re-auth is rare

### 2. Credit Card / SSN / Bank Info → Vault + Approval Gateway
- Same vault pattern with mandatory Telegram approval
- "Agent wants to enter your Visa ending 1234 on amazon.com. Approve?"
- Jon taps "Yes" on phone between patients

### 3. Account Creation → Vault + Email Alias
- Vault generates strong password
- Uses email alias (jon+servicename@gmail.com) for signups
- Agent fills form, vault stores new credentials
- Requires explicit "create account on X" instruction from Jon

### 4. CAPTCHAs → Multiple Strategies
- **Primary**: Maintain logged-in sessions with persistent cookies (CAPTCHAs rarely trigger)
- **Secondary**: Browser fingerprint consistency (same user agent, resolution, etc.)
- **Fallback**: Route to Jon via Telegram screenshot: "Please solve this CAPTCHA"
- **Future**: Some services offer accessibility alternatives that are automatable

### 5. 24/7 Autonomous Operation → ClaudeClaw + Scheduler
- ClaudeClaw already bridges Telegram → Claude Code
- Agent Zero has built-in task scheduler (cron-style)
- Combine: scheduled tasks trigger Claude Code sessions via SDK
- Example: "Every Monday 8am, check credit score and notify Jon"

### 6. Phone Calls → Twilio + Voice AI
- Twilio Programmable Voice API for making/receiving calls
- ElevenLabs or OpenAI TTS for natural speech
- Deepgram or Whisper for speech-to-text
- Agent scripts the call, voice layer executes it
- "Call Experian at 1-888-397-3742 and request a credit freeze"
- Can handle hold times, menu navigation, basic conversation

### 7. Native Apps → Web Alternatives + RPA
- Most services have web portals (use browser automation)
- For true desktop apps: Windows Power Automate (free, built into Win 11)
- AutoHotkey for simple automation
- Most "app-only" features have API alternatives

---

## Practical Use Cases (What Jon Can Delegate)

### Credit Repair Flow
1. "Pull my credit reports from all 3 bureaus" → Agent logs in (vault), downloads reports
2. "Find negative items" → Agent parses reports, lists items
3. "Dispute the Capital One late payment" → Agent drafts FCRA letter, files online dispute
4. "Send goodwill letters to creditors" → Agent drafts letters, sends via email or prepares for mail
5. "Follow up in 30 days" → Scheduler sets reminder, agent checks dispute status

### Bill Pay / Financial
- "Pay my electric bill" → Agent logs into utility site (vault), initiates payment (approval required)
- "Cancel my Hulu subscription" → Agent navigates to account settings, cancels
- "Find me a cheaper car insurance quote" → Agent researches, fills quote forms, compares

### Communication
- "Email my landlord about the broken dishwasher" → Agent drafts and sends (with approval)
- "Reply to the HR email about benefits enrollment" → Agent reads email, drafts reply
- "Send a thank you note to Dr. Smith" → Agent composes and sends

### Ordering / Shopping
- "Order a large pepperoni pizza from Domino's" → Agent navigates site, places order (vault for payment, approval required)
- "Reorder my contact lenses" → Agent goes to 1-800 Contacts, reorders from history
- "Buy the cheapest AA batteries on Amazon" → Agent searches, selects, orders (approval)

### Life Admin
- "Schedule my car inspection for Saturday" → Agent finds available slots, books
- "Renew my vehicle registration" → Agent navigates DMV site, fills forms
- "Check if my package shipped" → Agent checks tracking across carriers

---

## Security Model

### Principles
1. **LLM never sees secrets** — vault injection bypasses context entirely
2. **Approval tiers** — financial = always confirm, routine = auto-approve
3. **Audit log** — every action logged with timestamp, what was done, what was approved
4. **Session isolation** — browser profiles per service, no cross-site credential leakage
5. **Revocable access** — Jon can lock vault instantly from phone, killing all agent access

### Threat Model
| Threat | Mitigation |
|--------|-----------|
| Prompt injection steals credentials | Vault injection bypasses LLM — nothing to steal |
| Agent goes rogue, makes unauthorized purchases | Approval gateway requires Telegram confirmation |
| Vault breach | Bitwarden E2E encrypted, master password + biometric only |
| Session hijacking | Browser profiles with isolated cookie stores |
| Malicious website tricks agent | Claude's built-in safety rules still apply for navigation decisions |

---

## Technology Stack (Recommended for Jarvis v2)

```
Brain:        Claude API (via @anthropic-ai/claude-code SDK)
Vault:        Bitwarden CLI (self-hosted or cloud)
Browser:      Playwright (headless or headed)
Voice:        Twilio (calls) + ElevenLabs (TTS) + Deepgram (STT)
Messaging:    Telegram Bot API (ClaudeClaw pattern)
Scheduling:   Node-cron or BullMQ (already in ethereal-flame stack)
Notifications: Telegram with inline approve/deny buttons
Logging:      Structured JSON logs, queryable
Host:         Windows 11 or Docker container
```

---

## Research Needed (2026-03 Current Landscape)
- Computer Use agents (Claude, OpenAI Operator, Google Project Mariner)
- Browser Use framework (open source browser automation for AI)
- Anthropic's tool use + computer use API updates
- OpenAI Operator and its capabilities
- Google's Project Mariner / Gemini agent features
- Microsoft Copilot Actions
- Open source agent frameworks (AutoGPT, CrewAI, LangGraph, etc.)
- Secure credential handling patterns in production agents
- MCP (Model Context Protocol) ecosystem for agent tools

---

*Created: 2026-03-04*
*Purpose: Reference document for building Jon's autonomous life agent*
*Location: Claude Code auto-memory — loaded when this topic comes up*
