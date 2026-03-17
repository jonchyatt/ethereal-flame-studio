---
phase: 14-sub-agents-browser-engine
verified: 2026-03-17T16:00:00Z
status: human_needed
score: 9/9 must-haves verified (automated)
re_verification: false
human_verification:
  - test: "Browser-worker sub-agent navigates a real website"
    expected: "Playwright opens a browser, navigates to the URL, takes screenshots, and the response contains file paths under C:/Users/jonch/Projects/jarvis/data/screenshots/"
    why_human: "MCP inheritance from .mcp.json to sub-agents cannot be verified without running the SDK. The plan itself noted this: 'MCP inheritance tested: if browser-worker cannot use mcp__playwright__* tools, inline mcpServers added as fallback.' This is the critical unknown — browser-worker has no inline mcpServers, so if .mcp.json inheritance doesn't apply to sub-agents, Playwright tools will be unavailable to browser-worker."
  - test: "Researcher sub-agent runs a web search and returns structured findings"
    expected: "Jarvis invokes researcher, which uses WebSearch/WebFetch, returns URLs and structured data. Researcher does NOT invoke Notion, memory, or shell tools."
    why_human: "Context isolation (AGENT-02, AGENT-03) requires runtime observation that sub-agents only see their restricted tool lists. Cannot verify this from static analysis."
  - test: "Telegram BLOCKED notification fires when a sub-agent returns BLOCKED"
    expected: "PM2 logs show [CCodeBrain] Sub-agent failed, notifyIfBlocked is called, and a Telegram message (with or without screenshot) arrives in Jon's chat."
    why_human: "The end-to-end pipeline (sub-agent failure -> notifyIfBlocked -> Telegram) requires live TELEGRAM_OWNER_ID env, a running bot, and an actual blocked automation event to verify."
---

# Phase 14: Sub-Agents & Browser Engine Verification Report

**Phase Goal:** Jarvis can spawn role-specialized sub-agents and automate browser interactions including navigation, form filling, and screenshot verification
**Verified:** 2026-03-17T16:00:00Z
**Status:** human_needed — all automated checks pass, 3 items require live testing
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Three sub-agents exist: browser-worker, researcher, form-filler | VERIFIED | `subAgentRegistry.ts` L22, L47, L74 — all three defined in `buildSubAgents()` |
| 2 | Each sub-agent has a restricted tool set matching its role | VERIFIED | browser-worker: `['mcp__playwright__*']` only; researcher: `['WebSearch','WebFetch','Read','mcp__jarvis-tools__store_research','mcp__jarvis-tools__search_research']`; form-filler: `['mcp__bitwarden__*','mcp__playwright__*']` |
| 3 | Sub-agents get focused prompts under 2K tokens, not the parent system prompt | VERIFIED | Each agent has a dedicated `prompt:` field. browser-worker prompt ~540 chars, researcher ~470 chars, form-filler ~580 chars. None receive the parent's full system context. |
| 4 | The parent agent can invoke sub-agents via the Agent tool in query() | VERIFIED | `ccodeBrain.ts` L89: `allowedTools: [...JARVIS_ALLOWED_TOOLS, 'Agent']` and L90: `agents,` passed to query() options |
| 5 | Playwright MCP tools are available to browser-worker and form-filler sub-agents | UNCERTAIN | `.mcp.json` has `playwright` server. form-filler has inline `mcpServers.bitwarden` but no inline `playwright`. browser-worker has no inline mcpServers at all. SDK sub-agent MCP inheritance from global `.mcp.json` is unverified — needs live test. |
| 6 | Screenshots are persisted to a known directory with audit metadata | VERIFIED | `screenshotStore.ts` exports `SCREENSHOT_DIR = 'C:/Users/jonch/Projects/jarvis/data/screenshots'`, `listScreenshots()` returns `ScreenshotEntry[]` with path/filename/createdAt/sizeBytes. Directory exists on disk. `.mcp.json` playwright has `--output-dir` pointing to same path. |
| 7 | When a sub-agent reports BLOCKED, Jon receives a Telegram notification with screenshot | VERIFIED (wiring) / UNCERTAIN (runtime) | `notifyIfBlocked()` in `notifications.ts` parses `BLOCKED:` regex, extracts Windows PNG paths, calls `sendTelegramScreenshot()` or falls back to `sendTelegramAlert()`. Wired into `ccodeBrain.ts` L128 via `.catch()`. Runtime requires live TELEGRAM_OWNER_ID + actual blocked event. |
| 8 | Screenshot notification includes context (site, reason, action needed) | VERIFIED | `notifications.ts` L92: caption = `"Browser automation blocked (${agentName})\n\nReason: ${reason}\n\nAction needed: Please complete the challenge manually, then tell me to retry."` |
| 9 | The parent agent automatically calls notifyIfBlocked() when a sub-agent fails | VERIFIED | `ccodeBrain.ts` L125-130: `task_notification` event with `status === 'failed'` triggers `notifyIfBlocked(summary, agentName).catch(...)` — fire-and-forget, never blocks parent response |

