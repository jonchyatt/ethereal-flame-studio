# Feature Landscape: v5.0 Agent Unification

**Domain:** Autonomous life agent -- browser automation, vault-backed credentials, sub-agent orchestration, research-as-library
**Target User:** Solo operator (Jon) working 12-14hr hospital shifts who needs autonomous task execution
**Researched:** 2026-03-16
**Confidence:** MEDIUM-HIGH (WebSearch verified with official docs and multiple sources)

---

## Table Stakes

Features that are non-negotiable for an autonomous agent handling real-world financial and administrative tasks. Missing any of these = unusable or unsafe.

### Browser Automation Engine

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Playwright-based page navigation** | Industry standard for programmatic browser control; all serious browser agents use it | Low | Playwright npm package (already available via Claude Code) | Playwright MCP server v0.0.37+ has built-in secrets support. Use headed mode for debugging, headless for production. |
| **Form field detection and filling** | Core capability -- cannot automate bill pay or applications without filling forms | Medium | Playwright, DOM traversal | Use `page.fill()` with vault-injected credentials. AI vision (screenshots) handles dynamic forms better than CSS selectors. |
| **Login/authentication flows** | Every bill pay site requires login; cannot skip this | Medium | Vault integration, Playwright | Pattern: vault retrieves creds -> placeholder resolution -> `page.fill()` -> submit. LLM never sees raw values. |
| **Screenshot capture and verification** | Agent must verify what it sees before acting; catches layout changes and errors | Low | Playwright `page.screenshot()` | Claude's vision capability processes screenshots to understand page state. Critical for the Planner-Actor-Validator pattern. |
| **Error detection and graceful failure** | Sites break, layouts change, sessions expire -- agent must fail safely, never submit garbage | Medium | Screenshot analysis, retry logic | Skyvern's lesson: validation layer is critical. Agent should screenshot before AND after every action. |
| **Telegram approval gate for financial actions** | Any action involving money requires explicit human confirmation | Medium | Existing Telegram bot, inline keyboards | Industry consensus: human-in-the-loop for financial transactions is mandatory. Send screenshot + action summary to Telegram, wait for approval. |

### Vault-Backed Credential Injection

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Bitwarden CLI vault unlock/lock** | Must access credentials programmatically; Bitwarden CLI is the interface | Low | Bitwarden CLI installed, master password or API key in env | `bw unlock` returns session key. Store session key in memory, not on disk. Lock after use. |
| **Credential retrieval by site/service name** | Agent needs to say "get credentials for Duke Energy" and get username+password | Low | Bitwarden CLI, vault organization | `bw get item "Duke Energy"` returns JSON with login fields. Organize vault entries with consistent naming. |
| **Placeholder resolution (LLM never sees secrets)** | Security-critical: LLM works with `{{DUKE_ENERGY_PASSWORD}}`, real value injected at execution time | Medium | Playwright MCP secrets (v0.0.37+), or custom resolution layer | Playwright MCP issue #922 solved this: secrets land in v0.0.37. Alternatively, build thin wrapper that resolves `{{secret(...)}}` before `page.fill()`. |
| **TOTP/2FA code retrieval** | Many bill pay sites require 2FA; Bitwarden stores TOTP seeds | Low | Bitwarden CLI TOTP support | `bw get totp "Duke Energy"` returns current TOTP code. Time-sensitive -- must use immediately. |
| **Session management (lock after use)** | Vault should not stay unlocked indefinitely | Low | Timer or post-task hook | Lock vault after each workflow completes. Never leave session key in environment longer than needed. |

### Sub-Agent Orchestration

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Task-based agent spawning** | Complex workflows need isolation -- research agent should not have browser access, browser agent should not have full context | Medium | Claude Code SDK Task tool | Claude Code's Task tool spawns ephemeral workers with scoped context and tools. Define task, get result. |
| **Role-specialized agent definitions** | Different tasks need different system prompts and tool access | Low | `.claude/agents/` directory with markdown files | Define researcher.md, browser-automator.md, financial-analyst.md as agent profiles with YAML frontmatter. |
| **Result aggregation from sub-agents** | Parent agent must collect and synthesize sub-agent outputs | Low | Task tool return values | Sub-agents return structured results; parent synthesizes. Keep sub-agent outputs concise. |
| **Sequential task chains** | Bill pay = research site -> get credentials -> navigate -> fill -> verify -> approve -> submit | Medium | Task orchestration logic | Chain sub-agents: each step's output feeds the next. Fail fast if any step errors. |

