# Architecture Patterns

**Domain:** Autonomous life agent with browser automation, vault credential injection, sub-agent spawning, and research knowledge library
**Researched:** 2026-03-16
**Overall Confidence:** HIGH (verified against official SDK docs, Bitwarden MCP repo, Playwright MCP repo, existing Jarvis source)

## Recommended Architecture

### Current State (Jarvis v4.x)

```
User (Web UI / Telegram / Voice)
     |
     v
chatProcessor.ts (orchestrator)
     |
     +--- providerRouter.ts --- routeToCCodeSdk() ---> ccodeBrain.ts (query() via @anthropic-ai/claude-code)
     |                      \-- routeToApi()     ---> sdkBrain.ts (Anthropic API direct)
     |
     +--- toolBridge.ts (MCP server, 5-way routing)
     |       +--- Notion tools (executeNotionTool)
     |       +--- Memory tools (executeMemoryTool)
     |       +--- Calendar tools (executeCalendarTool)
     |       +--- Tutorial tools (executeTutorialTool)
     |       +--- Academy tools (executeAcademyTool)
     |
     +--- evaluator.ts + reflectionLoop.ts (self-improvement)
     |
     +--- cronRunner.ts (PM2 process: daily reflection + memory decay)
     |
     +--- telegram/bot.ts (grammY long-polling, separate PM2 process)
```

**PM2 Processes:** jarvis-web (Next.js :3001), jarvis-mcp (stdio tool server), jarvis-cron (node-cron), jarvis-tunnel (cloudflared)

### Target State (Jarvis v5.0)

```
User (Web UI / Telegram / Voice)
     |
     v
chatProcessor.ts (orchestrator) --- MODIFIED
     |
     +--- providerRouter.ts --- routeToCCodeSdk() --- MODIFIED
     |       |
     |       v
     |   ccodeBrain.ts --- MODIFIED (adds agents param, Playwright MCP, Bitwarden MCP)
     |       |
     |       +--- SubAgent: "browser-worker" (Playwright MCP, read-only tools)
     |       +--- SubAgent: "researcher" (WebSearch, WebFetch, Read, Grep)
     |       +--- SubAgent: "form-filler" (Playwright MCP + Bitwarden MCP)
     |
     +--- toolBridge.ts --- MODIFIED (adds vault, browser, research, scheduler tools)
     |       +--- Existing: Notion, Memory, Calendar, Tutorial, Academy
     |       +--- NEW: research tools (save-finding, search-findings, list-topics)
     |       +--- NEW: scheduler tools (add-task, remove-task, list-tasks, edit-task)
     |       +--- NEW: approval tools (request-approval, check-approval)
     |
     +--- NEW: research/researchStore.ts (SQLite + vector search)
     +--- NEW: scheduler/taskStore.ts (CRUD scheduled tasks in SQLite)
     +--- NEW: approval/approvalGateway.ts (Telegram inline keyboard approval flow)
     |
     +--- cronRunner.ts --- MODIFIED (reads task config from DB, dynamic scheduling)
     |
     +--- telegram/bot.ts --- MODIFIED (approval gateway callbacks)
```

## New Components Required

### 1. Bitwarden Vault Integration (via MCP)

**Responsibility:** Credential retrieval without LLM exposure.

**Architecture Decision:** Use `@bitwarden/mcp-server` as an MCP server rather than wrapping the Bitwarden CLI directly. The Bitwarden MCP server already handles session management, locking, syncing, and CRUD operations with proper security boundaries. This is the officially supported integration path as of mid-2025.

