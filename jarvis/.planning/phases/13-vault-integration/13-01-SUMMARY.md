---
phase: 13-vault-integration
plan: 01
subsystem: infra
tags: [bitwarden, vault, mcp, security, pm2, credential-isolation]

# Dependency graph
requires:
  - phase: 12-foundation-migration
    provides: PM2 ecosystem config, start-web.js launcher pattern, standalone repo
provides:
  - Vault health manager (checkVaultHealth, ensureVaultUnlocked)
  - Form-filler sub-agent definition with private Bitwarden MCP
  - Credential leakage canary test
  - Bootstrap script for vault unlock at PM2 startup
  - PM2 startup wiring in start-web.js (non-fatal)
affects: [14-browser-automation, vault, credentials]

# Tech tracking
tech-stack:
  added: ["@bitwarden/cli (global)", "@bitwarden/mcp-server (npx sub-agent)"]
  patterns: [sub-agent-scoped MCP servers, non-fatal startup hooks, credential canary testing]

key-files:
  created:
    - src/lib/jarvis/vault/vaultHealth.ts
    - src/lib/jarvis/vault/vaultConfig.ts
    - src/lib/jarvis/vault/canaryTest.ts
    - scripts/unlock-vault.sh
  modified:
    - scripts/start-web.js

key-decisions:
  - "Vault unlock runs in start-web.js (same process env as Next.js), not as separate PM2 process"
  - "Bitwarden MCP server scoped to sub-agent only, never in global .mcp.json"
  - "Vault bootstrap is non-fatal -- Jarvis starts without vault if bw not configured"

patterns-established:
  - "Sub-agent-scoped MCP: private MCP servers attached to sub-agent definitions, not global config"
  - "Non-fatal startup hooks: try/catch around optional service bootstraps in PM2 launchers"
  - "Credential canary: post-operation scan of parent conversation for leaked values"

requirements-completed: [VAULT-01, VAULT-02]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 13 Plan 01: Vault Integration Summary

**Bitwarden vault health manager, form-filler sub-agent with private MCP, canary test, and PM2 startup wiring**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T13:14:29Z
- **Completed:** 2026-03-17T13:19:00Z
- **Tasks:** 3 of 3
- **Files modified:** 5

## Accomplishments
- Vault health module with status checking and auto-re-unlock via BW_MASTER_PASSWORD
- Form-filler sub-agent with Bitwarden MCP isolated from parent agent (credential suppression prompt)
- Canary test function for detecting credential leakage in parent conversation history
- Bootstrap script (unlock-vault.sh) handles all 3 vault states with clear error messages
- PM2 startup wiring in start-web.js -- non-fatal, Jarvis starts without vault

## Task Commits

Each task was committed atomically:

1. **Task 1: Vault health manager, bootstrap script, PM2 wiring** - `4a46a56` (feat)
2. **Task 2: Form-filler sub-agent config and canary test** - `c9a13db` (feat)
3. **Task 3: Human verification checkpoint** - APPROVED (bw v2026.2.0 installed, vault unlocks, PM2 injects BW_SESSION, canary test passes)

## Files Created/Modified
- `src/lib/jarvis/vault/vaultHealth.ts` - checkVaultHealth() and ensureVaultUnlocked() functions
- `src/lib/jarvis/vault/vaultConfig.ts` - Form-filler sub-agent with private Bitwarden MCP server
- `src/lib/jarvis/vault/canaryTest.ts` - runCredentialCanaryTest() for leakage detection
- `scripts/unlock-vault.sh` - Bootstrap script outputting BW_SESSION for env injection
- `scripts/start-web.js` - Added vault bootstrap block (non-fatal try/catch)

## Decisions Made
- Vault unlock runs in start-web.js (same process env as Next.js), not as separate PM2 process -- BW_SESSION must be in the spawned process env
- Bitwarden MCP server scoped to sub-agent only, never in global .mcp.json -- parent agent cannot access vault tools
- Vault bootstrap is non-fatal -- Jarvis starts without vault if bw not configured (avoids breaking existing functionality)
- Uses `cmd /c npx` pattern for Windows compatibility, matching existing .mcp.json server definitions
- Model set to 'sonnet' for form-filler sub-agent (cost-efficient for mechanical form-filling)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

Jon must install Bitwarden CLI and login before vault features work:
1. `npm install -g @bitwarden/cli`
2. `bw login` (interactive, one-time)
3. Optionally set `BW_MASTER_PASSWORD` in `.env.local` for auto-re-unlock

See Task 3 checkpoint for full verification steps.

## Checkpoint Verification (Task 3)

Jon verified all 5 parts:
- **Part A (CLI Setup):** bw CLI v2026.2.0 installed, `bw login` completed for jonchyatt@gmail.com
- **Part B (Vault Health):** Vault unlocks via BW_MASTER_PASSWORD in .env.local
- **Part C (PM2 Wiring):** PM2 startup logs show `[vault] BW_SESSION injected (88 chars)`
- **Part D (Isolation):** .mcp.json has no bitwarden entry, MCP server downloads via npx
- **Part E (Canary Test):** Test vault entry "test-canary" created with password SuperSecret123!
  - Clean conversation: PASS (no leakage detected)
  - Leaked conversation: correctly detected credential at message index 1

## Next Phase Readiness
- Vault plumbing complete and verified end-to-end, ready for Phase 14 (browser automation)

## Self-Check: PASSED

- FOUND: src/lib/jarvis/vault/vaultHealth.ts
- FOUND: src/lib/jarvis/vault/vaultConfig.ts
- FOUND: src/lib/jarvis/vault/canaryTest.ts
- FOUND: scripts/unlock-vault.sh
- FOUND: Commit 4a46a56 (Task 1)
- FOUND: Commit c9a13db (Task 2)
- Task 3 checkpoint: APPROVED by user

---
*Phase: 13-vault-integration*
*Completed: 2026-03-17*
