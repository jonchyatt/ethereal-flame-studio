# Karpathy AutoResearch Pattern — Jarvis Master Reference

**Date:** 2026-03-15 (updated from 2026-03-13)
**Source:** [Karpathy AutoResearch repo](https://github.com/karpathy/autoresearch), video breakdowns
**Purpose:** This is the philosophical and operational framework behind ALL quality loops in Jarvis. Not just a pattern — a way of thinking.

---

## The Core Idea in One Sentence

Give an AI agent a measurable goal, a single file it can modify, and a fixed time budget per experiment — then let it run the scientific method in a loop overnight.

---

## What AutoResearch Actually Is

AutoResearch is Karpathy's experiment where an AI agent autonomously runs ML research:

```
Form hypothesis → Modify train.py → Train for exactly 5 min → Measure val_bpb → Keep or discard → Repeat
```

**The three files:**
- `prepare.py` — data prep (human-maintained, agent cannot touch)
- `train.py` — the ONLY file the agent can modify (model arch, optimizer, loop)
- `PROGRAM.md` — human-written research plan the agent reads before each experiment

**Results on nanoGPT / TinyStories:**
- Baseline: 1.173 val_bpb (barely above random)
- Final: 0.511 val_bpb — 56% improvement
- ~700 autonomous experiments
- Discoveries: shallower depth (3 layers vs 8), smaller batch size, vocab 4096
- **None were obvious. The agent found them. Karpathy missed them for 20 years of manual tuning.**

---

## The Three Non-Negotiable Principles

These are what make AutoResearch work. Violate any of them and you get noise, not signal.

### Principle 1: Single Modification Point
The agent touches ONE file. Not the data, not the infrastructure, not the evaluation harness — just `train.py`.

**Why it matters:** If the agent changes multiple things simultaneously, you can't isolate what caused improvement. You also can't review changes — the diff is too large. One variable, one outcome, traceable causality.

**Applied to Jarvis:** When running an AutoResearch loop on grant applications, the agent modifies ONE thing per experiment: the application narrative structure, OR the mission framing, OR the evidence section — never all three.

### Principle 2: Fixed Time Budget
Every experiment runs for EXACTLY 5 minutes. No exceptions.

**Why it matters:** Without a fixed budget, "better" could just mean "ran longer." The fixed time budget makes results comparable across all experiments, forever. You can compare Experiment 1 vs Experiment 700 because they all ran for the same duration.

**Applied to Jarvis:** Grant scoring runs for a fixed number of passes (e.g., 3 critic iterations max). Quality is measured at the same point every time. Morning briefing quality is measured at the same time each day.

### Principle 3: Measurable Objective Metric
One number. Lower is better (or higher is better). Consistent methodology.

**Why it matters:** "Better" is not a metric. "val_bpb < 0.900" is a metric. Without a number, the agent is just generating opinions. With a number, it's doing science.

**Applied to Jarvis:** Every AutoResearch loop needs a number before it starts. Not "better grant applications" — "critic rubric score ≥ 8.0 out of 10."

---

## The Loop (Generalized)

```
┌─────────────────────────────────────────────────────────┐
│  1. Read PROGRAM.md — what's the goal? what's the metric? │
│  2. Read resources.md — what have we learned so far?      │
│  3. Form ONE hypothesis: "If I change X, Y should improve"│
│  4. Modify the single target file                         │
│  5. Run experiment for fixed budget                       │
│  6. Measure the metric                                    │
│  7. Compare: challenger vs current baseline               │
│     • If better → challenger becomes new baseline         │
│       Log: "Changed X, metric went from A to B. Why: Z"  │
│     • If worse → discard, restore baseline                │
│       Log: "Changed X, metric got worse. Hypothesis wrong.│
│             Insight: Z (informs next hypothesis)"         │
│  8. Update resources.md with the learning                 │
│  9. Repeat from step 2                                    │
└─────────────────────────────────────────────────────────┘
```

### The Knowledge File (resources.md)

This is the actual product — not any individual experiment, but the accumulated knowledge:
```markdown
## Learnings (auto-maintained, newest first)

Experiment 023: Shorter mission statements (<50 words) score 1.2 pts higher on funder alignment
Experiment 019: Leading with community need outperforms leading with org credentials (+0.8 pts)
Experiment 011: Concrete numbers in evidence section ("847 patients served") vs vague ("many patients served") +1.5 pts
Experiment 007: Matching funder's own vocabulary exactly (scraped from their guidelines) +0.9 pts
Experiment 003: Budget narrative must mirror program narrative section-by-section — reviewers cross-check
```

After 50+ experiments, this file is more valuable than any consultant.

---

## Applied to Jarvis: The Grant Rubric Loop

This is the primary near-term application. Before showing Jonathan any grant application plan, the agent runs its own critic scoring loop.

### The Rubric (Fixed Metric)

Score each category 0-10, total out of 60, normalize to 10.0:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Mission alignment | 15/60 | Does our narrative match funder's stated priorities? (pulled from guidelines) |
| Value proposition | 10/60 | Is our org's unique angle clearly differentiated? |
| Completeness | 10/60 | Every required question answered? No blanks? |
| Evidence strength | 10/60 | Data, outcomes, community need cited with specifics? |
| Budget narrative | 10/60 | Budget matches program narrative section-by-section? |
| Language match | 5/60 | Echoes funder's own vocabulary from scraped guidelines? |

**Threshold:** Score ≥ 8.0 → show to Jonathan. Below 8.0 → agent revises, up to 3 iterations.

### The Loop in Practice

```
Agent Zero draft → Critic scores (0.0-10.0) → Below 8.0?
  → Identify lowest-scoring dimension
  → Modify that dimension ONLY (single modification point)
  → Re-score
  → Below 8.0 and < 3 iterations? → Repeat
  → ≥ 8.0 OR 3 iterations → Show to Jonathan with score breakdown
  → Log to resources.md: "Funder X: evidence section lowest-scored dimension consistently"
```

This means Jonathan never sees a draft that hasn't already been self-criticized at least once. The score breakdown tells him exactly where the weaknesses are.

---

## Applied to Jarvis: All Other Quality Loops

### Morning Briefing Quality

| Element | Metric | Variable | Loop Time |
|---------|--------|----------|-----------|
| Briefing format | Jonathan's rating (1-5) | Section order, length, tone | Daily |
| Task prioritization | Completion rate (%) | Priority algorithm parameters | Weekly |
| Notification timing | Response time after notification | Send times | Weekly |

**PROGRAM.md for briefing:**
```
Goal: Maximize briefing usefulness (Jonathan rates it 4+ consistently)
Metric: Average daily rating, rolling 7-day window
Variable: ONLY briefing_format.md (section order, depth, tone)
Budget: One format variant per day. Keep for 5 days, compare rolling averages.
```

### Jarvis System Prompt Optimization

This directly extends Phase D's self-improvement loop. Instead of qualitative reflection only, add the AutoResearch structure:

| Element | Metric | Variable | Loop Time |
|---------|--------|----------|-----------|
| Response quality | Haiku critic score (1-10) | System prompt sections | Weekly |
| Behavior rules | Task completion rate | Rule set additions/removals | Monthly |

**The key gap Phase D has today:** Rules are kept forever, even ineffective ones. AutoResearch adds the discard gate — rules that don't improve measurable outcomes get removed.

### Visopscreen / Cross-Project Loops

| Use Case | Metric | Variable | Loop Time |
|----------|--------|----------|-----------|
| API response time | p95 latency (ms) | Query optimization | Per deploy |
| Onboarding completion | % users who complete | Copy/step order | Weekly |

### Ethereal Flame Studio (YouTube)

| Use Case | Metric | Variable | Loop Time |
|----------|--------|----------|-----------|
| Video CTR | Click-through rate (YouTube Data API) | Thumbnail/title | Per upload |
| Description optimization | Search impressions | Description structure | Weekly |

---

## The PROGRAM.md Template

Every AutoResearch loop starts with a human-written PROGRAM.md. This is the non-negotiable anchor:

```markdown
# [Domain] AutoResearch Program

## Goal
[One sentence. What is optimal?]

## Metric
[One number. How do we measure optimal?]
[How is it calculated? What is the baseline?]
[What is the target threshold?]

## What Can Be Changed (The Target File)
[Exactly one thing the agent can modify]
[What it cannot change]

## Time Budget
[Fixed budget per experiment]
[Maximum iterations before surfacing to human]

## Baseline
[Current performance: metric = X]
[Current target file state: baseline_[domain].md]

## Accumulated Learnings
[Link to or embed resources.md]

## Instructions for Agent
[Behavioral guidance]
[What "better" looks like in this domain]
[Edge cases and guard rails]
```

---

## Infrastructure Options for Running Loops

### Option 1: Claude Code Scheduled Tasks (Desktop — Best for Jarvis)
- Runs on the desktop overnight via PM2 + Claude Code SDK
- Setup: scheduled task that triggers AutoResearch orchestrator
- Best for: grant scoring loops, morning briefing optimization, Jarvis self-improvement
- Limitation: desktop must be awake (solved by Dual-Jarvis reliability layer)

### Option 2: GitHub Actions (Cloud — Best for Code/Deploy Loops)
- 24/7 operation, free tier = 2,000 min/month
- Best for: Visopscreen API performance, build optimization
- Triggered: on deploy, or cron

### Option 3: Agent Zero Scheduled Tasks (Best for Web Research Loops)
- Agent Zero has built-in scheduled tasks (Mon 7 AM weekly grant scan, etc.)
- Runs inside Docker, persistent between sessions
- Best for: grant discovery, winner analysis, competitive intelligence

---

## Key Principles Summary (Reference Card)

1. **Single modification point** — one variable, one experiment, traceable causality
2. **Fixed time budget** — comparability requires constraints
3. **Measurable metric** — if it's not a number, it's an opinion
4. **Baseline vs challenger** — always comparing to the current best, not to the original
5. **Log everything** — the knowledge file is the real product
6. **Discard gate** — worse results get discarded AND logged (failures teach too)
7. **Consolidate periodically** — after ~100 experiments, summarize resources.md to prevent bloat
8. **One agent per loop** — don't mix domains; grant loop ≠ briefing loop ≠ prompt loop
9. **Human gates on irreversible actions** — agent iterates freely; human approves submit
10. **The agent IS the researcher** — not a script runner, a reasoning entity forming hypotheses

---

## What's Already Built vs What's Needed

| Component | Status |
|-----------|--------|
| Phase D critic scoring (Haiku evaluator) | SHIPPED — used for conversation quality |
| Phase D reflection (Opus rule generation) | SHIPPED — generates behavior rules |
| Phase D meta-evaluation | SHIPPED — evaluates if self-improvement is working |
| Scheduled tasks infrastructure | NOT BUILT — needed for overnight loops |
| Formal hypothesis → experiment → discard loop | NOT BUILT — Phase D is qualitative |
| resources.md knowledge accumulation | NOT BUILT — results aren't persisted structurally |
| Grant rubric critic loop | NOT BUILT — v4.5 W-05 |
| PROGRAM.md templates per domain | NOT BUILT — W-01+ scope |

**The gap:** Phase D evaluates and reflects but doesn't run systematic experiments with a fixed metric and a discard gate. AutoResearch adds the experimental discipline to what Phase D already does intuitively.

---

## Connection to Grant Secretary Workflow (v4.5)

The AutoResearch pattern shows up in two places in the grant workflow:

**Pre-submission (W-05):** Critic loop scores the draft before Jonathan sees it. This is the Karpathy loop applied to output quality.

**Post-submission (future):** When a grant outcome is known (funded / rejected), the critic scores the submitted application retrospectively. Learnings go into resources.md. Over 6-12 months, Jarvis gets better at predicting which opportunities are worth applying for and which language resonates with which funders.

This is the compounding advantage: the system improves with each application whether funded or not.

---

## References

- [Karpathy AutoResearch repo](https://github.com/karpathy/autoresearch) (active, Python)
- Karpathy quote: "Seeing an agent do this entire workflow end to end and all by itself as it worked through approximately 700 changes autonomously is wild."
- Karpathy quote: "All LLM Frontier Labs will do this. It's the final boss battle."
- Existing Jarvis Phase D: `jarvis/.paul/phases/D-self-improvement/`
- Scheduled tasks reference: `jarvis/docs/claude-code-scheduled-tasks.md`
- Grant workflow: `jarvis/.paul/concepts/jarvis-hands-v45.md`
