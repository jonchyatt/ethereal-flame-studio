# Phase 17: Agent Zero Sunset - Research

**Researched:** 2026-03-17
**Domain:** Agent decommission, capability migration, Docker container lifecycle
**Confidence:** HIGH

## Summary

Agent Zero (A0) runs as a Docker container (`agent0ai/agent-zero:v0.9.8.2`) on Jonathan's Windows 11 machine at port 50001. It has 5 scheduled tasks, 4 Visopscreen skills, 4 crypto agent profiles, and a FAISS-based memory system. It uses Claude Sonnet 4.5 (Anthropic API -- billed per token) as its chat model and Gemini 2.5 Flash as its utility model. This represents duplicate API billing since Jarvis runs on the Max plan (free Claude Code SDK usage).

The audit reveals that 3 of A0's 5 scheduled tasks are already superseded by Jarvis (Morning Briefing, Self-Improvement Reflection) or are for a dormant project (Ethereal Render Queue). The 2 Visopscreen tasks (Hourly Scan, Daily Briefing) are the only genuinely active ones and require the Visopscreen CLI tools which run inside the A0 container. The crypto system ("Crypto Aegis Lab") is a paper-trading framework with no evidence of active use -- it has an empty project directory. A0 has NO Cloudflare tunnel of its own; it is accessible only on localhost:50001.

**Primary recommendation:** Port the 2 Visopscreen scheduled tasks as generic "shell command" handlers in Jarvis's croner scheduler (the CLIs are Node.js scripts on the Windows host). Defer Visopscreen skills and crypto to explicit "not ported" status with documented rationale. Stop the container and remove the docker-compose service.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUNSET-01 | All active Agent Zero scheduled tasks ported to Jarvis flexible scheduler | Audit found 5 tasks: 2 active (Visopscreen), 1 already in Jarvis (Morning Briefing), 1 already in Jarvis (Self-Improvement), 1 dormant (Ethereal Render). Port the 2 Visopscreen tasks as new handler registrations in cronRunner.ts. |
| SUNSET-02 | Visopscreen and crypto skills accessible from Jarvis (as MCP tools, sub-agent workflows, or explicit deferral) | Visopscreen has 4 skills with 18 CLI adapters -- too complex to port as MCP tools in a sunset phase. Crypto is unused (empty project dir). Both should be explicitly deferred with documented rationale. |
| SUNSET-03 | Agent Zero container and tunnel decommissioned after capability verification | Container is `agent-zero-hub` in `C:\Users\jonch\Projects\agent-zero-hub\docker-compose.yml`. No tunnel exists (A0 is localhost-only). Stop container, optionally remove. Preserve `usr/` directory for archival. |
</phase_requirements>

## Agent Zero Complete Inventory

### Scheduled Tasks (5 total)

| # | Task Name | Schedule | Project | Status | Port Action |
|---|-----------|----------|---------|--------|-------------|
| 1 | Visopscreen Hourly Scan | 0 10-15 * * 1-5 ET | visopscreen | **ACTIVE** -- runs hourly during market hours | Port to Jarvis scheduler |
| 2 | Visopscreen Daily Briefing | 15 9 * * 1-5 ET | visopscreen | **ACTIVE** -- runs pre-bell weekdays | Port to Jarvis scheduler |
| 3 | Ethereal Render Queue Check | 5 */2 * * * ET | ethereal-flame-studio | **DORMANT** -- render pipeline not in use | Do not port (no active use) |
| 4 | Jarvis Morning Briefing | 0 7 * * * ET | jarvis | **SUPERSEDED** -- Jarvis has its own briefing via `/api/jarvis/briefing` | Do not port (already exists) |
| 5 | Self-Improvement Reflection | 0 6 */3 * * ET | (global) | **SUPERSEDED** -- Jarvis has `daily-reflection` handler in cronRunner.ts | Do not port (already exists) |

### Skills (Global -- 6)

| Skill | Purpose | Port? |
|-------|---------|-------|
| behavior-evolution | Evolve behavioral rules via versioning | No -- Jarvis has self-improvement loop (Phase D) |
| evaluate-conversation | Evaluate conversation quality | No -- Jarvis has evaluation pipeline |
| project-tutor | Teach projects via guided exploration | No -- Jarvis has Academy (v4.3) |
| reflection-loop | Full reflection cycle | No -- Jarvis has `runReflection()` |
| skill-authoring-guide | Guide for creating A0 skills | No -- A0-specific, not applicable |
| skill-effectiveness | Track skill effectiveness | No -- A0-specific metrics |

### Skills (Visopscreen Project -- 4)