---

## Differentiators

Features that elevate Jarvis from "browser script runner" to "autonomous life agent." Not expected but create outsized value for a single-user agent.

### Browser Automation -- Advanced

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Visual page understanding (screenshot + AI vision)** | Layout-resistant automation. Agent understands the page visually, not via brittle CSS selectors. Adapts when sites redesign. | Medium | Claude vision, Playwright screenshots | Skyvern 2.0 uses this pattern (Planner-Actor-Validator). Claude Sonnet already has vision. This is the key differentiator over traditional automation. |
| **Workflow recording and replay** | Jon walks through a bill pay once; Jarvis learns the workflow for future autonomous execution | High | Workflow definition format, step recording | Start manual, automate incrementally. Record clicks/fills as a replayable template. Huge time savings for recurring tasks. |
| **Multi-site session management** | Handle 5+ bill pay sites in one automated run without session conflicts | Medium | Browser context isolation, Playwright contexts | Use separate Playwright browser contexts per site. Each gets its own cookies/auth state. |
| **Confirmation screenshot to Telegram** | Before submitting payment, send screenshot to Jon on Telegram showing exactly what will be submitted | Low | Telegram bot, Playwright screenshot | "About to pay $142.30 to Duke Energy. Confirm?" with a screenshot. Simple but builds massive trust. |
| **Adaptive retry with layout detection** | When a site changes its layout, agent detects the change and adapts instead of failing silently | High | Vision comparison, layout analysis | Prevents the #1 cause of automation rot. Agent notices "this page looks different than expected" and adjusts. |

### Research-as-Library

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Structured research storage** | Research findings stored as queryable, typed knowledge (not just chat logs) | Medium | SQLite or JSON storage, schema design | Store: entity, field, value, source, date, confidence. E.g., {entity: "Verizon Digital Ready Grant", field: "deadline", value: "2026-03-31", source: "url", confidence: "HIGH"} |
| **Research recall during form-filling** | When filling a grant application, agent auto-retrieves stored research about that grant | Medium | Research storage, context injection | "What is your annual revenue?" -> agent recalls stored business facts. "What will you use funds for?" -> agent recalls grant-specific research. |
| **Business profile as structured data** | Jon's business details (EIN, revenue, NAICS code, founding date) stored once, reused across all applications | Low | Structured profile storage | Store once in vault or structured config. Inject into any form that asks for business info. Saves massive repetitive data entry. |
| **Grant eligibility pre-screening** | Before spending time on an application, verify Jon's businesses meet eligibility criteria | Medium | Research storage, eligibility rules | Store grant requirements, compare against business profile. "You qualify for 3 of 5 criteria -- proceed?" |
| **Research freshness tracking** | Flag when stored research may be outdated (deadline passed, terms changed) | Low | Date tracking, staleness rules | "Grant deadline research is 45 days old -- should I re-verify?" Prevents acting on stale data. |

### Sub-Agent Orchestration -- Advanced

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Parallel sub-agent execution** | Research 3 grants simultaneously instead of sequentially | Medium | Claude Code parallel Task tool calls | Claude Code supports parallel sub-agent execution natively. Research agent A + B + C run simultaneously, results aggregated. |
| **Agent skill porting from Agent Zero** | Preserve Visopscreen trading skills and crypto agent capabilities | Medium | Skill translation from A0 SKILL.md to Claude Code agent format | Map A0 skills to Claude Code sub-agent definitions. Not 1:1 -- Claude Code agents are markdown files, not skill folders. |
| **Scheduled autonomous workflows** | "Every 1st of the month, pay all bills" runs without Jon's intervention | High | Cron scheduler, browser automation, approval gate | Combine: scheduler triggers workflow -> sub-agents execute -> approval gate for payments -> execute or defer. Most ambitious differentiator. |

---

## Anti-Features

