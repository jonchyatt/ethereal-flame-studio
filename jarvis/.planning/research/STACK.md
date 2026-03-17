# Stack Research: v5.0 New Capabilities

**Domain:** Browser automation, vault integration, sub-agent spawning, research-as-library for autonomous life agent
**Researched:** 2026-03-16
**Confidence:** HIGH (official docs verified for all core recommendations)

**Scope:** Only NEW stack additions for v5.0. Existing validated stack (Claude Agent SDK, Next.js 15, Telegram/grammy, Deepgram, AWS Polly, SQLite, node-cron, PM2) is not re-evaluated.

---

## Critical Migration: Claude Code SDK to Claude Agent SDK

The `@anthropic-ai/claude-code` package has been **renamed** to `@anthropic-ai/claude-agent-sdk`. This is not optional -- the old package will stop receiving updates.

| Aspect | Old | New |
|--------|-----|-----|
| Package | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Version | `^0.0.42` | `^0.2.76` |
| Import | `from "@anthropic-ai/claude-code"` | `from "@anthropic-ai/claude-agent-sdk"` |

**Breaking changes to handle:**
1. System prompt no longer loads by default -- must pass `systemPrompt` explicitly or use `{ type: "preset", preset: "claude_code" }`
2. Settings sources (CLAUDE.md, settings.json) no longer loaded by default -- must pass `settingSources: ["user", "project", "local"]`
3. Python: `ClaudeCodeOptions` renamed to `ClaudeAgentOptions` (TypeScript API unchanged)

**Action:** `npm uninstall @anthropic-ai/claude-code && npm install @anthropic-ai/claude-agent-sdk`

---

## Recommended Stack Additions

### 1. Browser Automation Engine

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `playwright` | `^1.58.2` | Browser control (navigate, click, fill, submit) | Microsoft-backed, TypeScript-first, auto-wait eliminates flaky selectors, single API for Chromium/Firefox/WebKit. Already proven in Agent Zero's browser agent. |
| `@playwright/mcp` | `latest` | MCP server exposing 25+ browser tools to Claude | Official Microsoft package. Uses accessibility tree snapshots (2-5KB) instead of screenshots, 10-100x faster than vision-based approaches. But see note below. |

**Architecture Decision: Playwright directly vs. Stagehand vs. browser-use**

Use **Playwright directly** with custom tool wrappers, not Stagehand or browser-use. Here's why:

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **Playwright direct** | **USE THIS** | Full control, no abstraction tax, TypeScript-native, 1.58.2 is battle-tested. You control the page lifecycle, credential injection, and error handling. |
| Stagehand v3.1 | Skip | Adds act()/extract()/observe() natural language layer. Elegant for general web scraping, but for bill pay you need deterministic control over login flows, not AI-guessing which button to click. Stagehand's value is layout-resistance -- your bill pay targets are known sites with stable UIs. |
| browser-use (TS port) | Skip | Python-first, TS port is v0.5.11 alignment only. Immature for production Node.js. Also brings its own LLM orchestration that conflicts with Claude Agent SDK. |
| @playwright/mcp | Consider for research only | Great for ad-hoc browsing tasks (research, exploration). But for bill pay workflows, you want typed tool functions with explicit error handling, not generic MCP browser tools. Token cost: MCP uses ~114K tokens per task vs ~27K for direct CLI/code. |

**Key Insight from 2026 ecosystem:** The Playwright team added a CLI mode specifically for coding agents, and benchmarks show direct code is 4x more token-efficient than MCP for structured tasks. Use @playwright/mcp for research-as-library exploration tasks, Playwright direct for bill pay/form-fill.

**Installation:**
```bash
npm install playwright
npx playwright install chromium  # Only need Chromium for bill pay
```

### 2. Credential Vault (Bitwarden)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@bitwarden/cli` | `2026.2.0` | Vault credential retrieval | Free, CLI-accessible, outputs JSON. The LLM never sees passwords -- Node.js child_process calls `bw get item <id>`, parses JSON, injects into Playwright page.fill(). |

**Why NOT the Bitwarden SDK (`@bitwarden/sdk-internal`):** The internal SDK is Rust/WASM, designed for Bitwarden's own web clients, and not documented for third-party use. The CLI is the supported programmatic interface.

