---
phase: D-self-improvement
plan: 02
type: execute
wave: 1
depends_on: ["D-01"]
files_modified:
  - src/lib/jarvis/intelligence/reflectionLoop.ts
  - src/lib/jarvis/intelligence/metaEvaluator.ts
  - src/app/api/jarvis/reflect/route.ts
  - vercel.json
  - src/lib/jarvis/intelligence/chatProcessor.ts
autonomous: false
---

<objective>
## Goal
Build the reflection loop that synthesizes accumulated evaluation data into behavioral rules — closing Jarvis's self-improvement cycle.

## Purpose
D-01 built the data collection (evaluator + behavior rules table). Without D-02, evaluations just pile up unused. The reflection loop is the "thinking about thinking" step — it reads evaluation patterns, identifies recurring weaknesses, and creates/updates behavioral rules that shape future responses.

## Output
- `reflectionLoop.ts` — synthesizes evaluations into rule proposals, adds/supersedes rules
- `/api/jarvis/reflect` — Vercel Cron endpoint triggering reflection
- `vercel.json` — cron schedule (daily at 5 AM UTC)
- `chatProcessor.ts` — interaction-count trigger (reflect after every 10 evaluations)
- `metaEvaluator.ts` — second-order monitor: is the self-improvement system itself working?
- `/api/jarvis/reflect` route also runs meta-evaluation on the same cron
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/D-self-improvement/D-01-SUMMARY.md

## Source Files
@src/lib/jarvis/intelligence/evaluator.ts
@src/lib/jarvis/intelligence/behaviorRules.ts
@src/lib/jarvis/memory/queries/evaluations.ts
@src/lib/jarvis/memory/queries/behaviorRules.ts
@src/lib/jarvis/intelligence/chatProcessor.ts
@src/lib/jarvis/config.ts
</context>

<acceptance_criteria>

## AC-1: Reflection Synthesizes Evaluations Into Rules
```gherkin
Given 10+ evaluations exist in conversation_evaluations
When the reflection loop runs
Then it reads recent evaluations, identifies patterns (recurring low scores or repeated improvements),
  and proposes new behavioral rules via addRule()
```

## AC-2: Rule Supersession Works
```gherkin
Given an active behavior rule exists
When the reflection loop generates a refined version of the same rule
Then the old rule is superseded (isActive=0, supersededAt set)
  and the new version is added as active
```

## AC-3: Cron Trigger Works
```gherkin
Given vercel.json defines a cron schedule
When the cron fires (daily at 5 AM UTC)
Then /api/jarvis/reflect executes the reflection loop
  and returns a JSON summary of actions taken (rules added/superseded/skipped)
```

## AC-4: Interaction-Count Trigger Works
```gherkin
Given enableSelfImprovement is true
When a conversation evaluation is stored and the total unseen evaluation count >= 10
Then the reflection loop is triggered fire-and-forget from chatProcessor
```

## AC-5: Meta-Evaluation Monitors Self-Improvement Health
```gherkin
Given the reflection loop has been running for 7+ days
When the meta-evaluator runs (weekly on the same cron)
Then it analyzes: are scores trending up? Are rules being used effectively?
  Are rules accumulating without supersession? Is the system stagnant?
  and logs a health report with actionable diagnostics
```

