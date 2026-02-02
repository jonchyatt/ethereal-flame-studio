# Phase 10: Guardrails & Safety - Research

**Researched:** 2026-02-02
**Domain:** Tool safety, audit logging, voice confirmation flows
**Confidence:** HIGH (existing codebase analysis, established patterns)

## Summary

This research examines the existing Jarvis codebase to answer: what infrastructure exists, what needs to be added for guardrails and safety, and how to fix the two known bugs (FIX-01: check-in capture not reaching Notion, FIX-02: tomorrow preview showing placeholder data).

The codebase already has substantial infrastructure for this phase:
- **Memory schema** already has `source` field (user_explicit vs jarvis_inferred) for provenance tracking
- **dailyLogs table** already exists with `tool_invocation` event type for audit logging
- **Two-phase forget** pattern (search then confirm) already implements confirmation for memory deletion
- **delete_all_memories** already requires explicit `confirm="true"` parameter

Key additions needed:
1. **Confirmation wrapper** for destructive Notion operations (currently only memory tools have confirmation)
2. **Actual logging** - dailyLogs infrastructure exists but isn't being called from tool executors
3. **Context window monitoring** - no current implementation
4. **Bug fixes** require tracing existing flows and implementing missing connections

**Primary recommendation:** Extend the existing two-phase confirmation pattern from memory tools to Notion deletion tools, and wire up the existing dailyLogs table to tool executors.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.38.x | Database operations | Already used for memory schema |
| @libsql/client | latest | SQLite/Turso driver | Already configured |
| Anthropic SDK | 0.51.x | Claude API with tool_use | Already configured |

### Supporting (No New Dependencies Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.x | Date formatting | Already used in BriefingBuilder |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom logging | Winston/Pino | Overkill - we have dailyLogs table |
| Token counting library | cl100k_base tokenizer | Overkill - 4 chars/token estimate works |
| Confirmation UI library | Custom dialog | Overkill - voice-first interface |

**Installation:**
```bash
# No new packages needed - all infrastructure exists
```

## Architecture Patterns

### Existing Tool Execution Flow
```
User speaks
    -> VoicePipeline (STT)
    -> Chat API route
        -> Claude determines tool_use
        -> Tool executor routes to:
            - executeNotionTool (10 tools)
            - executeMemoryTool (6 tools)
        -> Tool result returned to Claude
        -> Claude generates response
    -> VoicePipeline (TTS)
```

### Recommended Confirmation Flow Pattern
```
User: "Delete all my memories"
    -> Claude calls delete_all_memories with confirm="false" (default)
    -> Tool returns {requiresConfirmation: true, message: "..."}
    -> Claude speaks: "This will permanently delete everything. Are you sure?"

User: "Yes, do it"
    -> Claude calls delete_all_memories with confirm="true"
    -> Tool executes deletion
    -> Claude confirms: "Done. Memory cleared."
```

This pattern already exists for `delete_all_memories` and `forget_fact`. The planner should extend it to Notion destructive operations.

### Recommended Audit Logging Pattern
```typescript
// In tool executor, after tool execution:
await logEvent(sessionId, 'tool_invocation', {
  toolName: 'create_task',
  success: true,
  context: 'Created task: "Buy groceries"',
});
```

The `logEvent` function and `dailyLogs` table already exist in `src/lib/jarvis/memory/queries/dailyLogs.ts`.

### Pattern: Confirmation Phrases Detection
```typescript
const CONFIRMATION_PHRASES = [
  'yes', 'yeah', 'yep', 'sure', 'do it', 'go ahead',
  'confirm', 'okay', 'ok', 'definitely', 'absolutely'
];

function isConfirmation(response: string): boolean {
  return CONFIRMATION_PHRASES.some(phrase =>
    response.toLowerCase().includes(phrase)
  );
}
```

Similar pattern already exists in `CheckInManager.isSkipCommand()` and `isAcknowledgement()`.

