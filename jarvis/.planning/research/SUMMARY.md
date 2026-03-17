# Project Research Summary

**Project:** Jarvis v5.0 — Agent Unification
**Domain:** Autonomous life agent — browser automation, vault-backed credentials, sub-agent orchestration, research-as-library
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

Jarvis v5.0 is the migration from a conversational life assistant to a fully autonomous execution agent — one that can log into websites, pay bills, fill grant applications, and manage Jon's administrative life during 12-14 hour hospital shifts. The research is unambiguous on the approach: use Playwright MCP for browser control, Bitwarden MCP for credential injection, Claude Agent SDK for sub-agent orchestration, and SQLite + Drizzle for research storage — all on top of the existing Jarvis v4.x infrastructure. The core innovation is a security model where credentials flow through MCP tool calls only and the LLM never sees raw secret values. This opaque bridge pattern is the single most important architectural constraint for the entire milestone.

The recommended build uses official MCP servers for both browser automation (`@playwright/mcp`, already configured in `.mcp.json`) and vault integration (`@bitwarden/mcp-server`, to be added), with sub-agents defined programmatically via the Claude Agent SDK `agents` parameter. This approach requires minimal new infrastructure: only 3 new production packages (playwright, croner, p-queue) plus a required SDK migration from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk`. Research-as-library and the flexible scheduler add zero external dependencies, building on existing SQLite + Drizzle schemas. The entire architecture extends the current v4.x codebase incrementally — no rewrites, mostly additive changes to a small set of files.

The highest risks are credential exposure (catastrophic and irreversible), financial automation without proper human approval gates (real money lost), and bot detection blocking financial sites (some sites will never be automatable). The mitigation strategy is the same for all three: the Planner-Actor-Validator pattern with mandatory Telegram approval before every financial action, an opaque vault bridge that never surfaces credentials to the LLM context, and graceful failure with human escalation rather than stealth bypass attempts. Research also flagged a critical SDK migration that must happen before any other v5.0 work begins — the old package is renamed and will stop receiving updates.

---

## Key Findings

### Recommended Stack

The existing Jarvis v4.x stack (Claude Agent SDK, Next.js 15, grammY, Deepgram, AWS Polly, SQLite/Drizzle, PM2) is validated and not re-evaluated. The v5.0 additions are minimal.

**The most important pre-work is migrating from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk` (v0.2.76).** The old package has been renamed and will stop receiving updates. This migration has three breaking changes: system prompt no longer loads by default (must pass explicitly), settings sources no longer load by default, and the `agents` parameter for sub-agent spawning only exists in the new package.

**Core new technologies:**
- `playwright` (^1.58.2): Browser control via Playwright MCP — Microsoft-backed, TypeScript-native, auto-wait eliminates flaky selectors, already partially configured in `.mcp.json`
- `@bitwarden/mcp-server`: Vault credential retrieval via official Bitwarden MCP server — local-only, zero-knowledge, handles session management, no custom wrapper needed
- `croner` (^9.0.0): Replaces `node-cron` — 1.5M weekly downloads vs 736K, built-in timezone support, zero dependencies, used by PM2 itself
- `p-queue` (^8.0.1): Concurrency control for parallel browser sessions — prevents opening 10 bill pay tabs simultaneously

**Not needed (zero new deps):** Sub-agent spawning is built into claude-agent-sdk. Research-as-library extends existing SQLite schema. Custom MCP tools use SDK-native `createSdkMcpServer`.

**Explicitly avoid:** Stagehand (abstraction tax, not needed for known workflows), browser-use TS port (immature, conflicting LLM orchestration), LangChain (50+ transitive deps, zero value here), Skyvern cloud (cost, latency, vendor lock-in when Playwright + Claude runs locally), building a custom vault service (Bitwarden MCP is the supported path).

See `STACK.md` for complete installation commands and version compatibility matrix.

### Expected Features

The feature research distinguishes sharply between what is required for safety and what is aspirational. Missing table stakes features means the system is unsafe, not just incomplete.