**Architecture Pattern: Secure Bridge**

```typescript
// secure-bridge.ts -- THE key missing piece identified in prior research
import { execSync } from 'child_process';

interface Credential {
  username: string;
  password: string;
  uri: string;
  totp?: string;
}

export async function getCredential(itemName: string): Promise<Credential> {
  // 1. Ensure vault is unlocked (session key from env)
  const sessionKey = process.env.BW_SESSION;
  if (!sessionKey) throw new Error('Bitwarden vault locked');

  // 2. Retrieve item -- LLM never sees this output
  const raw = execSync(
    `bw get item "${itemName}" --session "${sessionKey}"`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const item = JSON.parse(raw);

  return {
    username: item.login.username,
    password: item.login.password,
    uri: item.login.uris?.[0]?.uri ?? '',
    totp: item.login.totp ?? undefined,
  };
}

export async function injectCredentials(
  page: import('playwright').Page,
  credential: Credential
): Promise<void> {
  // 3. Fill form fields -- values pass through Playwright, never through LLM
  await page.fill('[type="email"], [name="username"], #username', credential.username);
  await page.fill('[type="password"], [name="password"], #password', credential.password);
}
```

**Critical security constraint:** The `getCredential` and `injectCredentials` functions must be called from Node.js process code, NOT from within a Claude Agent SDK tool handler. The tool handler tells Claude "credentials injected successfully" without ever exposing the values.

**Installation:**
```bash
npm install -g @bitwarden/cli
# Or use npx: npx @bitwarden/cli login
```

**Session management:** Bitwarden CLI requires unlock before use. For PM2-managed Jarvis, unlock on process start and store `BW_SESSION` in memory (not disk). Re-unlock on restart.

