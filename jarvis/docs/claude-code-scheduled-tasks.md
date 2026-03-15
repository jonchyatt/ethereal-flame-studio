# Claude Code Scheduled Tasks — Jarvis Integration Guide

**Date:** 2026-03-13
**Purpose:** Document Claude Code's scheduled tasks feature and Jarvis's implementation plan
**Related:** [Karpathy AutoResearch Pattern](./karpathy-autoresearch-pattern.md)

---

## What Are Scheduled Tasks?

Claude Code scheduled tasks are **full Claude Code agent sessions** that run on a schedule — not deterministic scripts. They have access to everything Claude Code has: MCP servers, skills, sub-agents, file system, bash, git, and the full reasoning engine.

Key difference from cron jobs: if a scheduled task hits an error, the agent **self-heals** — tries alternative approaches, fixes the issue, and updates itself to avoid the error next time. This is why Karpathy's AutoResearch pattern works — the agent IS the researcher, not a script runner.

---

## Requirements

- **Claude Desktop app** (Windows or macOS) — required for persistent scheduled tasks
- **Computer must be awake** — tasks don't fire during sleep
  - Prevent idle-sleep: Windows Settings → System → Power → Screen/Sleep → Never
  - Closing laptop lid still sleeps the machine
- **CLI `/loop` alternative** — session-scoped only, deleted on exit (good for dev, not production)
- **MCP servers** must be configured in `~/.claude.json` or `.mcp.json` (NOT `claude_desktop_config.json` which is chat-tab only)

---

## How to Create Scheduled Tasks

### Method 1: Desktop UI
1. Open Claude Desktop → **Code tab** (not Chat) → Schedule sidebar
2. Click **+ New Task**
3. Fill out: Name, Description, Prompt, Model, Permission Mode, Folder, Frequency
4. **Critical:** Run it once manually after creation → click "Always allow for session" on each permission prompt — these persist for future runs

### Method 2: In-Session Command
Type `/schedule` in any Claude Desktop Code session and describe what you want. Claude will create the task, often with a better-structured prompt than you'd write manually.

### Method 3: CLI `/loop` (Session-Scoped Only)
```
/loop 5m check if the deployment finished
/loop check the build every 2 hours
remind me at 3pm to push the release branch
```
Note: These die when the session ends. 3-day expiry for recurring. Max 50 per session.

### Frequency Options
| Option | Description |
|--------|-------------|
| Manual | Only runs when you click "Run now" |
| Hourly | Every hour (staggered offset) |
| Daily | Pick a time (e.g., 9:00 AM) |
| Weekdays | Mon-Fri at chosen time |
| Weekly | Pick day + time |

**Cron expressions also supported:** `0 9 * * 1-5` (weekdays at 9am)

**Tip:** Pick non-round minutes (e.g., `:03` instead of `:00`) for better timing accuracy. Times can drift ±1-5 minutes.

---

## Missed Schedule Behavior

If the computer is asleep/off when a task should run:
- Desktop checks the last **7 days** of missed runs on wake
- Runs **exactly one catch-up** for the most recently missed time
- All older missed runs are discarded
- Example: Daily task missed Mon-Sat → only Saturday's run executes on Sunday wake

**Important:** Always add time-aware gates to prompts:
```
Only review today's data. If it's after 10pm, just log "skipped — late run" and exit.
Check the current time first. If this is a catch-up run (current time differs
significantly from scheduled time), note this in the output.
```

---

## Permissions

- Each task has its own permission mode (Ask, Auto-accept, Plan, Bypass)
- **Best practice:** First run manually, click "Always allow for session" for every tool
- Tasks in Ask mode **stall silently** if they need unapproved tools and you're not watching
- Allow rules from `~/.claude/settings.json` also apply
- Review/revoke saved approvals from the task detail page

---

## Configuration Files

| File | Purpose |
|------|---------|
| `~/.claude/scheduled-tasks/<name>/SKILL.md` | Task prompt (YAML frontmatter + markdown body) |
| `~/.claude/settings.json` | Global permission rules, allow lists |
| `~/.claude.json` or `.mcp.json` | MCP server config for Code tab |