**Must have (table stakes):**
- Bitwarden vault integration (unlock, retrieve, TOTP, lock) — nothing else works without credentials
- Placeholder resolution where LLM never sees raw secrets — the entire security model
- Playwright navigation + form filling — core execution capability
- Screenshot capture + AI vision verification — prevents blind submissions
- Telegram approval gate before any financial action — mandatory, no exceptions
- Error detection and graceful failure — agent must never submit garbage data
- Task-based sub-agent spawning with role specialization (browser-worker, form-filler, researcher)
- Sequential task chains — bill pay is inherently sequential (research → auth → fill → verify → approve → submit)
- One working end-to-end bill pay workflow — proof-of-concept validates the full architecture

**Should have (differentiators):**
- Business profile as structured data (store once, reuse across all applications)
- Structured research storage with typed fields (entity, field, value, source, confidence)
- Research recall during form-filling (agent auto-populates grant applications from stored findings)
- Confirmation screenshot to Telegram before any submission
- Parallel sub-agent execution (research 3 grants simultaneously — native to SDK)
- Visual page understanding via screenshot + AI vision (layout-resistant over CSS selectors)

**Defer to v6.0+:**
- Workflow recording and replay (requires battle-tested manual workflows first)
- Scheduled autonomous workflows (needs manual-trigger reliability proven first)
- Adaptive retry with layout detection (start with simple retry + Telegram escalation)
- Agent skill porting from Agent Zero (Visopscreen/crypto can wait)
- Corporate credit applications (research library groundwork only in v5.0)

**Anti-features (never build):**
- Fully autonomous financial transactions without human approval — industry consensus is absolute on this
- Credentials in LLM context or conversation history — Krebs on Security 2026 specifically cites this attack vector
- CAPTCHA solving — pause and escalate to Jon instead (human-assisted CAPTCHA is faster than any solver)
- General-purpose "do anything on any website" browser agent — define specific workflow templates per site
- Real-time browser streaming to web UI — screenshots at key moments via Telegram is sufficient

See `FEATURES.md` for full feature dependency tree and community pattern analysis.

### Architecture Approach

The architecture is primarily additive changes to existing v4.x components. The core pattern is MCP-first: prefer official MCP servers over custom wrappers. Sub-agents are defined programmatically via the Claude Agent SDK `agents` parameter with restricted tool sets matching their role (researcher never gets vault access; form-filler never gets research write access; browser-worker has read-only tools). The approval gateway is deliberately asynchronous — the initial task completes after requesting Telegram approval, and a callback triggers a new SDK session to resume, avoiding burning rate limits during human response wait time.

**Major components:**
1. **ccodeBrain.ts (significant modification)** — adds `agents` parameter with 3 sub-agent definitions, adds `'Agent'` and `mcp__playwright__*` and `mcp__bitwarden__*` to allowed tools
2. **approval/approvalGateway.ts (new)** — Telegram approval flow, inline keyboards, screenshot attachment, 4-hour timeout, async resume via new SDK session on callback
3. **research/researchStore.ts (new)** — SQLite `research_topics` + `research_findings` tables, MCP tools (save, search, list, get, archive), reuses existing `vectorSearch.ts`
4. **scheduler/taskStore.ts (new)** — SQLite `scheduled_tasks` table replacing hardcoded cron, hot-reload on DB changes, existing hardcoded tasks migrated as `system: true` records
5. **toolBridge.ts (moderate modification)** — adds research, scheduler, approval tool categories following existing 5-way routing pattern exactly
6. **.mcp.json (minor modification)** — adds `@bitwarden/mcp-server` entry with `BW_SESSION` env var
7. **telegram/bot.ts (minor modification)** — adds approval callback handlers (`approval:approve:{id}`, `approval:reject:{id}`, `approval:modify:{id}`) and photo message support
8. **cronRunner.ts (moderate modification)** — replaces hardcoded `cron.schedule()` calls with dynamic task loading from DB, hot-reload capability

**Components requiring no changes:** `ecosystem.config.js` (MCP servers are SDK-spawned, not PM2 processes), `sdkBrain.ts`, `evaluator.ts`, `reflectionLoop.ts`.

