# Intelligence Evolution — v4.1 Vision

> The v4.0 self-improvement pipeline is structurally sound but architecturally naive.
> It produces numbers that go into a database and rules that go into a prompt,
> but it cannot answer the only question that matters:
> **"Is Jarvis actually getting better at serving Jonathan?"**
>
> — Layer 2 Audit, Feb 2026

**Status:** Concept documented, not yet in execution
**Origin:** "Best Work" audit, Layer 2 Intelligence (Feb 27, 2026)
**Depends on:** v4.0 audit completion + live usage data accumulation
**Builds on:** v4.0 items shipped in audit (evaluation trigger widened, rule causality tracking, meta-eval surfaced to UI, examples on rules)

---

## The Core Problem

The v4.0 self-improvement system has three layers:
1. **Evaluator** (Haiku) — scores each conversation on 5 dimensions
2. **Reflection Loop** (Opus) — synthesizes evaluations into behavioral rules
3. **Meta-Evaluator** (Opus) — weekly health check on whether layers 1-2 are working

Each layer works in isolation. The pipeline produces data, but cannot establish causality ("did this rule help?"), cannot learn from the simplest interactions (threshold was too high), and produces generic rules that an LLM effectively ignores ("be concise" — compared to what?).

The v4.0 audit shipped four immediate improvements:
- Widened evaluation trigger (1+ tool use, down from 2+)
- Active rule IDs tagged on every evaluation (causality tracking foundation)
- Meta-evaluator findings surfaced to Brain Health UI (no more /dev/null)
- Concrete examples required on every rule (actionable > abstract)

The five concepts below are the architectural evolution that transforms this from a data-collecting pipeline into a genuinely learning system.

---

## 5. Situation → Behavior Mappings

### The Problem

Current rules are generic: "Keep responses concise." "Check task properties before modifying."

LLMs don't improve from generic instruction. They improve from **contextual specificity** — knowing exactly when to apply exactly what behavior. "Be concise" does almost nothing in a system prompt. "When the user asks about tasks during work hours, respond with a bulleted list of 3-5 items max, no follow-up questions" changes output immediately.

### The Design

Replace the `rule: text` column with a structured format:

```typescript
interface SituationBehaviorMapping {
  /** When this rule applies */
  situation: {
    trigger: string;         // "user asks about tasks"
    context?: string;        // "during work hours" | "at start of session" | "after correction"
    domain?: string;         // "personal" | "visopscreen" | null (all)
  };
  /** What Jarvis should do */
  behavior: {
    instruction: string;     // "Respond with bulleted list, 3-5 items max"
    example: string;         // "Here are your 3 open tasks:\n- Review Q2 budget (due today)\n- ..."
    antipattern?: string;    // "Don't add commentary or ask follow-up questions"
  };
  /** Evidence from real conversations */
  evidence: {
    fromEvaluations: number[];  // evaluation IDs that led to this
    dimension: string;          // which scoring dimension this addresses
    beforeScore: number;        // avg score before this mapping existed
  };
}
```

### System Prompt Injection

Instead of:
```
BEHAVIORAL RULES (self-improved):
- Keep responses concise
- Check task properties before modifying
```

The system prompt would contain:
```
SITUATIONAL GUIDELINES (evolved from self-evaluation):

When the user asks about tasks at the start of a session:
→ Respond with a bulleted list of 3-5 items, prioritized by due date
→ Example: "3 open tasks:\n- Review Q2 budget (due today)\n- Follow up with Sarah\n- Schedule dentist"
→ Avoid: commentary, follow-up questions, or "anything else?"

When the user corrects a previous response:
→ Acknowledge once, apply the correction, move on
→ Example: "Got it, Wednesdays now. Updated."
→ Avoid: apologizing, explaining why you were wrong, re-summarizing
```

This is dramatically more effective because it tells the model exactly WHEN to do WHAT with a concrete EXAMPLE. Research on in-context learning shows examples are 3-10x more effective than abstract instructions.

### Migration Path

1. Keep the existing `rule` + `example` columns (backward compatible)
2. Add a `situationJson` column (nullable) for the structured format
3. `loadBehaviorRulesForPrompt()` checks for `situationJson` first, falls back to `rule + example`
4. Reflection loop produces structured mappings when it has enough context
5. Gradually, all rules become situation-behavior mappings

### Reflection Loop Changes

The reflection prompt would shift from "propose behavioral rules" to:

```
For each improvement pattern you identify, describe:
1. WHEN does this apply? (the situation/trigger)
2. WHAT should Jarvis do differently? (the behavior)
3. SHOW ME an example of the improved behavior (from the evaluation data)
4. What is the ANTIPATTERN to avoid?
```