Features to explicitly NOT build. Learned from industry failures and community discussions.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Fully autonomous financial transactions** | Industry consensus: AI should never submit payments without human approval. One bug = real money lost. Krebs on Security 2026 article highlights AI assistant security risks. | Always require Telegram approval with screenshot before any financial submission. No exceptions. |
| **Credential caching in memory/context** | If credentials enter the LLM context window, they could leak via prompt injection or logs. Defeats the entire vault pattern. | Placeholder resolution only. `{{secret(X)}}` resolved at execution time, masked in output. Bitwarden MCP's zero-knowledge architecture is the model. |
| **CAPTCHA solving** | Modern CAPTCHAs (Cloudflare Turnstile, reCAPTCHA v3) use behavioral analysis that's increasingly hard to bypass. Third-party solvers are expensive, unreliable, and ethically gray. | If a site has CAPTCHA, pause and notify Jon via Telegram. He taps through on his phone, agent continues. Human-assisted CAPTCHA is faster than any solver. |
| **General-purpose browser agent ("do anything on any website")** | Skyvern's lesson: agents work best on specific workflows, not general browsing. "AI worker for everything" creates more complexity than value. | Define specific workflow templates per site. Duke Energy bill pay is a defined workflow, not "go figure out how to pay Duke Energy." |
| **Phone call automation** | Requires telephony integration (Twilio/Vonage), speech synthesis, real-time conversation -- completely different domain. Out of scope for v5.0. | Defer to future milestone. Focus browser automation first. |
| **Multi-user support** | Jarvis is Jon's personal agent. Multi-tenancy adds auth, data isolation, billing -- massive complexity for zero value. | Single-user only. Hardcode Jon's context. |
| **Building a custom vault** | Bitwarden exists, is free, has CLI, has MCP server, has been security-audited. Building custom credential storage is a security liability. | Use Bitwarden. Period. |
| **Scraping sites for bill amounts** | Fragile, sites change layouts, may violate ToS. Bills change monthly anyway. | Let Jon tell Jarvis the amount, or read it from the payment confirmation page via screenshot during the workflow. |
| **Real-time browser streaming to UI** | Showing live browser viewport in Jarvis web UI adds massive complexity (WebSocket video stream) for minimal value. | Screenshots at key moments sent to Telegram. Jon does not need to watch the agent work -- he needs to approve the result. |

---

## Feature Dependencies

```
EXISTING JARVIS v4.x FEATURES
  |
  +-- Telegram bot (approval gateway foundation)
  |     |
  |     +-- Approval gate for financial actions [TABLE STAKES]
  |
  +-- Claude Code SDK (sub-agent foundation)
  |     |
  |     +-- Role-specialized agent definitions [TABLE STAKES]
  |     |     |
  |     |     +-- Parallel sub-agent execution [DIFFERENTIATOR]
  |     |     |
  |     |     +-- Agent skill porting from A0 [DIFFERENTIATOR]
  |     |
  |     +-- Task-based agent spawning [TABLE STAKES]
  |           |
  |           +-- Sequential task chains [TABLE STAKES]
  |                 |
  |                 +-- Scheduled autonomous workflows [DIFFERENTIATOR]
  |
  +-- Memory system (research storage foundation)
        |
        +-- Business profile as structured data [DIFFERENTIATOR]
        |     |
        |     +-- Structured research storage [DIFFERENTIATOR]
        |           |
        |           +-- Research recall during form-filling [DIFFERENTIATOR]
        |           |
        |           +-- Grant eligibility pre-screening [DIFFERENTIATOR]
        |           |
        |           +-- Research freshness tracking [DIFFERENTIATOR]
        |
        +-- (no dependency on browser automation)

NEW INFRASTRUCTURE
  |
  +-- Bitwarden CLI integration
  |     |
  |     +-- Vault unlock/lock [TABLE STAKES]
  |     |
  |     +-- Credential retrieval [TABLE STAKES]
  |     |
  |     +-- TOTP/2FA retrieval [TABLE STAKES]
  |     |
  |     +-- Placeholder resolution [TABLE STAKES]
  |           |
  |           +-- Login/auth flows [TABLE STAKES]
  |                 |
  |                 +-- Form filling [TABLE STAKES]
  |                       |
  |                       +-- Bill pay workflows [TABLE STAKES]
  |                       |
  |                       +-- Grant application filling [DIFFERENTIATOR]
  |                       |
  |                       +-- Visual page understanding [DIFFERENTIATOR]
  |                             |
  |                             +-- Adaptive retry [DIFFERENTIATOR]
  |
  +-- Playwright browser engine
        |
        +-- Page navigation [TABLE STAKES]
        |
        +-- Screenshot capture [TABLE STAKES]
        |
        +-- Error detection [TABLE STAKES]
        |
        +-- Multi-site sessions [DIFFERENTIATOR]
        |
        +-- Workflow recording [DIFFERENTIATOR]
```

**Critical path:** Bitwarden CLI -> Playwright engine -> Credential injection -> Login flows -> Form filling -> Bill pay -> Approval gate

---

## MVP Recommendation for v5.0