### Anti-Patterns to Avoid
- **Don't create a UI for audit logs:** Per CONTEXT.md, user asks "what did you do?" and Jarvis explains from logs - no browse UI
- **Don't filter content:** Per CONTEXT.md, no content filtering for single-user case
- **Don't show provenance to users:** Track source internally but don't expose "explicit vs inferred" distinction when listing memories

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audit logging table | New schema | Existing `dailyLogs` table | Already has eventType, eventData columns |
| Session tracking | Custom sessions | Existing `sessions` table | Already tracks sessionId for events |
| Confirmation flow | Custom state machine | Claude's multi-turn tool_use | Model handles conversation state |
| Provenance tracking | New column | Existing `source` field | Already has 'user_explicit' / 'jarvis_inferred' |
| Token counting | tiktoken library | `4 chars/token` estimate | Already decided in STATE.md |

**Key insight:** The codebase already has 90% of the infrastructure. The phase is about wiring things together, not building new systems.

## Common Pitfalls

### Pitfall 1: Blocking on Confirmation in Tool Executors
**What goes wrong:** Trying to implement confirmation by making tool executors wait for user response
**Why it happens:** Confusing tool execution with conversation flow
**How to avoid:** Tool returns immediately with `{requiresConfirmation: true}`. Claude handles the conversation, then calls tool again with confirmation.
**Warning signs:** Using `await` for user input in tool executors, or trying to create interactive prompts

### Pitfall 2: Logging Without Session Context
**What goes wrong:** Tool invocations logged without sessionId, making "what did you do?" queries impossible
**Why it happens:** Session context not passed through the call chain
**How to avoid:** Pass sessionId from Chat API route through to tool executors. Current code doesn't do this - needs implementation.
**Warning signs:** `logEvent(null, ...)` calls, or audit logs without session association

### Pitfall 3: Confirmation for Non-Destructive Actions
**What goes wrong:** Adding confirmation prompts for task completion, bill marking, task creation
**Why it happens:** Over-engineering safety
**How to avoid:** Per CONTEXT.md: "Only data deletion requires confirmation (not task completion, not notifications)"
**Warning signs:** Asking "Are you sure?" for creating tasks or marking things complete

### Pitfall 4: Hardcoding Confirmation Detection in Tools
**What goes wrong:** Tool executor tries to parse user intent for confirmation
**Why it happens:** Not trusting Claude to handle conversation flow
**How to avoid:** Claude determines if user confirmed and passes `confirm: "true"` parameter. Tool just checks the parameter.
**Warning signs:** String matching for "yes/no" inside tool executors

### Pitfall 5: Context Window Monitoring Without Clear Action
**What goes wrong:** Monitoring context window size but not knowing what to do when it's high
**Why it happens:** Requirement says "monitor" but doesn't specify action
**How to avoid:** Define clear thresholds and actions: at 80% utilization, summarize older memories; at 95%, prune
**Warning signs:** Console.log of token count with no follow-up logic

## Code Examples

Verified patterns from existing codebase:

### Existing Two-Phase Confirmation (from memoryTools.ts)
```typescript
// Source: src/lib/jarvis/memory/memoryTools.ts
{
  name: 'delete_all_memories',
  description: 'PERMANENTLY delete ALL stored memories...',
  input_schema: {
    type: 'object',
    properties: {
      confirm: {
        type: 'string',
        description: 'Must be "true" to execute the deletion',
      },
    },
    required: ['confirm'],
  },
}
```

### Existing Tool Logging Infrastructure (from dailyLogs.ts)
```typescript
// Source: src/lib/jarvis/memory/queries/dailyLogs.ts
export interface ToolInvocationData {
  toolName: string;
  success: boolean;
  context?: string;
  error?: string;
}

export async function logEvent(
  sessionId: number,
  eventType: EventType,
  eventData: EventData
): Promise<DailyLog> {
  const inserted = await db
    .insert(dailyLogs)
    .values({
      sessionId,
      eventType,
      eventData: JSON.stringify(eventData),
    })
    .returning();
  return inserted[0];
}
```