---

## 6. Deterministic Satisfaction Signals

### The Problem

The evaluator asks Haiku to guess whether Jonathan was satisfied based on "proxy signals" in the text. This is the weakest dimension in the entire pipeline because:
- Haiku is guessing from text tone, not measuring behavior
- Jonathan's communication style (brief, efficient, between patients) gets misread as "neutral" when it's actually "satisfied and busy"
- The score is subjective and noisy — the same conversation could score 6 or 8 depending on Haiku's interpretation

### The Design

Replace the LLM satisfaction guess with **deterministic behavioral signals** computed from actual conversation data:

```typescript
interface SatisfactionSignals {
  /** Did the user re-ask or rephrase? Strong dissatisfaction signal. */
  reaskCount: number;
  /** Did the user explicitly correct Jarvis? */
  correctionCount: number;
  /** Did the user say thanks/perfect/great? */
  positiveSignal: boolean;
  /** Did the user say no/wrong/nevermind? */
  negativeSignal: boolean;
  /** Was this the last exchange in the session? (user got what they needed and left) */
  wasTerminal: boolean;
  /** How many messages after the assistant's response before user moved on? */
  followUpDepth: number;
  /** Computed score: 0-10 based on weighted signals */
  computedScore: number;
}
```

Signal detection can be rule-based (no LLM needed):

```typescript
function detectSatisfactionSignals(messages: ChatMessage[]): SatisfactionSignals {
  const positivePatterns = /\b(thanks|perfect|great|got it|awesome|exactly)\b/i;
  const negativePatterns = /\b(no|wrong|not what|never ?mind|that's not|incorrect)\b/i;
  const reaskPatterns = /\b(I (said|meant|asked)|again|try again|what I (want|need))\b/i;

  // ... count occurrences, compute weighted score
}
```

### Scoring Formula

```
satisfaction = 10
  - (reaskCount * 2.5)        // each re-ask is a strong signal (-2.5)
  - (correctionCount * 2.0)    // each correction is a signal (-2.0)
  - (negativeSignal ? 3.0 : 0) // explicit negative (-3.0)
  + (positiveSignal ? 1.0 : 0) // explicit positive (+1.0, capped at 10)
  + (wasTerminal ? 0.5 : 0)    // clean exit is mildly positive (+0.5)
  clamped to [0, 10]
```

This produces a **consistent, reproducible** satisfaction score that doesn't depend on Haiku's mood. The score is computed BEFORE sending to the evaluator, which can then focus on the 4 dimensions it can actually assess (completeness, accuracy, efficiency, tone).

### Integration

1. Compute `SatisfactionSignals` in `chatProcessor.ts` before calling the evaluator
2. Pass the computed score to `storeEvaluation()` as `satisfactionComputed`
3. Still let Haiku score satisfaction as `satisfactionEstimate` (for comparison)
4. The reflection loop uses `satisfactionComputed` as the primary signal
5. Over time, compare computed vs estimated to validate the formula

---

## 7. Effectiveness Scoring + Merit-Based Rule Retention

### The Problem

The v4.0 rule cap (max 10 active) is FIFO — oldest rules get killed first. This means:
- A highly effective 2-month-old rule gets evicted by a new experimental rule
- The system has no memory of which rules actually improved scores
- The same problems recur because their fixes keep getting evicted

### The Design

With the v4.0 audit's causality tracking foundation (active rule IDs tagged on every evaluation), we can now compute effectiveness:

```typescript
interface RuleEffectiveness {
  ruleId: number;
  /** How many evaluations occurred while this rule was active */
  sampleSize: number;
  /** Average overall score when this rule was active */
  avgScoreWith: number;
  /** Average overall score in the period before this rule (baseline) */
  avgScoreBefore: number;
  /** Score delta: positive = improvement */
  delta: number;
  /** Statistical confidence (need 10+ samples for meaningful signal) */
  confidence: 'low' | 'medium' | 'high';
}
```

### Computing Effectiveness

```typescript
async function computeRuleEffectiveness(ruleId: number): Promise<RuleEffectiveness> {
  // Get evaluations where this rule was active
  const withRule = await db.select()
    .from(conversationEvaluations)
    .where(sql`json_each.value = ${ruleId}`)
    .innerJoin(sql`json_each(${conversationEvaluations.activeRuleIds})`);

  // Get baseline: evaluations from 30 days before rule creation
  const rule = await db.select().from(behaviorRules).where(eq(behaviorRules.id, ruleId));
  const baseline = await getAverageScores(30, rule.createdAt);

  return {
    ruleId,
    sampleSize: withRule.length,
    avgScoreWith: average(withRule.map(e => e.overall)),
    avgScoreBefore: baseline.avgOverall,
    delta: avgScoreWith - avgScoreBefore,
    confidence: withRule.length >= 20 ? 'high' : withRule.length >= 10 ? 'medium' : 'low',
  };
}
```

