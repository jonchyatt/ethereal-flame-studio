# Phase 16: Research & Applications - Research

**Researched:** 2026-03-17
**Domain:** MCP tool wiring, research storage, entity profiles, grant/credit application workflow orchestration
**Confidence:** HIGH

## Summary

Phase 16 is the capstone phase of Jarvis v5.0. All prior infrastructure converges here: the research store (Phase 12), vault credentials (Phase 13), sub-agents with browser automation (Phase 14), and the approval gateway (Phase 15). The core deliverable is wiring these existing pieces together -- not building new infrastructure. The research store exists but has zero MCP tools exposing it. The researcher sub-agent references `store_research`/`search_research` in its prompt but cannot actually call them. Entity profiles exist as a comprehensive markdown file but are not programmatically accessible. The grant application workflow follows the exact same multi-stage pattern as `billPayWorkflow.ts`.

The critical gap is the toolBridge -- it currently registers notion, calendar, memory, tutorial, academy, and scheduler tools, but has no research tools. The sub-agent registry gives the researcher `['WebSearch', 'WebFetch']` but not the `mcp__jarvis-tools__store_research` and `mcp__jarvis-tools__search_research` tools that were planned. The form-filler needs research data and entity profile data injected into its prompt context, not new tools.

**Primary recommendation:** Create research MCP tools (store_research, search_research, get_research_topic, list_research_topics), register them in toolBridge, add them to the researcher sub-agent's tool list, store entity profiles as research entries, then build the grant application workflow modeled exactly on billPayWorkflow.ts.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RESEARCH-01 | Research sub-agent stores structured findings in research library | Research MCP tools (store_research, search_research) must be created and wired into toolBridge + sub-agent registry. researchStore.ts already has full CRUD. |
| RESEARCH-02 | Research library supports structured fields with semantic search | researchEntries schema already has domain, topic, fieldName, fieldValue, source, confidence, tags, expiresAt. Keyword LIKE search is sufficient for Phase 16 (semantic search is a v6+ enhancement). |
| RESEARCH-03 | Form-filler retrieves research + business profile to auto-populate | Entity profiles need to be loaded into research_entries table. Form-filler sub-agent prompt gets research context injected before form-filling session. |
| RESEARCH-04 | Grant application workflow end-to-end | Follow billPayWorkflow.ts pattern: research -> check eligibility -> prepare form -> screenshot -> approve -> submit -> confirm. |
| RESEARCH-05 | Corporate credit application groundwork | Store credit research findings in research library with domain='credit'. Entity profile financial data serves both grant and credit workflows. |
</phase_requirements>

## Standard Stack

### Core (Already Built)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| researchStore.ts | Phase 12 | CRUD + LIKE search for research_entries | EXISTS -- needs MCP tools |
| subAgentRegistry.ts | Phase 14 | researcher, browser-worker, form-filler agents | EXISTS -- researcher needs tool updates |
| approvalGateway.ts | Phase 15 | requestApproval() with Telegram inline keyboard | EXISTS -- reuse as-is |
| billPayWorkflow.ts | Phase 15 | Multi-stage workflow pattern | EXISTS -- model grant workflow on this |
| toolBridge.ts | Phase 12 | Unified MCP tool routing | EXISTS -- needs research tools added |

### New Code Required
| Module | Purpose | Pattern To Follow |
|--------|---------|-------------------|
| researchTools.ts | Tool definitions for store_research, search_research, get_research_topic, list_research_topics | schedulerTools.ts |
| researchToolExecutor.ts | Execute research tool calls using researchStore | scheduler/toolExecutor.ts |
| grantApplicationWorkflow.ts | Multi-stage grant application orchestrator | billPayWorkflow.ts (exact same pattern) |
| entityProfileLoader.ts | Load entity profiles from markdown into research_entries | One-time import utility |

### No New Dependencies Required
All infrastructure exists. Phase 16 is wiring + workflow, not new library adoption.

## Architecture Patterns