**Confidence:** HIGH (verified via [Bitwarden MCP GitHub](https://github.com/bitwarden/mcp-server) and [npm package](https://www.npmjs.com/package/@bitwarden/mcp-server))

```
Integration:
  .mcp.json adds:
    "bitwarden": {
      "command": "npx",
      "args": ["-y", "@bitwarden/mcp-server"],
      "env": { "BW_SESSION": "${BW_SESSION}" }
    }

  ccodeBrain.ts adds to allowedTools:
    'mcp__bitwarden__*'

  Flow:
    1. BW_SESSION obtained at startup via `bw unlock --raw` (stored in env, never in code)
    2. Agent queries vault: mcp__bitwarden__retrieve_item({ name: "Electric Company" })
    3. Bitwarden MCP returns credentials to Claude Code SDK context
    4. Claude uses browser_fill via Playwright MCP to inject credentials
    5. Credentials exist only in the SDK subprocess memory, never persisted
```

**Security Model:**
- BW_SESSION env var set once per PM2 restart (manual `bw unlock` at boot)
- Bitwarden MCP server runs locally only, never exposed to network
- Claude sees credentials transiently during form-filling but cannot persist them (no Write tool for credential paths)
- Approval gateway required before any form submission

**Critical constraint:** The Bitwarden MCP server documentation explicitly states it must never be exposed over a network. Since Jarvis runs entirely locally on Jon's Windows machine via PM2, this constraint is naturally satisfied.

**No custom vaultService.ts needed.** The MCP server IS the vault service. The only Jarvis-side code is the .mcp.json configuration entry and the allowed tools list in ccodeBrain.ts.

### 2. Browser Automation (via Playwright MCP)

**Responsibility:** Managed browser for form-filling and web automation.

**Architecture Decision:** Use `@playwright/mcp` (already in .mcp.json) as the primary browser automation layer. The Playwright MCP server exposes browser actions as MCP tools that Claude Code SDK can call directly. No custom browser wrapper needed -- the MCP server IS the wrapper.

**Confidence:** HIGH (Playwright MCP already configured in project's .mcp.json, verified via [GitHub](https://github.com/microsoft/playwright-mcp))

```
Current .mcp.json already has:
  "playwright": {
    "command": "cmd",
    "args": ["/c", "npx", "-y", "@playwright/mcp@latest"]
  }

What changes:
  1. ccodeBrain.ts adds 'mcp__playwright__*' to JARVIS_ALLOWED_TOOLS
  2. Sub-agents get Playwright MCP access for browser tasks
  3. Form-filler sub-agent combines Playwright + Bitwarden MCP
```

**Key Playwright MCP capabilities (via accessibility tree, not screenshots):**
- `browser_navigate` -- go to URL
- `browser_click` -- click element by accessibility ref
- `browser_fill` -- fill form field
- `browser_snapshot` -- get accessibility snapshot (2-5KB vs 100KB+ for screenshot)
- `browser_take_screenshot` -- for audit trail and approval UI
- `browser_select_option` -- dropdown selection
- `browser_handle_dialog` -- accept/dismiss alerts

**No custom browserEngine.ts needed.** The Playwright MCP server manages browser lifecycle. The SDK spawns it on demand from .mcp.json configuration.

### 3. Sub-Agent Definitions (in `ccodeBrain.ts`)

**Responsibility:** Specialized agent instances for browser work, research, and form-filling.

**Architecture Decision:** Use the Claude Agent SDK `agents` parameter on `query()` to define programmatic sub-agents. Each sub-agent gets isolated context, restricted tools, and specialized system prompts.

**Confidence:** HIGH (verified via [official SDK subagents docs](https://platform.claude.com/docs/en/agent-sdk/subagents))

**Important SDK note:** The existing codebase imports from `@anthropic-ai/claude-code`. The Agent SDK docs reference `@anthropic-ai/claude-agent-sdk`. Based on the official TypeScript reference, the newer package is `@anthropic-ai/claude-agent-sdk` which provides the `agents` option. The existing `@anthropic-ai/claude-code` package may also support `agents` if it's been updated -- verify at build time.

```typescript
// In ccodeBrain.ts, modify thinkWithSdk():

const conversation = query({
  prompt: userMessage,
  options: {
    cwd,
    customSystemPrompt: systemPrompt,
    allowedTools: [
      ...JARVIS_ALLOWED_TOOLS,
      'mcp__playwright__*',
      'mcp__bitwarden__*',
      'Agent',  // Required for sub-agent invocation
    ],
    permissionMode: 'bypassPermissions',
    env: cleanEnv,
    agents: {
      'browser-worker': {
        description: 'Navigates websites, takes screenshots, reads page content. Use for browsing, research, and page inspection.',
        prompt: 'You are a browser automation specialist. Navigate pages, extract information, take screenshots for audit trails. Never fill forms or submit data -- hand off to form-filler for that.',
        tools: ['mcp__playwright__*', 'Read', 'Grep'],
        model: 'sonnet',
      },
      'form-filler': {
        description: 'Fills and submits web forms using credentials from vault. Use for bill pay, applications, account logins.',
        prompt: `You are a secure form-filling agent. You retrieve credentials from Bitwarden vault and fill web forms. RULES:
1. Take a screenshot BEFORE and AFTER every form submission
2. NEVER log, save, or repeat credentials in your response
3. Stop and report if you encounter CAPTCHAs or unexpected security prompts
4. Only submit forms when the parent agent has received explicit user approval`,
        tools: ['mcp__playwright__*', 'mcp__bitwarden__*'],
        model: 'sonnet',
      },
      'researcher': {
        description: 'Deep research specialist. Use for grant discovery, credit research, market analysis, information gathering.',
        prompt: 'You are a research specialist for Jonathan\'s life agent. Gather comprehensive information, cite sources, and structure findings for later retrieval. Focus on actionable intelligence.',
        tools: ['WebSearch', 'WebFetch', 'Read', 'Grep', 'Glob', 'mcp__jarvis-tools__save_research_finding'],
        model: 'sonnet',
      },
    },
  },
});
```

**Key SDK sub-agent behaviors:**
- Sub-agents cannot spawn their own sub-agents (no nested delegation)
- Each runs in fresh context -- only the prompt string passes from parent
- Multiple sub-agents can run concurrently (parallel research)
- Parent receives only the sub-agent's final message (context isolation)
- Sub-agents inherit project CLAUDE.md but not parent conversation history
- Windows caveat: sub-agents with very long prompts may fail due to 8191-char command line limit

### 4. Research Store (`research/researchStore.ts`)

**Responsibility:** Structured storage and retrieval of research findings for later use in form-filling.

**Architecture Decision:** Extend the existing SQLite + Drizzle ORM schema (already used for tasks, bills, goals, habits, memory). Add `research_topics` and `research_findings` tables. Leverage existing vector memory (BM25 + semantic via vectorSearch.ts) for search.

**Confidence:** MEDIUM (pattern is sound, follows existing codebase conventions, but specific schema needs validation during implementation)

```
New schema additions (in research/schema.ts):

research_topics
  - id, name, category (grants|credit|bills|general), status (active|archived)
  - createdAt, updatedAt

research_findings
  - id, topicId (FK), title, content (markdown), source_url
  - confidence (high|medium|low), tags (JSON array)
  - expires_at (some findings are time-sensitive, e.g., grant deadlines)
  - createdAt, updatedAt
```

**MCP tools to expose (via toolBridge.ts):**
- `save_research_finding` -- store a structured finding with topic, confidence, tags
- `search_research` -- semantic search across findings (reuse vectorSearch.ts)
- `list_research_topics` -- list topics with finding counts
- `get_research_topic` -- all findings for a topic (used during form-filling)
- `archive_research_topic` -- mark as no longer active

**CrewAI-inspired pattern:** CrewAI uses a 4-part memory architecture (short-term, long-term, entity, procedural). For Jarvis research, the equivalent mapping is:
- **Short-term:** Current session findings (in conversation context)
- **Long-term:** research_findings table (persisted across sessions)
- **Entity:** research_topics (organizational entities like "Amber Grant", "Capital One Spark")
- **Procedural:** The sub-agent prompts themselves encode the research procedure

### 5. Approval Gateway (`approval/approvalGateway.ts`)

**Responsibility:** Telegram-based approval flow for sensitive actions (payments, form submissions).

**Architecture Decision:** Extend existing Telegram bot with approval-specific inline keyboards. Store pending approvals in SQLite with timeout.

```
Flow:
  1. form-filler sub-agent completes form, takes screenshot
  2. Parent agent calls request_approval MCP tool
  3. approvalGateway sends Telegram message with screenshot + action summary
  4. Jon taps Approve / Reject / Modify
  5. Callback updates approval record in DB
  6. Parent agent polls/receives approval status
  7. If approved: form-filler submits
  8. If rejected: abort with reason logged

Schema:

pending_approvals
  - id, action_type (payment|submission|login), description
  - screenshot_path, amount (nullable), status (pending|approved|rejected)
  - expires_at, responded_at, response_note
  - createdAt
```

**New Telegram callbacks in bot.ts:**
- `approval:approve:{id}` -- approve pending action
- `approval:reject:{id}` -- reject with reason prompt
- `approval:modify:{id}` -- request changes

**Timeout:** Unapproved actions expire after 4 hours (configurable). Critical for bill-pay deadlines vs. abandoned approvals.

**Async design note:** The approval flow is inherently asynchronous. The initial SDK `query()` call that requests approval should complete after sending the Telegram message. When the user approves, a new `thinkWithSdk()` call resumes the workflow. This avoids keeping an SDK session alive (and burning rate limits) while waiting for human response.

### 6. Flexible Scheduler (`scheduler/taskStore.ts`)

**Responsibility:** CRUD management of scheduled tasks, replacing hardcoded cron schedules.

**Architecture Decision:** Store task definitions in SQLite, load dynamically in cronRunner.ts at startup and on changes. Each task has a cron expression, a brain prompt, and enabled/disabled status.

```
Schema:

scheduled_tasks
  - id, name, description
  - cron_expression (e.g., '0 5 * * *')
  - brain_prompt (what the agent should do when triggered)
  - enabled (boolean), system (boolean -- protects built-in tasks from deletion)
  - last_run_at, last_result, last_error
  - createdAt, updatedAt

MCP tools:
  - add_scheduled_task
  - edit_scheduled_task
  - remove_scheduled_task
  - list_scheduled_tasks
  - toggle_scheduled_task (enable/disable)
```

**cronRunner.ts modification:**
```
Current: Hardcoded cron.schedule() calls
Target:  On startup, load all enabled tasks from DB
         Schedule each via node-cron
         Watch for DB changes (poll every 60s or on MCP tool call)
         Hot-reload: reschedule on add/edit/remove
         Each task execution: spawn thinkWithSdk() with the task's brain_prompt

Migration: Existing hardcoded tasks become DB records with system=true
```

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| ccodeBrain.ts | SDK query orchestration, sub-agent definitions | providerRouter, MCP servers (Playwright, Bitwarden, jarvis-tools) |
| chatProcessor.ts | Message routing, persistence, evaluation | ccodeBrain, toolBridge, evaluator |
| toolBridge.ts (MCP server) | Tool registration and execution routing | All tool executors (existing 5 + new 3) |
| research/researchStore.ts | Research CRUD + search | SQLite, vectorSearch.ts |
| approval/approvalGateway.ts | Approval lifecycle management | Telegram bot, SQLite |
| scheduler/taskStore.ts | Scheduled task CRUD | SQLite, cronRunner |
| cronRunner.ts | Task execution at scheduled times | taskStore, ccodeBrain |
| telegram/bot.ts | User interface + approval callbacks | chatProcessor, approvalGateway |

## Existing Components Requiring Modification

### 1. `ccodeBrain.ts` -- SIGNIFICANT CHANGES

**What changes:**
- Add `agents` parameter to `query()` options for sub-agent definitions
- Add `'Agent'` to `JARVIS_ALLOWED_TOOLS` (required for sub-agent invocation)
- Add `'mcp__playwright__*'` and `'mcp__bitwarden__*'` to allowed tools
- Add sub-agent event detection in the message loop (detect `tool_use` where `name === 'Agent'`)
- May need to switch import from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk`

**Risk:** LOW -- additive changes, existing flow unaffected unless new tools are invoked.

### 2. `chatProcessor.ts` -- MODERATE CHANGES

**What changes:**
- Add routing for new tool categories (research, scheduler, approval)
- Remove Agent Zero routing logic (A0 sunset): delete `isComplexQuery()`, `COMPLEX_REASONING_PATTERNS`, A0 routing block
- Remove `sendToAgentZero` and `getAgentZeroStatus` imports
- Add `onPostToolResult` hooks for approval tracking

**Risk:** LOW -- mostly removing dead code (A0 routing) and adding new tool name sets following existing pattern.

### 3. `.mcp.json` -- ADD BITWARDEN SERVER

```json
{
  "mcpServers": {
    "jarvis-tools": { "..." },
    "notion": { "..." },
    "playwright": { "..." },
    "bitwarden": {
      "command": "npx",
      "args": ["-y", "@bitwarden/mcp-server"],
      "env": { "BW_SESSION": "${BW_SESSION}" }
    }
  }
}
```

**Risk:** LOW -- additive config change.

### 4. `toolBridge.ts` -- ADD NEW TOOL CATEGORIES

**What changes:**
- Import and register research, scheduler, and approval tool executors
- Add tool name sets for routing (following exact same pattern as existing 5 categories)
- Add new tool definitions to `getAllToolDefinitions()`

**Risk:** LOW -- follows established pattern exactly.

### 5. `config.ts` -- ADD FEATURE FLAGS

```typescript
// New flags in JarvisConfig interface
enableBrowserAutomation: boolean;    // Gate Playwright + form filling
enableVaultIntegration: boolean;     // Gate Bitwarden MCP
enableResearchLibrary: boolean;      // Gate research storage
enableApprovalGateway: boolean;      // Gate Telegram approvals
```

**Risk:** NONE -- additive.

### 6. `telegram/bot.ts` -- ADD APPROVAL CALLBACKS

**What changes:**
- New callback handlers for `approval:approve:{id}`, `approval:reject:{id}`, `approval:modify:{id}`
- New `/approve` command to list pending approvals
- Photo message support for sending form screenshots

**Risk:** LOW -- additive to existing callback routing.

### 7. `cronRunner.ts` -- DYNAMIC TASK LOADING

**What changes:**
- Replace hardcoded `cron.schedule()` calls with dynamic task loading from DB
- Add task execution via `thinkWithSdk()` (each task is a brain prompt)
- Add hot-reload capability (reschedule on DB changes)

**Risk:** MEDIUM -- this replaces the core scheduling mechanism. Existing hardcoded tasks (daily reflection at 5 AM) should be migrated as DB records with `system: true` flag to prevent accidental deletion.

### 8. `data/schema.ts` -- ADD TABLES

**What changes:**
- Add `research_topics`, `research_findings` tables
- Add `scheduled_tasks` table
- Add `pending_approvals` table
- Run Drizzle migration

**Risk:** LOW -- additive schema changes, existing tables untouched.

### 9. `ecosystem.config.js` -- NO CHANGES NEEDED

Playwright MCP and Bitwarden MCP run as MCP servers spawned by the Claude Code SDK process, not as separate PM2 processes. No new PM2 entries required.

## Data Flow: Bill Pay Workflow

```
1. User (Telegram): "Pay my electric bill"
2. chatProcessor.ts receives message, routes to ccodeBrain.ts
3. ccodeBrain.ts (parent agent):
   a. Queries Notion for bill details (amount, provider, due date)
   b. Delegates to 'browser-worker' sub-agent: "Navigate to [provider URL], find login page"
   c. browser-worker returns: page structure, login form identified
   d. Delegates to 'form-filler' sub-agent: "Log into [provider] using vault credentials, navigate to payment, fill amount [$X]"
   e. form-filler:
      - Calls mcp__bitwarden__retrieve_item for credentials
      - Calls mcp__playwright__browser_navigate to login page
      - Calls mcp__playwright__browser_fill for username/password
      - Calls mcp__playwright__browser_click to submit login
      - Navigates to payment page
      - Fills payment amount
      - Takes screenshot of filled form
      - Returns screenshot + summary to parent
   f. Parent agent calls request_approval MCP tool
4. approvalGateway.ts sends Telegram message with screenshot
5. Jon taps "Approve"
6. approvalGateway.ts updates DB, triggers new thinkWithSdk() call
7. New SDK session delegates to form-filler: "Submit the payment"
8. form-filler clicks submit, takes confirmation screenshot
9. Parent updates Notion bill status to "paid"
10. Parent responds via Telegram: "Electric bill paid. Confirmation screenshot saved."
```

## Data Flow: Research-then-Form-Fill (Grant Application)

```
1. User: "Research and apply for the Amber Grant"
2. Parent agent delegates to 'researcher' sub-agent:
   - WebSearch for Amber Grant details, deadlines, past winners
   - WebFetch official grant page
   - Calls mcp__jarvis-tools__save_research_finding for each structured finding
3. researcher returns: structured brief with eligibility, deadlines, requirements
4. Parent generates application plan from findings + Notion org profile
5. Parent sends plan to Telegram for approval (via request_approval tool)
6. After approval, parent delegates to 'form-filler':
   - Parent passes research findings summary in the delegation prompt
   - Opens grant application URL
   - Fills each field using research + org profile data
   - Screenshots at each step
   - Returns filled form for final approval
7. After final approval, form-filler submits
8. Parent updates Notion with submission record
```

## Patterns to Follow

### Pattern 1: MCP-First Integration

**What:** Prefer MCP servers over custom wrappers for external service integration.
**When:** Any time a service has an official or well-maintained MCP server.
**Why:** The Claude Code SDK natively manages MCP server lifecycle (spawn, communicate, cleanup). Custom wrappers duplicate this and lose SDK-level error handling.

**Apply to:**
- Browser automation: `@playwright/mcp` (already configured)
- Vault: `@bitwarden/mcp-server` (add to .mcp.json)
- Notion: `@notionhq/notion-mcp-server` (already configured)

### Pattern 2: Sub-Agent Delegation with Tool Restriction

**What:** Define sub-agents with minimal tool sets matching their role.
**When:** Tasks require different security levels or specialized behavior.
**Why:** Prevents the form-filler from doing research (wasting time), prevents the researcher from accessing the vault (security), prevents the browser-worker from modifying files.

**From OpenHands:** OpenHands isolates each agent session in a Docker container with full OS capabilities. For Jarvis, tool restriction on sub-agents achieves equivalent isolation without container overhead, since this is a single-user system running locally.

### Pattern 3: Approval-Before-Execution

**What:** Sensitive actions require explicit user approval via Telegram before execution.
**When:** Any action involving money, form submission, credential use, or irreversible changes.
**Why:** Safety net for autonomous operation during 12-14 hour hospital shifts.

**From AutoGPT:** AutoGPT's continuous mode with optional human approval gates. Jarvis makes approval mandatory for financial actions rather than optional.

### Pattern 4: Research-as-Knowledge (CrewAI Pattern)

**What:** Research findings stored as structured records with topic/confidence/tags, retrievable during form-filling.
**When:** Multi-step workflows where research phase and action phase are separated in time.
**Why:** Grants, credit applications, and corporate filings all follow research-then-apply workflows where research happens hours or days before action.

**From CrewAI:** CrewAI's knowledge sources pattern -- structured ingestion of varied content types into a searchable store with intelligent query rewriting. Jarvis adapts this as a simpler SQLite-backed store with the existing vector search infrastructure.

### Pattern 5: Existing Tool Routing Extension

**What:** Add new tool categories following the exact same pattern as existing 5-way routing in toolBridge.ts.
**When:** Adding research, scheduler, or approval tools.
**Why:** Consistency with established codebase patterns reduces bugs and cognitive load.

```typescript
// Existing pattern in toolBridge.ts -- just add more sets:
const researchToolNames = new Set(['save_research_finding', 'search_research', ...]);
const schedulerToolNames = new Set(['add_scheduled_task', 'edit_scheduled_task', ...]);
const approvalToolNames = new Set(['request_approval', 'check_approval', ...]);
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Custom Browser Wrapper

**What:** Building a custom Playwright wrapper (browserEngine.ts) that manages browser instances.
**Why bad:** Duplicates what `@playwright/mcp` already does. Adds maintenance burden, lifecycle bugs, and loses SDK-level error recovery.
**Instead:** Use Playwright MCP server directly. The SDK spawns and manages the browser process.

### Anti-Pattern 2: Credentials in System Prompt

**What:** Injecting vault credentials into the system prompt or conversation history.
**Why bad:** Credentials persist in conversation logs, session transcripts, and potentially memory.
**Instead:** Credentials flow through MCP tool calls only. The form-filler sub-agent sees them transiently during execution but cannot persist them (no Write tool access to credential-sensitive paths).

### Anti-Pattern 3: Monolithic Brain with All Tools

**What:** Giving the parent agent access to all tools including Playwright and Bitwarden directly.
**Why bad:** Bloats context with tool descriptions, makes the agent less focused, increases risk of the agent browsing when it should be thinking.
**Instead:** Parent delegates browser and vault work to sub-agents with restricted tool sets.

### Anti-Pattern 4: Polling for Approval

**What:** Having the agent poll the approval DB in a loop waiting for user response.
**Why bad:** Wastes SDK session time and Max plan rate limits. A single SDK session sitting idle while waiting for approval is a waste.
**Instead:** The approval flow is asynchronous. The initial task completes after requesting approval. A Telegram callback triggers a new `thinkWithSdk()` call to resume the workflow.

### Anti-Pattern 5: Separate PM2 Process per Capability

**What:** Adding jarvis-browser, jarvis-vault, jarvis-research as separate PM2 processes.
**Why bad:** MCP servers are spawned by the SDK on demand, not long-running processes. PM2 overhead, port management, and IPC complexity for no benefit.
**Instead:** MCP servers declared in .mcp.json, spawned by SDK when needed, cleaned up automatically.

### Anti-Pattern 6: Custom Vault Service Wrapper

**What:** Building `vault/vaultService.ts` to wrap Bitwarden CLI commands.
**Why bad:** The `@bitwarden/mcp-server` package already wraps the CLI with proper error handling, session management, and MCP protocol compliance. A custom wrapper duplicates this and introduces bugs.
**Instead:** Configure Bitwarden MCP in .mcp.json and access via `mcp__bitwarden__*` tools.

## Optimal Build Order (Dependency-Driven)

```
Phase 1: Foundation (no external dependencies)
  1a. Repo migration to standalone jarvis project
  1b. Research store schema + MCP tools
  1c. Flexible scheduler schema + MCP tools + cronRunner rewrite
  1d. Remove Agent Zero routing from chatProcessor.ts

Phase 2: Browser + Vault (depends on Phase 1a for clean repo)
  2a. Bitwarden MCP integration (.mcp.json + BW_SESSION setup)
  2b. Playwright MCP tool access (add to allowedTools in ccodeBrain.ts)
  2c. Sub-agent definitions in ccodeBrain.ts
  2d. Basic browser workflow test (navigate, screenshot, read page)

Phase 3: Approval Gateway (depends on Phase 2 for browser actions to approve)
  3a. Approval schema + approvalGateway service
  3b. Telegram bot approval callbacks + photo support
  3c. Integration test: browser action -> approval -> execution

Phase 4: End-to-End Workflows (depends on all above)
  4a. Bill pay workflow (browser + vault + approval)
  4b. Research workflow (researcher sub-agent + research store)
  4c. Grant application workflow (research + form-fill + approval)
  4d. Port Agent Zero scheduled tasks as DB records

Phase 5: Agent Zero Sunset
  5a. Verify all A0 capabilities absorbed
  5b. Port remaining A0 skills (Visopscreen, crypto)
  5c. Decommission A0 container and tunnel
```

**Build order rationale:**
- Phase 1 has zero dependencies on new external services -- pure refactoring and schema work
- Phase 2 introduces external service integration but no user-facing workflows yet
- Phase 3 adds the safety layer BEFORE any real-world automation runs
- Phase 4 connects everything into working workflows (the actual value delivery)
- Phase 5 is cleanup after verification that all A0 capabilities are absorbed

## Scalability Considerations

| Concern | At 1 user (Jon) | At scale (future) | Notes |
|---------|-----------------|---------------------|-------|
| Browser sessions | 1 Playwright instance via MCP | N/A (single-user system) | Playwright MCP manages lifecycle |
| Vault access | 1 BW_SESSION | Per-user sessions needed | Bitwarden MCP is local-only by design |
| Research storage | SQLite (more than sufficient) | Would need Postgres | SQLite handles single-user workloads trivially |
| Sub-agent concurrency | 2-3 concurrent sub-agents | Rate limit concern on Max plan | Monitor for throttling |
| Approval latency | Minutes (Jon checks Telegram) | N/A | Critical path for sensitive actions |
| Scheduled task volume | 10-20 tasks | Hundreds | node-cron handles this fine |

## Sources

- [Playwright MCP Server - GitHub](https://github.com/microsoft/playwright-mcp) -- official Microsoft MCP server for browser automation
- [Bitwarden MCP Server - GitHub](https://github.com/bitwarden/mcp-server) -- official Bitwarden MCP server for vault operations
- [Bitwarden MCP Server - npm](https://www.npmjs.com/package/@bitwarden/mcp-server) -- package details and configuration
- [Claude Agent SDK - Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents) -- official sub-agent API reference
- [Claude Agent SDK - TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- full SDK API including agents parameter
- [OpenHands Architecture](https://arxiv.org/abs/2511.03690) -- event-stream agent architecture, containerized execution pattern
- [CrewAI Knowledge Sources](https://docs.crewai.com/en/concepts/knowledge) -- structured research storage patterns
- [Playwright MCP Field Guide](https://medium.com/@adnanmasood/playwright-and-playwright-mcp-a-field-guide-for-agentic-browser-automation-f11b9daa3627) -- accessibility tree vs screenshots tradeoffs
- [Bitwarden MCP Security Model](https://cyberinsider.com/bitwarden-launches-mcp-server-to-enable-secure-ai-credential-management/) -- local-only deployment requirement
- Existing Jarvis source code: ccodeBrain.ts, chatProcessor.ts, providerRouter.ts, sdkBrain.ts, toolBridge.ts, cronRunner.ts, config.ts, telegram/bot.ts, data/schema.ts, .mcp.json