### 3. Sub-Agent Spawning

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@anthropic-ai/claude-agent-sdk` | `^0.2.76` | Sub-agent spawning with role specialization | Native subagent support via `agents` parameter. Each subagent gets fresh context, restricted tools, and optional model override. Runs on Max plan (free). |

**No additional packages needed.** Sub-agent spawning is built into the Claude Agent SDK. Key capabilities:

- **Programmatic definition:** Define agents inline with `AgentDefinition` (description, prompt, tools, model)
- **Context isolation:** Each subagent gets fresh context window. Parent receives only final result.
- **Tool restriction:** Subagents can be limited to specific tools (e.g., read-only research agent)
- **Model override:** Per-subagent model selection (`"sonnet"`, `"opus"`, `"haiku"`, `"inherit"`)
- **Parallel execution:** Multiple subagents run concurrently
- **Session resumption:** Subagents can be resumed via session ID + agent ID
- **Custom in-process tools:** `createSdkMcpServer` + `tool()` helper for typed tool definitions with Zod schemas

**Jarvis-specific agent definitions:**

```typescript
const jarvisAgents = {
  "bill-payer": {
    description: "Handles bill payment workflows via browser automation. Use when paying bills, checking balances, or managing utility accounts.",
    prompt: `You are a bill payment specialist. You have access to browser automation tools.
CRITICAL: Never attempt to read or log credentials. Use the inject_credentials tool which handles this securely.
Always verify amounts before submitting payments. Request Telegram approval for any payment.`,
    tools: ["Read", "Bash", "mcp__browser__*", "mcp__vault__inject_credentials"],
    model: "sonnet"
  },
  "researcher": {
    description: "Deep research specialist. Use for grant research, credit application research, or any multi-source investigation.",
    prompt: `You are a research specialist. Gather information from multiple sources, synthesize findings, and store structured results for later retrieval.`,
    tools: ["Read", "Grep", "Glob", "Bash", "mcp__browser__*", "mcp__research__*"],
    model: "sonnet"
  },
  "form-filler": {
    description: "Expert at filling web forms using stored research and credentials. Use for grant applications, credit applications, or any structured web form.",
    prompt: `You are a form-filling specialist. Use stored research data to populate form fields accurately. Always request approval before final submission.`,
    tools: ["Read", "Bash", "mcp__browser__*", "mcp__vault__*", "mcp__research__recall"],
    model: "sonnet"
  }
};
```

**Windows gotcha:** Subagents with very long prompts may fail due to Windows command line length limits (8191 chars). Keep prompts under ~6000 chars or use filesystem-based agents (`.claude/agents/` markdown files).

### 4. Research-as-Library

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Existing SQLite + Drizzle | (already in stack) | Structured research storage | No new dependency. Add a `research_entries` table to existing DB. SQLite + FTS5 handles keyword search; existing BM25 + semantic hybrid retrieval applies. |
| `createSdkMcpServer` | (part of claude-agent-sdk) | Expose research tools to Claude | Define `save_research`, `recall_research`, `list_research` as custom MCP tools. Claude can store and retrieve structured findings during conversations. |

**No new packages needed.** Research-as-library is an application pattern built on existing SQLite + Claude Agent SDK custom tools.

**Schema addition:**
```typescript
export const researchEntries = sqliteTable('research_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domain: text('domain').notNull(),        // 'grant', 'credit', 'bill', 'business'
  topic: text('topic').notNull(),           // 'Verizon Digital Ready Grant'
  fieldName: text('field_name'),            // 'business_ein', 'annual_revenue'
  fieldValue: text('field_value'),          // '12-3456789', '$50,000'
  source: text('source'),                   // URL or document reference
  confidence: real('confidence').default(1.0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  tags: text('tags'),                       // JSON array
});
```

**Usage pattern:** Researcher subagent gathers grant requirements, stores each field in `research_entries`. Later, form-filler subagent queries `recall_research({ domain: 'grant', topic: 'Verizon Digital Ready' })` and gets structured field/value pairs to populate the application form.

### 5. Flexible Scheduled Task System

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `croner` | `^9.0.0` | Cron scheduling with timezone support | Replaces node-cron. 1.5M weekly downloads, used by PM2 itself, supports timezone targeting natively, works in both Node and browser. Lightweight (zero deps). |

**Why replace node-cron with croner:**

| Feature | node-cron | croner |
|---------|-----------|--------|
| Weekly downloads | 736K | 1.5M |
| Timezone support | Manual | Built-in |
| Pattern validation | Basic | Rich validation + next-run preview |
| Used by | General projects | PM2, Uptime Kuma, ZWave JS |
| Dependencies | 1 | 0 |
| Cron expression | Standard | Extended (seconds, @yearly, etc.) |

**Task configuration pattern:**
```typescript
interface ScheduledTask {
  id: string;
  name: string;
  cron: string;           // '0 8 * * *' (daily 8am)
  timezone: string;       // 'America/New_York'
  enabled: boolean;
  handler: string;        // 'bill-check', 'morning-briefing', 'memory-decay'
  config: Record<string, unknown>;
  lastRun?: string;
  nextRun?: string;
}
```

Store task definitions in SQLite (not hardcoded). CRUD via Telegram commands or web UI. This absorbs Agent Zero's 5 scheduled tasks and adds dynamic task management.

**Installation:**
```bash
npm install croner
npm uninstall node-cron @types/node-cron  # Replace, don't layer
```

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^3.24` | Schema validation for custom MCP tools | Already in stack. Used with `createSdkMcpServer` `tool()` helper for type-safe tool definitions. |
| `p-queue` | `^8.0.1` | Concurrency control for browser tasks | Rate-limit parallel browser operations. Prevents opening 10 bill pay tabs simultaneously. |
| `playwright-extra` | `^4.3.6` | Stealth plugin for Playwright | Only if bill pay sites detect and block automation (unlikely for authenticated sessions, but good fallback). |
| `puppeteer-extra-plugin-stealth` | `^2.11.2` | Anti-detection measures | Pairs with playwright-extra. Use only if needed. |

---

## Installation Summary

### Required for v5.0
```bash
# Migration (MUST DO FIRST)
npm uninstall @anthropic-ai/claude-code
npm install @anthropic-ai/claude-agent-sdk

# Browser automation
npm install playwright
npx playwright install chromium

# Scheduler upgrade
npm uninstall node-cron @types/node-cron
npm install croner

# Concurrency control
npm install p-queue
```

### Required (system-level, one-time)
```bash
# Bitwarden CLI (global install)
npm install -g @bitwarden/cli
```