### Recommended Project Structure (New Files Only)
```
src/lib/jarvis/
  research/
    researchStore.ts           # EXISTS
    researchTools.ts           # NEW — tool definitions
    researchToolExecutor.ts    # NEW — tool execution
  workflows/
    billPayWorkflow.ts         # EXISTS — model for grant workflow
    grantApplicationWorkflow.ts # NEW — grant application orchestrator
  data/
    entityProfiles.ts          # NEW — entity profile loader/accessor
```

### Pattern 1: MCP Tool Registration (Existing Pattern)
**What:** Every MCP tool needs: (1) tool definition with name/description/input_schema in a `*Tools.ts` file, (2) executor function in a `toolExecutor.ts` file, (3) registration in `toolBridge.ts` (import definitions + executor, add to `getAllToolDefinitions()`, add routing in `executeTool()`).

**Why this matters:** The researcher sub-agent references `mcp__jarvis-tools__store_research` and `mcp__jarvis-tools__search_research` in its prompt but these tools do not exist in the MCP server. The sub-agent literally cannot store research findings right now.

**Example from schedulerTools.ts:**
```typescript
// 1. Define tools (researchTools.ts)
export const researchTools: ToolDefinition[] = [
  {
    name: 'store_research',
    description: 'Store a structured research finding...',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: "Category: 'grant' | 'credit' | 'business' | 'general'" },
        topic: { type: 'string', description: "Topic name, e.g., 'Verizon Digital Ready Grant'" },
        field_name: { type: 'string', description: "Field name, e.g., 'deadline', 'eligibility', 'amount'" },
        field_value: { type: 'string', description: 'The structured value for this field' },
        source: { type: 'string', description: 'URL or document reference' },
        confidence: { type: 'string', description: "'high' | 'medium' | 'low'" },
        notes: { type: 'string', description: 'Additional context or notes' },
        tags: { type: 'string', description: 'JSON array string of tags' },
        expires_at: { type: 'string', description: 'ISO date when this finding expires' },
      },
      required: ['domain', 'topic', 'field_name', 'field_value'],
    },
  },
  // ... search_research, get_research_topic, list_research_topics
];

// 2. Create executor (researchToolExecutor.ts)
export async function executeResearchTool(name: string, input: Record<string, unknown>): Promise<string> {
  // Routes to researchStore functions
}

// 3. Register in toolBridge.ts
import { researchTools, researchToolNames } from '../research/researchTools';
import { executeResearchTool } from '../research/researchToolExecutor';
// Add to getAllToolDefinitions() and executeTool() routing
```

### Pattern 2: Multi-Stage Workflow (billPayWorkflow.ts Pattern)
**What:** The grant application workflow follows the exact same decomposition as bill payment:
1. **Research stage** (researcher sub-agent): Search web for grant details, store findings
2. **Eligibility check** (parent agent): Compare grant requirements against entity profile in research library
3. **Prepare application** (form-filler sub-agent): Navigate to grant portal, fill form using research + entity data, screenshot before submission
4. **Approve** (approval gateway): Send filled-form screenshot to Telegram, wait for Jon's approval
5. **Submit** (browser-worker sub-agent): Click submit, capture confirmation screenshot
6. **Confirm** (parent agent): Log result, notify via Telegram

**Why same pattern works:** The approval gateway is domain-agnostic. The form-filler already has Playwright + Bitwarden. The only new element is injecting research context into the form-filler's prompt.

**Example from billPayWorkflow.ts:**
```typescript
// Stage 1: Researcher gathers grant details and stores them
const researchPrompt = `Research the grant "${grantName}" at ${grantUrl}. Store all findings using store_research tool with domain='grant' and topic='${grantName}'. Extract: eligibility, deadline, amount, requirements, application_url.`;

// Stage 2: Parent checks eligibility by querying research_entries
const eligibility = await searchResearch('eligibility', 'grant');
const entityProfile = await getResearchByTopic('business', entityName);

// Stage 3: Form-filler gets research context in prompt
const fillPrompt = `Fill the grant application at ${applicationUrl}.
ENTITY PROFILE: ${JSON.stringify(entityFields)}
GRANT REQUIREMENTS: ${JSON.stringify(grantFields)}
APPLICATION TEMPLATES: [selected templates from grant-application-templates.md]
...`;

// Stage 4-6: Same as billPayWorkflow.ts
```

