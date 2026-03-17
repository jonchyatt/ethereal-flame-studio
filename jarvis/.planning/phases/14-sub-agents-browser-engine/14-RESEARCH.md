# Phase 14: Sub-Agents & Browser Engine - Research

**Researched:** 2026-03-17
**Domain:** Claude Agent SDK sub-agent definitions, Playwright MCP browser automation, Telegram screenshot notifications
**Confidence:** HIGH

## Summary

Phase 14 builds on the sub-agent pattern established in Phase 13 (form-filler agent with private Bitwarden MCP) and generalizes it into a full sub-agent framework with three role-specialized agents (browser-worker, researcher, form-filler) plus Playwright-based browser automation. The Claude Agent SDK v0.2.77 already installed in the project has native support for programmatic sub-agent definitions via the `agents` option on `query()`, with per-agent tool restrictions, private MCP servers, model selection, and turn limits.

The Playwright MCP server (`@playwright/mcp`) is already configured in `.mcp.json`. It provides `browser_navigate`, `browser_click`, `browser_type`, `browser_take_screenshot`, `browser_snapshot` (accessibility tree), and other tools. Screenshots are saved to disk as PNG files with file paths returned. For CAPTCHA/2FA detection (BROWSER-04), the approach is prompt-engineering: instruct the browser-worker sub-agent to detect CAPTCHA/security challenge page patterns in accessibility snapshots and halt, returning a screenshot path. The parent agent then sends this screenshot to Jon via Telegram using grammY's `ctx.api.sendPhoto()` with `InputFile` from a local path.

The key architectural decision is where sub-agents run. The current `ccodeBrain.ts` uses `query()` from the Agent SDK, which already supports the `agents` parameter. Sub-agents are invoked by the parent agent using the `Agent` tool (built into Claude Code). Each sub-agent spawns its own subprocess with restricted tools, scoped MCP servers, and a focused system prompt. Token isolation (AGENT-03) is inherent: sub-agents get their own `query()` call with only their prompt + tool definitions, not the parent's full system context. The 15K input token budget per sub-agent turn is achievable by keeping sub-agent prompts under 2K tokens and relying on focused tool sets.