### Existing Source/Provenance Tracking (from schema.ts)
```typescript
// Source: src/lib/jarvis/memory/schema.ts
export const memoryEntries = sqliteTable('memory_entries', {
  // ... other fields ...
  source: text('source').notNull(), // 'user_explicit' | 'jarvis_inferred'
});
```

### Existing Check-In Capture (Bug Location - CheckInManager.ts)
```typescript
// Source: src/lib/jarvis/executive/CheckInManager.ts line 486-489
// Log captured items
if (this.state.capturedItems.length > 0) {
  console.log('[CheckInManager] Captured items:', this.state.capturedItems);
  // Future: Send to Notion inbox  <-- BUG: This comment indicates missing implementation
}
```

### Existing Tomorrow Preview (Bug Location - CheckInManager.ts)
```typescript
// Source: src/lib/jarvis/executive/CheckInManager.ts line 397-400
private buildTomorrowScript(): string {
  // For now, just a placeholder - tomorrow's data would need to be fetched
  return "Tomorrow looks manageable. Anything to adjust? Or say skip.";  // <-- BUG: Placeholder, not real data
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Memory-only confirmation | Two-phase tool pattern | Phase 9 | Memory tools have confirmation, Notion tools don't |
| No audit logging | dailyLogs table exists | Phase 7 | Infrastructure ready, not wired up |
| No provenance | source field in schema | Phase 9 | Exists but not used for decay logic yet |

**Deprecated/outdated:**
- None identified - this is all new implementation

## Tool Inventory Analysis

### Notion Tools (10 total)

**Read Tools (5) - No confirmation needed:**
1. `query_tasks` - Read-only
2. `query_bills` - Read-only
3. `query_projects` - Read-only
4. `query_goals` - Read-only
5. `query_habits` - Read-only

**Write Tools (5) - Confirmation analysis:**
| Tool | Destructive? | Needs Confirmation? | Reason |
|------|-------------|---------------------|--------|
| `create_task` | No | No | Creates new data, easily reversible |
| `update_task_status` | No | No | Status change, not deletion |
| `mark_bill_paid` | No | No | Not deletion (could be "unpaid" later) |
| `pause_task` | No | No | Status change, not deletion |
| `add_project_item` | No | No | Creates new data |

**Conclusion:** Per CONTEXT.md, no Notion tools currently require confirmation. The "delete" operations would be things like "delete this task" which don't exist yet. If they're added, they'd need confirmation.

### Memory Tools (6 total)

| Tool | Destructive? | Has Confirmation? | Status |
|------|-------------|-------------------|--------|
| `remember_fact` | No | No | OK |
| `forget_fact` | Yes | Yes (two-phase) | OK |
| `list_memories` | No | No | OK |
| `delete_all_memories` | Yes | Yes (explicit confirm) | OK |
| `restore_memory` | No | No | OK |
| `observe_pattern` | No | No | OK |

**Conclusion:** Memory tools already have appropriate confirmation for destructive actions.

## Bug Analysis

### FIX-01: Captured Items Not Reaching Notion Inbox

**Flow Trace:**
1. `CheckInManager.handleCaptureResponse()` adds items to `this.state.capturedItems`
2. `CheckInManager.complete()` logs items but has `// Future: Send to Notion inbox` comment
3. **Missing:** Call to `executeNotionTool('create_task', ...)` for each captured item

**Root Cause:** Implementation never completed - there's a TODO comment where the Notion API call should be.

**Fix Location:** `src/lib/jarvis/executive/CheckInManager.ts` line 486-489

**Fix Strategy:**
```typescript
// In complete() method:
if (this.state.capturedItems.length > 0) {
  for (const item of this.state.capturedItems) {
    await executeNotionTool('create_task', { title: item });
  }
}
```

### FIX-02: Tomorrow Preview Shows Placeholder Data

**Flow Trace:**
1. `CheckInManager.startEveningCheckIn()` calls `buildCheckInData('evening')`
2. `buildCheckInData()` returns `briefing` with today's data but no tomorrow data
3. `CheckInManager.buildTomorrowScript()` ignores briefing data and returns hardcoded string