### Pattern 3: Entity Profiles as Research Entries
**What:** Store entity profile data in the `research_entries` table with domain='business', topic=entity name, and individual fields (EIN, mission statement, revenue, etc.) as separate rows.

**Why this approach:** The research store already exists with full CRUD and search. Adding a separate entity_profiles table would be redundant. The form-filler already knows how to query research findings. Entity profiles are just another category of structured research data.

**Structure:**
```
domain: 'business'
topic: 'Satori Living Foundation'
fieldName: 'ein' | 'mission_statement_short' | 'entity_type' | 'year_formed' | ...
fieldValue: '93-3978916' | 'SATORI LIVING advances...' | 'Domestic Nonprofit Corporation' | '2023' | ...
confidence: 'high'
source: 'grant-entity-profiles.md'
```

### Anti-Patterns to Avoid
- **Separate entity_profiles table:** Unnecessary schema complexity. Use research_entries with domain='business'.
- **Semantic/vector search for Phase 16:** The existing LIKE search across topic, fieldName, fieldValue, notes, and tags is sufficient. Structured field names like 'eligibility', 'deadline', 'amount' make keyword search highly effective. Vector search is a v6+ enhancement.
- **Putting entity profile markdown into the form-filler prompt raw:** The 600+ line entity profiles file would blow the sub-agent token budget. Instead, query the specific entity from research_entries and inject only the relevant fields.
- **Autonomous form submission:** Every submission MUST go through requestApproval(). The grant-application-templates.md explicitly states: "One application, one draft, human review."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Research storage | New database table | researchStore.ts + research_entries table | Already built in Phase 12, full CRUD + search |
| Approval flow | Custom Telegram buttons | requestApproval() from approvalGateway.ts | Domain-agnostic, battle-tested in bill pay |
| Browser automation | Custom Playwright scripts | form-filler + browser-worker sub-agents | Already have CAPTCHA detection, screenshot capture, vault injection |
| Entity profile storage | Separate entity_profiles table | research_entries with domain='business' | Avoids schema proliferation, reuses existing search |
| Workflow orchestration | New orchestration framework | Direct async/await stages (billPayWorkflow pattern) | Simple, debuggable, no framework overhead |

**Key insight:** Phase 16 is 90% wiring existing infrastructure and 10% new code. The temptation is to over-engineer. Resist it. The billPayWorkflow.ts pattern proves that simple sequential stages with sub-agent calls work.

## Common Pitfalls

### Pitfall 1: Researcher Cannot Actually Store Research
**What goes wrong:** The researcher sub-agent's tool list is `['WebSearch', 'WebFetch']`. The prompt tells it to use `store_research` and `search_research`, but those MCP tools don't exist. The researcher can find information but has no way to persist it.
**Why it happens:** Phase 14 plan specified these tools but the implementation dropped them because the MCP tools hadn't been created yet.
**How to avoid:** Create researchTools.ts + researchToolExecutor.ts, register in toolBridge.ts, then update the researcher's tool list in subAgentRegistry.ts to include `'mcp__jarvis-tools__store_research'`, `'mcp__jarvis-tools__search_research'`, `'mcp__jarvis-tools__get_research_topic'`, `'mcp__jarvis-tools__list_research_topics'`.
**Warning signs:** Researcher agent responds with findings in text but nothing is saved to SQLite.

### Pitfall 2: Entity Profile Token Explosion
**What goes wrong:** The entity profiles markdown file is 600+ lines covering 5 ventures. Injecting it raw into a sub-agent prompt would consume 3000+ tokens of the sub-agent's budget, leaving little room for the actual form-filling instructions.
**Why it happens:** Entity profiles were designed for human reference, not for LLM injection.
**How to avoid:** Store entity profiles as individual research_entries rows. Query only the specific entity needed for a given application. Inject only the relevant 20-30 fields, not the entire file.
**Warning signs:** Form-filler sub-agent produces truncated or poor-quality responses.

