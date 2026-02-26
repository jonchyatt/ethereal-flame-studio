# Roadmap: Jarvis v4.0 Brain Swap & Life Manager UI

**Milestone:** v4.0
**Status:** In progress (Phase A complete, Phase B planning)
**Phases:** 6 (B through G)
**Research:** `.paul/research/v4-intelligence-audit.md`

---

## Phase A: Intelligence Audit (COMPLETE)

**Goal:** Understand what Jarvis has before changing anything

**Deliverable:** Research document auditing Jarvis, Agent Zero, and ClaudeClaw

**Status:** COMPLETE — 17 gems identified, Option D recommended

---

## Phase B: SDK Integration

**Goal:** Replace chatProcessor.ts tool loop with Claude Code SDK `query()` while preserving the intelligence layer

**What changes:**
- New: `query()` call replaces custom Anthropic API + tool iteration loop
- New: `.mcp.json` for Notion MCP server (replaces direct SDK calls)
- Preserved: System prompt assembly, memory injection, personality
- Preserved: Side effects (dashboard refresh, panel open, captures)

**Key risk:** Jarvis runs on Vercel (serverless). Claude Code SDK may need adaptation for serverless context. Research needed during planning.

**Depends on:** Phase A (complete)

**Status:** COMPLETE — B-01-SUMMARY.md

---

## Phase C: Memory & Intelligence Preservation

**Goal:** Ensure all 17 gems survive the SDK swap and work with the new brain

**What changes:**
- Adapt memory retrieval + scoring to prepend to SDK prompt
- Preserve preference inference pipeline
- Preserve conversation summarization + backfill
- Adapt fuzzy title resolution for MCP tool results
- Preserve error self-healing loop

**Depends on:** Phase B

**Status:** COMPLETE — C-01-SUMMARY.md

---

## Phase D: Self-Improvement Loop

**Goal:** Port Agent Zero's critic → evaluate → evolve cycle to Jarvis

**What changes:**
- New: Conversation evaluation with 5-dimension rubric
- New: Behavior evolution with versioned rules and rollback
- Upgrade: Existing preference inference pipeline enhanced with A0 patterns
- New: Reflection scheduling (time-based or interaction-count triggered)

**Depends on:** Phase C (memory system must be stable first)

**Status:** COMPLETE — D-01 (evaluator + behavior rules) + D-02 (reflection loop + meta-evaluator)

---

## Phase E: Mobile-First UI Redesign

**Goal:** Elegant responsive interface that works beautifully on both desktop and mobile

**What changes:**
- New: Clean chat + voice interface (primary interaction)
- New: Dashboard with tasks, habits, bills, scheduling
- Preserved: NotionPanel overlay system
- Archived: 3D orb (kept in codebase, removed from main UI)
- Design: No Figma/design plugins — built with taste and iteration

**Depends on:** Phase B (needs SDK integration for chat to work)
**Parallel with:** Phase C and D (UI is independent of memory/self-improvement internals)

**Status:** In progress — E-01/E-02/E-03 complete (research + IA + UI design), E-04 building (Shell Foundation plan created)

---

## Phase F: Vector Memory

**Goal:** Add semantic search alongside existing BM25 keyword search

**What changes:**
- New: Embedding-based memory search ("remember when we talked about...")
- New: Memory consolidation (merge similar memories)
- Upgrade: Dual retrieval — BM25 for exact, vector for semantic

**Depends on:** Phase C (memory system must be preserved first)

**Status:** Not started

---

## Phase G: Integration & Polish

**Goal:** End-to-end verification, edge case handling, production hardening

**What changes:**
- Verify all 17 gems work in new architecture
- Cross-session continuity testing
- Executive function (briefings, nudges, check-ins) verified
- Performance optimization
- Production deployment verification

**Depends on:** All prior phases

**Status:** Not started

---

## Dependency Graph

```
Phase A (Research) ← COMPLETE
    │
    ▼
Phase B (SDK Integration)
    │
    ├──────────────────┐
    ▼                  ▼
Phase C (Memory)    Phase E (UI) — parallel
    │
    ├───────┐
    ▼       ▼
Phase D   Phase F
(Self-    (Vector
Improve)  Memory)
    │       │
    └───┬───┘
        ▼
    Phase G (Polish)
```

---

## Progress

| Phase | Name | Status |
|-------|------|--------|
| A | Intelligence Audit | Complete |
| B | SDK Integration | Complete |
| C | Memory & Intelligence Preservation | Complete |
| D | Self-Improvement Loop | Complete |
| E | Mobile-First UI Redesign | In progress (E-04-01 planning) |
| F | Vector Memory | Not started |
| G | Integration & Polish | Not started |

---

*Created: 2026-02-25*
*Milestone: v4.0 Brain Swap & Life Manager UI*