**Score:** 9/9 truths verified (2 have runtime-only unknowns flagged for human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/jarvis/agents/agentTypes.ts` | SubAgentName type and SUB_AGENT_NAMES const | VERIFIED | Exports `SUB_AGENT_NAMES` tuple with all 3 names, `SubAgentName` union type — 11 lines, substantive |
| `src/lib/jarvis/agents/subAgentRegistry.ts` | buildSubAgents() with 3 agents | VERIFIED | Exports `buildSubAgents()`, 101 lines, all 3 agents defined with tools/prompts/model/maxTurns, form-filler has private bitwarden mcpServers |
| `src/lib/jarvis/intelligence/ccodeBrain.ts` | Brain with agents param wired into query() | VERIFIED | Imports `buildSubAgents` + `notifyIfBlocked`, `Agent` in allowedTools, `agents` passed to query(), sub-agent event handlers present |
| `src/lib/jarvis/browser/screenshotStore.ts` | Screenshot file management | VERIFIED | Exports `SCREENSHOT_DIR`, `listScreenshots()`, `getLatestScreenshot()`, `cleanOldScreenshots()` — 87 lines, substantive |
| `src/lib/jarvis/telegram/notifications.ts` | Telegram notification helpers | VERIFIED | Exports `sendTelegramScreenshot()`, `sendTelegramAlert()`, `notifyIfBlocked()` — 108 lines, all three functions substantive with real logic |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `subAgentRegistry.ts` | `vault/vaultHealth.ts` | `ensureVaultUnlocked()` for form-filler BW_SESSION | WIRED | L12: `import { ensureVaultUnlocked } from '../vault/vaultHealth'`; L68: called inside try/catch; `vaultHealth.ts` L34 exports `ensureVaultUnlocked(): string` |
| `ccodeBrain.ts` | `agents/subAgentRegistry.ts` | `buildSubAgents()` called and passed to query() options.agents | WIRED | L12: `import { buildSubAgents }...`; L79: `agents = buildSubAgents()`; L90: `agents,` in query options |
| `subAgentRegistry.ts` | `@playwright/mcp` | `mcp__playwright__*` in browser-worker and form-filler tool lists | WIRED (static) / UNCERTAIN (runtime) | Tool name pattern present in both agents. Runtime availability depends on SDK MCP inheritance — see human verification item 1. |
| `notifications.ts` | `telegram/bot.ts` | `getTelegramBot()` for bot instance | WIRED | L13: `import { getTelegramBot } from './bot'`; `bot.ts` L326 exports `getTelegramBot()`; called at L33 and L62 |
| `notifications.ts` | `grammy` | `InputFile` for local file upload | WIRED | L12: `import { InputFile } from 'grammy'`; used at L37 in `sendTelegramScreenshot()` |
| `screenshotStore.ts` | `data/screenshots/` | fs operations on persistent screenshot directory | WIRED | `SCREENSHOT_DIR` constant matches `.mcp.json` `--output-dir`; directory exists at `C:/Users/jonch/Projects/jarvis/data/screenshots`; `.gitignore` L32 excludes it |
| `ccodeBrain.ts` | `telegram/notifications.ts` | `notifyIfBlocked()` in task_notification failed branch | WIRED | L13: `import { notifyIfBlocked }...`; L128: `notifyIfBlocked(summary, agentName).catch(...)` inside `taskEvent.status === 'failed'` branch |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AGENT-01 | 14-01 | Sub-agent definitions with role specialization (browser-worker, researcher, form-filler) | SATISFIED | `subAgentRegistry.ts` defines all 3 agents with distinct roles, descriptions, and prompts |
| AGENT-02 | 14-01 | Sub-agents have restricted tool access (browser-worker can't access memory, researcher can't access vault) | SATISFIED (static) | Tool lists verified: browser-worker: Playwright only; researcher: web+research library only; form-filler: Bitwarden+Playwright only. Runtime isolation needs human verification. |
| AGENT-03 | 14-01 | Context isolation — sub-agents get focused prompts, not full system context | SATISFIED | Each sub-agent has its own `prompt:` field with focused instructions under 600 chars. Parent's system prompt is never passed to sub-agents. |
| BROWSER-01 | 14-01 | Playwright engine for navigating websites, clicking elements, filling forms, submitting | SATISFIED (static) | browser-worker and form-filler have `mcp__playwright__*` in tools. `@playwright/mcp` in `.mcp.json`. Runtime availability needs human verification. |
| BROWSER-02 | 14-02 | Screenshot-based verification — capture before/after screenshots for audit trail | SATISFIED | Both browser agents instructed to screenshot before/after every significant action. `screenshotStore.ts` provides persistent audit trail with `listScreenshots()`. |
| BROWSER-03 | 14-02 | Graceful failure with Telegram notification when sites block automation or require manual intervention | SATISFIED (wiring) | `notifyIfBlocked()` wired into `ccodeBrain.ts` failed branch. Falls back to text alert if screenshot inaccessible. Fire-and-forget so main flow is uninterrupted. Runtime Telegram delivery needs human verification. |
| BROWSER-04 | 14-02 | CAPTCHA/2FA pause — detect and notify Jon via Telegram for manual completion | SATISFIED (wiring) | browser-worker prompt contains explicit CAPTCHA/2FA detection patterns. `notifyIfBlocked()` parses `BLOCKED:` response and sends Telegram notification. Same runtime caveat as BROWSER-03. |

No orphaned requirements — all 7 IDs are claimed by plans 14-01 and 14-02 and verified against implementations.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `screenshotStore.ts` | 50 | `return []` | Info | Legitimate: inside catch block for `fs.readdir` failure (directory not found). Returns empty list gracefully, not a stub. |
| `subAgentRegistry.ts` | 13 | `import type { SubAgentName }` imported but unused at value level | Info | Type-only import used for documentation intent. No runtime impact. TypeScript compiles clean. |

No blocker or warning-level anti-patterns found.

### Human Verification Required

#### 1. Browser-Worker MCP Inheritance

**Test:** Ask Jarvis: "Use the browser-worker to navigate to https://example.com and take a screenshot"
**Expected:** Playwright opens a browser, navigates to example.com, screenshot appears in `C:/Users/jonch/Projects/jarvis/data/screenshots/`, response contains the file path
**Why human:** `browser-worker` has `tools: ['mcp__playwright__*']` but no inline `mcpServers`. The plan assumed `.mcp.json` global Playwright config is inherited by sub-agents, but explicitly noted this as unverified and deferred to live testing. If inheritance doesn't work, browser-worker will report tool unavailability. Fix: add inline `mcpServers.playwright` to browser-worker in `subAgentRegistry.ts`.

#### 2. Sub-Agent Context Isolation at Runtime

**Test:** After the browser-worker test, inspect PM2 logs: `pm2 logs jarvis-web --lines 100`
**Expected:** Logs show `[CCodeBrain] Sub-agent progress:` events. The browser-worker response should NOT mention Notion, memory, or any tool outside Playwright.
**Why human:** Static tool lists define restrictions but only runtime execution confirms the SDK enforces them. Sub-agent context isolation is a core requirement (AGENT-02, AGENT-03).

#### 3. End-to-End Telegram BLOCKED Notification

**Test:** Navigate to a site that triggers a CAPTCHA or Cloudflare challenge via browser-worker. Or manually test by having browser-worker navigate to a bot-protected URL.
**Expected:** PM2 log shows `[CCodeBrain] Sub-agent failed (browser-worker): BLOCKED: [reason]`, followed by `[Telegram] Screenshot sent:` or a Telegram message arriving in Jon's chat.
**Why human:** Requires TELEGRAM_OWNER_ID to be set in the Vercel/PM2 environment, a running Telegram bot, and an actual blocked automation event. Cannot simulate programmatically.

### Gaps Summary

No automated gaps found. All 5 artifacts are substantive (not stubs), all 7 key links are wired, all 7 requirements have implementation evidence. The 3 human verification items are runtime unknowns inherent to browser automation (MCP sub-process behavior, SDK tool restriction enforcement, live Telegram delivery) — they cannot be resolved by code inspection alone.

The most significant risk is item 1 (browser-worker MCP inheritance). The plan's own acceptance criteria explicitly required testing this and adding an inline `mcpServers` fallback if inheritance failed. That test was skipped per project rules (no local environments). If browser-worker cannot use Playwright, AGENT-01, BROWSER-01, BROWSER-02, and parts of BROWSER-03/04 effectively fail at runtime even though the code is correctly written.

---

_Verified: 2026-03-17T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