### Pitfall 3: Grant Forms Are Not Like Bill Payment Portals
**What goes wrong:** Bill payment portals are relatively predictable (login, find payment, enter amount, submit). Grant application portals are wildly diverse -- multi-page forms, file uploads, dropdown selections, character-limited text areas, sometimes even video upload requirements.
**Why it happens:** Grants come from different funders with different platforms (HelloAlice, HelloSkip, direct websites, Submittable, etc.).
**How to avoid:** The grant workflow must be flexible enough to handle multi-page forms. The form-filler sub-agent needs higher maxTurns (20+) and explicit instructions about multi-page navigation. File upload steps should be flagged as "BLOCKED: requires file upload" for manual completion.
**Warning signs:** Form-filler gets stuck on page 2 of a 5-page application.

### Pitfall 4: Expired Grant Deadlines
**What goes wrong:** Researcher stores a grant with a deadline, but the deadline passes before Jonathan acts on it. The research data becomes stale and misleading.
**Why it happens:** Grant deadlines are real-world time-sensitive data.
**How to avoid:** Use the `expiresAt` field in research_entries. When querying grants, filter out expired entries by default. The scheduled task system (Phase 12) can run a daily check for approaching deadlines and send Telegram reminders.
**Warning signs:** Jarvis suggests applying to a grant whose deadline was last week.

### Pitfall 5: Many Entity Profile Fields Are Still [FILL]
**What goes wrong:** The entity profiles markdown has dozens of `[FILL]` placeholders. The form-filler encounters a required field, queries the entity profile, gets `[FILL]`, and either fabricates data or leaves the field blank.
**Why it happens:** Jonathan hasn't completed all entity profile fields yet.
**How to avoid:** The form-filler prompt must include: "If a required field maps to [FILL] or empty in the entity profile, STOP and report which fields are missing. NEVER fabricate entity data." The entity profile loader should flag incomplete fields.
**Warning signs:** Grant application submitted with fabricated EIN or revenue numbers.

## Code Examples

### Research Tool Definitions (new file pattern)
```typescript
// src/lib/jarvis/research/researchTools.ts
import type { ToolDefinition } from '../intelligence/tools';

export const researchToolNames = new Set([
  'store_research',
  'search_research',
  'get_research_topic',
  'list_research_topics',
]);

export const researchTools: ToolDefinition[] = [
  {
    name: 'store_research',
    description:
      "Store a structured research finding in the research library. Use when you've found a specific fact, deadline, eligibility criterion, amount, or other structured data point about a grant, credit option, or business topic.",
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: "Category: 'grant' | 'credit' | 'business' | 'general'",
        },
        topic: {
          type: 'string',
          description: "Topic name, e.g., 'Verizon Digital Ready Grant' or 'Satori Living Foundation'",
        },
        field_name: {
          type: 'string',
          description: "Structured field name: 'deadline', 'eligibility', 'amount', 'requirements', 'application_url', 'ein', 'mission_statement', etc.",
        },
        field_value: {
          type: 'string',
          description: 'The value for this field',
        },
        source: {
          type: 'string',
          description: 'URL or document reference where this was found',
        },
        confidence: {
          type: 'string',
          description: "Confidence level: 'high' | 'medium' | 'low'. Default: 'medium'",
        },
        notes: {
          type: 'string',
          description: 'Additional context, caveats, or notes',
        },
        tags: {
          type: 'string',
          description: 'JSON array of tags, e.g., \'["urgent","march-2026","nonprofit-only"]\'',
        },
        expires_at: {
          type: 'string',
          description: 'ISO date when this finding expires (e.g., grant deadline)',
        },
      },
      required: ['domain', 'topic', 'field_name', 'field_value'],
    },
  },
  {
    name: 'search_research',
    description:
      "Search the research library for findings matching a keyword query. Searches across topic, field names, field values, notes, and tags. Optionally filter by domain. Use when user asks 'what grants am I eligible for?' or 'what do we know about X?'",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (keyword-based, searches across all text fields)',
        },
        domain: {
          type: 'string',
          description: "Optional domain filter: 'grant' | 'credit' | 'business' | 'general'",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_research_topic',
    description:
      "Get all research entries for a specific domain + topic combination. Use when you need the full profile of a grant, business entity, or credit option. E.g., get_research_topic(domain='grant', topic='Pilot Growth Fund') returns all fields: deadline, eligibility, amount, requirements, etc.",
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: "Domain: 'grant' | 'credit' | 'business' | 'general'" },
        topic: { type: 'string', description: 'Topic name to retrieve' },
      },
      required: ['domain', 'topic'],
    },
  },
  {
    name: 'list_research_topics',
    description:
      "List all unique domain + topic combinations in the research library with entry counts. Use to see what research has been stored: available grants, business profiles, credit options.",
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Optional domain filter' },
      },
    },
  },
];
```

