---
phase: G-integration-polish
plan: 04
type: execute
wave: 3
depends_on: ["G-01", "G-02", "G-03"]
files_modified: []
autonomous: false
---

<objective>
## Goal
Comprehensive production verification of the entire Jarvis v4.0 stack — both UIs, all 17 intelligence gems, self-improvement pipeline, memory lifecycle, executive functions, and vector search. This is the final quality gate before closing milestone v4.0.

## Purpose
Six phases of building (A–F) plus three integration plans (G-01 through G-03) have transformed Jarvis from a simple chat interface into a self-improving, multi-domain life management system. This verification plan ensures everything works together in production — not in isolation, but as the integrated whole it was designed to be.

## Output
- All 17 gems verified active from live site
- Both /jarvis (voice) and /jarvis/app (dashboard) confirmed working
- Self-improvement pipeline verified (evaluations → reflection → rules → prompt injection)
- Memory lifecycle verified (store → retrieve → decay → vector search → consolidation)
- Executive bridge verified in new shell (toasts, data refresh, nudge awareness)
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md

## Prior Work
@.paul/phases/G-integration-polish/G-01-PLAN.md — Config activation (must be complete)
@.paul/phases/G-integration-polish/G-02-PLAN.md — Home live data (must be complete)
@.paul/phases/G-integration-polish/G-03-PLAN.md — Executive bridge (must be complete)
@.paul/research/v4-intelligence-audit.md — 17 gems reference list
</context>

<acceptance_criteria>

## AC-1: New Shell (/jarvis/app) End-to-End
```gherkin
Given G-01, G-02, and G-03 are deployed
When the user visits https://jarvis.whatamiappreciatingnow.com/app
Then the home screen shows real tasks, bills, habits from Notion (not mock data)
And domain health reflects actual status
And BriefingCard shows a generated summary
And ChatOverlay sends/receives real messages via SSE
And toast notifications work (visible in UI)
And Command Palette (Cmd+K) searches real content
```

## AC-2: Old Page (/jarvis) Still Works
```gherkin
Given the old voice-first page was not modified
When the user visits https://jarvis.whatamiappreciatingnow.com/jarvis (or subdomain root)
Then the 3D orb renders and responds to state
And voice pipeline works (microphone permission → PTT → response)
And briefing flow can be triggered
And dashboard panel shows real data
```

## AC-3: Memory System End-to-End
```gherkin
Given enableMemoryLoading is now ON by default
When the user says "Remember that my favorite restaurant is Nobu"
Then the memory is stored with content hash and embedding
When the user starts a new conversation and says "What's my favorite restaurant?"
Then memory retrieval scores and returns the Nobu memory
And it appears in the system prompt context
And proactive surfacing detects relevant pending items
```

## AC-4: Self-Improvement Pipeline
```gherkin
Given enableSelfImprovement is ON (default)
When the user has a multi-turn conversation
Then the conversation evaluator (Haiku) fires post-chat (fire-and-forget)
And scores are stored in conversation_evaluations table
When the /api/jarvis/reflect cron fires (or is manually triggered)
Then the reflection loop (Opus) reads recent evaluations
And proposes/supersedes behavior rules
And rules are stored in behaviorRules table
And next chat includes rules in system prompt
```

## AC-5: Vector Search + Consolidation
```gherkin
Given OPENAI_API_KEY is set in Vercel
When the user says "search my memories for anything about health"
Then the search_memories tool uses dual retrieval (BM25 + vector)
And results are ranked by RRF fusion
When the user says "consolidate similar memories"
Then consolidation detects candidates via stored embeddings
And presents preview for confirmation
```