| Skill | CLIs Used | Purpose | Port? |
|-------|-----------|---------|-------|
| trade-search | run-bwb.js, run-ratio.js, run-dipper.js, etc. | Find option trades via screeners | **DEFER** -- complex, Visopscreen is its own project |
| strategy-advisor | analyze-market.js, analyze-position.js | Strategy recommendations | **DEFER** -- domain-specific |
| trading-dialog | manage-templates.js, generate-box-exit.js | Multi-turn trade conversations | **DEFER** -- interactive, not schedulable |
| trading-memory | trade-preferences.js, trade-journal.js, etc. | Trade journaling and memory | **DEFER** -- Visopscreen domain |

### Agent Profiles (10 total)

| Profile | Domain | Port? |
|---------|--------|-------|
| agent0 | General purpose (built-in) | No -- built-in to A0 |
| developer | Software dev (built-in) | No -- Jarvis is the developer agent |
| researcher | Research (built-in) | No -- Jarvis has researcher sub-agent |
| hacker | Cybersecurity (built-in) | No -- not needed |
| content-creator | Content creation | No -- unused |
| critic | Conversation evaluation | No -- Jarvis has evaluator |
| life-organizer | Life organization | No -- Jarvis IS the life organizer |
| project-tutor | Project teaching | No -- Jarvis has Academy |
| trading-analyst | Options analysis | **DEFER** -- Visopscreen domain |
| crypto-chief | Crypto coordination | **DEFER** -- unused (empty project dir) |
| crypto-risk-warden | Crypto risk checks | **DEFER** -- unused |
| crypto-paper-executor | Paper trade execution | **DEFER** -- unused |
| crypto-auditor | PnL reporting | **DEFER** -- unused |

### Data / Memory

| Data | Location | Size | Action |
|------|----------|------|--------|
| FAISS vector memory (default) | `usr/memory/default/` | 93KB | Archive before decommission |
| Behavioral rules | `usr/memory/default/behaviour.md` | 2 rules | Already captured in Jarvis |
| Knowledge files | `usr/knowledge/main/` | 5 files | Archival only (behavior versions, eval test, counter) |
| Chat history | `usr/chats/` | 3 chats | Minimal -- archive |
| Visopscreen project data | `usr/projects/visopscreen/.a0proj/` | Skills, knowledge, secrets | Lives in Visopscreen repo, not in A0 |
| Crypto project data | `usr/projects/crypto-aegis-lab/` | Empty directory | Nothing to preserve |

### Docker Configuration

| Property | Value |
|----------|-------|
| Container | `agent-zero-hub` |
| Image | `agent0ai/agent-zero:v0.9.8.2` |
| Compose file | `C:\Users\jonch\Projects\agent-zero-hub\docker-compose.yml` |
| Port | 50001:80 |
| Volumes | `./usr:/a0/usr` (persistent), 4 read-only project mounts |
| Cloudflare tunnel | **NONE** (localhost only) |
| API billing | Anthropic (Claude Sonnet 4.5) + Google (Gemini 2.5 Flash) |

## Architecture Patterns

### Porting Visopscreen Scheduled Tasks to Jarvis

The Visopscreen CLI tools (`scan-orchestrator.js`, `daily-briefing.js`, `notification-dispatch.js`) are Node.js scripts located at:
- `C:\Users\jonch\Visopscreen\headless\cli\scan-orchestrator.js`
- `C:\Users\jonch\Visopscreen\headless\cli\daily-briefing.js`
- `C:\Users\jonch\Visopscreen\headless\notifications\notification-dispatch.js`