### Research Tool Executor (new file pattern)
```typescript
// src/lib/jarvis/research/researchToolExecutor.ts
import {
  saveResearchEntry,
  searchResearch,
  getResearchByTopic,
  listResearchTopics,
} from './researchStore';

export async function executeResearchTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'store_research': {
      const entry = await saveResearchEntry({
        domain: input.domain as string,
        topic: input.topic as string,
        fieldName: input.field_name as string || null,
        fieldValue: input.field_value as string || null,
        source: input.source as string || null,
        confidence: (input.confidence as string) || 'medium',
        notes: input.notes as string || null,
        tags: input.tags as string || null,
        expiresAt: input.expires_at as string || null,
      });
      return JSON.stringify({ stored: true, id: entry.id, topic: entry.topic });
    }
    case 'search_research': {
      const results = await searchResearch(
        input.query as string,
        input.domain as string | undefined,
      );
      if (results.length === 0) return 'No research findings match that query.';
      return JSON.stringify(results, null, 2);
    }
    case 'get_research_topic': {
      const entries = await getResearchByTopic(
        input.domain as string,
        input.topic as string,
      );
      if (entries.length === 0) return `No research found for ${input.domain}/${input.topic}.`;
      return JSON.stringify(entries, null, 2);
    }
    case 'list_research_topics': {
      const topics = await listResearchTopics(input.domain as string | undefined);
      if (topics.length === 0) return 'Research library is empty.';
      return JSON.stringify(topics, null, 2);
    }
    default:
      throw new Error(`Unknown research tool: ${name}`);
  }
}
```

### toolBridge.ts Registration (additions)
```typescript
// Add imports
import { researchTools, researchToolNames } from '../research/researchTools';
import { executeResearchTool } from '../research/researchToolExecutor';

// Add to getAllToolDefinitions()
return [
  ...notionTools,
  ...calendarTools,
  ...memoryTools,
  ...tutorialTools,
  ...academyTools,
  ...schedulerTools,
  ...researchTools,  // ADD THIS
];

// Add to executeTool() routing (before default Notion fallback)
if (researchToolNames.has(name)) {
  return executeResearchTool(name, input);
}
```

### Sub-Agent Registry Update (researcher tools)
```typescript
// In subAgentRegistry.ts, update researcher tools array:
agents['researcher'] = {
  // ... existing description and prompt
  tools: [
    'WebSearch',
    'WebFetch',
    'Read',
    'mcp__jarvis-tools__store_research',
    'mcp__jarvis-tools__search_research',
    'mcp__jarvis-tools__get_research_topic',
    'mcp__jarvis-tools__list_research_topics',
  ],
  model: 'sonnet',
  maxTurns: 20,
};
```