See `ARCHITECTURE.md` for full data flow diagrams for bill pay and grant application workflows.

### Critical Pitfalls

1. **LLM sees raw credentials during browser automation** — The most dangerous failure mode. Build vault integration as an opaque tool: LLM calls `fill_credentials(site_id)`, never receives credential values. Tool internally unlocks Bitwarden, fetches credentials, calls `page.fill()`, returns only success/failure. Implement canary credential test. This must be verified before any browser automation ships. Recovery cost is HIGH (rotate all credentials, purge memory, audit logs for exfiltration).

2. **Bitwarden CLI session token silently expires mid-task** — Default timeout is 1 hour, sometimes 15 minutes. CLI does not warn on expiry — commands simply fail or return empty results. API key and master password unlock are two separate steps. Build vault wrapper that calls `bw status` before every credential fetch and re-unlocks if needed. Never assume session is valid.

3. **Financial sites detect and block Playwright automation** — Banks and utility portals actively detect CDP-connected browsers. Do not attempt stealth bypasses — this is an arms race you will lose. Use headed mode on Windows (not headless), persistent browser profiles, human-like delays (50-200ms between keystrokes). Accept that some sites will not be automatable; build graceful fallback notification pattern from day one.

4. **Agent submits wrong or duplicate payment** — LLMs occasionally misread amounts; retry logic can re-submit. Implement: mandatory Telegram approval with screenshot before any submission, idempotency check against payment ledger, never-retry policy on payment submissions, dry-run mode that stops before the final submit button. Recovery cost is MEDIUM (contact billing company, takes days to resolve).

5. **Sub-agent token explosion burns Max plan limits** — Each sub-agent subprocess re-injects full system prompt (~50K tokens) by default. With 40+ MCP tools in scope, a single subprocess turn consumes ~50K tokens before doing work. Mitigation: pass `--system-prompt` with only relevant context, limit MCP tools per sub-agent to role requirements, monitor per-subprocess token usage with alerts.

---

## Implications for Roadmap

The dependency chain from ARCHITECTURE.md and the pitfall-to-phase mapping from PITFALLS.md converge on a clear 5-phase structure.

### Phase 1: Foundation and Migration

**Rationale:** Zero external dependencies — pure refactoring and schema work. The SDK migration unblocks sub-agents. New DB schemas must exist before any new features write to them. A0 code removal reduces dead weight. This phase de-risks the entire milestone before any external service integration begins.
**Delivers:** SDK migrated to `@anthropic-ai/claude-agent-sdk`, repo migrated to standalone structure, `research_topics`/`research_findings`/`scheduled_tasks`/`pending_approvals` schemas added and migrated, `cronRunner.ts` rewritten for dynamic task loading, Agent Zero routing removed from `chatProcessor.ts`
**Addresses:** SDK breaking changes, repo migration, research schema, scheduler schema, A0 sunset groundwork
**Avoids:** PM2 path caching pitfall (re-register from new path, run `pm2 save`); building on SDK that won't receive updates

### Phase 2: Vault Integration

**Rationale:** Security foundation must exist and be verified in isolation before browser automation is built on top of it. If the credential exposure bug exists and browser automation is already shipping, the blast radius is much larger.
**Delivers:** Bitwarden MCP in `.mcp.json`, BW_SESSION startup unlock flow with session wrapper, vault service wrapper with status check + re-unlock, canary credential test passing, `BW_SESSION` properly propagated to PM2 environment
**Addresses:** Table stakes: vault unlock/lock, credential retrieval by service name, TOTP/2FA retrieval, placeholder resolution, session management
**Avoids:** Pitfall 1 (credential exposure), Pitfall 2 (session expiration); sub-agents having vault access by design (tool restriction designed in this phase)

### Phase 3: Browser Automation Engine