**Root Cause:** `buildTomorrowScript()` is a placeholder that doesn't use actual data.

**Fix Location:** `src/lib/jarvis/executive/CheckInManager.ts` line 397-400

**Note:** `EveningWrapFlow.buildTomorrowPreviewScript()` already has real implementation that queries tomorrow's tasks. The fix should align CheckInManager with EveningWrapFlow's approach.

**Fix Strategy:**
1. Ensure `buildCheckInData('evening')` fetches tomorrow's tasks (check BriefingBuilder)
2. Update `buildTomorrowScript()` to use `this.state.data.tomorrow` like EveningWrapFlow does

Actually, looking at BriefingBuilder, `buildMorningBriefing()` doesn't query tomorrow's tasks, but `buildEveningWrapData()` does. The CheckInManager uses `buildCheckInData()` which calls `buildMorningBriefing()`. This needs to either:
- Option A: CheckInManager uses `buildEveningWrapData()` for evening check-ins
- Option B: `buildCheckInData('evening')` should additionally query tomorrow's tasks

## Context Window Monitoring

**Current Implementation:** None

**Where to Add:** `buildSystemPrompt()` or the Chat API route

**What to Monitor:**
- System prompt token count (estimate: characters / 4)
- Memory context token count
- Conversation history token count

**Thresholds (Claude's discretion per CONTEXT.md):**
- Warning at 80% of model's context (Claude 3.5 Haiku: ~8K tokens typical, 200K max)
- Action at 90%: summarize older conversation turns
- Emergency at 95%: drop oldest conversation turns

**Recommended Implementation Pattern:**
```typescript
// In Chat API route, before Claude call:
const estimatedTokens = Math.ceil(
  (systemPrompt.length + JSON.stringify(messages).length) / 4
);
const utilizationPercent = estimatedTokens / MAX_CONTEXT_TOKENS * 100;

if (utilizationPercent > 80) {
  console.warn(`[Context] High utilization: ${utilizationPercent.toFixed(1)}%`);
  // Could add to system prompt: "Context is getting long, be concise"
}
```

## Open Questions

Things that couldn't be fully resolved:

1. **Session ID propagation to tool executors**
   - What we know: `logEvent()` requires sessionId, Chat API route doesn't pass it
   - What's unclear: Best way to thread sessionId through to tool executors
   - Recommendation: Add sessionId to tool executor context parameter or use module-level state

2. **Audit log retention period**
   - What we know: CONTEXT.md says "Claude's discretion"
   - What's unclear: What's reasonable for a personal assistant?
   - Recommendation: 30 days matches memory decay, or 90 days for debugging

3. **"What did you do?" query implementation**
   - What we know: User should be able to ask and Jarvis explains from logs
   - What's unclear: Should this be a tool, or handled by system prompt + log retrieval?
   - Recommendation: Add `query_audit_log` tool that Claude calls when asked "what did you do?"

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/jarvis/memory/schema.ts` - existing schema
- Codebase analysis: `src/lib/jarvis/memory/queries/dailyLogs.ts` - audit infrastructure
- Codebase analysis: `src/lib/jarvis/memory/toolExecutor.ts` - confirmation patterns
- Codebase analysis: `src/lib/jarvis/executive/CheckInManager.ts` - bug locations

### Secondary (MEDIUM confidence)
- `jarvis/.planning/phases/10-guardrails-safety/10-CONTEXT.md` - user decisions
- `jarvis/.planning/STATE.md` - prior decisions and known bugs

### Tertiary (LOW confidence)
- None - all findings from direct codebase analysis

## Metadata

**Confidence breakdown:**
- Tool inventory: HIGH - direct code analysis
- Bug analysis: HIGH - traced code flow, found exact locations
- Confirmation patterns: HIGH - existing implementation analyzed
- Context monitoring: MEDIUM - no existing implementation to reference, using common patterns

**Research date:** 2026-02-02
**Valid until:** 90 days (stable patterns, local codebase)