You can edit `SKILL.md` directly on disk — changes take effect on next run. Schedule, folder, model, and enabled state must be changed via the Desktop UI.

---

## Limitations & Gotchas

| Limitation | Workaround |
|------------|------------|
| Computer must be awake | Windows power settings → never sleep; use GitHub Actions for critical 24/7 tasks |
| Times drift ±1-5 min | Use non-round minutes; don't rely on exact timing |
| Only one catch-up run per 7 days | Add time-aware gates to prompts |
| MCP servers from chat tab don't appear in Code tab | Configure in `~/.claude.json` |
| No Linux support | Use CLI `/loop` or GitHub Actions on Linux |
| Can't change model mid-session | Choose model when creating task |

---

## Deployment Architecture: Vercel + Desktop Coexistence

### Current State

```
You push code to GitHub (master branch)
         │
         ├──→ Vercel auto-deploys ──→ whatamiappreciatingnow.com
         │    (flame site, serverless Jarvis UI, limited cron)
         │
         └──→ Desktop PM2 stays on OLD code ← THE GAP
              (full Jarvis brain, MCP tools, tunnel)
```

### What Runs Where

| Component | Vercel (Serverless) | Desktop (PM2) | Notes |
|-----------|:---:|:---:|-------|
| Flame 3D visualization | Yes | - | Public site only |
| Jarvis Web UI | Yes | Yes | Desktop has full brain access |
| Jarvis Brain (Claude SDK) | - | Yes | Can't run in serverless (subprocess) |
| MCP Tools (Notion, Calendar) | - | Yes | Local stdio process |
| Cron: Daily reflection | Limited | Full | Desktop is primary |
| Cloudflare Tunnel | - | Yes | External → Desktop |
| Database (Turso) | Both | Both | Shared remote DB |

### The Gap → The Fix