**Primary recommendation:** Define three sub-agents programmatically in a `subAgentRegistry.ts` module. Wire them into `ccodeBrain.ts` via the `agents` option. Browser-worker gets `mcp__playwright__*` tools. Researcher gets `WebSearch`, `WebFetch`, `Read`, and research library tools. Form-filler (already exists from Phase 13) gets `mcp__bitwarden__*` + `mcp__playwright__*`. Add a `sendTelegramScreenshot()` utility for CAPTCHA/failure notifications. Run Playwright in headed mode for debuggability on Jon's Windows desktop.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGENT-01 | Sub-agent definitions with role specialization (browser-worker, researcher, form-filler) | Claude Agent SDK `AgentDefinition` type supports `description`, `prompt`, `tools`, `model`, `mcpServers`, `maxTurns`. Three agents defined in `subAgentRegistry.ts`. |
| AGENT-02 | Sub-agents have restricted tool access (browser-worker can't access memory, researcher can't access vault) | `AgentDefinition.tools` field accepts array of allowed tool names. `disallowedTools` field for explicit exclusion. Sub-agents only see tools listed in their definition. |
| AGENT-03 | Context isolation -- sub-agents get focused prompts, not full system context (prevent 10x token waste) | Sub-agents spawn via SDK `Agent` tool as separate `query()` calls. Each gets only its own `prompt` field (not parent's systemPrompt). Token usage verifiable via `task_progress` events with `usage` field. |
| BROWSER-01 | Playwright engine for navigating websites, clicking elements, filling forms, submitting | `@playwright/mcp` already in `.mcp.json`. Provides `browser_navigate`, `browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`. Scoped to browser-worker and form-filler sub-agents. |
| BROWSER-02 | Screenshot-based verification -- capture before/after screenshots for audit trail | `browser_take_screenshot` tool saves PNG to disk, returns file path. Screenshots stored in a configurable output directory. Audit trail = before/after paths logged per browser action. |
| BROWSER-03 | Graceful failure with Telegram notification when sites block automation or require manual intervention | Browser-worker prompt instructs: on automation block, capture screenshot and return failure summary. Parent agent calls `sendTelegramScreenshot()` to forward screenshot + context to Jon via Telegram. |
| BROWSER-04 | CAPTCHA/2FA pause -- detect and notify Jon via Telegram for manual completion | Accessibility snapshot analysis detects CAPTCHA iframes, reCAPTCHA elements, 2FA input fields. Sub-agent halts, takes screenshot, returns structured failure. Parent sends screenshot via Telegram `sendPhoto`. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | `0.2.77` | Sub-agent definitions + parent agent orchestration | Already installed; native `agents` param on `query()` with tool scoping, private MCP servers, turn limits |
| `@playwright/mcp` | `latest` (via npx) | Browser automation MCP server | Already in `.mcp.json`; Microsoft-maintained, provides navigate/click/type/screenshot/snapshot tools |
| `grammy` | existing | Telegram bot framework | Already in project; `ctx.api.sendPhoto()` for screenshot delivery, `InputFile` for local file upload |

### Supporting (Already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@bitwarden/mcp-server` | `2026.2.0` | Vault credential injection | Form-filler sub-agent only (Phase 13 pattern) |
| `fs/promises` | built-in | Screenshot file operations | Reading screenshot PNGs from disk for Telegram upload |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright MCP (accessibility-based) | Playwright MCP `--caps vision` (coordinate-based) | Vision mode requires screenshot analysis per action (higher token cost); accessibility mode is 2-5KB per snapshot vs 100KB+ screenshots. Use accessibility mode by default, vision mode only for sites with poor accessibility markup. |
| Sub-agent per role | Single monolithic agent with all tools | Monolithic agent wastes tokens loading all tool definitions (Bitwarden + Playwright + research + memory). Sub-agents keep each invocation focused. |
| Headed mode (default) | Headless mode (`--headless`) | Headed lets Jon see what browser-worker is doing on his desktop. Keep headed for now; switch to headless when running unattended scheduled tasks. |

**Installation:**
```bash
# Nothing new to install -- all packages already present
# Playwright MCP runs via npx (already in .mcp.json)
# Agent SDK already installed
# grammY already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/lib/jarvis/
  agents/
    subAgentRegistry.ts     # NEW: All sub-agent definitions (browser-worker, researcher, form-filler)
    agentTypes.ts           # NEW: Shared types for sub-agent configs
  vault/
    vaultConfig.ts          # EXISTING: Form-filler agent definition (MOVE to subAgentRegistry)
    vaultHealth.ts          # EXISTING: Unchanged
  browser/
    screenshotStore.ts      # NEW: Screenshot file management + audit trail
  telegram/
    bot.ts                  # MODIFIED: Add sendTelegramScreenshot utility
    notifications.ts        # NEW: Telegram notification helpers (screenshot, alert)
  intelligence/
    ccodeBrain.ts           # MODIFIED: Wire agents param into query() call
```

### Pattern 1: Sub-Agent Registry

**What:** Centralized module that builds all sub-agent definitions with their tool restrictions and MCP server configs.
**When to use:** Every time ccodeBrain.ts creates a `query()` call.
**Example:**

```typescript
// agents/subAgentRegistry.ts
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { ensureVaultUnlocked } from '../vault/vaultHealth';

export function buildSubAgents(): Record<string, AgentDefinition> {
  return {
    'browser-worker': {
      description: 'Navigates websites, clicks elements, fills forms, takes screenshots. Use for any browser automation task.',
      prompt: `You are a browser automation agent. You navigate websites and interact with page elements.

RULES:
1. Take a screenshot BEFORE and AFTER every significant action (form fill, button click, navigation)
2. Use browser_snapshot (accessibility tree) to understand page structure before interacting
3. If you see CAPTCHA, reCAPTCHA, "verify you are human", or 2FA/MFA prompts: STOP immediately, take a screenshot, and report "BLOCKED: [reason]" with the screenshot path
4. If a page shows "access denied", "bot detected", or similar: STOP, screenshot, report "BLOCKED: [reason]"
5. Never guess at element selectors -- always use the accessibility snapshot first
6. Report the file paths of all screenshots you take`,
      tools: ['mcp__playwright__*'],
      model: 'sonnet',
      maxTurns: 15,
    },

    'researcher': {
      description: 'Searches the web, reads pages, and stores structured findings. Use for research tasks.',
      prompt: `You are a research agent. You search the web, read pages, and extract structured information.

RULES:
1. Always cite your sources with URLs
2. Extract structured data (dates, amounts, requirements, eligibility criteria) when found
3. Store findings using the research library tools when instructed
4. Cross-reference multiple sources for important claims
5. Report what you found AND what you could not find`,
      tools: ['WebSearch', 'WebFetch', 'Read', 'mcp__jarvis-tools__store_research', 'mcp__jarvis-tools__search_research'],
      model: 'sonnet',
      maxTurns: 20,
    },

    'form-filler': buildFormFillerAgent(),
  };
}

function buildFormFillerAgent(): AgentDefinition {
  let session: string;
  try {
    session = ensureVaultUnlocked();
  } catch {
    session = ''; // Vault unavailable -- agent will report error
  }

  return {
    description: 'Fills web forms using vault credentials. Use for logins and form submissions requiring stored passwords.',
    prompt: `You are a secure form-filling agent. You retrieve credentials from Bitwarden vault and inject them into web forms.

CRITICAL SECURITY RULES:
1. NEVER repeat, echo, log, or include any credential values (usernames, passwords, TOTP codes) in your response text
2. When reporting results, say "Credentials retrieved and injected" -- never show actual values
3. Take a screenshot BEFORE and AFTER every form submission
4. Stop and report if you encounter CAPTCHAs, 2FA prompts, or unexpected security challenges
5. Only submit forms when the parent agent has received explicit user approval
6. If a credential is not found in the vault, report "Credential not found for [site name]" -- do not guess or fabricate`,
    tools: ['mcp__bitwarden__*', 'mcp__playwright__*'],
    model: 'sonnet',
    maxTurns: 15,
    mcpServers: [{
      bitwarden: {
        command: 'cmd',
        args: ['/c', 'npx', '-y', '@bitwarden/mcp-server'],
        env: { BW_SESSION: session },
      },
    }],
  };
}
```

### Pattern 2: Wiring Sub-Agents into ccodeBrain.ts

**What:** Pass the `agents` record to the SDK `query()` call so the parent agent can invoke sub-agents via the built-in `Agent` tool.
**When to use:** When the main Jarvis brain needs to delegate to specialized sub-agents.
**Example:**

```typescript
// In ccodeBrain.ts thinkWithSdk()
import { buildSubAgents } from '../agents/subAgentRegistry';

const agents = buildSubAgents();

const conversation = query({
  prompt: userMessage,
  options: {
    cwd,
    systemPrompt,
    allowedTools: [...JARVIS_ALLOWED_TOOLS, 'Agent'],
    agents,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    env: cleanEnv,
    // Optional: track sub-agent progress
    agentProgressSummaries: true,
    stderr: (data: string) => console.error('[CCodeBrain stderr]', data),
    ...(sessionId ? { resume: sessionId } : {}),
  },
});
```

### Pattern 3: Telegram Screenshot Notification

**What:** Send a screenshot image to Jon via Telegram when automation is blocked.
**When to use:** CAPTCHA/2FA detection (BROWSER-04) or site blocking (BROWSER-03).
**Example:**

```typescript
// telegram/notifications.ts
import { InputFile } from 'grammy';
import { getTelegramBot } from './bot';
import * as fs from 'fs/promises';

export async function sendTelegramScreenshot(
  screenshotPath: string,
  caption: string
): Promise<void> {
  const bot = getTelegramBot();
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!ownerId) {
    console.warn('[Telegram] No TELEGRAM_OWNER_ID set, cannot send screenshot');
    return;
  }

  try {
    const fileBuffer = await fs.readFile(screenshotPath);
    await bot.api.sendPhoto(
      ownerId,
      new InputFile(fileBuffer, 'screenshot.png'),
      { caption: caption.slice(0, 1024) } // Telegram caption limit
    );
  } catch (error) {
    console.error('[Telegram] Failed to send screenshot:', error);
  }
}
```

### Pattern 4: CAPTCHA/2FA Detection via Accessibility Snapshot

**What:** The browser-worker sub-agent detects CAPTCHA and 2FA challenges by examining accessibility tree snapshots.
**When to use:** Every page load during login or form submission flows.
**Why accessibility tree:** Cheaper than screenshot analysis (2-5KB text vs 100KB+ image). Common patterns are reliably detectable:
- reCAPTCHA: `<iframe>` with title containing "recaptcha" or "challenge"
- hCaptcha: elements with role containing "hcaptcha"
- Cloudflare: "Verify you are human" text, "cf-challenge" in page
- 2FA: Input fields labeled "verification code", "two-factor", "authenticator"
- General: "access denied", "bot detected", "please verify"

The sub-agent prompt includes these patterns so it can detect them in the `browser_snapshot` output.

### Anti-Patterns to Avoid

- **Sub-agent inheriting all parent tools:** Always specify `tools` array. Without it, the sub-agent gets ALL parent tools, defeating isolation.
- **Passing full system prompt to sub-agents:** Each sub-agent has its own focused `prompt`. Never concatenate the parent's 5K+ system prompt with personality, memory, behavior rules.
- **Screenshot-based navigation by default:** Use `browser_snapshot` (accessibility tree) for navigation decisions. Only use `browser_take_screenshot` for visual verification and audit trail. Vision-based navigation is 50-100x more expensive in tokens.
- **Synchronous screenshot upload:** Screenshot sending to Telegram should be fire-and-forget from the parent agent's perspective. Never block the response waiting for Telegram delivery.
- **Hard-coding screenshot paths:** Use a configurable output directory. Playwright MCP saves to a temp directory by default; screenshots for audit should be copied to a persistent location.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom Puppeteer/Playwright scripts | Playwright MCP `browser_*` tools | MCP server handles browser lifecycle, page management, tool interface; sub-agent orchestrates |
| Sub-agent orchestration | Custom process spawning + message passing | SDK `agents` param + built-in `Agent` tool | SDK handles subprocess lifecycle, context isolation, tool scoping, progress events |
| CAPTCHA detection | Computer vision / ML classifier | Prompt engineering on accessibility snapshots | Accessibility tree reliably contains CAPTCHA markers (iframe titles, role attributes); no model needed |
| Screenshot delivery to Telegram | Custom HTTP upload to Telegram API | grammY `InputFile` + `sendPhoto` | grammY handles multipart upload, file size limits, retry logic |
| Tool restriction enforcement | Custom middleware filtering tool calls | SDK `AgentDefinition.tools` field | SDK strips unlisted tools from model context; agent literally cannot call restricted tools |

**Key insight:** The SDK's `agents` parameter and `Agent` tool handle the entire sub-agent lifecycle. The implementation work is defining the agents (prompts + tool lists) and wiring the notification path for failures.

## Common Pitfalls

### Pitfall 1: Playwright MCP Server Not Reachable from Sub-Agent

**What goes wrong:** Browser-worker sub-agent tries to call `mcp__playwright__browser_navigate` but the MCP server is not connected because it was configured in the parent's `.mcp.json` but not available to the sub-agent process.
**Why it happens:** Sub-agents spawned by the SDK may inherit `.mcp.json` servers (since they share the same working directory), but this depends on SDK behavior.
**How to avoid:** Verify that sub-agents inherit `.mcp.json` MCP servers. If not, add Playwright as an inline `mcpServers` entry on the browser-worker agent definition (same pattern as Bitwarden on form-filler).
**Warning signs:** Sub-agent reports "tool not found" or "mcp__playwright__* unavailable."

### Pitfall 2: Screenshot Path Not Accessible After Sub-Agent Completes

**What goes wrong:** Browser-worker takes screenshots, returns file paths in its response, but the parent agent tries to read those files and they're gone (temp directory cleaned up).
**Why it happens:** Playwright MCP saves screenshots to a temp directory that may be cleaned up when the sub-agent process exits.
**How to avoid:** Configure Playwright MCP with `--output-dir` pointing to a persistent directory (e.g., `C:/Users/jonch/Projects/jarvis/data/screenshots/`). Or copy screenshots immediately upon receiving the path.
**Warning signs:** "File not found" when trying to send screenshot to Telegram.

### Pitfall 3: Sub-Agent Token Budget Exceeded

**What goes wrong:** A sub-agent's input tokens exceed 15K per turn because the prompt is too long or the accessibility snapshot of a complex page is massive.
**Why it happens:** Accessibility snapshots for complex pages (e.g., banking portals) can be 10K+ tokens. Combined with the system prompt, this exceeds budget.
**How to avoid:** Keep sub-agent prompts under 2K tokens. Set `maxTurns` to prevent runaway loops. If a page snapshot is too large, use `browser_take_screenshot` with vision mode selectively instead of trying to parse the entire accessibility tree. Monitor via `task_progress` events' `usage` field.
**Warning signs:** Slow sub-agent execution, high token usage in progress events.

### Pitfall 4: Headed Browser Window Interferes with Jon's Desktop

**What goes wrong:** Playwright opens a visible browser window on Jon's Windows desktop while he's working, stealing focus or covering his work.
**Why it happens:** Headed mode is the Playwright MCP default.
**How to avoid:** Two options: (1) Use `--headless` flag in `.mcp.json` args for unattended automation. (2) Keep headed mode but document that browser tasks should ideally run when Jon requests them or during scheduled windows. For Phase 14 testing, headed mode is preferred so Jon can observe.
**Warning signs:** Jon reports browser windows popping up unexpectedly.

### Pitfall 5: Form-Filler Agent Echoes Credentials in Response

**What goes wrong:** Despite prompt instructions, the LLM includes credential values in its response text, which then enters the parent conversation history.
**Why it happens:** LLMs are probabilistic; prompt instructions are not guarantees.
**How to avoid:** Defense in depth: (1) Prompt instructions forbid echoing credentials. (2) Post-processing: scan sub-agent response text for known credential patterns before including in parent context. (3) Form-filler's Bitwarden MCP is private (not in parent namespace), so the parent never sees raw tool call results.
**Warning signs:** Canary test (Phase 13) fails; credential substrings appear in parent conversation.

### Pitfall 6: Windows `cmd /c npx` Path Issues in Sub-Agent MCP Config

**What goes wrong:** MCP server config uses `command: 'npx'` but the sub-agent subprocess on Windows can't find npx.
**Why it happens:** PM2-spawned processes and SDK sub-agent subprocesses may not inherit the full user PATH on Windows.
**How to avoid:** Always use `command: 'cmd', args: ['/c', 'npx', ...]` pattern established in Phase 13 for all MCP server configs on Windows.
**Warning signs:** MCP server fails to start with "npx: command not found" or ENOENT errors.

## Code Examples

### Sub-Agent Definition Types (from SDK source)

```typescript
// From @anthropic-ai/claude-agent-sdk v0.2.77 sdk.d.ts
type AgentDefinition = {
  description: string;           // Natural language description of when to use this agent
  tools?: string[];              // Allowed tool names. If omitted, inherits ALL parent tools
  disallowedTools?: string[];    // Explicitly disallowed tool names
  prompt: string;                // The agent's system prompt
  model?: string;                // Model alias: 'sonnet', 'opus', 'haiku', or full model ID
  mcpServers?: AgentMcpServerSpec[];  // Private MCP servers for this agent only
  maxTurns?: number;             // Max agentic turns before stopping
};

type AgentMcpServerSpec = string | Record<string, McpServerConfigForProcessTransport>;

type McpStdioServerConfig = {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
};
```

### Monitoring Sub-Agent Progress

```typescript
// In ccodeBrain.ts event loop
for await (const event of conversation) {
  if (event.type === 'system' && event.subtype === 'task_progress') {
    // Sub-agent progress update
    console.log(`[SubAgent] Task ${event.task_id}: ${event.description}`);
    // event.usage contains token counts for budget monitoring
    onToolUse?.(`subagent_progress`, { description: event.description });
  }
  if (event.type === 'system' && event.subtype === 'task_notification') {
    // Sub-agent completed/failed/stopped
    console.log(`[SubAgent] Task ${event.task_id} ${event.status}: ${event.summary}`);
    if (event.status === 'failed') {
      // Check if failure indicates CAPTCHA/block
      onToolResult?.('subagent_failed', event.summary);
    }
  }
  // ... existing event handling
}
```

### Playwright MCP Configuration with Output Directory

```jsonc
// .mcp.json -- updated Playwright config for persistent screenshots
{
  "mcpServers": {
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest", "--output-dir", "C:/Users/jonch/Projects/jarvis/data/screenshots"]
    }
  }
}
```

### Sending Screenshot via Telegram (grammY)

```typescript
// Source: grammY docs (https://grammy.dev/guide/files#sending-files)
import { InputFile } from 'grammy';

// From local file path
await bot.api.sendPhoto(chatId, new InputFile('/path/to/screenshot.png'), {
  caption: 'Browser automation blocked: CAPTCHA detected on duke-energy.com'
});

// From Buffer (if reading file first)
const buffer = await fs.readFile(screenshotPath);
await bot.api.sendPhoto(chatId, new InputFile(buffer, 'screenshot.png'), {
  caption: caption.slice(0, 1024)  // Telegram 1024 char caption limit
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom Playwright scripts per site | Playwright MCP server with AI agent | 2025 (Playwright MCP v1.0) | Agent navigates dynamically using accessibility tree; no per-site scripting |
| Monolithic agent with all tools | Role-specialized sub-agents with tool scoping | Claude Agent SDK v0.2.x (2025-2026) | Context isolation reduces token waste; each agent sees only relevant tools |
| Screenshot-based navigation | Accessibility snapshot navigation | Playwright MCP default | 50-100x cheaper in tokens; accessibility tree is 2-5KB vs 100KB+ screenshots |
| Manual CAPTCHA detection code | Prompt-engineered detection on accessibility snapshots | Current | No ML model needed; accessibility tree reliably surfaces CAPTCHA markers |

**Deprecated/outdated:**
- Using Puppeteer directly: Playwright MCP server abstracts browser management
- `claude-code` (old package name): Renamed to `@anthropic-ai/claude-agent-sdk`; already migrated in Phase 12
- File-based agent definitions (`.claude/agents/*.md`): Programmatic `agents` param is more flexible for dynamic configs (e.g., BW_SESSION injection)

## Open Questions

1. **Sub-agent MCP server inheritance from .mcp.json**
   - What we know: The parent agent loads MCP servers from `.mcp.json`. Sub-agents spawned by the SDK run in the same working directory.
   - What's unclear: Whether sub-agents automatically inherit `.mcp.json` servers, or if they need explicit `mcpServers` entries for Playwright.
   - Recommendation: Test during implementation. If sub-agents don't inherit, add Playwright as inline MCP on browser-worker (same pattern as Bitwarden on form-filler). LOW risk -- straightforward fix either way.

2. **Playwright `--output-dir` flag availability**
   - What we know: Screenshots save to a temp directory by default. Some documentation mentions `--output-dir`.
   - What's unclear: Whether the latest `@playwright/mcp` version supports `--output-dir` as a CLI flag.
   - Recommendation: Test the flag. If unsupported, implement screenshot copy logic after each `browser_take_screenshot` call.

3. **Sub-agent token usage monitoring granularity**
   - What we know: `task_progress` events include a `usage` field. `agentProgressSummaries: true` enables periodic progress events.
   - What's unclear: Exact format of the `usage` field (input_tokens, output_tokens, etc.) and whether it's per-turn or cumulative.
   - Recommendation: Enable `agentProgressSummaries` and log the usage field during testing to understand the data format. Use this to validate the 15K input token budget requirement.

4. **Headed vs headless for scheduled tasks**
   - What we know: Phase 14 is interactive (Jon requests actions). Phase 15+ may have scheduled bill payments.
   - What's unclear: Whether to default to headed or headless mode.
   - Recommendation: Default headed for Phase 14 (Jon can observe). Add `--headless` toggle for Phase 15 scheduled tasks.

## Sources

### Primary (HIGH confidence)
- `@anthropic-ai/claude-agent-sdk` v0.2.77 `sdk.d.ts` -- `AgentDefinition`, `AgentMcpServerSpec`, `McpStdioServerConfig` types, `agents` query option, `task_progress`/`task_notification` event types (read from installed package)
- Existing codebase -- `ccodeBrain.ts`, `vaultConfig.ts`, `vaultHealth.ts`, `.mcp.json`, `telegram/bot.ts` (read from project)
- Phase 13 Research (`13-RESEARCH.md`) -- Sub-agent scoped MCP pattern, form-filler definition, vault health management

### Secondary (MEDIUM confidence)
- [Microsoft Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp) -- Tool capabilities, headed/headless config, accessibility-first approach
- [Autify Playwright MCP Guide](https://autify.com/blog/playwright-mcp) -- Screenshot save-to-disk behavior, tool response format
- [grammY documentation](https://grammy.dev/guide/files) -- `InputFile` class, `sendPhoto` API for screenshot delivery

### Tertiary (LOW confidence)
- Playwright MCP `--output-dir` flag -- Mentioned in some sources but not verified in current `@playwright/mcp` version. Needs validation during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All packages already installed/configured; SDK types read from source
- Sub-agent architecture: HIGH -- SDK `AgentDefinition` type is well-documented with examples; pattern proven in Phase 13
- Browser automation: HIGH -- Playwright MCP already in `.mcp.json` and working; tool capabilities verified
- CAPTCHA/2FA detection: MEDIUM -- Accessibility snapshot approach is sound but untested against real sites; may need refinement per-site
- Telegram screenshots: HIGH -- grammY `sendPhoto` is standard API; `InputFile` pattern is documented
- Token budget validation: MEDIUM -- `task_progress` usage field format unverified; may need runtime testing

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain; SDK and Playwright MCP are mature)
