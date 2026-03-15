# Karpathy AutoResearch Pattern — Jarvis Application Guide

**Date:** 2026-03-13
**Source:** [Karpathy AutoResearch repo](https://github.com/karpathy/auto-research), video breakdowns
**Purpose:** Document the AutoResearch pattern and how Jarvis should leverage it as a master agent

---

## What Is AutoResearch?

AutoResearch is a pattern created by Andrej Karpathy (OpenAI co-founder, one of the foremost minds in AI/ML) where an AI agent autonomously runs the scientific method in a loop:

```
Form hypothesis → Run experiment → Measure results → Keep or discard → Repeat
```

Karpathy's original use case: training a small LLM (nanoGPT). The agent modifies hyperparameters, trains for 5 minutes, checks if validation loss improved, keeps what works, discards what doesn't, and builds on successes. He ran ~700 autonomous experiments and the agent found bugs he'd missed for 20 years of manual tuning.

**Key quote:** "All LLM Frontier Labs will do this. It's the final boss battle."

---

## Why It Matters

This is NOT a toy experiment. It's the automation of the scientific method itself:

1. **Self-healing** — Unlike deterministic scripts that break on errors, the agent diagnoses and recovers
2. **Self-improving** — Each experiment's results inform the next hypothesis
3. **Compounding** — Learnings accumulate in a knowledge base (resources.md) that makes future experiments smarter
4. **24/7** — Runs overnight while you sleep, hundreds of experiments with zero human involvement

### Karpathy's Results (nanoGPT on TinyStories)
- Baseline: 1.173 val_bpb (barely better than random)
- Final: 0.511 val_bpb (near human-level, 56% improvement)
- Key discoveries: shallower depth (3 vs 8), smaller batch size, vocab 4096
- **None of these were obvious** — the agent found them through systematic experimentation

---

## The Pattern (Generalized)

### Three Requirements
1. **Objective metric** you can measure (reply rate, conversion rate, val_loss, satisfaction score)
2. **API or programmatic access** to change inputs (email copy, landing page, model config, ad creative)
3. **Fast feedback loop** — the tighter the loop, the faster improvement compounds

### The Loop
```
┌─────────────────────────────────────────────┐
│  1. Read research plan (PROGRAM.md)         │
│  2. Review previous experiment results      │
│  3. Form hypothesis based on learnings      │
│  4. Modify the variable (code/copy/config)  │
│  5. Run experiment (train/deploy/send)      │
│  6. Measure results (metric)                │
│  7. Compare: baseline vs challenger         │
│  8. If better → new baseline + log why      │
│     If worse → discard + log why            │
│  9. Update resources.md with learnings      │
│  10. Repeat from step 2                     │
└─────────────────────────────────────────────┘
```

### File Structure (Karpathy's Original)
```
auto-research/
├── PROGRAM.md          ← Research plan (human-written, agent reads)
├── train.py            ← The only file the agent can modify
├── data/               ← Training data
├── results/            ← Experiment logs (agent-written)
└── resources.md        ← Accumulated learnings (agent-maintained)
```

---

## Proven Use Cases Beyond ML

### Marketing / Sales
| Use Case | Metric | Variable | Loop Time |
|----------|--------|----------|-----------|
| Cold email copy | Reply rate | Email body/subject | 4 hours |
| Landing pages (CRO) | Conversion rate | Page layout/copy | 1 day |
| Ad creatives | CTR / CVR | Ad copy/images | 6 hours |
| YouTube titles | Click-through rate | Title text | 1 day |
| Newsletter subjects | Open rate | Subject line | Per send |
| Product descriptions | Sales/revenue | Description copy | 1 day |
| Pricing pages | Conversion rate | Price/layout | 1 week |

### Software / DevOps
| Use Case | Metric | Variable | Loop Time |
|----------|--------|----------|-----------|
| API performance | Response time (p95) | Code/config | 5 min |
| Build optimization | Build time | Webpack/config | 5 min |
| Test suite speed | Total runtime | Test structure | 5 min |
| Database queries | Query time | SQL/indexes | 5 min |
| Prompt engineering | Quality score | System prompt | 5 min |

### Personal (Jarvis-Specific)
| Use Case | Metric | Variable | Loop Time |
|----------|--------|----------|-----------|
| Morning briefing quality | User satisfaction | Briefing format/content | 1 day |
| Habit formation | Streak length | Reminder timing/framing | 1 week |
| Task prioritization | Completion rate | Priority algorithm | 1 day |
| Notification timing | Response rate | Send times | 1 day |

---

## Implementation Pattern: Orchestrator + Challenger

The practical implementation (as demonstrated by practitioners applying this) uses:

### Orchestrator Agent
Top-level agent that manages the experiment lifecycle:
```
orchestrator.py / orchestrator.ts
├── Reads PROGRAM.md (research plan)
├── Reviews previous results from resources.md
├── Spawns sub-agents for:
│   ├── Generating new challenger variants
│   ├── Deploying experiments (API calls)
│   ├── Harvesting results (metric collection)
│   └── Analyzing outcomes
├── Decides: promote challenger → baseline OR discard
└── Updates resources.md with learnings
```

### Baseline vs Challenger Pattern
```
Round 1: Baseline (human-written) vs Challenger A (agent-generated)
  → Challenger A wins → becomes new Baseline
Round 2: Baseline (was Challenger A) vs Challenger B
  → Baseline wins → discard B, log why
Round 3: Baseline vs Challenger C
  → Challenger C wins → becomes new Baseline
...repeat indefinitely
```

### Knowledge Accumulation
The `resources.md` file grows with each experiment:
```markdown
## Learnings (auto-maintained)
- Shorter emails (<75 words) → +0.3% reply rate
- Specific CTA with time → +0.5% reply rate
- Leading with relevance > leading with credentials
- Risk reversal in first line → higher engagement
- Subject lines as questions outperform statements
```

This accumulated knowledge makes each new challenger smarter than the last.

---

## Running AutoResearch: Infrastructure Options

### Option 1: Claude Code Scheduled Tasks (Desktop)
- Best for: personal use, runs on your machine
- Setup: Claude Desktop → Schedule tab → New Task
- Frequency: hourly/daily depending on experiment
- Limitation: computer must be awake

### Option 2: GitHub Actions (Cloud)
- Best for: 24/7 unattended operation
- Setup: `.github/workflows/autoresearch.yml` with cron trigger
- Frequency: as tight as every 5 minutes
- Cost: free tier = 2,000 min/month

### Option 3: Hybrid (Recommended for Jarvis)
- Scheduled tasks for interactive experiments (desktop)
- GitHub Actions for background optimization loops (cloud)
- Both write results to same repo/database

---

## Jarvis AutoResearch Applications

### Application 1: Master Agent Self-Optimization

Jarvis is the master agent for multiple projects (Visopscreen, Ethereal Flame Studio video channel). The AutoResearch pattern can optimize Jarvis's own effectiveness:

**PROGRAM.md concept:**
```
Goal: Maximize user satisfaction and task completion rate.

Metrics:
- Task completion rate (tasks created vs completed)
- Response usefulness (self-evaluation score)
- Conversation efficiency (turns to resolution)

Variables to experiment with:
- System prompt phrasing and structure
- Tool selection heuristics
- Morning briefing format and content
- Notification timing and frequency
- Task prioritization algorithm
```

**Loop:** Daily at 11 PM, review the day's interactions, evaluate what worked, generate a hypothesis for improvement, update behavior rules.

This directly extends the existing Phase D self-improvement system (evaluator → reflection → behavior rules) by adding the formal hypothesis → experiment → measure → keep/discard loop.

### Application 2: Cross-Project Optimization

As master agent for Visopscreen and Ethereal Flame Studio:

**Visopscreen experiments:**
- A/B test onboarding flows (metric: completion rate)
- Optimize API response times (metric: p95 latency)
- Test different UI layouts (metric: user engagement)

**Ethereal Flame Studio experiments:**
- YouTube thumbnail/title testing (metric: CTR via YouTube Data API v3)
- Video description optimization (metric: search impressions)
- Upload timing optimization (metric: first-hour views)

### Application 3: Bill & Financial Optimization

**PROGRAM.md concept:**
```
Goal: Minimize total bill costs and prevent late payments.

Metrics:
- Bills paid on time (%)
- Total monthly spend vs budget
- Savings identified

Variables:
- Payment timing (early payment discounts?)
- Service plan comparisons (cheaper alternatives?)
- Usage patterns (can we reduce consumption?)
```

### Application 4: Habit & Health Optimization

**PROGRAM.md concept:**
```
Goal: Maximize habit consistency and health metrics.

Metrics:
- Habit streak lengths
- Completion rate per habit
- Health metric trends

Variables:
- Reminder timing and frequency
- Habit stacking order
- Recovery protocols after streak breaks
```

---

## Connection to Existing Jarvis Systems

### Phase D Self-Improvement (Already Built)
The existing system does:
- L1: Haiku critic (5-dimension conversation evaluation)
- L2: Opus reflection (synthesize patterns → behavior rules)
- L3: Opus meta-evaluation (is self-improvement working?)

**AutoResearch enhancement:** Add formal hypothesis tracking, A/B testing of behavior rules, and metric-driven keep/discard decisions instead of purely qualitative reflection.

### Scheduled Tasks Integration
AutoResearch loops should run as Claude Code scheduled tasks:
- **Hourly:** Fast-loop experiments (prompt optimization, API performance)
- **Daily:** Medium-loop experiments (briefing quality, task prioritization)
- **Weekly:** Slow-loop experiments (habit formation, financial optimization)

### Knowledge Base
All experiment results should flow into:
- `resources.md` per experiment domain
- Notion database for structured tracking
- Jarvis memory system for cross-domain insights

---

## Getting Started: Minimal Viable AutoResearch

1. **Pick one metric** — start with morning briefing satisfaction
2. **Write PROGRAM.md** — goal, metric, what can be changed
3. **Set baseline** — current morning briefing format
4. **Create scheduled task** — daily, generate challenger briefing format
5. **Measure** — ask Jon to rate briefings (1-5) or use self-evaluation
6. **Iterate** — keep what scores higher, discard what doesn't

Scale up from there. Each successful AutoResearch loop proves the pattern for the next domain.

---

## Key Principles

1. **Start small, iterate fast** — 5-minute loops > 1-day loops for learning
2. **One variable at a time** — isolate what's actually causing improvement
3. **Log everything** — the knowledge base is the real product, not any single experiment
4. **Consolidate periodically** — after ~500 experiments, summarize learnings to prevent context bloat
5. **Agent swarms (future)** — multiple agents testing in parallel, promoting best ideas to a larger model (Karpathy's next direction)
6. **The agent IS the researcher** — not a script runner, a reasoning entity that forms hypotheses

---

## References

- [Karpathy AutoResearch repo](https://github.com/karpathy/auto-research)
- [Windows/RTX fork](https://github.com/karpathy/auto-research-win-rtx)
- Karpathy quote: "Seeing an agent do this entire workflow end to end and all by itself as it worked through approximately 700 changes autonomously is wild."
- Existing Jarvis Phase D: `jarvis/.paul/phases/D-self-improvement/`
- Agent Zero inspiration: `jarvis/.paul/research/v4-intelligence-audit.md`
