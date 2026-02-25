---
phase: B-sdk-integration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/intelligence/chatProcessor.ts
  - src/lib/jarvis/intelligence/sdkBrain.ts (new)
  - src/app/api/jarvis/chat/route.ts
autonomous: false
---

<objective>
## Goal
Replace Jarvis's custom Claude API tool loop with a smarter brain while preserving the intelligence layer. First validate the right integration approach for Vercel serverless, then implement it.

## Purpose
The current chatProcessor.ts manually calls `anthropic.messages.create()` in a loop (max 5 iterations), hand-routes tools to 3 executors (Notion, Memory, Tutorial), and manages message history. This works but:
- We maintain the tool loop ourselves (fragile, hard to extend)
- No MCP protocol support (can't easily add new tool servers)
- Locked to a single model (claude-haiku-4-5)
- No native session resumption

The brain swap upgrades the plumbing while the intelligence layer (system prompt, memory, executive function) stays untouched.

## Output
- New `sdkBrain.ts` module that replaces the tool execution in chatProcessor.ts
- Updated `chat/route.ts` to use the new brain
- chatProcessor.ts refactored to use sdkBrain instead of direct Anthropic calls
</objective>

<context>
## Project Context
@jarvis/.paul/PROJECT.md
@jarvis/.paul/ROADMAP.md
@jarvis/.paul/research/v4-intelligence-audit.md

## Source Files
@src/lib/jarvis/intelligence/chatProcessor.ts (263 LOC — the tool loop to replace)
@src/app/api/jarvis/chat/route.ts (131 LOC — SSE endpoint)
@src/lib/jarvis/intelligence/systemPrompt.ts (259 LOC — PRESERVE, do not modify)
@src/lib/jarvis/intelligence/tools.ts (404 LOC — tool schemas, 17 Notion + panel tools)
@src/lib/jarvis/intelligence/memoryTools.ts (7 memory tools)
@src/lib/jarvis/intelligence/ClaudeClient.ts (244 LOC — browser SSE client)

## Critical Research Finding
The Claude Code SDK (`@anthropic-ai/claude-code`) spawns a subprocess (`cli.js`) and stores session JSONL files on disk. Jarvis runs on Vercel serverless where:
- Filesystem is ephemeral (only `/tmp`, wiped between cold starts)
- Function timeout is 10s default (60s Pro, 300s Enterprise)
- Subprocess spawning IS supported but adds cold start latency
- MCP servers in `.mcp.json` also need subprocess spawning

This means the full ClaudeClaw approach (SDK `query()` with `.mcp.json`) may have issues in serverless. Three alternatives exist — see decision checkpoint below.
</context>

<acceptance_criteria>

## AC-1: Brain Module Exists
```gherkin
Given the new sdkBrain.ts module exists
When processChatMessage calls it with a system prompt, messages, and tool definitions
Then it returns a response text and list of tools used
And the intelligence layer (system prompt, memory injection) is untouched
```

## AC-2: Tool Execution Works
```gherkin
Given a user message that triggers tool use (e.g., "show my tasks")
When the brain processes it
Then Notion tools execute correctly and return results
And memory tools execute correctly
And tutorial tools execute correctly
```

## AC-3: SSE Streaming Preserved
```gherkin
Given a chat request from the browser
When the brain processes it
Then tool_use and tool_result events stream via SSE in real-time
And the final text response streams as a text event
And a done event signals completion
```

## AC-4: Build Succeeds
```gherkin
Given all changes are complete
When npm run build executes
Then it completes with zero errors
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Research SDK serverless compatibility</name>
  <files>package.json (read only)</files>
  <action>
    Investigate whether @anthropic-ai/claude-code SDK works in Vercel serverless:
    1. Check if the SDK's query() spawns a child process or runs in-process
    2. Check session storage requirements (JSONL on disk vs in-memory)
    3. Check MCP server startup requirements
    4. Test a minimal query() call in a Next.js API route context
    5. Document findings for the decision checkpoint

    Also investigate alternative: using @anthropic-ai/sdk (the regular Anthropic SDK)
    with enhanced tool loop — this is what chatProcessor.ts already uses, just needs
    improvement (multi-model support, better error handling, MCP client protocol).

    Also investigate: @modelcontextprotocol/sdk for adding MCP client support to the
    existing Anthropic API approach.
  </action>
  <verify>Written findings with clear recommendation on which approach works in Vercel serverless</verify>
  <done>Decision checkpoint has all information needed to choose approach</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <decision>Which integration approach for Jarvis's brain in Vercel serverless?</decision>
  <context>
    The brain swap needs to work in Vercel serverless. The choice affects all subsequent phases.
    Research from Task 1 will inform this. Here are the expected options:
  </context>
  <options>
    <option id="option-a">
      <name>Claude Code SDK (full ClaudeClaw pattern)</name>
      <pros>
        - Proven in ClaudeClaw
        - SDK handles entire tool loop, retries, MCP
        - Session resumption built-in
        - Future SDK improvements come free
      </pros>
      <cons>
        - Spawns subprocess — cold start penalty in serverless
        - Session JSONL needs persistent disk (not available in Vercel)
        - MCP servers also spawn subprocesses
        - May hit function timeout on complex queries
        - Overkill if we're keeping custom tools anyway
      </cons>
    </option>
    <option id="option-b">
      <name>Enhanced Anthropic API + MCP Client</name>
      <pros>
        - Already works in serverless (current approach)
        - Add MCP client via @modelcontextprotocol/sdk for Notion
        - Keep custom tool execution for memory/tutorial/panel tools
        - No subprocess overhead
        - Full control over streaming, timeouts, retries
        - Can use different models per query type (Haiku for CRUD, Sonnet for complex)
      </pros>
      <cons>
        - Still maintaining our own tool loop
        - MCP client integration is additional work
        - Don't get future SDK improvements for free
      </cons>
    </option>
    <option id="option-c">
      <name>Hybrid: Vercel frontend + separate SDK server</name>
      <pros>
        - SDK runs properly on long-lived server
        - Vercel stays lightweight (just proxy)
        - Could share server with Agent Zero Docker
        - Best of both worlds
      </pros>
      <cons>
        - Extra infrastructure to maintain
        - Network latency between Vercel and SDK server
        - More complex deployment
        - Dependency on second server being up
      </cons>
    </option>
  </options>
  <resume-signal>Select: option-a, option-b, or option-c (or suggest a combination)</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Implement chosen brain module</name>
  <files>
    src/lib/jarvis/intelligence/sdkBrain.ts (new),
    src/lib/jarvis/intelligence/chatProcessor.ts,
    src/app/api/jarvis/chat/route.ts
  </files>
  <action>
    Based on the decision checkpoint result, implement the new brain:

    **If Option A (Claude Code SDK):**
    - Install @anthropic-ai/claude-code
    - Create sdkBrain.ts wrapping query() with:
      - System prompt prepended to prompt message
      - Memory context prepended to prompt message
      - SSE event forwarding from async generator
      - Session ID management via Turso (not JSONL)
    - Create .mcp.json for Notion server
    - Update chatProcessor.ts to call sdkBrain instead of anthropic.messages.create
    - Preserve: Agent Zero routing (Gem #8), fire-and-forget persistence, summarization trigger

    **If Option B (Enhanced Anthropic API + MCP Client):**
    - Create sdkBrain.ts wrapping anthropic.messages.create with:
      - Multi-model support (Haiku for CRUD, Sonnet for complex via isComplexQuery)
      - Improved tool loop (configurable max iterations, parallel execution preserved)
      - MCP client connection to Notion server via @modelcontextprotocol/sdk
      - Keep custom tool execution for memory/tutorial tools
    - Update chatProcessor.ts to use sdkBrain
    - Preserve: All existing intelligence (Agent Zero routing, SSE callbacks, persistence)

    **If Option C (Hybrid):**
    - Create sdkBrain.ts as HTTP client to external SDK server
    - Create separate sdk-server/ directory with standalone query() wrapper
    - Update chatProcessor.ts to call sdkBrain
    - Preserve: All existing intelligence

    **For ALL options — PRESERVE these (do not modify):**
    - systemPrompt.ts (personality, memory injection)
    - tools.ts tool schemas (may be re-registered differently but same definitions)
    - memoryTools.ts tool schemas
    - Memory retrieval/scoring/decay (retrieval.ts, decay.ts)
    - Preference inference (preferenceInference.ts)
    - Executive function (Scheduler, BriefingFlow, CheckInManager, etc.)
    - Fuzzy title resolution (recentResults.ts)
    - Error self-healing loop
    - ClaudeClient.ts browser-side SSE client (may need minor updates for new event format)
  </action>
  <verify>npm run build completes with zero errors</verify>
  <done>AC-1, AC-2, AC-3, AC-4 satisfied: Brain module works, tools execute, SSE streams, build passes</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/intelligence/systemPrompt.ts (personality — Gem #1)
- src/lib/jarvis/memory/* (entire memory system — Gems #2-7, #15)
- src/lib/jarvis/executive/* (briefings, nudges, check-ins — Gems #9-11, #14)
- src/lib/jarvis/notion/recentResults.ts (fuzzy matching — Gem #12)
- src/lib/jarvis/notion/toolExecutor.ts (recurring task auto-creation — Gem #13)
- src/lib/jarvis/resilience/* (circuit breaker, error classifier)
- src/lib/jarvis/tutorial/* (tutorial system)

## SCOPE LIMITS
- This plan replaces the TOOL LOOP only, not the intelligence layer
- No UI changes in this plan (that's Phase E)
- No memory system changes (that's Phase C)
- No self-improvement loop (that's Phase D)
- Do not change the system prompt content or personality
- Do not change tool executor business logic (only how tools are registered/called)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] sdkBrain.ts exists and exports a function matching ProcessChatResult interface
- [ ] chatProcessor.ts calls sdkBrain instead of direct anthropic.messages.create
- [ ] SSE streaming still works (tool_use, tool_result, text, done events)
- [ ] Agent Zero routing preserved (complex queries still detected)
- [ ] All 3 tool executor paths work (Notion, Memory, Tutorial)
- [ ] No intelligence layer files modified
</verification>

<success_criteria>
- Brain module implemented with chosen approach
- All existing tool execution paths preserved
- SSE streaming to browser preserved
- Build passes with zero errors
- Intelligence layer completely untouched
</success_criteria>

<output>
After completion, create `jarvis/.paul/phases/B-sdk-integration/B-01-SUMMARY.md`
</output>
