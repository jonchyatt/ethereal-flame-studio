---
phase: G-integration-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/config.ts
autonomous: false
---

<objective>
## Goal
Activate 4 dormant intelligence gems by fixing the `enableMemoryLoading` default, and ensure all required environment variables exist in Vercel for v4.0 features (vector search, cron security).

## Purpose
The integration audit revealed that Gems #2 (memory scoring), #3 (proactive surfacing), #4 (memory decay), and #7 (conversation summarization) are fully wired but silently disabled because `enableMemoryLoading` defaults to OFF — a Phase C rollout safeguard that was never removed. Flipping this one flag activates 4 intelligence systems simultaneously. Additionally, OPENAI_API_KEY (for vector search + consolidation) and CRON_SECRET (for reflect endpoint security) need to be set in Vercel.

## Output
- Updated `config.ts` with production-ready memory default
- All environment variables confirmed in Vercel dashboard
- 17/17 gems active (vs 13/17 currently)
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Source Files
@src/lib/jarvis/config.ts — Feature flag defaults and env var mapping
@src/lib/jarvis/memory/retrieval.ts — retrieveMemories() gated by enableMemoryLoading
@src/lib/jarvis/memory/summarization.ts — backfillSummarization() gated by enableMemoryLoading
@src/app/api/jarvis/reflect/route.ts — CRON_SECRET verification
@src/lib/jarvis/memory/embeddings.ts — OPENAI_API_KEY usage
</context>

<acceptance_criteria>

## AC-1: Memory Loading Enabled by Default
```gherkin
Given Jarvis v4.0 is past the rollout phase (Phases A–F complete)
When the app starts without JARVIS_ENABLE_MEMORY explicitly set
Then enableMemoryLoading defaults to true
And the opt-out pattern (set JARVIS_ENABLE_MEMORY=false to disable) works
```

## AC-2: All v4.0 Environment Variables Present
```gherkin
Given the Vercel production environment
When the user audits environment variables
Then OPENAI_API_KEY is set (enables vector search + memory consolidation)
And CRON_SECRET is set (secures the /api/jarvis/reflect cron endpoint)
And all pre-existing vars (ANTHROPIC_API_KEY, DATABASE_URL, NOTION_TOKEN, etc.) are confirmed
```

## AC-3: Dormant Gems Activate
```gherkin
Given enableMemoryLoading defaults to true and OPENAI_API_KEY is set
When a user sends a chat message
Then the system prompt includes memory context (Gem #2)
And proactive surfacing items are included if action-intent memories exist (Gem #3)
And memory scores reflect decay calculations (Gem #4)
And conversation summarization triggers at 20+ messages (Gem #7)
And vector search is available for semantic memory recall (Phase F)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Flip enableMemoryLoading to ON by default</name>
  <files>src/lib/jarvis/config.ts</files>
  <action>
    Change enableMemoryLoading from opt-in to opt-out pattern:

    Line 57, change:
      `enableMemoryLoading: process.env.JARVIS_ENABLE_MEMORY === 'true',`
    To:
      `enableMemoryLoading: process.env.JARVIS_ENABLE_MEMORY !== 'false', // ON by default (v4.0 stable)`

    Update the JSDoc comment block (around line 47-54) to reflect:
      `JARVIS_ENABLE_MEMORY: "false" to disable (default: true — stable since Phase C)`

    Do NOT change any other flag defaults. Verified correct:
    - enableSelfHealing: `!== 'false'` (ON) ✓
    - enableSelfImprovement: `!== 'false'` (ON) ✓
    - enableVectorMemory: `!== 'false' && !!OPENAI_API_KEY` (ON when key present) ✓
    - enableTelegram: `=== 'true'` (OFF, opt-in) ✓
    - enableMcpConnector: `=== 'true'` (OFF, parked) ✓
  </action>
  <verify>npm run build passes with zero errors</verify>
  <done>AC-1 satisfied: enableMemoryLoading defaults to true with opt-out via env var</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <what-built>Memory loading now ON by default — 4 dormant gems will activate on next deploy</what-built>
  <how-to-verify>
    **Go to Vercel Dashboard → Settings → Environment Variables → Production**

    **Add these NEW variables:**
    - [ ] `OPENAI_API_KEY` — Your OpenAI API key (enables vector search + memory consolidation)
    - [ ] `CRON_SECRET` — Any random string (e.g., generate with `openssl rand -hex 32`). Secures the daily reflection cron endpoint.

    **Confirm these EXISTING variables are present:**
    - [ ] `ANTHROPIC_API_KEY` — Claude API
    - [ ] `DATABASE_URL` — Turso database
    - [ ] `DATABASE_AUTH_TOKEN` — Turso auth
    - [ ] `NOTION_TOKEN` — Notion API
    - [ ] `DEEPGRAM_API_KEY` — Speech-to-text
    - [ ] `AWS_ACCESS_KEY_ID` — TTS (AWS Polly)
    - [ ] `AWS_SECRET_ACCESS_KEY` — TTS (AWS Polly)
    - [ ] `JARVIS_API_SECRET` — Server-side API auth
    - [ ] `NEXT_PUBLIC_JARVIS_SECRET` — Client-side API auth

    **Optional (only if using these features):**
    - `TELEGRAM_BOT_TOKEN` + `TELEGRAM_OWNER_ID` — Telegram bot
    - `NOTION_OAUTH_TOKEN` — MCP Connector (parked)

    **Can now REMOVE if it exists:**
    - `JARVIS_ENABLE_MEMORY=true` — No longer needed (defaults to ON)
  </how-to-verify>
  <resume-signal>Type "env done" when variables are confirmed, or list which are missing</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/intelligence/* — Intelligence layer stable
- src/lib/jarvis/memory/* — Memory layer stable (only config.ts changes)
- src/app/api/jarvis/* — API routes stable
- vercel.json — Cron already configured correctly (5 AM UTC daily)
- Any UI components — No visual changes in this plan

## SCOPE LIMITS
- Only update config default for enableMemoryLoading — no other flags
- No new env vars in code — just ensuring existing ones are set in Vercel
- No feature work — this is purely configuration activation

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] `enableMemoryLoading` uses `!== 'false'` pattern (ON by default)
- [ ] JSDoc comment updated to reflect new default
- [ ] OPENAI_API_KEY confirmed in Vercel
- [ ] CRON_SECRET confirmed in Vercel
- [ ] All pre-existing env vars confirmed present
</verification>

<success_criteria>
- config.ts updated with 1 line change + comment update
- All v4.0 environment variables confirmed in Vercel
- Build passes cleanly
- Ready for G-02 (live data integration)
</success_criteria>

<output>
After completion, create `.paul/phases/G-integration-polish/G-01-SUMMARY.md`
</output>