**Rationale:** Browser capabilities require vault (credentials needed for login flows). Build browser tools once the secure credential bridge is verified. Graceful failure design goes in from day one — not as an afterthought after a real failure embarrasses you.
**Delivers:** Playwright MCP access in `ccodeBrain.ts`, three sub-agent definitions (browser-worker, form-filler, researcher) with restricted tool sets, screenshot + AI vision verification utilities, error detection + Telegram escalation on failure, human-like delay utilities, headed mode configured on Windows
**Addresses:** Table stakes: Playwright navigation, form filling, screenshot capture, error detection, sub-agent spawning and role specialization
**Avoids:** Pitfall 3 (bot detection) — headed mode and delay utilities built from day one; Pitfall 5 (token explosion) — sub-agent prompts scoped, tool lists restricted; Anti-pattern 1 (no custom browserEngine.ts wrapper)

### Phase 4: Approval Gateway and End-to-End Workflows

**Rationale:** The safety layer must exist before any real-world automation runs with real money. Once the gateway is in place, wire everything together into working workflows. This is the value delivery phase.
**Delivers:** `approvalGateway.ts` with async Telegram callback pattern, Telegram bot approval callbacks with screenshot support, one working bill pay workflow (e.g., Duke Energy), dry-run mode, research workflow (researcher sub-agent + research store), business profile as structured data, confirmation screenshot to Telegram, payment ledger with idempotency check
**Addresses:** Table stakes: approval gate, one working bill pay workflow; Differentiators: business profile, research storage, research recall, confirmation screenshots
**Avoids:** Pitfall 4 (duplicate/wrong payment) — payment ledger, idempotency, dry-run mode; Anti-pattern 4 (polling for approval) — async callback pattern with new SDK session on resume

### Phase 5: Agent Zero Sunset

**Rationale:** Only after Phase 4 verifies all critical capabilities end-to-end should Agent Zero be decommissioned. Running both in parallel during verification reduces risk. A0 skills cannot be ported using A0's format — each requires a rewrite for Claude Code agent markdown format.
**Delivers:** Complete A0 skills audit with explicit disposition for each of the 20+ skills (ported / dropped / not needed), all 5 A0 scheduled tasks migrated as DB records with `system: true`, Visopscreen and crypto skills ported or explicitly deferred, A0 container and Cloudflare tunnel decommissioned
**Addresses:** A0 skill gap checklist, scheduled task port, cost elimination (per-token billing eliminated)
**Avoids:** Premature decommission before capability parity is confirmed

### Phase Ordering Rationale

- Phase 1 first because it has no external dependencies and the SDK migration blocks sub-agents (Phase 3 requirement)
- Phase 2 before Phase 3 because browser login flows require credentials; credential security must be verified before browser workflows are built on it
- Phase 3 before Phase 4 because you need real browser actions to test what the approval gateway is protecting
- Phase 4 integrates all three prior phases; attempting earlier means debugging three simultaneous unknowns
- Phase 5 is cleanup after Phase 4 confirms parity; doing it earlier means risking capability loss before the replacement is proven

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Vault Integration):** BW_SESSION lifecycle on Windows + PM2 process isolation needs concrete testing. Exact implementation of master password storage for automated unlock (Windows Credential Manager vs env var) needs decision during planning.
- **Phase 3 (Browser Automation Engine):** Target bill pay sites need individual reconnaissance. Bot detection behavior varies per site and requires empirical testing against actual sites before committing to a workflow design.
- **Phase 4 (End-to-End Workflows):** Grant application form structures are site-specific. Research-as-library schema may need field additions after reviewing real grant application forms.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation and Migration):** SDK migration steps are documented. Schema additions follow existing Drizzle conventions. Repo migration is a standard `git filter-repo` operation.
- **Phase 5 (A0 Sunset):** Skill audit is inventory work. The pattern for translating A0 SKILL.md to Claude Code agent markdown is documented.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs verified for all core recommendations. SDK migration breaking changes are documented by Anthropic. Playwright and Bitwarden MCP are official packages from their maintainers. |
| Features | MEDIUM-HIGH | Table stakes have strong community consensus. Differentiator features are well-understood patterns (CrewAI, Skyvern, Google EverMem). Defer list is opinionated but defensible. |
| Architecture | HIGH | Verified against existing Jarvis v4.x source code. MCP-first pattern follows official SDK documentation. Component boundaries align with established codebase conventions. |
| Pitfalls | HIGH | Critical pitfalls sourced from OWASP Agentic Top 10, official Bitwarden community issues, Playwright maintainer docs, production reports. Financial safety pitfalls have industry-wide consensus. |