### Must Ship (Table Stakes -- Unsafe or Broken Without These)

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | **Bitwarden CLI integration** (unlock, retrieve, TOTP, lock) | Foundation. Cannot automate anything requiring login without credentials. |
| 2 | **Placeholder resolution** | Security. LLM must never see credentials. This is the entire security model. |
| 3 | **Playwright navigation + form filling** | Core capability. Navigate to site, fill fields, click buttons. |
| 4 | **Screenshot capture + AI vision verification** | Safety. Agent must verify what it sees before acting. Prevents blind submissions. |
| 5 | **Telegram approval gate** | Non-negotiable for financial actions. Leverages existing Telegram bot. |
| 6 | **Error detection + graceful failure** | Agent must fail safely, never submit garbage or pay wrong amounts. |
| 7 | **Task-based sub-agent spawning** | Isolation. Browser agent should not have full context; research agent should not have browser access. |
| 8 | **Role-specialized agent definitions** | Minimum 3 roles: browser-automator, researcher, financial-analyst. |
| 9 | **Sequential task chains** | Bill pay workflow is inherently sequential: research -> auth -> navigate -> fill -> verify -> approve -> submit. |
| 10 | **One working bill pay workflow** (e.g., Duke Energy) | Proof of concept. One end-to-end workflow validates the entire architecture. |

### Ship to Differentiate

| # | Feature | Rationale |
|---|---------|-----------|
| 11 | **Business profile as structured data** | Store once, reuse everywhere. Immediate value for grant applications. |
| 12 | **Structured research storage** | Research findings queryable by entity + field. Foundation for grant automation. |
| 13 | **Research recall during form-filling** | Agent auto-populates grant applications from stored research. Key value prop. |
| 14 | **Confirmation screenshot to Telegram** | Low effort, massive trust. "Here's what I'm about to submit." |
| 15 | **Parallel sub-agent execution** | Research 3 grants simultaneously. Claude Code supports this natively. |
| 16 | **Visual page understanding** | Layout-resistant automation. The reason to use AI instead of Selenium scripts. |

### Defer to v6.0+

| Feature | Why Defer |
|---------|-----------|
| **Workflow recording and replay** | Requires defining a workflow schema, recording UX, replay engine. Build manual workflows first, then automate the automation. |
| **Scheduled autonomous workflows** | Needs battle-tested workflows before running them unattended. Get bill pay reliable manually-triggered first. |
| **Adaptive retry with layout detection** | Optimization. Start with simple retry + Telegram notification on failure. |
| **Agent skill porting from A0** | Important but not blocking. Visopscreen/crypto skills can wait. Core v5.0 value is browser automation + vault. |
| **Grant eligibility pre-screening** | Nice to have. Jon can manually verify eligibility faster than building a rules engine. |
| **Multi-site session management** | Optimization. Handle sites one at a time in v5.0. Parallelize later. |
| **Corporate credit applications** | Groundwork only in v5.0. These require extensive business documentation that needs research-as-library first. |

---

## Real-World Patterns and Lessons from the Community

### What People Are Actually Building (2026)

1. **Skyvern** (open source, $2.7M raised): Planner-Actor-Validator architecture for browser automation. Key lesson: validation layer is critical -- LLMs hallucinate and get stuck. Screenshot verification before and after every action.

2. **OpenClaw** (trending on HackerNews 2026): DIY automation tool with Bitwarden skill integration. Uses Playwright to control real browser. Community-built skills marketplace.

3. **Bitwarden MCP Server** (official, July 2025): Bitwarden's own MCP server for AI agent credential management. Local-first, zero-knowledge. This is the blessed path for credential injection.

4. **Playwright MCP Secrets** (v0.0.37, March 2026): Microsoft added built-in secret management to Playwright MCP. Placeholder tokens resolved server-side. Directly addresses the "LLM should never see passwords" requirement.

5. **Privacy.com AI Agent Payments** (2026): Virtual cards for AI agent transactions. Interesting but overkill for personal bill pay where you use your own payment methods on file.

### Community Consensus (Reddit/HN/IndieHackers)

- **Start with one specific workflow, not a general agent.** Every community discussion agrees: narrow scope first, expand later.
- **Human approval for money is non-negotiable.** No production system lets AI autonomously spend money without confirmation.
- **Screenshot-based verification beats DOM parsing.** AI vision understanding pages visually is more robust than CSS selectors.
- **Credential vaults are table stakes.** Nobody serious stores passwords in env vars or config files for agent automation.
- **CAPTCHA is the hard problem nobody has solved cleanly.** Best approach: pause and ask the human.