### Merit-Based Cap Enforcement

Replace FIFO eviction with effectiveness-based eviction:

```typescript
// When rule cap exceeded, evict the LEAST EFFECTIVE rule (not oldest)
const updatedRules = await getActiveRules();
if (updatedRules.length > 10) {
  const effectiveness = await Promise.all(
    updatedRules.map(r => computeRuleEffectiveness(r.id))
  );
  // Sort by delta ascending — worst-performing rule is first
  effectiveness.sort((a, b) => a.delta - b.delta);
  // Evict least effective (only if sample size is meaningful)
  const toEvict = effectiveness.find(e => e.confidence !== 'low');
  if (toEvict) {
    await supersedeRule(toEvict.ruleId);
  }
}
```

### What the Meta-Evaluator Gets

The meta-evaluator can now answer real questions:
- "Rule #7 improved tone by +1.3 over 25 conversations" → keep it
- "Rule #12 had no measurable effect over 15 conversations" → candidate for eviction
- "Rule #3 correlates with a -0.5 drop in efficiency" → actively harmful, remove

---

## 8. Unified Observation + Self-Improvement Pipeline

### The Problem

Two completely separate systems try to learn "how to serve Jonathan better":

**System A: Self-Improvement Pipeline**
- Evaluator → scores conversations
- Reflection Loop → proposes rules
- Meta-Evaluator → checks pipeline health

**System B: Observation/Preference Inference**
- `observeAndInfer()` → tracks behavioral patterns
- `preferenceInference.ts` → stores inferred preferences after threshold
- `loadBehaviorRulesForPrompt()` → loads rules for system prompt
- `inferredPreferences` → loaded separately in context builder

These systems share zero data. The reflection loop doesn't know that Jonathan "prefers brief responses" (inferred from observations). The observation system doesn't know that the evaluator consistently scores "tone" at 9/10 (so tone preferences are already handled).

### The Design

Merge the two into a single intelligence pipeline:

```
                     ┌──────────────┐
                     │ Conversation │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ Evaluate │ │ Observe  │ │  Satisfaction │
        │ (Haiku)  │ │ (detect) │ │  (computed)   │
        └────┬─────┘ └────┬─────┘ └──────┬────────┘
             │             │              │
             ▼             ▼              ▼
        ┌────────────────────────────────────────┐
        │         Unified Intelligence Store      │
        │  evaluations + observations + signals   │
        └────────────────────┬───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Reflection Loop │
                    │  (reads ALL data)│
                    └────────┬────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │  Situation-Behavior    │
                │  Mappings + Preferences │
                └────────────────────────┘
```

### Key Changes

1. **Reflection loop reads observations too.** When proposing rules, the reflection prompt includes:
   - Evaluation scores (existing)
   - Active observations approaching threshold (new)
   - Already-inferred preferences (new)

2. **Observations inform rule proposals.** If the system has observed "prefers_brief_responses" 2 out of 3 times, the reflection loop can proactively propose a brevity rule before the observation threshold triggers.

3. **Single system prompt section.** Instead of separate "BEHAVIORAL RULES" and "LEARNED PREFERENCES" sections, combine into one "INTELLIGENCE" section that presents all learned behavior holistically.

4. **Observations can VALIDATE rules.** If a rule says "be concise" but observations show "prefers_detailed_responses," there's a contradiction that the reflection loop should resolve.

### Implementation Sketch

```typescript
// In the reflection loop, gather ALL intelligence data
const evaluations = await getRecentEvaluations(20);
const activeRules = await getActiveRules();
const pendingObservations = await getPendingInferences(); // from preferenceInference
const inferredPreferences = await getEntriesByCategory('preference');

// Build a richer prompt for Opus
const userMessage = `
EVALUATIONS: ${formatEvaluations(evaluations)}
ACTIVE RULES: ${formatRules(activeRules)}
PENDING OBSERVATIONS: ${formatObservations(pendingObservations)}
INFERRED PREFERENCES: ${formatPreferences(inferredPreferences)}

Look for:
1. Contradictions between rules and observations
2. Observations that should become rules
3. Rules that observations suggest are wrong
4. Gaps: dimensions with low scores that no rule addresses
`;
```

---

## 9. Rule Graduation — Proven Rules Become Permanent Personality

### The Problem