**Overall confidence:** HIGH

### Gaps to Address

- **playwright-extra stealth plugin compatibility with Playwright 1.58:** Single source, untested. Only relevant if bot detection forces stealth mode. Address empirically during Phase 3 if needed.
- **p-queue ESM-only behavior in Jarvis's CJS/ESM mixed project:** May require dynamic import. Address during Phase 3 dependency installation.
- **Windows 8191-char command line limit for sub-agent prompts:** Mentioned in Anthropic docs but not empirically confirmed. Mitigation is straightforward (keep prompts under ~6000 chars or use filesystem-based agent markdown files). Verify during Phase 3.
- **Exact BW_SESSION propagation to PM2 processes on Windows:** Current understanding is each PM2 process needs its own session via wrapper, but the concrete implementation for Windows + PM2 needs validation during Phase 2 planning.
- **Per-site bot detection behavior:** Cannot be assessed without testing against actual sites. Must be discovered empirically in Phase 3 before committing to a workflow design per provider.

---

## Sources

### Primary (HIGH confidence)
- [Claude Agent SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) — breaking changes, `agents` parameter, system prompt defaults
- [Claude Agent SDK Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents) — AgentDefinition API, tool restrictions, context isolation
- [Claude Agent SDK Custom Tools](https://platform.claude.com/docs/en/agent-sdk/custom-tools) — `createSdkMcpServer`, `tool()` helper, Zod schemas
- [Playwright Official Docs](https://playwright.dev/) — v1.58.2, accessibility tree, browser lifecycle
- [Bitwarden MCP Server - GitHub](https://github.com/bitwarden/mcp-server) — official package, security model, local-only constraint
- [Playwright MCP Server - GitHub](https://github.com/microsoft/playwright-mcp) — accessibility tree snapshots, 25+ browser tools
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) — agent security pitfalls framework
- Existing Jarvis source code — ccodeBrain.ts, chatProcessor.ts, toolBridge.ts, cronRunner.ts, data/schema.ts, .mcp.json

### Secondary (MEDIUM confidence)
- [Playwright MCP vs CLI benchmarks](https://bug0.com/blog/playwright-mcp-changes-ai-testing-2026) — 114K vs 27K tokens per task
- [Skyvern 2.0 - Planner-Actor-Validator architecture](https://www.skyvern.com/blog/skyvern-2-0-state-of-the-art-web-navigation-with-85-8-on-webvoyager-eval/) — production browser agent patterns
- [Best Node.js Schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) — croner vs node-cron feature comparison
- [Why Claude Code Subagents Waste 50K Tokens Per Turn](https://dev.to/jungjaehoon/why-claude-code-subagents-waste-50k-tokens-per-turn-and-how-to-fix-it-41ma) — token explosion mitigation
- [Bitwarden CLI Session Expiration](https://community.bitwarden.com/t/cli-session-expiration/43611) — session timeout behavior, re-authentication
- [Playwright MCP Issue #922](https://github.com/microsoft/playwright-mcp/issues/922) — placeholder resolution for credentials (resolved in v0.0.37)
- [Krebs on Security: AI Assistants Moving Security Goalposts](https://krebsonsecurity.com/2026/03/how-ai-assistants-are-moving-the-security-goalposts/) — credential exposure via LLM context
- [CrewAI Knowledge Sources](https://docs.crewai.com/en/concepts/knowledge) — structured research storage patterns

### Tertiary (LOW confidence, needs validation)
- playwright-extra stealth plugin compatibility with Playwright 1.58 — single source, untested
- p-queue ESM-only behavior in mixed CJS/ESM Next.js projects — may require dynamic import
- Windows 8191-char command line limit for sub-agent prompts — mentioned in Anthropic docs, not empirically confirmed

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