## AC-6: Build Passes
```gherkin
Given all changes are complete
When npm run build executes
Then zero new TypeScript errors are introduced
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create reflectionLoop.ts and cron API route</name>
  <files>
    src/lib/jarvis/intelligence/reflectionLoop.ts,
    src/app/api/jarvis/reflect/route.ts,
    vercel.json
  </files>
  <action>
    **reflectionLoop.ts:**
    Create the core reflection module that:
    1. Calls `getRecentEvaluations(20)` to load last 20 evaluations
    2. Calls `getAverageScores(7)` for the 7-day trend
    3. Calls `getActiveRules()` for current rules
    4. Sends a synthesis prompt to Sonnet (not Haiku — needs reasoning) with:
       - Evaluation summaries (scores + improvements + strengths)
       - Current active rules
       - Instructions to: identify patterns, propose new rules, propose rule supersessions
    5. Uses `tool_choice` forced to `submit_reflection` tool with schema:
       - `newRules: Array<{ rule: string, category: RuleCategory, rationale: string }>`
       - `supersede: Array<{ ruleId: number, reason: string, replacement: string, category: RuleCategory, rationale: string }>`
       - `summary: string` (human-readable reflection summary)
    6. Executes: for each newRule → `addRule()`, for each supersede → `supersedeRule()` then `addRule()`
    7. Returns a ReflectionResult with actions taken
    8. Add a `lastReflectedEvalId` tracking mechanism — store the ID of the most recent evaluation that was reflected on, so we don't re-reflect on old data. Use a simple behavior_rules entry with category='system' or a new column. Simplest: just track via the max evaluation ID at reflection time and compare when deciding if 10 new evals exist.

    Guard rails:
    - Max 3 new rules per reflection (avoid flooding)
    - Max 2 supersessions per reflection
    - Skip reflection if < 5 evaluations since last reflection
    - Cap total active rules at 10 (oldest get superseded if over limit)
    - Entire function wrapped in try/catch, returns result or error

    Use model `claude-opus-4-6` for the reflection call — best reasoning for pattern synthesis. Cost: ~$0.10/reflection (vs $0.02 for Sonnet). At daily frequency = ~$3/month. Worth it for the brain that improves the brain.

    **route.ts (Vercel Cron endpoint):**
    - GET handler secured with `CRON_SECRET` from env (Vercel cron security)
    - Checks `Authorization: Bearer ${CRON_SECRET}` header
    - Calls `runReflection()` from reflectionLoop.ts
    - Returns JSON with reflection result
    - Sets `maxDuration = 30` (reflection can take a few seconds)

    **vercel.json:**
    - Create with cron config: `{ "crons": [{ "path": "/api/jarvis/reflect", "schedule": "0 5 * * *" }] }`

    Avoid:
    - Do NOT use Haiku for reflection (needs deep reasoning to synthesize patterns)
    - Do NOT create rules without rationale
    - Do NOT reflect if there are fewer than 5 new evaluations
    - Do NOT use Sonnet — Opus is worth the extra $2.40/month for the system that improves itself
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit` on the new files shows no errors</verify>
  <done>AC-1, AC-2, AC-3 satisfied: reflection loop synthesizes evaluations, supersedes rules, cron endpoint exists</done>
</task>