### Grant Application Workflow (new file, follows billPayWorkflow.ts)
```typescript
// src/lib/jarvis/workflows/grantApplicationWorkflow.ts
// Same multi-stage pattern as billPayWorkflow.ts:
// Stage 1: Research (researcher sub-agent) — search web, store findings
// Stage 2: Eligibility check (parent) — query research_entries, compare against entity profile
// Stage 3: Prepare application (form-filler sub-agent) — navigate, fill form, screenshot
// Stage 4: Approve (approval gateway) — Telegram approval with screenshot
// Stage 5: Submit (browser-worker sub-agent) — click submit, capture receipt
// Stage 6: Confirm (parent) — log result, update research_entries with application status
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Entity profiles in markdown | Entity profiles as research_entries | Phase 16 | Programmatic access, search, per-field retrieval |
| Researcher has no storage | Researcher stores via MCP tools | Phase 16 | Research findings persist across sessions |
| Manual grant applications | Semi-automated with approval gate | Phase 16 | Jon approves on Telegram, Jarvis fills and submits |
| Grant templates in markdown | Templates loaded into context per application | Phase 16 | AI selects appropriate template, fills from entity profile |

## Open Questions

1. **Entity profile import strategy**
   - What we know: `grant-entity-profiles.md` has 5 ventures with structured fields. Many fields are `[FILL]`.
   - What's unclear: Should the import be a one-time script or a persistent parser that re-reads on change?
   - Recommendation: One-time import script that parses the markdown and creates research_entries. Re-run manually when Jonathan updates the file. Flag `[FILL]` fields as confidence='low' with notes='MISSING - needs human input'.

2. **Grant application templates integration**
   - What we know: `grant-application-templates.md` has section-by-section templates for every common grant question type.
   - What's unclear: Should templates be stored in research_entries or loaded from file at workflow time?
   - Recommendation: Load from file at workflow time. Templates are static reference material, not dynamic research findings. Inject relevant template sections into the form-filler prompt based on the grant's question types.

3. **Credit application scope for RESEARCH-05**
   - What we know: Requirement says "corporate credit application groundwork -- research credit options, prepare business profiles, fill applications."
   - What's unclear: How far does RESEARCH-05 go? Full auto-fill of credit applications or just research + profile storage?
   - Recommendation: RESEARCH-05 is "groundwork" -- store credit research findings with domain='credit', ensure entity profiles have financial data (revenue, bank account, credit score). Do NOT attempt automated credit application submission in Phase 16. Credit apps require SSN/legal signatures that cannot be automated safely.

4. **File upload handling in grant applications**
   - What we know: Some grant applications require file uploads (501c3 determination letter, financial statements, board roster).
   - What's unclear: Can Playwright handle file uploads? Where are these documents stored on Jonathan's machine?
   - Recommendation: Treat file upload requirements as "BLOCKED: requires file upload of [document]". The form-filler stops and reports which files are needed. Jonathan provides them manually or we create a document store in a future phase.

## Sources

### Primary (HIGH confidence)
- `C:/Users/jonch/Projects/jarvis/src/lib/jarvis/research/researchStore.ts` -- Full CRUD + keyword LIKE search, verified in codebase
- `C:/Users/jonch/Projects/jarvis/src/lib/jarvis/mcp/toolBridge.ts` -- Current tool routing, confirmed research tools NOT registered
- `C:/Users/jonch/Projects/jarvis/src/lib/jarvis/agents/subAgentRegistry.ts` -- Researcher tools confirmed as `['WebSearch', 'WebFetch']` only
- `C:/Users/jonch/Projects/jarvis/src/lib/jarvis/workflows/billPayWorkflow.ts` -- Multi-stage workflow pattern with approval gateway
- `C:/Users/jonch/Projects/jarvis/src/lib/jarvis/data/schema.ts` -- research_entries table schema with all fields
- `jarvis/.paul/concepts/grant-entity-profiles.md` -- 5 ventures, ~620 lines, many [FILL] placeholders
- `jarvis/.paul/concepts/grant-application-templates.md` -- Section templates for all common grant question types
- `jarvis/.paul/concepts/grant-action-plan-march-2026.md` -- Prioritized grant list with deadlines and entity mapping

### Secondary (MEDIUM confidence)
- `jarvis/.paul/concepts/grant-patient-evidence-library.md` -- Patient outcome stories for grant narratives (useful for form-filler context)
- billPayWorkflow.ts pattern applicability to grant forms -- grant forms are more complex than bill portals but the stage decomposition still applies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all infrastructure exists in the codebase, verified by reading actual source files
- Architecture: HIGH -- follows exact same patterns (MCP tools, toolBridge, multi-stage workflow) proven in Phases 12-15
- Pitfalls: HIGH -- identified from actual codebase gaps (missing MCP tools, [FILL] placeholders, sub-agent tool mismatch)

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no external dependencies changing)
