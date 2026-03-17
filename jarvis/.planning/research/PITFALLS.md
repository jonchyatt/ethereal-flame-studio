# Pitfalls Research

**Domain:** Autonomous life agent -- browser automation, vault credentials, sub-agents, repo migration
**Researched:** 2026-03-16
**Confidence:** HIGH (OWASP Agentic Top 10, Bitwarden CLI issues, Playwright docs, Claude SDK production reports)

---

## Critical Pitfalls

### Pitfall 1: LLM Sees Raw Credentials During Browser Automation

**What goes wrong:**
The most dangerous failure mode in the entire v5.0 milestone. When Playwright fills login forms, the credential values pass through the LLM context if the automation is not properly isolated. The LLM logs the credentials in its reasoning, they appear in conversation history, memory system stores them, and they leak into vector DB embeddings. Once a credential is in the LLM context, it is permanently compromised -- you cannot un-see it.

**Why it happens:**
- Developer builds browser automation as a normal Claude Code tool where the LLM decides what to type
- Playwright MCP (microsoft/playwright-mcp) has an open issue (#922) requesting placeholder resolution specifically because the default pattern exposes credentials to the model
- Agent Zero's `{{secret(KEY)}}` pattern works because secrets are replaced at execution time and masked in output -- but Jarvis's Claude Code SDK does not have this pattern built in
- Testing with dummy credentials works fine; the problem only surfaces with real credentials

**How to avoid:**
1. Build the vault-to-browser bridge as an **opaque tool** -- the LLM calls `fill_credentials(site_id)` and NEVER receives the credential values
2. The tool internally: unlocks Bitwarden CLI, fetches credentials, calls `page.fill()`, returns only success/failure metadata
3. Credential values must never appear in: tool arguments, tool responses, system prompts, conversation history, or log files
4. Implement the Agent Zero masking pattern: scan all tool output for known secret values and replace with placeholders before returning to the LLM
5. Test with a "canary credential" that triggers alerts if it appears anywhere in logs or memory

**Warning signs:**
- Any tool that accepts a `password` or `credential` parameter from the LLM
- Playwright automation that uses `page.fill(selector, variable_from_llm_context)`
- Tool responses that include "logged in as..." with username details
- Memory entries containing anything resembling credentials

**Phase to address:** Vault Integration (must be the FIRST feature built, before any browser automation)

**Sources:**
- [Playwright MCP Issue #922: Placeholder Resolution](https://github.com/microsoft/playwright-mcp/issues/922)
- [Secure Credential Management in Playwright (Medium, Jan 2026)](https://medium.com/@sajith-dilshan/secure-credential-management-in-playwright-0cf75c4e2ff4)
- [Securing Automation Workflow with Vault using Playwright (Medium)](https://medium.com/@mhabiib/securing-your-automation-workflow-with-vault-using-playwright-25742bbf43aa)

---

### Pitfall 2: Bitwarden CLI Session Token Silently Expires Mid-Task

**What goes wrong:**
Bitwarden CLI's `BW_SESSION` token expires after the web vault's configured timeout (default: 1 hour, sometimes 15 minutes). The CLI does not warn you -- commands simply fail with cryptic errors or return empty results. For a bill pay workflow that takes 5 minutes, this seems fine. But for a scheduled task that runs every 8 hours, or a long research session, the token expires between vault lookups and the automation silently fails or hangs waiting for master password input.

**Why it happens:**
- The CLI is not a persistent daemon; it has no concept of auto-refresh
- API key login (`bw login --apikey`) still requires a separate `bw unlock` step with master password to decrypt the vault -- API key alone cannot decrypt
- Each `bw unlock` produces a DIFFERENT session token, so you cannot cache tokens
- The vault lock timeout is controlled by web vault settings, not CLI settings, and applies globally
- On Windows, environment variables set in one shell do not propagate to PM2 processes

**How to avoid:**
1. Build a **vault service wrapper** that handles unlock-on-demand: before every credential fetch, check `bw status`, re-unlock if locked, cache the session token for the current operation only
2. Use `bw login --apikey` for authentication (no interactive password prompt), then `bw unlock` with master password stored in a protected environment variable or Windows Credential Manager
3. Never assume the session is valid -- always verify before use
4. Set vault timeout to maximum (e.g., 4 hours) in Bitwarden web vault settings during development, but plan for it being shorter in production
5. Log session status transitions for debugging (locked/unlocked/expired) without logging the token itself

**Warning signs:**
- `bw list items` returns empty array when vault has items
- `bw get` commands fail silently or return `null`
- Scheduled tasks work on first run but fail on subsequent runs
- Different behavior between interactive terminal and PM2 process

**Phase to address:** Vault Integration

**Sources:**
- [Bitwarden Community: Vault remains "locked" despite successful unlock](https://community.bitwarden.com/t/persistent-issue-with-bitwarden-cli-vault-remains-locked-despite-successful-unlock/83874)
- [GitHub: Automate BW_SESSION Export (Issue #102)](https://github.com/bitwarden/cli/issues/102)
- [GitHub: CLI client requires password to unlock, API key useless (Issue #5408)](https://github.com/bitwarden/clients/issues/5408)
- [Bitwarden CLI: Session Expiration](https://community.bitwarden.com/t/cli-session-expiration/43611)

---

### Pitfall 3: Financial Sites Detect and Block Playwright Automation

**What goes wrong:**
Bank and bill pay websites actively detect automated browsers. Playwright sets `navigator.webdriver = true` by default, uses identifiable browser fingerprints, and connects via Chrome DevTools Protocol (CDP) -- all of which modern anti-bot systems detect. The automation works perfectly against test sites and simple web forms, then fails completely against Chase, Schwab, utility company portals, and any site using Cloudflare, Akamai, or DataDome bot protection.

**Why it happens:**
- Financial sites have the strongest anti-bot measures in any industry
- CDP detection is a newer technique (2024-2025) that specifically targets automation frameworks
- Bot detection analyzes behavioral patterns: instant form fills, no mouse movement, no scroll patterns, no typing cadence
- Residential IP vs datacenter IP matters -- home ISP is better than cloud
- Browser fingerprint (canvas, WebGL, fonts, plugins) is consistent across automated sessions

**How to avoid:**
1. **Do NOT try to "stealth" Playwright** -- this is an arms race you will lose. Financial sites update detection faster than stealth plugins update evasion
2. **Prefer official APIs** wherever available (Schwab API exists and Jarvis already uses it)
3. For sites without APIs, use **persistent browser profiles** (not incognito) with real browsing history
4. Add **human-like delays**: random 50-200ms between keystrokes, mouse movements before clicks, scroll before interacting with below-fold elements
5. Run Playwright in **headed mode** (not headless) on your Windows machine -- headless detection is trivial for bot systems
6. Accept that some sites **will not work** -- have a fallback plan (notification to Jon via Telegram: "Cannot automate X, manual intervention needed")
7. Start with the EASIEST bill pay sites first (simple utility companies) before attempting banks

**Warning signs:**
- CAPTCHA appears during automated login but not manual login
- "Unusual activity detected" emails after automation runs
- Automation works once, then fails on subsequent attempts
- Different behavior between headed and headless mode

**Phase to address:** Browser Automation Engine (design for graceful failure from day one)

**Sources:**
- [Avoid Bot Detection With Playwright Stealth (Scrapeless)](https://www.scrapeless.com/en/blog/avoid-bot-detection-with-playwright-stealth)
- [How Anti-Detect Frameworks Evolved (Castle.io)](https://blog.castle.io/from-puppeteer-stealth-to-nodriver-how-anti-detect-frameworks-evolved-to-evade-bot-detection/)
- [From Playwright Codegen to Scalable Automation (Browserless)](https://www.browserless.io/blog/playwright-codegen-scalable-browserless-browserql)

---

### Pitfall 4: Autonomous Agent Submits Wrong Payment or Duplicate Payment

**What goes wrong:**
The agent pays the wrong amount, pays the wrong account, pays twice due to retry logic, or submits a form before the human approves. With financial transactions, there is no "undo" -- a duplicate mortgage payment or a payment to the wrong utility account causes real financial harm that takes days to resolve.

**Why it happens:**
- LLMs are probabilistic -- they occasionally misread amounts from scraped page content
- Retry logic after a timeout may re-submit a payment that actually succeeded
- Page structure changes between visits (different amount displayed, different form layout)
- The approval gateway has a race condition: agent proceeds while waiting for Telegram confirmation
- "Confirmation page" detection fails -- the agent thinks it is still on the form page when it is actually on the success page

**How to avoid:**
1. **Mandatory Telegram approval gate** before ANY financial submission -- no exceptions, no override
2. The approval message must include: site name, payee, amount, payment method, and a screenshot of the pre-submit page
3. Implement **idempotency**: track payment IDs, check "already paid" state before attempting
4. **Never retry a payment submission** -- if it times out, report to the human and wait
5. Build a **dry-run mode** that navigates through the entire flow but stops before the final submit button
6. Parse and validate amounts using OCR/screenshot comparison, not just DOM text (sites may have hidden fields with different values)
7. Store a payment ledger: every attempted and completed payment with timestamp, amount, confirmation number

**Warning signs:**
- Payment amount in DOM differs from what was displayed to user
- Multiple "submit" events in rapid succession
- No confirmation number captured after payment
- Agent reports "payment successful" but no confirmation email received

**Phase to address:** Bill Pay Workflows (requires both vault integration AND browser engine to be stable first)

**Sources:**
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [AI Went from Assistant to Autonomous Actor and Security Never Caught Up (HelpNetSecurity)](https://www.helpnetsecurity.com/2026/03/03/enterprise-ai-agent-security-2026/)
- [Know Your Agent: Autonomous Payments (The Financial Brand)](https://thefinancialbrand.com/news/payments-trends/know-your-agent-is-a-must-when-autonomous-payments-can-be-fraudsters-entry-point-195876)

---

### Pitfall 5: Sub-Agent Token Explosion Burns Through Max Plan Limits

**What goes wrong:**
Each Claude Code subprocess re-injects the entire system prompt (CLAUDE.md, MCP tool descriptions, skill files) on every turn. With Jarvis's 40+ MCP tools, a single subprocess turn consumes ~50K tokens before doing any actual work. Spawning 3 sub-agents for parallel research = 150K tokens of system prompt overhead per round. The Max plan has generous but not infinite limits, and this burns through them fast.

**Why it happens:**
- Claude Code CLI re-reads global configuration on every turn of every subprocess
- MCP tool descriptions alone can consume 10-20K tokens
- No isolation between parent and child system prompts
- The problem is invisible until you check token usage dashboards -- responses seem normal

**How to avoid:**
1. Use `--system-prompt` flag to provide ONLY the specific context each sub-agent needs -- do not let it inherit the full global config
2. Use **stream-json mode** for persistent sub-agent sessions -- keeps context in one continuous session without re-injection
3. Limit MCP tools available to sub-agents: a research sub-agent does not need Notion's 10 tools
4. Monitor token usage per subprocess: set alerts at thresholds
5. Prefer Agent Teams (experimental Opus 4.6 feature) over raw subprocess spawning when available
6. Before isolation: turn 1 = ~50K tokens, turn 5 = ~250K tokens. After isolation: turn 1 = ~5K, turn 5 = ~25K. This is a 10x difference

**Warning signs:**
- Max plan usage spikes dramatically after sub-agent feature ships
- Sub-agent responses are slow (processing large context)
- Simple sub-agent tasks take disproportionate token counts
- "Context window exceeded" errors in sub-agent processes

**Phase to address:** Sub-Agent Spawning

**Sources:**
- [Why Claude Code Subagents Waste 50K Tokens Per Turn (DEV Community)](https://dev.to/jungjaehoon/why-claude-code-subagents-waste-50k-tokens-per-turn-and-how-to-fix-it-41ma)
- [Claude Code Sub-Agents: Parallel vs Sequential Patterns (ClaudeFast)](https://claudefa.st/blog/guide/agents/sub-agent-best-practices)
- [Claude Agent SDK Overview (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding bill pay site selectors | Fast to build | Breaks when site redesigns (every 3-6 months) | Never -- use data-driven selector config files |
| Storing BW master password in `.env` | Easy vault unlock | Single point of compromise for ALL credentials | Only during initial development, must move to Windows Credential Manager |
| Skipping Telegram approval for "safe" actions | Faster automation | Category creep -- "safe" list grows until a real mistake happens | Never for financial actions. OK for read-only actions |
| Single monolithic browser context | Simpler code | One site's cookies/state leak into another site's session | Never -- use separate browser contexts per site |
| Using Agent Zero skills directly without porting | Saves rewrite time | A0 skills depend on A0's tool format, won't work in Claude Code | Only as reference -- must rewrite for Claude Code tool format |
| Skipping payment ledger | Less code to maintain | No audit trail, cannot detect duplicates or reconcile | Never |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Bitwarden CLI | Assuming `bw login --apikey` unlocks the vault | API key authenticates only. You must still run `bw unlock` with master password to decrypt. Two separate steps |
| Bitwarden CLI | Caching BW_SESSION across processes | Each PM2 process needs its own session. Set via wrapper, not global env var |
| Playwright | Using `page.goto()` without `waitUntil: 'networkidle'` on financial sites | Financial sites have heavy JS; use `networkidle` or explicit `waitForSelector` on the form element you need |
| Playwright | Running headless mode against banks | Banks detect headless. Run headed on Windows desktop. Use `xvfb` only as last resort on Linux |
| PM2 (repo migration) | Moving project directory while PM2 process is running | PM2 caches the original `cwd` in its dump file. Must `pm2 delete` + re-register from new path, not just `pm2 restart` |
| PM2 + symlinks | Using symlink to redirect old path to new path | PM2 resolves symlinks and stores the real path. Symlinks do not work as a migration strategy for PM2 |
| Cloudflare Tunnel | Changing the origin after tunnel is configured | Must update tunnel config AND restart `cloudflared`. Old config cached locally |
| git filter-repo | Using `git filter-branch` to extract subdirectory | `filter-branch` is deprecated, slow, and has portability issues. Use `git filter-repo` instead |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Opening new browser for each bill pay task | 5-10 second startup per task | Maintain persistent browser context pool; reuse contexts per site | Immediately noticeable -- 3 bills = 30 seconds of browser startups |
| Fetching all Bitwarden items to find one credential | Slow credential lookup | Use `bw get item <id>` with known item IDs, not `bw list items` + filter | When vault has 100+ items (already likely for Jon) |
| Loading full research library into every sub-agent context | Context overflow | Retrieve only relevant entries via semantic search, limit to top 5 | When research library exceeds 20-30 entries |
| Synchronous vault unlock on every credential request | Blocks the main agent loop | Cache unlocked session, verify status before use, unlock only when needed | Every single credential fetch adds 2-3 second delay |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging Playwright network traffic that includes POST bodies | Credentials in form submissions appear in logs | Disable request logging or filter POST body data for login URLs |
| Storing screenshots of filled-in login forms | Screenshots contain typed credentials | Take screenshots BEFORE filling credentials, or after successful login on the dashboard page |
| Sub-agent inherits parent's vault access | Compromised sub-agent prompt can request credentials for any site | Sub-agents should NEVER have vault access. Only the parent orchestrator calls vault tools |
| Memory system stores "I paid the electric bill, amount $X, account Y" | Financial details in vector DB, searchable | Store only: "Electric bill paid, confirmation #Z". Never store account numbers or payment amounts in memory |
| Research library stores grant application data with SSN/EIN fields | PII in searchable knowledge base | Separate PII fields from research content. PII goes in Bitwarden vault, research goes in library |
| Telegram approval messages include account numbers | Telegram message history contains financial data | Show masked account numbers: "****1234". Include enough to identify, not enough to compromise |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent failure on blocked automation | Jon thinks bill was paid, it was not | Always send explicit Telegram notification: "FAILED: Electric bill -- site blocked automation. Manual payment needed" |
| Approval request without context | Jon gets "Approve payment?" while in surgery, no idea what it is | Include: site name, amount, due date, and screenshot. Make it self-contained |
| No way to cancel in-progress automation | Bill pay starts navigating wrong site, no abort | Telegram "CANCEL" button that kills the browser context immediately |
| Scheduling tasks with no visibility | Tasks run in background, Jon does not know what is happening | Daily digest: "Today Jarvis will: pay electric bill at 9am, research grants at 2pm" |
| Research results dumped as raw text | Unusable for form-filling later | Structure research as typed fields: {grant_name, deadline, requirements[], eligibility_criteria[]} |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Vault integration:** Often missing session re-lock handling -- verify vault auto-locks after each credential fetch
- [ ] **Browser bill pay:** Often missing "already paid" detection -- verify the workflow checks if current billing cycle is already paid before attempting
- [ ] **Telegram approval:** Often missing timeout handling -- verify what happens if Jon never responds (answer: cancel after 30 min, notify)
- [ ] **Sub-agent spawning:** Often missing error propagation -- verify parent agent knows when sub-agent fails (not just times out)
- [ ] **Repo migration:** Often missing PM2 dump update -- verify `pm2 save` after re-registering from new path
- [ ] **Repo migration:** Often missing Cloudflare tunnel origin update -- verify tunnel still routes to correct local port
- [ ] **Scheduled tasks:** Often missing timezone handling -- verify cron expressions use America/New_York, not UTC
- [ ] **Research library:** Often missing structured schema -- verify research entries have typed fields, not just free-text blobs
- [ ] **A0 sunset:** Often missing skill audit -- verify all 20+ A0 skills are either ported, deliberately dropped, or documented as not needed
- [ ] **A0 sunset:** Often missing scheduled task port -- verify all 5 A0 scheduled tasks are recreated in Jarvis or explicitly deprecated

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Credential leaked to LLM context | HIGH | Rotate credential immediately in Bitwarden. Clear conversation history. Purge memory entries containing the credential. Audit logs for exfiltration |
| Duplicate payment submitted | MEDIUM | Contact billing company for refund. Add idempotency check. Update payment ledger. Disable automated payment for that site until fixed |
| Bot detection blocks automation | LOW | Switch to manual payment for that site. Add to "manual-only" list. Research if site has an API alternative |
| Sub-agent token explosion | LOW | Kill runaway processes. Add `--system-prompt` isolation. Monitor token dashboard. Set per-subprocess budget |
| PM2 process lost during migration | LOW | Re-register process from new path. Update ecosystem.config.js. Run `pm2 save`. Verify with `pm2 ls` |
| BW session expired during bill pay | LOW | Re-unlock vault. Restart the bill pay workflow from the beginning (do NOT resume mid-flow) |
| Research data contains PII | MEDIUM | Delete affected entries from vector DB. Move PII to Bitwarden. Re-ingest clean research. Audit what was exposed |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Credential exposure to LLM (Pitfall 1) | Vault Integration | Canary credential test: inject fake cred, verify it never appears in logs/memory |
| BW session expiration (Pitfall 2) | Vault Integration | Run vault wrapper for 2+ hours, verify auto-re-unlock works |
| Bot detection blocking (Pitfall 3) | Browser Engine | Test against 3 real bill pay sites in headed mode before declaring "done" |
| Duplicate/wrong payment (Pitfall 4) | Bill Pay Workflows | Dry-run mode successfully navigates full flow without submitting |
| Token explosion (Pitfall 5) | Sub-Agent Spawning | Monitor token usage: subprocess turn < 10K tokens with isolation |
| PM2 path caching (Integration) | Repo Migration | `pm2 ls` shows correct new path. `pm2 restart` works from new location |
| A0 skill gap (Integration) | A0 Sunset | Checklist of all 20+ skills with disposition: ported / dropped / not needed |
| PII in research library (Security) | Research Library | Schema review: no PII fields in research entries. PII audit tool |
| Approval gateway race condition (Pitfall 4) | Bill Pay Workflows | Test: start payment, do NOT approve for 30 min, verify timeout behavior |

## Sources

### Vault and Credentials
- [Bitwarden CLI Documentation](https://bitwarden.com/help/cli/)
- [Bitwarden CLI Session Expiration Discussion](https://community.bitwarden.com/t/cli-session-expiration/43611)
- [Bitwarden CLI: Vault Locked Despite Unlock](https://community.bitwarden.com/t/persistent-issue-with-bitwarden-cli-vault-remains-locked-despite-successful-unlock/83874)
- [Bitwarden Clients Issue #5408: API key cannot unlock](https://github.com/bitwarden/clients/issues/5408)
- [Playwright MCP Issue #922: Placeholder Resolution for Credentials](https://github.com/microsoft/playwright-mcp/issues/922)

### Browser Automation
- [Playwright and Playwright MCP Field Guide (Medium, Feb 2026)](https://medium.com/@adnanmasood/playwright-and-playwright-mcp-a-field-guide-for-agentic-browser-automation-f11b9daa3627)
- [Anti-Detect Framework Evolution (Castle.io)](https://blog.castle.io/from-puppeteer-stealth-to-nodriver-how-anti-detect-frameworks-evolved-to-evade-bot-detection/)
- [Bypassing CAPTCHA with Playwright (BrowserStack, 2026)](https://www.browserstack.com/guide/playwright-captcha)

### AI Agent Security
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [AI Went from Assistant to Autonomous Actor (HelpNetSecurity, March 2026)](https://www.helpnetsecurity.com/2026/03/03/enterprise-ai-agent-security-2026/)
- [The Looming Authorization Crisis: Why Traditional IAM Fails Agentic AI (ISACA)](https://www.isaca.org/resources/news-and-trends/industry-news/2025/the-looming-authorization-crisis-why-traditional-iam-fails-agentic-ai)
- [Replit AI Disaster Post-Mortem (BayTechConsulting)](https://www.baytechconsulting.com/blog/the-replit-ai-disaster-a-wake-up-call-for-every-executive-on-ai-in-production)

### Sub-Agent Orchestration
- [Why Claude Code Subagents Waste 50K Tokens Per Turn (DEV Community)](https://dev.to/jungjaehoon/why-claude-code-subagents-waste-50k-tokens-per-turn-and-how-to-fix-it-41ma)
- [Claude Code Sub-Agents: Best Practices (ClaudeFast)](https://claudefa.st/blog/guide/agents/sub-agent-best-practices)
- [Claude Agent SDK Overview (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview)

### Repo Migration
- [git-filter-repo (recommended over filter-branch)](https://github.com/newren/git-filter-repo)
- [PM2 Symlink Issues (GitHub #5939)](https://github.com/Unitech/pm2/issues/5939)
- [PM2 Symlink Path Resolution (GitHub #1663)](https://github.com/Unitech/pm2/issues/1663)
- [Splitting Sub-folders Into New Git Repository (Close Engineering)](https://making.close.com/posts/splitting-sub-folders-out-into-new-git-repository/)

---
*Pitfalls research for: Jarvis v5.0 -- browser automation, vault integration, sub-agents, repo migration*
*Researched: 2026-03-16*