The 10-rule cap means Jarvis's personality resets every ~30 days as old rules are evicted. Rules that have proven highly effective over months get killed the same as experimental rules from last week.

This is the opposite of learning. A human who learns "Jonathan prefers brevity" doesn't forget it after 30 days — it becomes part of their mental model of the person. Jarvis should work the same way.

### The Design

Rules have a lifecycle:

```
PROPOSED → ACTIVE → PROVEN → GRADUATED
                  ↘ INEFFECTIVE → SUPERSEDED
```

**PROPOSED:** Just created by reflection loop. Active but unproven.

**ACTIVE:** Has been in the system prompt for 10+ conversations. Collecting effectiveness data.

**PROVEN:** Effectiveness score shows consistent positive delta (>= +0.5) over 20+ conversations with medium+ confidence. Still in the behavioral rules section.

**GRADUATED:** Has been proven over 50+ conversations with high confidence AND positive delta. Moves OUT of the behavioral rules section and INTO the personality section of the system prompt. No longer counts against the 10-rule cap. Effectively permanent.

**INEFFECTIVE:** Effectiveness score shows no improvement or negative delta over 15+ conversations. Candidate for supersession or removal.

### Schema Changes

```sql
ALTER TABLE behavior_rules ADD COLUMN lifecycle TEXT DEFAULT 'active';
-- 'proposed' | 'active' | 'proven' | 'graduated' | 'ineffective'
ALTER TABLE behavior_rules ADD COLUMN effectiveness_delta REAL;
ALTER TABLE behavior_rules ADD COLUMN sample_size INTEGER DEFAULT 0;
```

### System Prompt Integration

```typescript
function buildSystemPrompt(context: SystemPromptContext): string {
  // ...

  // Graduated rules are part of the personality (permanent, high-confidence)
  if (context.graduatedRules && context.graduatedRules.length > 0) {
    // These are woven into the personality section, not listed as "rules"
    // They feel like Jarvis's natural personality, not imposed constraints
    personalitySection += context.graduatedRules
      .map(r => `\n- ${r.rule}`)
      .join('');
  }

  // Active/proven rules are listed as behavioral guidelines (still evolving)
  if (context.behaviorRules && context.behaviorRules.length > 0) {
    sections.push(`BEHAVIORAL GUIDELINES (evolving):
${context.behaviorRules.map(r => `- ${r}`).join('\n')}`);
  }
}
```

### The Vision

Over months of real usage, Jarvis's personality section grows organically:
- Month 1: Generic Jarvis personality + 5-10 active rules churning
- Month 3: Generic personality + 3 graduated traits + 7 active rules
- Month 6: Rich personality (generic + 8 graduated traits) + 5 active rules exploring new territory
- Month 12: Jarvis feels like a genuinely personalized assistant — not because someone wrote a custom prompt, but because the system LEARNED what works for Jonathan

The 10-rule cap becomes a cap on EXPLORATION, not on total learned behavior. Proven behaviors graduate out of the cap into permanent personality.

---

## Implementation Priority

| # | Concept | Depends On | Effort | Impact |
|---|---------|------------|--------|--------|
| 6 | Deterministic satisfaction | Nothing | Small | High — replaces weakest signal |
| 7 | Effectiveness scoring | v4.0 causality tracking (shipped) | Medium | High — enables everything else |
| 5 | Situation-Behavior mappings | Effectiveness scoring | Medium | Very High — fundamentally better rules |
| 8 | Unified pipeline | Reflection loop changes | Medium | Medium — reduces fragmentation |
| 9 | Rule graduation | Effectiveness scoring + situation mappings | Small | Very High — enables convergence |

**Recommended sequence:** 6 → 7 → 5 → 9 → 8

Start with deterministic satisfaction (easiest, removes the weakest link). Then effectiveness scoring (unlocks merit-based decisions). Then situation-behavior mappings (the biggest quality leap). Then graduation (the convergence mechanism). Finally unify the pipelines (cleanup).

---

## Relationship to Other Concepts

- **Jarvis Academy** (`concepts/jarvis-academy.md`): Academy mode adds `academyContext` to the system prompt. Situational rules could include Academy-specific mappings: "When in Academy mode and user gets an answer wrong → encourage, don't correct immediately."

- **v4.0 Honest Gaps**: The 6 empty domains need content before domain-specific situational rules make sense. Personal domain has enough data now.

- **Vector Memory** (Phase F): Effectiveness scoring could leverage vector search to find similar past conversations and compare before/after a rule was introduced.

---

*This document captures the architectural vision for evolving Jarvis's intelligence from a data-collecting pipeline into a genuinely learning system. Execute with evolving perfection when live usage data has accumulated enough signal.*
