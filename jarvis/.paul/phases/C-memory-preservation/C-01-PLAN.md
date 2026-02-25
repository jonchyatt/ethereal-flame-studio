---
phase: C-memory-preservation
plan: 01
type: execute
wave: 1
depends_on: ["B-01"]
files_modified:
  - package.json
  - src/lib/jarvis/intelligence/sdkBrain.ts
  - src/lib/jarvis/config.ts
  - src/lib/jarvis/intelligence/chatProcessor.ts
autonomous: false
---

<objective>
## Goal
Upgrade @anthropic-ai/sdk to latest, wire Notion MCP Connector into sdkBrain.ts, and relocate intelligence gems from custom Notion executors to a post-hook layer — so Claude interacts with Notion the way its brain intends (via MCP) while our gems survive as hooks and prompt enrichment.

## Purpose
Phase B created sdkBrain.ts but kept all Notion tools as custom executors. The user correctly identified this disconnects Claude from its natural MCP interaction pattern. The gems baked into our Notion executors (fuzzy matching, recurring task auto-creation, API workarounds) CAN be relocated:

- **Gem #12 (fuzzy matching)** → Claude searches Notion directly via MCP. This is BETTER — Claude can search, filter, and pick the right item itself.
- **Gem #13 (recurring task auto-creation)** → Post-tool-result hook in sdkBrain.ts. After any task completion, check if recurring → create next instance.
- **Gem #16 (Notion API workarounds)** → Notion's own MCP server likely handles these. If not, post-hook.

The result: Claude talks to Notion natively, our intelligence layer augments rather than replaces.

## Output
- Updated @anthropic-ai/sdk to latest
- sdkBrain.ts with MCP Connector support + post-tool-result hook system
- config.ts with MCP feature flag
- System prompt enrichment for recurring task awareness
- Verification that build passes and gems are preserved or relocated
</objective>

<context>
## Project Context
@jarvis/.paul/PROJECT.md
@jarvis/.paul/ROADMAP.md
@jarvis/.paul/phases/B-sdk-integration/B-01-SUMMARY.md

## Source Files
@src/lib/jarvis/intelligence/sdkBrain.ts (161 LOC — add MCP + hooks)
@src/lib/jarvis/intelligence/chatProcessor.ts (168 LOC — update tool routing)
@src/lib/jarvis/config.ts (56 LOC — add MCP flag)
@src/lib/jarvis/intelligence/systemPrompt.ts (259 LOC — add recurring task instruction)
@src/lib/jarvis/notion/toolExecutor.ts (lines 932-1018 — recurring task logic to relocate)
@src/lib/jarvis/notion/recentResults.ts (fuzzy matching — will be superseded by MCP search)

## Research
@jarvis/.paul/research/v4-intelligence-audit.md (17 gems inventory)
</context>

<acceptance_criteria>

## AC-1: SDK Upgraded
```gherkin
Given @anthropic-ai/sdk is at version 0.72.1
When npm install completes
Then @anthropic-ai/sdk is at latest stable version
And no existing imports or type usages break
```

## AC-2: MCP Connector Wired for Notion
```gherkin
Given sdkBrain.ts has a think() function
When enableMcpConnector is true and mcpServers is configured
Then the Anthropic API call includes mcp_servers param for Notion
And Claude can search/read/write Notion directly via MCP tools
And custom tools (memory, tutorial, panel) still execute locally
And when enableMcpConnector is false (default), behavior is identical to Phase B
```

## AC-3: Post-Hook Layer Works
```gherkin
Given a tool result returns from the brain (MCP or local)
When the result indicates a task was completed
And the task had a recurring frequency
Then the post-hook automatically creates the next recurring instance via Notion SDK
```

## AC-4: System Prompt Enriched
```gherkin
Given Claude is about to process a message
When the system prompt is assembled
Then it includes guidance about recurring tasks ("After completing a recurring task, confirm the next instance was created")
And it includes guidance about searching before acting ("When updating a task by name, search first to find the exact item")
```

