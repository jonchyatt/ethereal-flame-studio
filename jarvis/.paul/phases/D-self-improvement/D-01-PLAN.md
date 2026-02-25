---
phase: D-self-improvement
plan: 01
type: execute
wave: 1
depends_on: ["C-01"]
files_modified:
  - src/lib/jarvis/memory/schema.ts
  - src/lib/jarvis/intelligence/evaluator.ts
  - src/lib/jarvis/intelligence/behaviorRules.ts
  - src/lib/jarvis/intelligence/chatProcessor.ts
  - src/lib/jarvis/intelligence/systemPrompt.ts
  - src/lib/jarvis/telegram/context.ts
  - src/lib/jarvis/config.ts
autonomous: false
---

<objective>
## Goal
Build the foundation of Jarvis's self-improvement loop: conversation evaluation with a 5-dimension rubric, a behavior rules system with versioning, and integration into the chat flow and system prompt. This is the "evaluate + store" half of the loop — data collection and rule injection.

## Purpose
Agent Zero has a proven self-improvement cycle (critic → evaluate → evolve behavior) that makes it measurably better over time. Jarvis already has a simpler version (Gem #5: observe → count → infer preferences with 9 patterns). Phase D upgrades this to a full critic system that:
1. Evaluates every substantive conversation on 5 dimensions (Completeness, Accuracy, Efficiency, Tone, Satisfaction)
2. Stores evaluations in the database for pattern analysis
3. Maintains versioned behavioral rules that shape how Jarvis responds
4. Injects active rules into the system prompt alongside existing preferences

D-01 delivers the evaluation + rules foundation. D-02 (future) will add the automated reflection loop that synthesizes evaluations into rule changes.

## Output
- New tables: `conversation_evaluations`, `behavior_rules`
- New module: `evaluator.ts` — uses Haiku as critic to evaluate conversations
- New module: `behaviorRules.ts` — CRUD + versioning for behavioral rules
- Updated: `chatProcessor.ts` — fire-and-forget evaluation after substantive conversations
- Updated: `systemPrompt.ts` — BEHAVIORAL RULES section
- Updated: `context.ts` — loads active rules into prompt context
- Updated: `config.ts` — `enableSelfImprovement` feature flag
</objective>

<context>
## Project Context
@jarvis/.paul/PROJECT.md
@jarvis/.paul/ROADMAP.md
@jarvis/.paul/phases/C-memory-preservation/C-01-SUMMARY.md

## Source Files
@src/lib/jarvis/memory/schema.ts (105 LOC — add 2 new tables)
@src/lib/jarvis/memory/db.ts (67 LOC — lazy singleton, re-exports schema)
@src/lib/jarvis/intelligence/chatProcessor.ts (235 LOC — add evaluation trigger)
@src/lib/jarvis/intelligence/systemPrompt.ts (267 LOC — add BEHAVIORAL RULES section)
@src/lib/jarvis/intelligence/sdkBrain.ts (295 LOC — think() used by evaluator as critic)
@src/lib/jarvis/telegram/context.ts (83 LOC — add behavior rules loading)
@src/lib/jarvis/config.ts (62 LOC — add self-improvement flag)
@src/lib/jarvis/memory/preferenceInference.ts (117 LOC — existing Gem #5, reference pattern)

## Research
@jarvis/.paul/research/v4-intelligence-audit.md (Agent Zero self-improvement loop details)
</context>

<acceptance_criteria>

## AC-1: Database Schema Extended
```gherkin
Given the memory database schema
When D-01 changes are applied
Then a `conversation_evaluations` table exists with columns:
  id, sessionId, scores (JSON), overall, strengths, improvements, model, evaluatedAt
And a `behavior_rules` table exists with columns:
  id, rule, category, source, version, isActive, rationale, createdAt, supersededAt
And existing tables (memory_entries, sessions, etc.) are unchanged
```

## AC-2: Evaluator Produces Structured Results
```gherkin
Given a completed conversation (messages array)
When the evaluator runs
Then it returns a structured evaluation with 5 dimension scores (0-10),
  overall score, strengths list, and improvements list
And the evaluation is stored in `conversation_evaluations` table
And the evaluator uses Haiku model (cheap, fast)
And errors in evaluation never affect the user's chat response
```

## AC-3: Behavior Rules Injected into System Prompt
```gherkin
Given active behavior rules exist in the database
When the system prompt is assembled
Then a BEHAVIORAL RULES section appears with active rules
And the section is positioned after LEARNED PREFERENCES
And when no rules exist, the section is omitted (not empty)
```

## AC-4: Evaluation Triggers After Substantive Conversations
```gherkin
Given a chat conversation completes successfully
When the conversation used 2+ tools OR was routed as complex
Then a fire-and-forget evaluation is triggered
And the evaluation runs asynchronously (never delays the response)
And when enableSelfImprovement is false, no evaluation occurs
```

## AC-5: Build Passes
```gherkin
Given all changes are complete
When tsc --noEmit runs
Then zero new TypeScript errors (pre-existing local-agent errors excluded)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Database schema + evaluator module + behavior rules module</name>
  <files>
    src/lib/jarvis/memory/schema.ts,
    src/lib/jarvis/intelligence/evaluator.ts,
    src/lib/jarvis/intelligence/behaviorRules.ts,
    src/lib/jarvis/memory/queries/evaluations.ts,
    src/lib/jarvis/memory/queries/behaviorRules.ts
  </files>
  <action>
    1. Add two new tables to schema.ts:

       `conversation_evaluations`:
       - id: integer PK autoincrement
       - sessionId: integer references sessions(id)
       - scores: text (JSON string with 5 dimensions, each { score: number, evidence: string })
       - overall: text (numeric string, 1 decimal)
       - strengths: text (JSON array of strings)
       - improvements: text (JSON array of strings)
       - model: text (which model did the evaluation)
       - evaluatedAt: text (ISO timestamp, default now)

       `behavior_rules`:
       - id: integer PK autoincrement
       - rule: text NOT NULL (the behavioral instruction)
       - category: text NOT NULL ('communication' | 'workflow' | 'tone' | 'task_handling')
       - source: text NOT NULL ('reflection' | 'manual' | 'seed')
       - version: integer NOT NULL default 1
       - isActive: integer NOT NULL default 1 (SQLite boolean: 1=active, 0=superseded)
       - rationale: text (why this rule was created/changed)
       - createdAt: text (ISO timestamp, default now)
       - supersededAt: text (null = current, ISO = when replaced)

       Export types: ConversationEvaluation, BehaviorRule, etc.

    2. Create src/lib/jarvis/memory/queries/evaluations.ts:
       - storeEvaluation(sessionId, scores, overall, strengths, improvements, model)
       - getRecentEvaluations(limit=10) — for future reflection loop
       - getAverageScores(sinceDays=7) — for future reflection loop

    3. Create src/lib/jarvis/memory/queries/behaviorRules.ts:
       - getActiveRules() — returns all isActive=1 rules
       - addRule(rule, category, source, rationale) — insert new active rule
       - supersedRule(id) — set isActive=0, set supersededAt
       - getRuleHistory(limit=20) — all rules ordered by createdAt desc

    4. Create src/lib/jarvis/intelligence/evaluator.ts:
       - evaluateConversation(sessionId, messages: ChatMessage[]) → Promise<void>
       - Uses anthropic.messages.create() directly with Haiku model
       - System prompt is a critic prompt (adapted from Agent Zero's 5-dimension rubric):
         * Completeness (0-10): Did Jarvis fully address the request?
         * Accuracy (0-10): Were statements and tool results correct?
         * Efficiency (0-10): Minimal unnecessary steps or tool calls?
         * Tone (0-10): Matched Jarvis personality (concise, warm, not servile)?
         * Satisfaction (0-10): Proxy signals from user response
         * Each score MUST have evidence (specific quote or description)
       - Asks Claude to return JSON (use tool_use with a structured schema for reliable parsing)
       - Stores result via storeEvaluation()
       - Entire function wrapped in try/catch — errors logged, never thrown
       - Filter: skip if conversation has < 3 messages (too short to evaluate)

    5. Create src/lib/jarvis/intelligence/behaviorRules.ts:
       - loadBehaviorRulesForPrompt() → Promise<string[]>
         Loads active rules, returns array of rule strings
       - formatBehaviorRules(rules: string[]) → string
         Formats as a system prompt section

    DO NOT modify: memory/*, executive/*, resilience/*, tutorial/* (except schema.ts for new tables)
  </action>
  <verify>tsc --noEmit passes; schema.ts exports new table types; evaluator.ts and behaviorRules.ts compile</verify>
  <done>AC-1 and AC-2 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Wire evaluation into chat flow + inject rules into system prompt</name>
  <files>
    src/lib/jarvis/config.ts,
    src/lib/jarvis/intelligence/chatProcessor.ts,
    src/lib/jarvis/intelligence/systemPrompt.ts,
    src/lib/jarvis/telegram/context.ts
  </files>
  <action>
    1. Add to config.ts:
       - enableSelfImprovement: boolean (default: false)
       - Env var: JARVIS_ENABLE_SELF_IMPROVEMENT=true

    2. Update chatProcessor.ts processChatMessage():
       - After the brain returns a successful result AND the conversation was substantive:
         * Substantive = result.toolsUsed.length >= 2 OR isComplex was true
         * Fire-and-forget: evaluateConversation(sessionId, messages).catch(err => console.error(...))
         * Only when config.enableSelfImprovement is true
       - Import evaluateConversation from './evaluator'
       - This MUST be after the response is returned to the user (fire-and-forget pattern)

    3. Update SystemPromptContext interface in systemPrompt.ts:
       - Add: behaviorRules?: string[]
       - In buildSystemPrompt(), after the LEARNED PREFERENCES section:
         * If context.behaviorRules exists and length > 0:
           Add a BEHAVIORAL RULES section:
           ```
           BEHAVIORAL RULES (self-improved):
           - {rule 1}
           - {rule 2}

           These rules evolved from self-evaluation. Follow them naturally.
           ```
         * If no rules, omit the section entirely

    4. Update context.ts buildSystemPromptContext():
       - When config.enableSelfImprovement is true:
         * Import loadBehaviorRulesForPrompt from behaviorRules.ts
         * Load active rules and add to context as behaviorRules
       - When false: omit (no loading, no section)

    DO NOT modify: sdkBrain.ts (evaluator creates its own Anthropic call, doesn't use think())
    DO NOT modify: memory/*, executive/*, resilience/*, tutorial/*
  </action>
  <verify>tsc --noEmit passes; chatProcessor has fire-and-forget evaluation call; systemPrompt has conditional BEHAVIORAL RULES section</verify>
  <done>AC-3 and AC-4 satisfied</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Self-improvement foundation:
    - Conversation evaluator with 5-dimension rubric (uses Haiku as critic)
    - Behavior rules system with versioning in database
    - Fire-and-forget evaluation after substantive conversations
    - Behavioral rules injected into system prompt
    - All behind enableSelfImprovement feature flag (off by default)
  </what-built>
  <how-to-verify>
    1. Review evaluator.ts — critic prompt, 5-dimension rubric, JSON parsing
    2. Review schema.ts — two new tables (conversation_evaluations, behavior_rules)
    3. Review chatProcessor.ts — fire-and-forget evaluation trigger
    4. Review systemPrompt.ts — BEHAVIORAL RULES section
    5. Review config.ts — enableSelfImprovement flag
    6. Confirm: with enableSelfImprovement=false, behavior is IDENTICAL to Phase C
    7. Confirm: tsc --noEmit passes
    8. Push to GitHub → auto-deploys → test with flag OFF first
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/memory/preferenceInference.ts (Gem #5 — existing inference pipeline stays)
- src/lib/jarvis/memory/retrieval.ts (memory scoring — untouched)
- src/lib/jarvis/memory/decay.ts (decay system — untouched)
- src/lib/jarvis/memory/queries/memoryEntries.ts (BM25 search — untouched)
- src/lib/jarvis/memory/queries/observations.ts (observation pipeline — untouched)
- src/lib/jarvis/executive/* (briefings, nudges, check-ins — untouched)
- src/lib/jarvis/resilience/* (circuit breaker, error classifier — untouched)
- src/lib/jarvis/tutorial/* (tutorial system — untouched)
- src/lib/jarvis/intelligence/sdkBrain.ts (brain module — evaluator makes its own API calls)
- src/lib/jarvis/notion/* (Notion tools — untouched)

## SCOPE LIMITS
- D-01 is the FOUNDATION only — evaluation + rules storage + injection
- The automated reflection loop (synthesize evaluations → evolve rules) is D-02
- No seed rules — behavior_rules table starts empty (rules are earned, not given)
- Evaluator uses its own Anthropic API call, NOT the brain's think() function
- Feature flag off by default — safe rollout
- No UI for viewing evaluations or rules (database only)
- drizzle-kit push is NOT run as part of this plan (manual step per Vercel deploy workflow)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `tsc --noEmit` passes (excluding pre-existing local-agent errors)
- [ ] schema.ts has `conversation_evaluations` and `behavior_rules` tables
- [ ] evaluator.ts evaluates with 5-dimension rubric, stores to DB
- [ ] behaviorRules.ts loads active rules for system prompt
- [ ] chatProcessor.ts triggers evaluation fire-and-forget
- [ ] systemPrompt.ts has conditional BEHAVIORAL RULES section
- [ ] context.ts loads behavior rules when feature enabled
- [ ] config.ts has enableSelfImprovement flag
- [ ] With enableSelfImprovement=false, no code path reaches evaluation
- [ ] Memory system files untouched (except schema.ts for new tables)
- [ ] Executive function files untouched
</verification>

<success_criteria>
- Two new database tables defined in schema
- Conversation evaluator produces 5-dimension scored evaluations
- Evaluations stored in database for future reflection loop
- Behavior rules loaded and injected into system prompt
- Evaluation is fire-and-forget (never blocks user response)
- All behind feature flag (safe to deploy with flag off)
- Build passes with zero new errors
</success_criteria>

<output>
After completion, create `jarvis/.paul/phases/D-self-improvement/D-01-SUMMARY.md`
</output>