These CLIs run independently of Agent Zero. A0 just invokes them via `code_execution_tool` from inside the container (where they're mounted at `/home/user/projects/visopscreen/`). From Jarvis, they can be invoked directly on the Windows host since Jarvis runs natively (not in Docker).

**Pattern: Generic shell-command handler**

```typescript
// Add to cronRunner.ts HANDLERS registry
'shell-command': async (config: { command: string; cwd?: string }) => {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const exec = promisify(execFile);

  const { stdout, stderr } = await exec('node', [config.command], {
    cwd: config.cwd || process.cwd(),
    timeout: 120_000, // 2 minute timeout
  });

  return stdout.trim() || stderr.trim() || 'Completed with no output';
},
```

However, the A0 tasks also include AI narration (the agent reads CLI JSON output, generates insight, then dispatches). For the initial port, skip the AI narration -- just run the CLIs and send Telegram alerts with raw results. AI narration can be added later as a Jarvis sub-agent enhancement.

### Recommended Approach for Each A0 Task

| A0 Task | Jarvis Handler | Cron | Notes |
|---------|---------------|------|-------|
| Visopscreen Hourly Scan | `visopscreen-scan` | `0 10-15 * * 1-5` | Runs scan-orchestrator.js, parses JSON, sends Telegram |
| Visopscreen Daily Briefing | `visopscreen-briefing` | `15 9 * * 1-5` | Runs daily-briefing.js, sends Telegram |
| Ethereal Render Queue | (skip) | -- | Not in use |
| Jarvis Morning Briefing | (skip) | -- | Already exists in Jarvis |
| Self-Improvement Reflection | (skip) | -- | Already `daily-reflection` handler |

### Decommission Process

```
1. Verify: Run ported tasks in Jarvis for 1+ market day
2. Parallel: Run A0 alongside Jarvis for comparison
3. Stop: docker compose -f C:\Users\jonch\Projects\agent-zero-hub\docker-compose.yml down
4. Archive: Keep usr/ directory intact (93KB memory, chat history)
5. Clean: Optionally remove from Docker Desktop, reclaim resources
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Running Visopscreen CLIs | A0-style LLM orchestration per scan | Direct `child_process.execFile` | The CLIs already produce complete JSON; AI narration was A0's value-add but is not essential for the task output |
| Crypto paper trading | Custom crypto execution engine | Explicit deferral | Zero evidence of active use; building this wastes time |
| A0 FAISS memory migration | Memory import pipeline | Archive the files | 93KB total, 3 chats, 2 behavioral rules already in Jarvis |
| Visopscreen interactive skills | MCP tool wrappers for 18 CLIs | Explicit deferral | Visopscreen is its own project with its own roadmap |

## Common Pitfalls

### Pitfall 1: Porting Unused Tasks
**What goes wrong:** Spending time porting the Ethereal Render Queue or A0 Morning Briefing
**Why it happens:** Assumption that "all 5 tasks" must be ported literally
**How to avoid:** SUNSET-01 says "all active" tasks. Render Queue is dormant, Morning Briefing and Reflection are superseded.
**Warning signs:** Creating handlers for tasks that have no active consumers

### Pitfall 2: Trying to Replicate A0's AI Narration Layer
**What goes wrong:** Building an LLM-in-the-loop for scan narration, adding complexity for marginal value
**Why it happens:** A0's scheduled tasks included an AI narration step (read JSON, generate insight, dispatch)
**How to avoid:** Phase 17 is a sunset, not an enhancement. Port the deterministic pipeline (run CLI, send results). AI narration is a future enhancement.
**Warning signs:** Adding Claude API calls inside scheduler handlers

### Pitfall 3: Not Testing Visopscreen CLIs Outside Docker
**What goes wrong:** CLIs fail because they depend on npm packages installed inside the A0 container
**Why it happens:** The CLIs were always run from inside Docker where `npm install` happened
**How to avoid:** Verify that `C:\Users\jonch\Visopscreen\headless\` has its own `node_modules/`. Run a test invocation from the Windows host.
**Warning signs:** `MODULE_NOT_FOUND` errors when Jarvis tries to run scan-orchestrator.js

### Pitfall 4: Schwab API Secrets
**What goes wrong:** Visopscreen scans fail because Schwab OAuth secrets were in A0's `secrets.env`
**Why it happens:** A0 had project-specific secrets: `SCHWAB_APP_KEY`, `SCHWAB_APP_SECRET`, `SCHWAB_CALLBACK_URL`, `SCHWAB_API_BASE_URL`
**How to avoid:** These secrets need to be available to the Jarvis process (e.g., in `.env.local` or passed as env vars to the child process)
**Warning signs:** 401 errors from Schwab API during scans

### Pitfall 5: Decommissioning Before Verification
**What goes wrong:** Container stopped, then discover a scheduled task was actually important
**Why it happens:** Premature decommission without parallel-run period
**How to avoid:** Run Jarvis tasks for at least 1 full market day while A0 is still running. Compare outputs. Then stop A0.

### Pitfall 6: Telegram Bot Token Collision
**What goes wrong:** Both A0 and Jarvis try to send Telegram messages, causing webhook conflicts
**Why it happens:** If both use the same Telegram bot token
**How to avoid:** Visopscreen has its own notification dispatch (`notification-dispatch.js`) that likely uses a different Telegram configuration. Verify the dispatch mechanism before porting.

## Code Examples

### Adding a new handler to cronRunner.ts

```typescript
// In HANDLERS registry in cronRunner.ts
'visopscreen-scan': async () => {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const exec = promisify(execFile);

  const cwd = 'C:\\Users\\jonch\\Visopscreen';
  const { stdout } = await exec('node', ['headless/cli/scan-orchestrator.js'], {
    cwd,
    timeout: 120_000,
    env: { ...process.env }, // Inherits Schwab secrets from .env.local
  });

  // Parse JSON output
  const result = JSON.parse(stdout);
  const summary = `Scan: ${result.totalResults} trades found (${result.dedupedCount} new). Top: ${result.summary?.topResults?.[0]?.symbol ?? 'none'}`;

  // Send Telegram notification
  await sendTelegramAlert(`Visopscreen Hourly Scan\n\n${summary}`).catch(() => {});

  return summary;
},
```

### Seeding ported tasks in taskStore.ts

```typescript
// Add to seedSystemTasks()
const hasVisoScan = existing.some(t => t.handler === 'visopscreen-scan');
if (!hasVisoScan) {
  await db.insert(scheduledTasks).values({
    name: 'Visopscreen Hourly Scan',
    description: 'Run option screener scan during market hours (10-15 ET, weekdays)',
    cronExpression: '0 10-15 * * 1-5',
    timezone: 'America/New_York',
    handler: 'visopscreen-scan',
    enabled: true,
    isSystem: false, // User-manageable, not a core Jarvis function
    createdAt: now,
    updatedAt: now,
  });
}
```

### Docker decommission commands

```bash
# Stop the container
docker compose -f "C:\Users\jonch\Projects\agent-zero-hub\docker-compose.yml" down

# Verify it's stopped
docker ps -a | grep agent-zero

# Archive memory (optional -- already on disk at usr/)
# The usr/ directory persists on disk after container removal
```

## State of the Art

| Old Approach (A0) | New Approach (Jarvis) | Impact |
|---|---|---|
| Docker container with Anthropic API billing | Native PM2 process on Max plan (free) | Eliminates duplicate API cost |
| FAISS vector memory (in-container) | SQLite + drizzle-orm (on host) | Simpler, no Docker dependency |
| A0 scheduler (JSON file, in-container) | croner + SQLite DB (hot-reload, CRUD via chat) | More flexible, user-manageable |
| A0 sub-agents (9 profiles) | Jarvis sub-agents (browser-worker, researcher, form-filler) | Purpose-built for Jarvis use cases |
| A0 skills (SKILL.md + CLI) | Jarvis MCP tools (40+) | Richer integration, Notion-aware |

## Open Questions

1. **Schwab API Secret Delivery**
   - What we know: A0 had `SCHWAB_APP_KEY`, `SCHWAB_APP_SECRET`, `SCHWAB_CALLBACK_URL`, `SCHWAB_API_BASE_URL` in `usr/projects/visopscreen/.a0proj/secrets.env`
   - What's unclear: Whether these secrets are also available in `C:\Users\jonch\Visopscreen\.env` or need to be duplicated
   - Recommendation: Check if Visopscreen's own `.env` has them. If yes, pass `cwd` and let the CLI read them. If no, add to Jarvis's `.env.local`.

2. **Visopscreen CLI Dependencies**
   - What we know: CLIs live at `C:\Users\jonch\Visopscreen\headless\cli\`
   - What's unclear: Whether `node_modules` is installed at the project root or only inside the Docker container
   - Recommendation: Run `node C:\Users\jonch\Visopscreen\headless\cli\scan-orchestrator.js --status` from the host to verify

3. **Notification Dispatch Mechanism**
   - What we know: A0 tasks call `notification-dispatch.js` for Telegram/email delivery
   - What's unclear: Whether this uses Jarvis's Telegram bot or a separate one
   - Recommendation: Read `notification-dispatch.js` to determine its Telegram configuration. If it uses its own bot token, it works independently. If it shares Jarvis's bot, verify no webhook conflicts.

## Sources

### Primary (HIGH confidence)
- `C:\Users\jonch\Projects\agent-zero-hub\usr\scheduler\tasks.json` -- actual A0 scheduled tasks (5 tasks)
- `C:\Users\jonch\Projects\agent-zero-hub\docker-compose.yml` -- Docker configuration
- `C:\Users\jonch\Projects\agent-zero-hub\CLAUDE.md` -- A0 architecture reference
- `C:\Users\jonch\Projects\agent-zero-hub\usr\.env` -- A0 model configuration (secrets excluded)
- `C:\Users\jonch\Projects\jarvis\src\lib\jarvis\scheduler\cronRunner.ts` -- Jarvis scheduler implementation
- `C:\Users\jonch\Projects\jarvis\src\lib\jarvis\scheduler\taskStore.ts` -- Jarvis task CRUD and seeding

### Secondary (MEDIUM confidence)
- Docker container listing (`docker ps -a`) -- verified A0 is running, no A0-specific Cloudflare tunnel
- Filesystem scan of `usr/skills/`, `usr/agents/`, `usr/projects/`, `usr/memory/` -- inventory of A0 capabilities

## Metadata

**Confidence breakdown:**
- Scheduled tasks inventory: HIGH -- read directly from tasks.json
- Skills/agents inventory: HIGH -- read directly from filesystem
- Porting approach: HIGH -- Jarvis scheduler is well-understood, CLIs are standalone Node.js
- Visopscreen CLI host compatibility: MEDIUM -- untested outside Docker, but they're standard Node.js
- Crypto status (unused): HIGH -- empty project directory is definitive

**Research date:** 2026-03-17
**Valid until:** No expiry -- decommission audit, not a moving target