</acceptance_criteria>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Full Jarvis v4.0 stack — config activated, home live data, executive bridge</what-built>
  <how-to-verify>
    All changes from G-01 through G-03 should be pushed and auto-deployed.

    **1. NEW SHELL — Home Screen (/jarvis/app)**
    - [ ] Visit https://jarvis.whatamiappreciatingnow.com/app
    - [ ] Home shows real tasks from Notion (PriorityStack — not "Call dentist" mock data)
    - [ ] Domain health shows actual status for Personal domain
    - [ ] BriefingCard shows generated summary with real counts
    - [ ] Loading state visible briefly on first load (skeletons)
    - [ ] BriefingCard shows freshness indicator (green "Live" dot)

    **2. NEW SHELL — Chat**
    - [ ] Open ChatOverlay (tap chat icon or Cmd+Shift+C)
    - [ ] Send "Hello Jarvis" — get a response with personality (not generic)
    - [ ] Send "Remember that I prefer window seats on flights"
    - [ ] Jarvis confirms memory stored
    - [ ] Send "What kind of seats do I prefer?" — Jarvis retrieves the memory

    **3. NEW SHELL — Executive Bridge**
    - [ ] Wait for a scheduled event OR check that toasts can fire
    - [ ] If testing outside schedule: check browser console for [Scheduler] logs
    - [ ] Tap BriefingCard to trigger manual refresh — data should reload

    **4. NEW SHELL — Command Palette**
    - [ ] Press Cmd+K — palette opens
    - [ ] Type a task name — fuzzy search returns results
    - [ ] Press Escape — palette closes

    **5. OLD PAGE — Voice Interface**
    - [ ] Visit https://jarvis.whatamiappreciatingnow.com/jarvis
    - [ ] 3D orb renders and animates
    - [ ] Grant microphone permission if prompted
    - [ ] Use PTT to speak — Jarvis responds via voice
    - [ ] Chat panel (text) also works

    **6. MEMORY SYSTEM**
    - [ ] In chat: "What do you remember about me?" — should retrieve real memories
    - [ ] "Search my memories for [topic]" — should use dual search (check for vector results if OPENAI_API_KEY is set)
    - [ ] Verify memories have embeddings: try "remember something about cooking" → later "search memories about food" (semantic match, not keyword)

    **7. SELF-IMPROVEMENT**
    - [ ] After a conversation, check Vercel logs for evaluator output (fire-and-forget)
    - [ ] Manually hit /api/jarvis/reflect to trigger reflection (may return 401 if CRON_SECRET is set — use auth header or test without secret temporarily)
    - [ ] Check response for reflection results: { success: true, reflection: { ... } }

    **8. BUILD HEALTH**
    - [ ] Vercel deployment shows successful build
    - [ ] No runtime errors in Vercel function logs
    - [ ] Page loads without console errors
  </how-to-verify>
  <resume-signal>
    Type "all verified" if everything passes.
    Or describe what failed — we'll create a fix plan.
  </resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- No code changes in this plan — verification only
- Do not fix issues found during verification in this plan (create G-05 fix plan if needed)

## SCOPE LIMITS
- This is a verification checkpoint, not a fix plan
- If issues are found, document them and create a targeted fix plan
- Voice features only verified on old /jarvis page (new shell is text-only by design)
- Telegram bot verification is optional (only if TELEGRAM_BOT_TOKEN is set)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] New shell home screen shows real data (not mock)
- [ ] Chat works in new shell (SSE streaming, tool execution)
- [ ] Memory store → retrieve lifecycle works
- [ ] Self-improvement evaluator fires post-chat
- [ ] Reflection endpoint returns 200 with results
- [ ] Old page still functional (orb, voice, briefing)
- [ ] No runtime errors in production
- [ ] Vector search returns semantic results (if OPENAI_API_KEY set)
</verification>

<success_criteria>
- All 17 intelligence gems confirmed active in live production
- Both UIs verified functional end-to-end
- Memory lifecycle: store → retrieve → decay → vector → consolidation
- Self-improvement: evaluate → reflect → rules → prompt injection
- Executive bridge: scheduler toasts, nudge awareness, briefing refresh
- Zero critical issues blocking milestone close
</success_criteria>

<output>
After completion, create `.paul/phases/G-integration-polish/G-04-SUMMARY.md`

If all verifications pass, milestone v4.0 is ready for close.
Run `/paul:unify` to close the loop, then consider `/paul:milestone` to archive v4.0.
</output>