The self-update scheduled task (#1 below) closes this gap. When you push code:
1. Vercel rebuilds automatically (~60 seconds)
2. Desktop scheduled task detects new commits → pulls → builds → restarts PM2
3. Both environments converge on the same code

---

## Jarvis Scheduled Task Plan

### Task 1: Self-Update from GitHub

**Schedule:** Daily at 4:03 AM + manual trigger
**Priority:** Critical — closes the deployment gap
**Category:** Infrastructure

**Prompt:**
```
You are Jarvis's self-update agent. Check if the GitHub repo at
C:/Users/jonch/Projects/ethereal-flame-studio has new commits on master.

Steps:
1. cd C:/Users/jonch/Projects/ethereal-flame-studio
2. Run: git fetch origin master
3. Run: git log HEAD..origin/master --oneline
4. If there are new commits:
   a. Check for local uncommitted changes — if any, run: git stash
   b. Run: git pull origin master
   c. Check if package.json or package-lock.json changed in the diff
      — if so, run: npm install
   d. Run: npm run build
   e. If build succeeds:
      - Run: pm2 restart jarvis-web jarvis-mcp jarvis-cron --update-env
      - Wait 10 seconds
      - Verify: curl http://localhost:3001 returns 200
      - If verification passes, write success log to jarvis/logs/updates/
      - If stashed changes exist, run: git stash pop
   f. If build fails:
      - DO NOT restart PM2 (keep old working version running)
      - Write detailed error log to jarvis/logs/updates/failure-{date}.md
      - Include the full build error output
      - If stashed, run: git stash pop
      - Run: git reset --hard HEAD~1 to rollback
5. If no new commits, do nothing — no log needed.

Rules:
- Never force-push or modify git history
- Never run on any branch other than master
- If git pull has merge conflicts, abort and log the conflict
- After successful update, check pm2 list to confirm all processes are online
```

### Task 2: Bill Balance Checking

**Schedule:** Monday and Friday at 8:03 AM
**Priority:** High — financial awareness
**Category:** Life management

**Prompt:**
```
You are Jarvis's financial monitoring agent. Check Jon's upcoming bills
and balances.

Working directory: C:/Users/jonch/Projects/ethereal-flame-studio

Steps:
1. Use the Jarvis MCP tools to query the Notion bills database
   (tool: mcp__jarvis-tools__list_bills or similar)
2. Identify bills due within the next 7 days
3. For each upcoming bill:
   - Note the amount, due date, and payment status
   - Flag any that are overdue or due within 48 hours
4. Check if any bills have changed amounts from last check
   (compare with previous run's log if it exists)
5. Write a summary to jarvis/logs/bills/check-{date}.md
6. Format as a concise briefing:
   "BILLS THIS WEEK:
   - [DUE TODAY] Electric: $142 — autopay scheduled
   - [DUE FRI] Internet: $65 — needs manual payment
   - [OVERDUE] Phone: $89 — 3 days late!
   TOTAL DUE: $296"

Time gate: If it's after 6pm, skip and note "late run skipped."
Only check today's actual date — do not backfill missed checks.
```

**Future enhancement:** Use Playwright browser automation to log into utility portals and check actual balances, not just Notion stored amounts.

### Task 3: Morning Briefing

**Schedule:** Daily at 7:03 AM
**Priority:** High — daily value
**Category:** Life management

**Prompt:**
```
You are Jarvis's morning briefing agent. Compile Jon's daily digest.

Working directory: C:/Users/jonch/Projects/ethereal-flame-studio

Gather:
1. Today's calendar events (use MCP calendar tools)
2. Overdue and due-today tasks from Notion
3. Habit streaks at risk (any habits not done yesterday?)
4. Bills due within 3 days
5. Any GitHub activity on ethereal-flame-studio since yesterday
6. Whether the self-update task ran successfully last night

Compile into a concise morning briefing. Save to:
jarvis/logs/briefings/morning-{date}.md

Format: Short, scannable, action-oriented. Lead with the most
urgent items. Group by category. No fluff.

Time gate: Only run between 6am-10am. If outside this window,
this is a catch-up run — add "(delayed)" to the subject and
skip any time-sensitive items.
```

### Task 4: GitHub Repo Monitor

**Schedule:** Every 6 hours (at :03)
**Priority:** Medium — awareness
**Category:** Development

**Prompt:**
```
You are Jarvis's GitHub monitoring agent.

Working directory: C:/Users/jonch/Projects/ethereal-flame-studio

Steps:
1. git fetch origin
2. git log HEAD..origin/master --oneline --since="6 hours ago"
3. If new commits exist:
   - Summarize what changed (read commit messages)
   - Note if any seem breaking or significant
   - Check if the 4am self-update already handled them
4. Check for any open PRs or issues (if gh CLI available)
5. Write summary to jarvis/logs/github/monitor-{date}-{time}.md
6. If nothing new, do nothing.

Do NOT pull or restart anything — that's the self-update task's job.
This is observation only.
```

### Task 5: Weekly Goal & Habit Review

**Schedule:** Every Sunday at 6:03 PM
**Priority:** Medium — self-improvement
**Category:** Life management

**Prompt:**
```
You are Jarvis's weekly review agent. Compile Jon's weekly
progress report.

Working directory: C:/Users/jonch/Projects/ethereal-flame-studio

Analyze:
1. Query Notion for all goals — assess progress vs milestones
2. Query habits — calculate completion rates for the past 7 days
3. Review task completion rate (created vs completed this week)
4. Cross-reference calendar (did schedule support goal progress?)
5. Review any bill alerts from the week
6. Check GitHub commit activity (productivity indicator)

Generate:
- Weekly scorecard with metrics
- Top 3 wins
- Top 3 areas needing attention
- Specific recommendations for next week
- One habit to focus on (lowest completion rate)

Save to: jarvis/logs/reviews/weekly-{date}.md
Also save to Notion journal if the MCP tool supports it.
```

### Task 6: AutoResearch Self-Improvement Loop

**Schedule:** Daily at 11:03 PM
**Priority:** Medium — long-term compounding
**Category:** Intelligence (AutoResearch pattern)

**Prompt:**
```
You are Jarvis's self-improvement researcher, following the Karpathy
AutoResearch pattern: hypothesis → experiment → measure → keep/discard.

Working directory: C:/Users/jonch/Projects/ethereal-flame-studio

Steps:
1. Read the current behavior rules from the database
   (use MCP tools or check src/lib/jarvis/intelligence/behaviorRules.ts)
2. Read today's conversation evaluations (if any exist)
3. Read the previous experiment log at jarvis/logs/autoresearch/history.md
4. Based on patterns:
   a. Form a HYPOTHESIS about what would improve Jarvis
      (e.g., "Shorter responses for simple queries will improve satisfaction")
   b. Define the METRIC (evaluation scores, completion rates, etc.)
   c. Define the CHANGE (modify a behavior rule, adjust system prompt, etc.)
5. Implement the change (create/update behavior rule)
6. Log the experiment to jarvis/logs/autoresearch/history.md:
   - Experiment #, date, hypothesis, change made, expected metric improvement
7. On subsequent runs, check if previous experiments improved metrics:
   - If improved → KEEP, mark as successful, add to resources.md
   - If no change or worse → REVERT, mark as discarded, log why

This is not just reflection — this is structured experimentation.
Every change is a hypothesis. Every outcome is measured.
The knowledge base in jarvis/logs/autoresearch/resources.md
grows with each run, making future hypotheses smarter.
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. Set Windows power settings to never sleep
2. Update Claude Desktop to latest version
3. Create Task 1 (Self-Update) — this is the prerequisite for everything
4. Run Task 1 manually, approve all permissions
5. Verify it works: push a small commit, check if desktop updates overnight
6. Create `jarvis/logs/` directory structure:
   ```
   jarvis/logs/
   ├── updates/      ← Self-update results
   ├── bills/        ← Bill check results
   ├── briefings/    ← Morning briefings
   ├── github/       ← Repo monitoring
   ├── reviews/      ← Weekly reviews
   └── autoresearch/ ← Self-improvement experiments
       ├── history.md
       └── resources.md
   ```

### Phase 2: Life Management (Week 2)
1. Create Task 2 (Bill Balance Checking)
2. Create Task 3 (Morning Briefing)
3. Test both manually, approve permissions
4. Monitor for one week, refine prompts based on output quality

### Phase 3: Development Awareness (Week 3)
1. Create Task 4 (GitHub Repo Monitor)
2. Integrate monitor output into morning briefing
3. Set up Telegram notifications for urgent items (bills overdue, build failures)

### Phase 4: Intelligence (Week 4)
1. Create Task 5 (Weekly Goal & Habit Review)
2. Create Task 6 (AutoResearch Self-Improvement Loop)
3. Establish baseline metrics for the AutoResearch loop
4. Begin tracking improvement over time

### Phase 5: Multi-Project Master Agent (Month 2+)
Apply AutoResearch pattern to Jarvis's role as master agent for:
- **Visopscreen:** Optimize onboarding flows, API performance
- **Ethereal Flame Studio channel:** YouTube title/thumbnail testing, upload timing
- **Personal projects:** Any project with measurable metrics

---

## Prompt Writing Best Practices

### Always Include
1. **Working directory** — `C:/Users/jonch/Projects/ethereal-flame-studio`
2. **Time gates** — "If it's after X, skip"
3. **Catch-up awareness** — "If this is a delayed run, note it"
4. **Output location** — where to write logs/results
5. **Failure handling** — what to do if something breaks
6. **Scope limits** — what NOT to do (e.g., "observation only, don't deploy")

### Avoid
- Prompts that require real-time user input
- Tasks that modify production without verification
- Overly broad instructions ("make everything better")
- Missing rollback plans for destructive operations

### Idempotency
Write prompts so running them twice is safe:
- Check before creating (don't duplicate)
- Use date-stamped filenames for logs
- Gate on "already done today" checks

---

## Desktop Infrastructure Checklist

- [ ] Windows power settings: never sleep, never turn off display
- [ ] Claude Desktop: latest version installed
- [ ] Claude Desktop: Code tab MCP servers configured in `~/.claude.json`
- [ ] PM2: all 4 processes online (`pm2 list`)
- [ ] Git: `origin` remote points to GitHub repo
- [ ] `jarvis/logs/` directory structure created
- [ ] Cloudflare tunnel: running and healthy
- [ ] Test: manual run of self-update task succeeds
- [ ] Test: manual run of bill check task succeeds
- [ ] Test: manual run of morning briefing task succeeds