<task type="auto">
  <name>Task 2: Wire interaction-count trigger in chatProcessor</name>
  <files>
    src/lib/jarvis/intelligence/chatProcessor.ts,
    src/lib/jarvis/intelligence/reflectionLoop.ts
  </files>
  <action>
    After the existing evaluation fire-and-forget block in chatProcessor.ts:
    1. Import `shouldReflect, runReflection` from reflectionLoop.ts
    2. After `evaluateConversation()` is called, add a second fire-and-forget:
       - Call `shouldReflect()` which checks if 10+ evaluations exist since last reflection
       - If true, call `runReflection()` fire-and-forget
       - Log: `[ChatProcessor] Triggering reflection loop (10+ new evaluations)`
    3. `shouldReflect()` in reflectionLoop.ts:
       - Count evaluations with ID > last reflected ID
       - Return true if count >= 10
       - Use a simple approach: store last reflected eval ID in a module-level variable
         initialized from DB on first call (query max evaluation ID from last reflection's rules)

    Avoid:
    - Do NOT make the reflection blocking — it's fire-and-forget like evaluation
    - Do NOT trigger reflection on every conversation — only after evaluation runs AND threshold met
  </action>
  <verify>`npm run build` passes with zero new errors</verify>
  <done>AC-4 satisfied: interaction-count trigger works</done>
</task>

<task type="auto">
  <name>Task 3: Create meta-evaluator — the system that evaluates self-improvement</name>
  <files>
    src/lib/jarvis/intelligence/metaEvaluator.ts,
    src/app/api/jarvis/reflect/route.ts
  </files>
  <action>
    **metaEvaluator.ts:**
    Create a second-order feedback module that answers: "Is the self-improvement system itself working?"

    1. `runMetaEvaluation()` function that:
       - Queries evaluation scores over the last 30 days, grouped by week
       - Queries rule creation/supersession history
       - Computes health signals:
         a. **Score trend**: Are average scores improving week-over-week? Flat? Declining?
         b. **Rule effectiveness**: Were any rules added in the last period? If scores didn't improve after rule changes, rules may not be actionable enough.
         c. **Rule churn**: Are rules being superseded at a healthy rate? Zero supersessions = stagnation. Too many = instability.
         d. **Rule saturation**: Is the system hitting the 10-rule cap regularly? May need to increase cap or improve rule quality.
         e. **Reflection frequency**: Is reflection running often enough? Are there long gaps?
       - Uses Opus to synthesize these signals into a diagnostic report
       - Uses `tool_choice` forced to `submit_meta_evaluation` with schema:
         - `healthScore: number` (0-10, overall self-improvement health)
         - `diagnosis: string` (what's working, what's not)
         - `recommendations: string[]` (actionable changes to the self-improvement pipeline)
         - `adjustments: Array<{ parameter: string, currentValue: string, suggestedValue: string, reason: string }>` (concrete tuning suggestions)
       - Logs the report to console with `[MetaEvaluator]` prefix
       - Stores the report in a behavior_rules entry with category='meta_evaluation' for history

    2. **Weekly cadence**: Only runs once per week (check last meta-evaluation timestamp).
       In the cron route, after `runReflection()`, check if 7 days have passed since last meta-eval.
       If so, run `runMetaEvaluation()`.

    Guard rails:
    - Meta-evaluation is advisory only — it logs recommendations but does NOT auto-modify the reflection pipeline parameters (that's future work)
    - Max cost: one Opus call per week = ~$0.40/month
    - Fire-and-forget: errors logged, never block

    Avoid:
    - Do NOT auto-tune parameters based on meta-evaluation (advisory only for now)
    - Do NOT run meta-evaluation more than once per week
  </action>
  <verify>`npm run build` passes with zero new errors</verify>
  <done>AC-5, AC-6 satisfied: meta-evaluator monitors self-improvement health, build passes</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Complete self-improvement system with three layers:
    - reflectionLoop.ts with Opus-powered synthesis (evaluate → reflect → evolve)
    - metaEvaluator.ts — monitors whether self-improvement itself is working (weekly)
    - Vercel Cron daily trigger at 5 AM UTC (reflection daily, meta-eval weekly)
    - Interaction-count trigger after 10 evaluations
    - Guard rails: max 3 new rules, max 2 supersessions, 10 active rule cap
  </what-built>
  <how-to-verify>
    1. Review the reflection system prompt — does it produce good rules?
    2. Review the meta-evaluator health signals — are they the right things to monitor?
    3. Review guard rails — are limits reasonable?
    4. Confirm cron schedule (5 AM UTC) works for your timezone
    5. Build passes: `npm run build`
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/intelligence/evaluator.ts (D-01 evaluator is stable)
- src/lib/jarvis/memory/schema.ts (no new tables — use existing infrastructure)
- src/lib/jarvis/intelligence/systemPrompt.ts (already wired in D-01)
- src/lib/jarvis/telegram/context.ts (already wired in D-01)

## SCOPE LIMITS
- No UI for viewing reflection results (deferred to Phase E settings page)
- No manual rule editing UI (deferred to Phase E)
- No vector similarity for rule deduplication (deferred to Phase F)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes
- [ ] reflectionLoop.ts exports `runReflection()` and `shouldReflect()`
- [ ] route.ts is secured with CRON_SECRET
- [ ] vercel.json has cron schedule
- [ ] chatProcessor.ts has fire-and-forget reflection trigger
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- Self-improvement cycle is fully closed: evaluate → reflect → evolve rules → apply rules
</success_criteria>

<output>
After completion, create `.paul/phases/D-self-improvement/D-02-SUMMARY.md`
</output>