## AC-5: Build Passes
```gherkin
Given all changes are complete
When npm run build executes
Then it completes with zero new errors (pre-existing local-agent errors excluded)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Upgrade SDK and add MCP Connector config</name>
  <files>package.json, src/lib/jarvis/config.ts</files>
  <action>
    1. Run `npm install @anthropic-ai/sdk@latest`
    2. If upgrade introduces type changes, note them for Task 2

    3. Add to config.ts JarvisConfig interface:
       ```
       enableMcpConnector: boolean   // default: false
       notionMcpUrl: string          // default: 'https://mcp.notion.com/mcp'
       notionOAuthToken: string      // from env NOTION_OAUTH_TOKEN (empty = disabled)
       ```
    4. Add env readers:
       - JARVIS_ENABLE_MCP → enableMcpConnector
       - NOTION_MCP_URL → notionMcpUrl (with default)
       - NOTION_OAUTH_TOKEN → notionOAuthToken

    Note: MCP will be OFF by default. Requires NOTION_OAUTH_TOKEN to be set.
    The existing NOTION_TOKEN (integration token) continues to work for custom executors
    as a fallback path.
  </action>
  <verify>npm run build passes; config.ts exports new fields</verify>
  <done>AC-1 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Wire MCP Connector + post-hook layer into sdkBrain.ts</name>
  <files>src/lib/jarvis/intelligence/sdkBrain.ts, src/lib/jarvis/intelligence/chatProcessor.ts</files>
  <action>
    1. Add MCP Connector path to sdkBrain.ts think() function:
       - Import config
       - When enableMcpConnector is true AND notionOAuthToken is set:
         - Use anthropic.beta.messages.create() with:
           - mcp_servers: [{ type: 'url', url: notionMcpUrl, name: 'notion',
             authorization_token: notionOAuthToken }]
           - betas: ['mcp-client-2025-11-20']
         - Notion tools are NOT in the local `tools` array (MCP provides them)
         - Custom tools (memory, tutorial, panel) remain in `tools` array
       - When enableMcpConnector is false:
         - Behavior identical to Phase B (all tools local)

    2. Add post-tool-result hook system to sdkBrain.ts:
       - New BrainRequest field: `onPostToolResult?: (name: string, input: Record<string, unknown>, result: string) => Promise<void>`
       - After each tool result (MCP or local), call the hook
       - Hook is fire-and-forget (errors logged, never block response)

    3. Update chatProcessor.ts createToolExecutor():
       - When MCP is enabled: only route memory/tutorial/panel tools locally
       - Add onPostToolResult callback that:
         a. Detects task completion patterns in MCP results
         b. If recurring task completed → create next instance via direct Notion SDK call
         c. Logs the side-effect for audit trail

    4. Handle the API shape difference:
       - beta.messages.create() may return different types than messages.create()
       - Ensure both paths produce compatible BrainResult
       - Test with enableMcpConnector=false first (existing behavior)

    5. DO NOT modify: memory/*, executive/*, resilience/*, tutorial/*
  </action>
  <verify>npm run build passes; sdkBrain.ts has conditional MCP path; post-hook fires</verify>
  <done>AC-2 and AC-3 satisfied</done>
</task>

<task type="auto">
  <name>Task 3: Enrich system prompt with relocated intelligence</name>
  <files>src/lib/jarvis/intelligence/systemPrompt.ts</files>
  <action>
    Add a small section to systemPrompt.ts (after the existing MEMORY MANAGEMENT section):

    NOTION INTEGRATION section:
    - "When updating a task by name, search Notion first to find the exact item before modifying it"
    - "After completing a task, check if it has a recurring frequency (Daily/Weekly/Monthly). If so, confirm the next instance was created."
    - "When asked about items by approximate name, use Notion search rather than guessing IDs"

    These instructions make Claude's MCP interactions smarter — they encode the
    intelligence that was previously in our fuzzy matching code and recurring task
    logic, but now as guidance for Claude's native MCP behavior.

    Keep the section small (5-8 lines). Do not modify existing personality, memory,
    or voice sections.
  </action>
  <verify>systemPrompt.ts has new NOTION INTEGRATION section; build passes</verify>
  <done>AC-4 satisfied</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    MCP Connector wired into sdkBrain.ts behind feature flag.
    Post-hook layer for recurring task auto-creation.
    System prompt enriched with Notion interaction guidance.
    SDK upgraded to latest.
  </what-built>
  <how-to-verify>
    1. Review the new code in sdkBrain.ts — MCP path and post-hook layer
    2. Review systemPrompt.ts — new NOTION INTEGRATION section
    3. Review config.ts — new MCP flags
    4. Confirm: with enableMcpConnector=false, behavior is IDENTICAL to Phase B
    5. Confirm: build passes (npm run build)
    6. Push to GitHub → auto-deploys → test on live site with MCP OFF first
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/memory/* (entire memory system — Gems #2-7, #15)
- src/lib/jarvis/executive/* (briefings, nudges, check-ins — Gems #9-11, #14, #16)
- src/lib/jarvis/resilience/* (circuit breaker, error classifier)
- src/lib/jarvis/tutorial/* (tutorial system)
- src/lib/jarvis/intelligence/memoryTools.ts (memory tool schemas)
- src/lib/jarvis/intelligence/tools.ts (tool schemas — still needed for MCP-off fallback)

## SCOPE LIMITS
- MCP Connector is feature-flagged OFF by default
- Notion OAuth token setup is NOT in scope (manual env var)
- Do not remove existing Notion tool executors (they're the fallback when MCP is off)
- Do not remove recentResults.ts fuzzy matching (still used when MCP is off)
- SDK upgrade is @anthropic-ai/sdk only — no other dependency upgrades

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes (excluding pre-existing local-agent errors)
- [ ] @anthropic-ai/sdk version is latest stable
- [ ] config.ts has enableMcpConnector, notionMcpUrl, notionOAuthToken
- [ ] sdkBrain.ts has conditional MCP path + post-hook layer
- [ ] chatProcessor.ts has recurring task post-hook callback
- [ ] systemPrompt.ts has NOTION INTEGRATION section
- [ ] With enableMcpConnector=false, behavior identical to Phase B
- [ ] Memory system files untouched
- [ ] Executive function files untouched
</verification>

<success_criteria>
- SDK upgraded to latest
- MCP Connector wired for Notion behind feature flag
- Post-hook layer handles recurring task auto-creation
- System prompt teaches Claude to search before acting
- Existing behavior preserved when flag is off
- Build passes with zero new errors
</success_criteria>

<output>
After completion, create `jarvis/.paul/phases/C-memory-preservation/C-01-SUMMARY.md`
</output>