### Optional (add only if needed)
```bash
# Stealth browsing (if sites block automation)
npm install playwright-extra puppeteer-extra-plugin-stealth

# Playwright MCP (for research browsing tasks)
npm install @playwright/mcp
```

### NOT needed (zero new deps)
- Sub-agent spawning: built into claude-agent-sdk
- Research-as-library: built on existing SQLite + Drizzle
- Custom MCP tools: built into claude-agent-sdk (`createSdkMcpServer`)

**Total new production dependencies: 3** (playwright, croner, p-queue)
**Total removed: 2** (node-cron, @types/node-cron)
**Net dependency change: +1 production, +0 dev**

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Playwright direct | Stagehand v3.1 | If bill pay targets frequently change their UI layout and you need layout-resistant automation. Stagehand's act("click the pay button") adapts to DOM changes. But adds $0.01-0.05/action in LLM costs. |
| Playwright direct | browser-use (TS) | If you want fully autonomous browsing with zero scripted flows. But TS port is immature (aligned to Python v0.5.11) and brings its own LLM orchestration. |
| @bitwarden/cli | 1Password CLI (`op`) | If you switch to 1Password. Similar pattern: `op item get <name> --format json`. |
| @bitwarden/cli | HashiCorp Vault | If you need enterprise secrets management. Massive overkill for personal agent. |
| croner | Bree | If you need worker thread isolation for CPU-intensive scheduled tasks. Bree spawns actual worker threads. But Jarvis tasks are I/O-bound (API calls, browser), not CPU-bound. |
| croner | Agenda (MongoDB) | If you need distributed job scheduling across multiple servers. Jarvis is single-instance. |
| SQLite research tables | Pinecone/Weaviate | If research corpus exceeds 100K entries and needs sub-100ms vector search at scale. Jarvis will have <10K research entries. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `puppeteer` | Playwright supersedes it -- same team, better API, multi-browser. Puppeteer is legacy. | `playwright` |
| `selenium-webdriver` | Java-era automation. Slow, fragile, no auto-wait. | `playwright` |
| `@anthropic-ai/claude-code` | Renamed and deprecated. Will stop receiving updates. | `@anthropic-ai/claude-agent-sdk` |
| `langchain` | Heavy abstraction layer. Claude Agent SDK + MCP tools is the native Anthropic pattern. LangChain adds 50+ transitive deps for zero value here. | Direct Claude Agent SDK |
| `autogen` / `crewai` | Multi-agent frameworks that bring their own LLM orchestration. Conflicts with Claude Agent SDK's native subagent system. | Claude Agent SDK `agents` parameter |
| `node-cron` (keep) | croner is strictly superior: more downloads, zero deps, native timezone, used by PM2 itself. | `croner` |
| `better-sqlite3` (for new tables) | Already migrated to `@libsql/client` + Drizzle in v2. Don't regress. | Existing Drizzle setup |
| `cheerio` / `jsdom` | Don't parse HTML separately. Playwright already has full DOM access via `page.evaluate()` and `page.locator()`. | Playwright selectors |
| Skyvern (cloud) | SaaS dependency for browser automation. Adds cost ($$$), latency, and vendor lock-in. You have Playwright + Claude locally. | Playwright + Claude Agent SDK |

---

## Environment Variables for v5.0

Add to existing `.env`:
```bash
# Bitwarden vault
BW_SESSION=              # Set programmatically on unlock, never hardcode
BW_MASTER_HASH=          # Optional: for automated unlock on PM2 restart

# Playwright
PLAYWRIGHT_BROWSERS_PATH=0  # Use default browser location
HEADLESS=true               # Run headless in production

# Claude Agent SDK (replaces claude-code vars if any)
# No new env vars needed -- uses same ANTHROPIC_API_KEY
```

---

## Version Compatibility

| Package | Min Version | Pairs With | Notes |
|---------|-------------|------------|-------|
| `@anthropic-ai/claude-agent-sdk` | `0.2.76` | Claude Code CLI v2.1.63+ | Tool name "Task" renamed to "Agent" in v2.1.63 |
| `playwright` | `1.58.0` | Node.js 18+ | Uses Chrome for Testing builds (not Chromium) since v1.57 |
| `croner` | `9.0.0` | Node.js 18+ | ESM-first, supports CJS via wrapper |
| `p-queue` | `8.0.0` | Node.js 18+ | ESM-only since v7. Use dynamic import if CJS project. |
| `@bitwarden/cli` | `2026.2.0` | Node.js 18+ | Global install, not project dep |