### The Planner-Actor-Validator Pattern

The dominant architecture in production browser agents (2026):

1. **Planner**: Holds high-level goal ("Pay Duke Energy bill"). Decomposes into steps.
2. **Actor**: Executes immediate browser actions (navigate, click, fill). Uses vision to understand the page.
3. **Validator**: Screenshots after each action. Confirms action worked. Catches errors before they propagate.

This maps cleanly to Jarvis's sub-agent model: Planner = orchestrator agent, Actor = browser-automator agent, Validator = verification step within the browser agent.

---

## Sources

### Browser Automation
- [Skyvern - AI Browser Automation](https://github.com/Skyvern-AI/skyvern) -- Planner-Actor-Validator architecture
- [Skyvern 2.0 - State of the Art Web Navigation](https://www.skyvern.com/blog/skyvern-2-0-state-of-the-art-web-navigation-with-85-8-on-webvoyager-eval/)
- [Stagehand vs Playwright AI vs Browser Use (2026)](https://www.pkgpulse.com/blog/stagehand-vs-playwright-ai-vs-browser-use-ai-web-automation-2026)
- [Top 10 Browser AI Agents 2026](https://o-mega.ai/articles/top-10-browser-use-agents-full-review-2026)
- [Agent-Browser - AI-First Browser Automation](https://pub.spillwave.com/agent-browser-ai-first-browser-automation-that-saves-93-of-your-context-window-7a2c52562f8c)

### Credential Security
- [Bitwarden MCP Server - Official Blog](https://bitwarden.com/blog/bitwarden-mcp-server/)
- [Bitwarden MCP Server - GitHub](https://github.com/bitwarden/mcp-server)
- [Playwright MCP Issue #922 - Placeholder Resolution (RESOLVED)](https://github.com/microsoft/playwright-mcp/issues/922)
- [Secure Credential Management in Playwright (2026)](https://medium.com/@sajith-dilshan/secure-credential-management-in-playwright-0cf75c4e2ff4)
- [Vault + Playwright Pattern](https://medium.com/@mhabiib/securing-your-automation-workflow-with-vault-using-playwright-25742bbf43aa)

### Sub-Agent Orchestration
- [Claude Code Custom Subagents - Official Docs](https://code.claude.com/docs/en/sub-agents)
- [Claude Agent SDK - Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [Task Tool vs Subagents](https://amitkoth.com/claude-code-task-tool-vs-subagents/)
- [Claude Code Agent Teams Guide (2026)](https://claudefa.st/blog/guide/agents/agent-teams)
- [Multi-Agent Orchestration for Claude Code (2026)](https://shipyard.build/blog/claude-code-multi-agent/)

### Research-as-Library
- [PlugMem - Microsoft Research - Reusable Knowledge for AI Agents](https://www.microsoft.com/en-us/research/blog/from-raw-interaction-to-reusable-knowledge-rethinking-memory-for-ai-agents/)
- [AI Agents for Grant Applications - StackAI](https://www.stackai.com/insights/ai-agents-for-nonprofits-automate-grant-applications-donor-research-and-impact-reporting)
- [Grantable - AI Grant Writing](https://www.grantable.co/)

### Financial Agent Safety
- [AI Agent Payment Solutions (2026)](https://www.privacy.com/blog/payment-solutions-ai-agents-2026-compared)
- [AI Assistants Moving Security Goalposts - Krebs on Security](https://krebsonsecurity.com/2026/03/how-ai-assistants-are-moving-the-security-goalposts/)
- [Human-in-the-Loop to Human-on-the-Loop](https://bytebridge.medium.com/from-human-in-the-loop-to-human-on-the-loop-evolving-ai-agent-autonomy-c0ae62c3bf91)
- [HackerNews - Autonomous Agents: What Actually Works](https://news.ycombinator.com/item?id=44623207)

### CAPTCHA and 2FA Challenges
- [CAPTCHA Bypass for AI Browser Automation - Skyvern](https://www.skyvern.com/blog/best-way-to-bypass-captcha-for-ai-browser-automation-september-2025/)
- [2026 Guide to Solving Modern CAPTCHA for AI Agents](https://www.capsolver.com/blog/web-scraping/2026-ai-agent-captcha)
- [Best 2FA Browser Automation Tools (2025)](https://www.skyvern.com/blog/best-2fa-browser-automation-tools-for-enterprise-workflows-november-2025/)
