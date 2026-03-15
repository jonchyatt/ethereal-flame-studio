# Desktop Setup Handoff — 2026-03-11

## Current State: Server Running, Chat Broken

The desktop is running Jarvis via PM2 with tunnel access. Everything works EXCEPT the chat/tour (Claude Code SDK brain). The server is live and accessible.

---

## WHAT'S DONE (Working)

### Infrastructure
- **PM2** installed globally, 4 processes running (jarvis-web, jarvis-mcp, jarvis-cron, jarvis-tunnel-cf)
- **Cloudflare tunnel** running via PM2 (using native `cloudflared.exe` directly, NOT the .bat file)
- **pm2-windows-startup** installed for auto-start on reboot
- **Sleep disabled** (powercfg: standby, hibernate, monitor all set to 0)
- **Playwright** installed locally + Chrome available

### Application
- **DB migrated** — `academy_progress` table created via `scripts/fix-db.mjs`
- **Calendar JSON fixed** — was broken by bad escaping in .env.local export; rebuilt with `scripts/fix-calendar-env.mjs`. Now shows `configured: true, tokenOk: true, 9 events`
- **.env.local** — copied from laptop to project dir, calendar JSON line fixed
- **Build** — clean Next.js 15.5.9 production build, 42 static pages
- **Onboarding** — all 6 steps work (26/29 Playwright tests pass)

### Smoke Test Results (scripts/smoke-test.mjs)
- Health API: PASS
- DB connected: PASS
- Calendar configured: PASS
- Calendar token OK: PASS
- App page loads: PASS
- All 8 personal pages: PASS
- Settings page: PASS
- Tunnel health: PASS
- Academy page: PASS (after DB migration)

---

## WHAT'S BROKEN — The CLAUDECODE Problem

### Symptom
Chat returns: `"Claude Code process exited with code 1"`
Tour fails immediately after sending "Start my guided tour of Jarvis"

### Root Cause (Fully Diagnosed)
1. PM2 was first started FROM a Claude Code session (this terminal)
2. Claude Code sets `CLAUDECODE=1` in its environment
3. The PM2 **daemon process** inherited `CLAUDECODE=1` at spawn time
4. Every child process PM2 spawns inherits it from the daemon
5. When jarvis-web uses `@anthropic-ai/claude-code` SDK to spawn a `claude` subprocess, the `claude` binary sees `CLAUDECODE=1` and exits immediately ("cannot be launched inside another Claude Code session")
6. The SDK's `env` option correctly strips CLAUDECODE from the spawn env, BUT on Windows with `shell: true`, `cmd.exe` re-injects the parent's env vars — the `delete process.env.CLAUDECODE` and `env: cleanEnv` in start-web.js get overridden

### Evidence
- `scripts/test-sdk-debug.mjs` — runs the SDK with `CLAUDECODE=1` + clean env option → **PASSES** when run directly or via PM2 start
- Same code inside Next.js server (via `npm start` with `shell: true`) → **FAILS**
- The PM2 daemon itself holds `CLAUDECODE=1` and it propagates through the `cmd.exe` shell chain

### Code Changes Made (in ccodeBrain.ts)
- Added `getCleanEnv()` function that strips CLAUDECODE from process.env
- Passes `env: getCleanEnv()` to the SDK `query()` options
- Added `stderr` callback for debugging
- Added `pathToClaudeCodeExecutable` pointing to native binary
- **These changes are correct and in the build, but insufficient because the Windows shell chain re-injects the env var**

---

## THE FIX (Not Yet Implemented)

### Option A: Restart PM2 Outside Claude Code (Fastest, Manual)
Open a **native cmd.exe or PowerShell** (NOT from Claude Code), then:
```
cd C:\Users\jonch\Projects\ethereal-flame-studio
pm2 kill
pm2 start jarvis/ecosystem.config.js
pm2 start C:\Users\jonch\AppData\Local\cloudflared.exe --name jarvis-tunnel-cf -- tunnel run jarvis
pm2 save
```
This creates a PM2 daemon without CLAUDECODE in its env. Everything should just work.

### Option B: Use cross-spawn or execSync to Clear Env (Code Fix)
In `start-web.js`, use `child_process.execSync` with explicit env to start `next start` without `shell: true`, or use `cross-spawn` package which properly handles Windows env inheritance.

### Option C: Wrapper Script
Create a `.bat` or `.cmd` file that does `set CLAUDECODE=` before running `npm start`. PM2 can call this script instead of `start-web.js`.

### Recommendation
**Do Option A first** to unblock immediately, then implement Option C as a permanent fix in the ecosystem config so it survives Claude Code sessions.

---

## FILES MODIFIED (Not Committed)

### Production Code
- `src/lib/jarvis/intelligence/ccodeBrain.ts` — Added env stripping + stderr + native binary path
- `jarvis/scripts/start-web.js` — Added CLAUDECODE deletion (works but insufficient due to Windows shell)

### Utility Scripts Created
- `scripts/fix-db.mjs` — Creates academy_progress table (already run, safe to delete)
- `scripts/fix-calendar-env.mjs` — Fixes calendar JSON in .env.local (already run, safe to delete)
- `scripts/smoke-test.mjs` — Playwright smoke test (15/19 pass)
- `scripts/test-onboarding.mjs` — Playwright onboarding test (26/29 pass)
- `scripts/test-sdk.mjs` / `scripts/test-sdk-debug.mjs` — SDK diagnostic scripts
- `scripts/check-env.mjs` — PM2 env diagnostic
- `scripts/debug-failures.mjs` — Debug failed tests
- `scripts/screenshots/` — Test screenshots

---

## PM2 CURRENT STATE

```
jarvis-web      — online (port 3001, serving, chat broken)
jarvis-mcp      — online (stdio MCP server)
jarvis-cron     — online (daily reflection at 5:00 AM ET)
jarvis-tunnel-cf — online (cloudflared native binary, 4 connections)
```

Note: ecosystem.config.js also defines `jarvis-tunnel` using the .bat file — that one doesn't work on PM2. The working tunnel was started manually as `jarvis-tunnel-cf` using the exe directly.

---

## VERIFICATION AFTER FIX

After fixing the CLAUDECODE issue, run:
```bash
cd C:/Users/jonch/Projects/ethereal-flame-studio
node scripts/smoke-test.mjs          # Should be 19/19
node scripts/test-onboarding.mjs     # Should be 29/29
```

The 3 remaining onboarding failures will resolve once chat works:
- Tour: Spotlight overlay active
- Tour: Audio element present (TTS)
- Tour: Tutorial instruction visible

---

## THINGS THAT STILL NEED ATTENTION

1. **Academy 401 errors** — Console shows `[AcademyStore] Failed to load progress: Error: HTTP 401`. The academy API endpoint requires auth but the client-side fetch isn't sending the secret header.
2. **Ecosystem config** — Should be updated to use the cloudflared exe directly instead of the .bat file (which doesn't work with PM2)
3. **Commit changes** — None of the fixes have been committed yet
4. **Laptop shutdown** — Once desktop is confirmed working, run `pm2 stop all && pm2 delete all && pm2 save` on the laptop