---

## Emerging Patterns Worth Watching

### 1. Playwright CLI Mode (February 2026)
Microsoft released a CLI mode alongside MCP that's specifically optimized for coding agents. Uses ~27K tokens per task vs ~114K for MCP. For Jarvis's structured bill pay flows, this means 4x lower token cost. Consider using CLI mode for known workflows and MCP mode for exploratory browsing.

### 2. createSdkMcpServer for In-Process Tools
The Claude Agent SDK's `createSdkMcpServer` + `tool()` pattern lets you define typed tools inline without running a separate MCP server process. This is perfect for vault, research, and approval gateway tools. Zod schema validation, type-safe handlers, zero infrastructure.

### 3. Google's Always-On Memory Agent Pattern
Google published a pattern where the agent reads inputs, extracts structured records, writes to SQLite, and later reads records back. This is exactly the research-as-library pattern. Validates the SQLite + structured fields approach over vector-only retrieval.

### 4. Subagent Context Isolation
Claude Agent SDK subagents get fresh context windows. This means the bill-payer subagent can navigate 20 pages without bloating the main conversation. Parent receives only the final "Bill paid: $127.50 to Duke Energy" message. This is a massive context window efficiency win.

### 5. Opus 4.6 Over-Spawning Tendency
Anthropic docs flag that Opus 4.6 tends to over-spawn subagents when they're available. For Jarvis, mitigate by: (a) using Sonnet for subagents (cheaper, faster), (b) writing precise descriptions so Claude only delegates appropriate tasks, (c) considering `maxTurns` limits on subagent queries.

---

## Sources

### HIGH Confidence (official docs, verified)
- [Claude Agent SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) -- breaking changes, migration steps
- [Claude Agent SDK Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents) -- AgentDefinition API, tool restrictions, resumption
- [Claude Agent SDK Custom Tools](https://platform.claude.com/docs/en/agent-sdk/custom-tools) -- createSdkMcpServer, tool() helper
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- full API reference
- [@anthropic-ai/claude-agent-sdk npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) -- v0.2.76
- [Playwright Official Docs](https://playwright.dev/) -- v1.58.2, Library API
- [Playwright MCP npm](https://www.npmjs.com/package/@playwright/mcp) -- accessibility tree approach
- [Bitwarden CLI Docs](https://bitwarden.com/help/cli/) -- credential retrieval, session management
- [@bitwarden/cli npm](https://www.npmjs.com/package/@bitwarden/cli) -- v2026.2.0

### MEDIUM Confidence (multiple sources agree)
- [Playwright MCP vs CLI benchmarks](https://bug0.com/blog/playwright-mcp-changes-ai-testing-2026) -- 114K vs 27K tokens
- [Stagehand v3.1](https://www.browserbase.com/blog/stagehand-v3) -- 44% faster, CDP-direct, caching
- [Best Node.js Schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) -- croner vs node-cron vs bree
- [npm-compare: scheduler downloads](https://npm-compare.com/node-schedule,croner,node-cron,bull,agenda,bree) -- croner 1.5M/week
- [sqlite-memory (SQLiteAI)](https://github.com/sqliteai/sqlite-memory) -- hybrid FTS5 + vector pattern
- [EverMem-style persistent agent](https://www.marktechpost.com/2026/03/04/how-to-build-an-evermem-style-persistent-ai-agent-os-with-hierarchical-memory-faiss-vector-retrieval-sqlite-storage-and-automated-memory-consolidation/) -- SQLite + structured metadata pattern

### LOW Confidence (single source, needs validation)
- Playwright-extra stealth plugin compatibility with Playwright 1.58 (untested)
- p-queue ESM-only behavior in mixed CJS/ESM Next.js projects (may need dynamic import)
- Windows 8191-char limit for subagent prompts (mentioned in Anthropic docs, untested in practice)

---
*Stack research for: Jarvis v5.0 -- browser automation + vault + sub-agents + research-as-library*
*Researched: 2026-03-16*
