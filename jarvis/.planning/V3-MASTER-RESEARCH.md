# Jarvis v3 Master Research & Planning Document

> **Purpose:** Single source of truth for all v3 research, decisions, and planning.
> **Last Updated:** 2026-02-03
> **Status:** Research Complete, Ready for Phase Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State (v1/v2)](#current-state-v1v2)
3. [Research Findings](#research-findings)
4. [Architecture Decisions](#architecture-decisions)
5. [Feature Roadmap](#feature-roadmap)
6. [Implementation Phases](#implementation-phases)
7. [Reference Documents](#reference-documents)

---

## Executive Summary

### What is Jarvis v3?

Jarvis v3 transforms the voice-enabled executive function partner into a **full autonomous agentic system** with:

1. **Persistent memory** with conversation continuity
2. **Self-healing loops** that learn from errors
3. **Remote control** via Telegram
4. **Tutorial system** for user onboarding
5. **Integration with Atlas/GOTCHA framework** for autonomous operation

### Key Research Sources

| Source | What We Learned | Document |
|--------|-----------------|----------|
| OpenClaw + N8N (Barty Bart) | Bi-directional agent ↔ workflow pattern | `V3-OPENCLAW-N8N-RESEARCH.md` |
| GOTCHA/Atlas (Mansel Scheffel) | Self-improving autonomous agent architecture | `V3-AGENT-ARCHITECTURE-DEEP-DIVE.md` |
| Notion Life OS (Simon) | Pedagogical framework for tutorials | `JARVIS-TUTORIAL-FRAMEWORK.md` |

### Critical Insight

> "90% accuracy per step = ~59% accuracy over 5 steps."

**Solution:** Push reliability into deterministic code, push reasoning into the LLM.

---

## Current State (v1/v2)

### v1.0 (Shipped 2026-02-02)
- 49 files, 11,851 LOC TypeScript
- Voice pipeline (Deepgram STT + ElevenLabs TTS)
- Claude API with 10 Notion tools + 5 memory tools
- Morning/evening/weekly briefings
- Life area tracking with neglect detection
- Dashboard with priority indicators

### v2.0 (In Progress)
- Phase 7: Database foundation (context complete)
- Phases 8-11: Memory, guardrails, production deployment
- Target: jarvis.whatareyouappreciatingnow.com

### Known Limitations
- No persistent memory across sessions (beyond localStorage)
- No remote control capability
- No self-healing on errors
- No user onboarding/tutorial
- Every tool call = LLM tokens (no caching/batching)

---

## Research Findings

### Finding 1: Two Agent Architecture Patterns

**Pattern A: OpenClaw + N8N**
```
Agent → Webhook → N8N Workflow → Webhook Response → Agent
```
- Pros: Token savings, deterministic workflows, 1000+ integrations
- Cons: Extra infrastructure, complexity, latency

**Pattern B: GOTCHA/Atlas (Recommended)**
```
Claude Code IS the orchestrator + Deterministic Python tools
```
- Pros: No extra infrastructure, self-improving, no API costs (Max sub)
- Cons: Requires always-on machine

**Decision:** Use GOTCHA/Atlas pattern. More powerful, simpler architecture.

### Finding 2: Memory System Architecture

From Atlas framework analysis:

```
memory/
├── MEMORY.md          # Human-readable long-term facts
├── logs/YYYY-MM-DD.md # Daily session logs
└── index.json         # Fast lookup

data/
├── memory.db          # SQLite with embeddings
├── messages.db        # Conversation history (last 20)
└── activity.db        # Workflow tracking
```

**Key Features:**
- Hybrid search (BM25 keyword + vector semantic)
- Memory types: fact, preference, event, insight, task, relationship
- Decay function for older facts
- Conversation continuity (load last 20 messages)

### Finding 3: Self-Healing Loop

```
Error → Document → Fix Tool/Goal → Retry → Success
              ↓
        Add to Guardrails (prevent recurrence)
```

**Implementation:**
1. Catch errors with full context
2. Log to memory with pattern identification
3. Ask Claude for fix strategy
4. Apply fix and retry
5. On success, update goal/tool documentation
6. Add guardrail if pattern is dangerous

### Finding 4: Tutorial Framework (From Notion Life OS)

**Pedagogical Principles:**
1. Mindset first ("use what's useful")
2. Navigation before features
3. Overwhelm alerts
4. Progressive disclosure
5. Two methods (simple vs advanced)

**Module Structure:**
- Module 0: Welcome & Mindset
- Module 1: Navigation (3 Ways to Interact)
- Module 2-12: Feature-specific lessons
- Each module: content, demo, exercise, overwhelm alert

---

## Architecture Decisions

### Decision 1: Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    JARVIS v3 ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Interfaces                                                 │
│  ├── Voice (web app) ──────▶ Jarvis API (Vercel)               │
│  ├── Dashboard (web) ──────▶ Jarvis API (Vercel)               │
│  └── Telegram (phone) ─────▶ Atlas (MacBook) ───▶ Jarvis API   │
│                                                                  │
│  Jarvis API (Vercel - Serverless)                               │
│  ├── Voice pipeline (existing)                                  │
│  ├── Claude API for conversation                                │
│  ├── Notion tools for Life OS                                   │
│  ├── Memory tools (read/write)                                  │
│  ├── Tutorial system (NEW)                                      │
│  └── Briefing workflows (existing)                              │
│                                                                  │
│  Atlas (MacBook - Always On) [When Available]                   │
│  ├── Telegram handler daemon                                    │
│  ├── GOTCHA framework                                           │
│  ├── Self-healing loops                                         │
│  ├── Build/automation capabilities                              │
│  └── Overnight autonomous operation                             │
│                                                                  │
│  Shared State                                                    │
│  ├── Turso database (cloud SQLite)                              │
│  ├── Notion (Life OS data)                                      │
│  └── Memory sync                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Decision 2: Tutorial as Core Feature

Tutorial is NOT documentation. It's a conversational feature:
- Jarvis teaches through voice interaction
- Progressive module unlocking
- Tracks user progress in memory
- Adapts to user expertise level

### Decision 3: Memory-First for v3

Before adding new capabilities, make memory robust:
1. Conversation continuity (last 20 messages)
2. Fact persistence (MEMORY.md + SQLite)
3. Session logging (daily logs)
4. Hybrid search (keyword + semantic)

### Decision 4: Telegram Before Full Atlas

Implement Telegram control in Jarvis (Vercel) first:
- Simpler architecture
- Works without MacBook
- Proves the pattern
- Atlas adds autonomous capabilities later

---

## Feature Roadmap

### v3.0 Features (Prioritized)

| Priority | Feature | Description | Phase |
|----------|---------|-------------|-------|
| P0 | Tutorial System | Voice-guided onboarding | 12 |
| P0 | Memory Enhancement | Conversation continuity + hybrid search | 13 |
| P1 | Self-Healing Loop | Error documentation + retry logic | 14 |
| P1 | Telegram Control | Remote command capability | 15 |
| P2 | Atlas Integration | Full autonomous operation | 16 |
| P2 | System Dashboard | Visibility into agent state | 17 |
| P3 | Batch Operations | Multi-item workflows | 18 |
| P3 | Scheduled Jobs | Cron-like background tasks | 19 |

### Feature Dependencies

```
Tutorial System (12)
        ↓
Memory Enhancement (13)
        ↓
Self-Healing Loop (14)
        ↓
Telegram Control (15)
        ↓
Atlas Integration (16) ──▶ Requires MacBook
        ↓
System Dashboard (17)
        ↓
Batch Operations (18)
        ↓
Scheduled Jobs (19)
```

---

## Implementation Phases

### Phase 12: Tutorial System ✅ IMPLEMENTED
**Goal:** Voice-guided onboarding for new and existing users

**Status:** Core implementation complete (2026-02-03)

**Implemented:**
- ✅ Tutorial type definitions (`types.ts`)
- ✅ 13 tutorial modules with full content (`modules.ts`)
- ✅ `TutorialManager` class with progress tracking
- ✅ 6 tutorial tools for Claude
- ✅ Tool executor for tutorial operations
- ✅ Chat route updated to include tutorial tools
- ✅ System prompt updated for tutorial awareness

**Files Created:**
- `src/lib/jarvis/tutorial/types.ts`
- `src/lib/jarvis/tutorial/modules.ts`
- `src/lib/jarvis/tutorial/TutorialManager.ts`
- `src/lib/jarvis/tutorial/tutorialTools.ts`
- `src/lib/jarvis/tutorial/toolExecutor.ts`
- `src/lib/jarvis/tutorial/index.ts`

**Files Modified:**
- `src/lib/jarvis/intelligence/tools.ts` - Added tutorial tools export
- `src/lib/jarvis/intelligence/systemPrompt.ts` - Added tutorial context
- `src/app/api/jarvis/chat/route.ts` - Added tutorial tool routing

**Voice Commands Now Available:**
- "Start tutorial" - Begin guided onboarding
- "Teach me about [topic]" - Topic-specific help
- "Continue" / "Next" - Advance tutorial
- "Skip" - Skip current module
- "What can you do?" - Quick reference card
- "Tutorial progress" - Check progress

### Phase 13: Memory Enhancement
**Goal:** Full conversation continuity and hybrid search

**Tasks:**
- Add messages table to schema
- Implement conversation history loading
- Add BM25 keyword search
- Integrate with embeddings for hybrid search
- Update system prompt with memory context

### Phase 14: Self-Healing Loop
**Goal:** Automatic error recovery with learning

**Tasks:**
- Create error logging to memory
- Implement retry strategy engine
- Add guardrails configuration
- Create pattern detection for recurring errors
- Update tool executor with healing wrapper

### Phase 15: Telegram Control
**Goal:** Remote command capability via Telegram

**Tasks:**
- Create Telegram bot configuration
- Implement message handler (API route)
- Add conversation context for Telegram sessions
- Security: whitelist, rate limiting, pattern blocking
- Response relay back to Telegram

### Phase 16: Atlas Integration
**Goal:** Connect to GOTCHA framework on MacBook

**Tasks:**
- Set up Atlas directory structure
- Configure CLAUDE.md system handbook
- Implement Telegram handler daemon
- Memory sync between Jarvis and Atlas
- Test full autonomous loop

---

## Reference Documents

### Created During This Research Session

| Document | Purpose | Location |
|----------|---------|----------|
| V3-OPENCLAW-N8N-RESEARCH.md | OpenClaw + N8N pattern analysis | `.planning/` |
| V3-AGENT-ARCHITECTURE-DEEP-DIVE.md | GOTCHA vs OpenClaw comparison | `.planning/` |
| JARVIS-TUTORIAL-FRAMEWORK.md | Tutorial module definitions | `.planning/` |
| ATLAS-INTEGRATION-PREP.md | MacBook setup checklist | `.planning/` |
| V3-MASTER-RESEARCH.md | This document | `.planning/` |

### External Sources

| Source | Type | Key Takeaway |
|--------|------|--------------|
| Barty Bart YouTube | Video | OpenClaw + N8N bi-directional pattern |
| Mansel Scheffel YouTube | Video | GOTCHA/Atlas self-improving agent |
| Simon's Notion Life OS | Video | Tutorial pedagogical framework |
| atlas_framework/ | Code | Memory system implementation |

### Atlas Framework Files (Already Downloaded)

```
jarvis/atlas_framework/atlas_framework/
├── CLAUDE.md              # System handbook
├── build_app.md           # ATLAS workflow
├── SETUP_GUIDE.md         # Setup instructions
└── memory/
    ├── memory_db.py       # SQLite CRUD
    ├── memory_read.py     # Load memory
    ├── memory_write.py    # Write memory
    ├── embed_memory.py    # Embeddings
    ├── semantic_search.py # Vector search
    └── hybrid_search.py   # BM25 + vector
```

---

## Quick Reference

### Voice Commands to Implement

```
Tutorial:
- "Jarvis, start the tutorial"
- "Jarvis, teach me about [topic]"
- "Jarvis, what can you do?"
- "Jarvis, I'm stuck"
- "Jarvis, skip this lesson"

Memory:
- "Jarvis, remember that [fact]"
- "Jarvis, what do you know about [topic]?"
- "Jarvis, forget that"

Remote (Telegram):
- /start - Begin interaction
- /briefing - Get morning briefing
- /tasks - List today's tasks
- /add [task] - Add a task
- /help - Show commands
```

### Key Architectural Patterns

```
GOTCHA Framework:
- Goals: What to achieve (process definitions)
- Orchestration: Claude (the AI manager)
- Tools: Deterministic scripts
- Context: Domain knowledge
- Hard Prompts: Reusable templates
- Args: Runtime settings

Tutorial Framework:
- Mindset first
- Navigation before features
- Overwhelm alerts
- Progressive disclosure
- Two methods (simple/advanced)
```

---

## Session Continuity Notes

### If Starting a New Session

1. Read this document first (`V3-MASTER-RESEARCH.md`)
2. Check current phase in roadmap
3. Read specific phase planning document if exists
4. Check `PROJECT.md` for overall status

### Key Context to Preserve

- **User Goal:** Full autonomous agentic operation
- **Hardware Constraint:** MacBook available "in a few days"
- **Priority:** Tutorial system first, then memory, then Atlas
- **Architecture Decision:** GOTCHA > OpenClaw+N8N

### Files Modified This Session

- Created: `V3-OPENCLAW-N8N-RESEARCH.md`
- Created: `V3-AGENT-ARCHITECTURE-DEEP-DIVE.md`
- Created: `JARVIS-TUTORIAL-FRAMEWORK.md`
- Created: `ATLAS-INTEGRATION-PREP.md`
- Created: `V3-MASTER-RESEARCH.md` (this file)

---

*This document consolidates all v3 research. Future sessions should start here.*
