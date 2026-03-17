# Phase 13: Vault Integration - Research

**Researched:** 2026-03-17
**Domain:** Bitwarden MCP server integration, credential injection, session management on Windows/PM2
**Confidence:** HIGH

## Summary

Phase 13 integrates the official Bitwarden MCP server (`@bitwarden/mcp-server`) into Jarvis so credentials can be retrieved from the vault and injected into tool workflows. The two requirements (VAULT-01 and VAULT-02) are straightforward: configure the MCP server in `.mcp.json` and handle session lifecycle.

The critical design constraint is the "without LLM exposure" requirement. Investigation reveals that the Bitwarden MCP `get` tool **does** return raw credentials (username, password, TOTP) in its response -- this is by design and documented by Bitwarden. The architectural solution is **sub-agent isolation**: credential retrieval is confined to a dedicated `form-filler` sub-agent with its own private MCP server configuration. The parent agent (main Jarvis brain) never receives the sub-agent's tool call results -- only the sub-agent's final text summary. Combined with prompt instructions forbidding the sub-agent from echoing credentials in its response, this achieves the "LLM conversation history clean" requirement.

The Bitwarden CLI's BW_SESSION token does **not** auto-expire -- it persists until `bw lock` or `bw logout`. This is actually favorable for PM2: obtain the token once at boot, inject into PM2 environment, and it remains valid indefinitely. The "auto-unlock" requirement (VAULT-02) therefore means: (1) obtain BW_SESSION at Jarvis startup, (2) detect when the session becomes invalid (e.g., after `bw lock` or server-side invalidation), and (3) re-authenticate transparently. A health-check wrapper that calls `bw status` and re-unlocks if locked satisfies this.

**Primary recommendation:** Configure Bitwarden MCP as a sub-agent-scoped private server (not in `.mcp.json` global config). Build a lightweight vault session manager script that obtains/validates BW_SESSION. Implement a canary test that verifies no credential values appear in parent agent conversation transcripts.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VAULT-01 | Bitwarden MCP server integrated -- credentials injected into browser without LLM exposure | `@bitwarden/mcp-server` v2026.2.0 via npm; sub-agent scoped MCP config prevents parent from seeing credentials; form-filler sub-agent definition with prompt-level credential suppression |
| VAULT-02 | Bitwarden session management with auto-unlock and health checking (handles token expiry) | BW_SESSION from `bw unlock --raw` has no auto-expiry; health check via `bw status --session`; re-unlock via `bw unlock --passwordenv BW_MASTER_PASSWORD --raw`; PM2 env injection pattern from Phase 12 |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@bitwarden/mcp-server` | `2026.2.0` | MCP server for Bitwarden vault operations | Official Bitwarden package; provides get/list/create/edit/sync/lock/status operations over MCP protocol |
| `@bitwarden/cli` | latest | CLI tool for vault operations | Required dependency of the MCP server; provides `bw` command for unlock/lock/status |

### Supporting (Already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@anthropic-ai/claude-code` (or `claude-agent-sdk`) | current | SDK with sub-agent support | Sub-agent definitions with private MCP servers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@bitwarden/mcp-server` | Custom CLI wrapper (`vaultService.ts`) | Duplicates MCP server's work; loses protocol compliance; adds maintenance |
| `@bitwarden/mcp-server` | `rbw-mcp` (community alternative) | Uses `rbw` instead of official CLI; less tested; smaller community |
| Sub-agent isolation | Proxy-based credential injection | Anthropic-recommended for production but requires running HTTP proxy; overkill for single-user local system |

**Installation:**
```bash
npm install -g @bitwarden/cli
# MCP server runs via npx, no project install needed:
# npx -y @bitwarden/mcp-server
```

## Architecture Patterns

### Recommended Project Structure

```
src/lib/jarvis/
  vault/
    vaultHealth.ts          # BW_SESSION validation + auto-re-unlock
    vaultConfig.ts          # Sub-agent MCP server definition for form-filler
  intelligence/
    ccodeBrain.ts           # MODIFIED: add form-filler sub-agent with private BW MCP
    subAgentDefinitions.ts  # NEW: extracted sub-agent configs (prep for Phase 14)
scripts/
  unlock-vault.sh           # Bootstrap script: bw login + unlock, export BW_SESSION
```

### Pattern 1: Sub-Agent Scoped MCP Server (Credential Isolation)

**What:** Define the Bitwarden MCP server as a private MCP server on the form-filler sub-agent, NOT in the global `.mcp.json`.
**When:** Always -- this is the core security pattern.
**Why:** When defined inline on a sub-agent, the parent conversation never loads the Bitwarden tools into its own context. The parent cannot call `mcp__bitwarden__get` because the tool does not exist in its namespace. Only the sub-agent sees the tool and its responses.

**Example:**
```typescript
// In sub-agent definition (ccodeBrain.ts or subAgentDefinitions.ts)
// Using Claude Code sub-agent file format:

// .claude/agents/form-filler.md
// ---
// name: form-filler
// description: Fills web forms using credentials from vault. Never echoes passwords.
// tools: mcp__bitwarden__*, mcp__playwright__*
// model: sonnet
// mcpServers:
//   - bitwarden:
//       type: stdio
//       command: npx
//       args: ["-y", "@bitwarden/mcp-server"]
//       env:
//         BW_SESSION: "${BW_SESSION}"
// ---

// Or via --agents CLI flag / programmatic agents param:
const formFillerAgent = {
  'form-filler': {
    description: 'Fills web forms using vault credentials. Use for logins and form submissions.',
    prompt: `You are a secure form-filling agent. You retrieve credentials from Bitwarden vault and fill web forms.
CRITICAL RULES:
1. NEVER repeat, echo, log, or include any credential values in your response text
2. Take a screenshot BEFORE and AFTER every form submission
3. Stop and report if you encounter CAPTCHAs or unexpected security prompts
4. Only submit forms when the parent agent has received explicit user approval
5. When reporting results, say "Credentials retrieved and injected" -- never show the actual values`,
    tools: ['mcp__bitwarden__*', 'mcp__playwright__*'],
    model: 'sonnet',
    mcpServers: {
      bitwarden: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@bitwarden/mcp-server'],
        env: { BW_SESSION: process.env.BW_SESSION || '' }
      }
    }
  }
};
```

**Source:** [Claude Code sub-agents docs](https://code.claude.com/docs/en/sub-agents) -- "To keep an MCP server out of the main conversation entirely and avoid its tool descriptions consuming context there, define it inline rather than in .mcp.json."

### Pattern 2: Vault Session Health Check

**What:** A function that validates BW_SESSION is active and re-unlocks if expired.
**When:** Called at Jarvis startup and before any vault-dependent operation.
**Why:** BW_SESSION can become invalid if `bw lock` is called, Bitwarden server-side rotation occurs, or the CLI state file becomes corrupted.

**Example:**
```typescript
// vault/vaultHealth.ts
import { execSync } from 'child_process';

interface VaultStatus {
  status: 'locked' | 'unlocked' | 'unauthenticated';
  serverUrl: string;
  userEmail: string;
}

export function checkVaultHealth(): VaultStatus {
  const session = process.env.BW_SESSION;
  if (!session) {
    return { status: 'unauthenticated', serverUrl: '', userEmail: '' };
  }
  try {
    const raw = execSync(`bw status --session "${session}"`, {
      encoding: 'utf8',
      timeout: 10_000,
    });
    return JSON.parse(raw) as VaultStatus;
  } catch {
    return { status: 'locked', serverUrl: '', userEmail: '' };
  }
}

export function ensureVaultUnlocked(): string {
  const status = checkVaultHealth();
  if (status.status === 'unlocked') {
    return process.env.BW_SESSION!;
  }
  // Re-unlock using master password from env
  const masterPw = process.env.BW_MASTER_PASSWORD;
  if (!masterPw) {
    throw new Error('Vault locked and BW_MASTER_PASSWORD not set. Manual unlock required.');
  }
  const newSession = execSync('bw unlock --passwordenv BW_MASTER_PASSWORD --raw', {
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, BW_MASTER_PASSWORD: masterPw },
  }).trim();
  process.env.BW_SESSION = newSession;
  return newSession;
}
```

### Pattern 3: Canary Test for Credential Leakage

**What:** A verification function that scans parent agent conversation history for credential values after a vault retrieval cycle.
**When:** Run as part of Phase 13 success criteria validation. Can also run periodically.
**Why:** Proves the sub-agent isolation pattern works -- no raw credentials appear in the parent conversation.

**Example:**
```typescript
// vault/canaryTest.ts
export async function runCredentialCanaryTest(
  parentConversationHistory: string[],
  testCredentialValue: string,  // A known credential value from a test vault entry
): Promise<{ passed: boolean; details: string }> {
  for (const message of parentConversationHistory) {
    if (message.includes(testCredentialValue)) {
      return {
        passed: false,
        details: `FAIL: Credential value "${testCredentialValue.slice(0, 3)}..." found in parent conversation at index ${parentConversationHistory.indexOf(message)}`,
      };
    }
  }
  return { passed: true, details: 'No credential values found in parent conversation history' };
}
```

### Anti-Patterns to Avoid

- **Bitwarden MCP in global .mcp.json:** This makes `mcp__bitwarden__get` available to the parent agent, which would see raw credentials in tool results. The parent conversation history would contain passwords.
- **BW_SESSION hardcoded in config files:** Must be env-only, never committed. Use `.env.local` or PM2 env injection.
- **Storing master password in .env.local permanently:** Acceptable for single-user local system but adds risk. Alternative: require manual `bw unlock` at boot. Tradeoff between convenience and security.
- **Custom vault wrapper bypassing MCP:** The `@bitwarden/mcp-server` handles CLI invocation, JSON parsing, session passing, error handling. A custom wrapper duplicates all of this.
- **Polling vault status continuously:** Vault check should be on-demand (before credential-needing operations), not continuous. BW_SESSION has no auto-expiry, so polling wastes cycles.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vault credential retrieval | Custom `bw get item` wrapper | `@bitwarden/mcp-server` get tool | MCP server handles session passing, JSON parsing, error codes, item types (login, note, card, identity) |
| Session management | Custom session token storage | `bw status` + `bw unlock --passwordenv` | CLI handles encryption, server sync, token format changes |
| MCP protocol compliance | Custom stdio protocol handler | MCP server package | The package handles MCP handshake, tool registration, response formatting |
| Credential form injection | Manual clipboard/paste automation | Playwright MCP `browser_fill` | Playwright handles input field detection, value injection, event triggering |

**Key insight:** The entire vault integration is configuration + glue code. The `@bitwarden/mcp-server` package IS the implementation. Jarvis's job is to wire it to the right sub-agent with the right permissions and handle session lifecycle.

## Common Pitfalls

### Pitfall 1: Bitwarden CLI Not Installed or Not on PATH

**What goes wrong:** `npx -y @bitwarden/mcp-server` starts but immediately fails because it shells out to `bw` CLI commands which aren't found.
**Why it happens:** The MCP server is a wrapper around the Bitwarden CLI. The CLI must be installed separately.
**How to avoid:** Install `@bitwarden/cli` globally (`npm install -g @bitwarden/cli`) and verify `bw --version` works before configuring the MCP server.
**Warning signs:** MCP server starts but all tool calls return errors about "bw: command not found."

### Pitfall 2: Node.js Version Mismatch

**What goes wrong:** `@bitwarden/mcp-server` requires Node.js 22+. Jon's machine has Node v22.18.0 -- this is fine. But if downgraded or using nvm with wrong version, it fails.
**Why it happens:** The MCP server uses modern Node.js features.
**How to avoid:** Verify `node --version` >= 22 before installing. Currently satisfied (v22.18.0).
**Warning signs:** Syntax errors or import failures when MCP server starts.

### Pitfall 3: BW_SESSION Not Available to Sub-Agent Process

**What goes wrong:** The sub-agent spawns the Bitwarden MCP server, but BW_SESSION is empty because the env var wasn't propagated through Claude Code SDK -> sub-agent -> MCP server process chain.
**Why it happens:** Sub-agents may not inherit all parent env vars depending on SDK configuration. The `env` field in the MCP server config might not resolve `${BW_SESSION}` from the process environment.
**How to avoid:** Set BW_SESSION explicitly in the MCP server's env config using `process.env.BW_SESSION` (resolved at definition time, not deferred). Test the full chain: Jarvis process -> SDK -> sub-agent -> MCP server -> `bw status`.
**Warning signs:** MCP server starts but vault operations return "vault is locked" errors.

### Pitfall 4: Master Password in Environment Risks

**What goes wrong:** BW_MASTER_PASSWORD stored in `.env.local` for auto-re-unlock. If Jarvis is compromised, attacker gets full vault access.
**Why it happens:** Convenience vs. security tradeoff for auto-unlock.
**How to avoid:** Two-tier approach: (1) For initial implementation, require manual `bw unlock` at boot -- simpler, more secure. (2) Only add auto-unlock via BW_MASTER_PASSWORD if manual unlock proves too burdensome (Jon working 12-14 hour shifts). Document the risk explicitly.
**Warning signs:** BW_MASTER_PASSWORD appearing in any log, git commit, or error message.

### Pitfall 5: Credentials Appearing in Sub-Agent Response Text

**What goes wrong:** The form-filler sub-agent includes credential values in its final text response (e.g., "I logged in with username admin@example.com and password s3cret").
**Why it happens:** LLM follows helpful instincts and describes what it did in detail.
**How to avoid:** Strong prompt instructions: "NEVER repeat, echo, or include any credential values in your response." Test with known credential values and grep the response.
**Warning signs:** Credential substrings appearing in parent agent's conversation context after sub-agent delegation.

### Pitfall 6: Windows PATH Issues with `npx`

**What goes wrong:** On Windows, `npx -y @bitwarden/mcp-server` fails because npm global bin isn't on PATH for PM2-spawned processes.
**Why it happens:** PM2 on Windows doesn't always inherit the full user PATH.
**How to avoid:** Use the existing PM2 pattern from Phase 12: `interpreter: 'cmd'`, `interpreter_args: '/c'` wrapping. For MCP server config, use full path to npx or use `cmd /c npx`.
**Warning signs:** "npx: command not found" in PM2 logs for the MCP server.

## Code Examples

### Vault Health Check Script (Bootstrap)

```bash
#!/bin/bash
# scripts/unlock-vault.sh
# Run at Jarvis startup to ensure vault is unlocked

# Check if bw CLI is installed
if ! command -v bw &> /dev/null; then
  echo "ERROR: Bitwarden CLI not installed. Run: npm install -g @bitwarden/cli"
  exit 1
fi

# Check current status
STATUS=$(bw status 2>/dev/null | jq -r '.status' 2>/dev/null)

case $STATUS in
  "unlocked")
    echo "Vault already unlocked"
    # Re-export current session
    echo "BW_SESSION=$(bw unlock --raw 2>/dev/null)"
    ;;
  "locked")
    echo "Vault locked. Unlocking..."
    SESSION=$(bw unlock --raw)
    if [ -z "$SESSION" ]; then
      echo "ERROR: Failed to unlock vault"
      exit 1
    fi
    echo "BW_SESSION=$SESSION"
    ;;
  "unauthenticated")
    echo "Not logged in. Run: bw login"
    exit 1
    ;;
  *)
    echo "ERROR: Unknown vault status: $STATUS"
    exit 1
    ;;
esac
```

### .mcp.json (What NOT to Do vs. What TO Do)

```jsonc
// WRONG: Bitwarden in global config = parent agent sees credentials
{
  "mcpServers": {
    "bitwarden": {
      "command": "npx",
      "args": ["-y", "@bitwarden/mcp-server"],
      "env": { "BW_SESSION": "${BW_SESSION}" }
    }
  }
}

// RIGHT: .mcp.json stays clean. Bitwarden is sub-agent private.
// Global .mcp.json unchanged:
{
  "mcpServers": {
    "jarvis-tools": { "command": "npx", "args": ["tsx", "src/lib/jarvis/mcp/index.ts"] },
    "notion": { "command": "cmd", "args": ["/c", "npx", "-y", "@notionhq/notion-mcp-server"] },
    "playwright": { "command": "cmd", "args": ["/c", "npx", "-y", "@playwright/mcp@latest"] }
  }
}
// Bitwarden MCP is defined inline on the form-filler sub-agent only.
```

### Bitwarden MCP Available Tools

```
Session management:
  - status        : Check vault lock state
  - lock          : Lock the vault
  - sync          : Sync with Bitwarden server

Item operations:
  - list          : List vault items (with filters)
  - get           : Retrieve a single item by ID or name (returns full JSON including login.username, login.password, login.totp)
  - create_item   : Create a new vault item
  - edit_item     : Edit an existing vault item
  - delete        : Delete a vault item
  - restore       : Restore a deleted item

Utilities:
  - generate      : Generate a secure password
  - get_totp      : Get TOTP code for a vault item

Folders:
  - create_folder : Create a folder
  - edit_folder   : Edit a folder
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom `bw` CLI wrapper | `@bitwarden/mcp-server` official package | July 2025 | No need to build custom vault service; MCP protocol handles everything |
| Credentials in system prompt | Sub-agent isolated MCP | 2025-2026 (Claude Code sub-agents) | Credentials never enter parent conversation context |
| Manual session refresh | `bw status` + `bw unlock --passwordenv` | Bitwarden CLI has supported this for years | Automated re-authentication possible |
| API key auth for vault | BW_SESSION (master password) | Both supported | BW_SESSION simpler for personal use; API keys for org/enterprise |

**Deprecated/outdated:**
- Building custom `vaultService.ts` wrappers: Use the MCP server
- Storing BW_SESSION in config files: Use env vars only
- `bw unlock --raw` with interactive prompt: Use `--passwordenv` or `--passwordfile` for automation

## Open Questions

1. **Master password storage approach for auto-re-unlock**
   - What we know: `bw unlock --passwordenv BW_MASTER_PASSWORD` enables non-interactive unlock. BW_SESSION has no auto-expiry.
   - What's unclear: Whether Jon wants auto-re-unlock (master password in `.env.local`) or manual unlock at boot (more secure but requires interaction on restart).
   - Recommendation: Start with manual unlock at boot. Add `--passwordenv` later if manual proves burdensome. This is a user preference, not a technical blocker.

2. **Sub-agent MCP server definition mechanism**
   - What we know: Claude Code supports `.claude/agents/form-filler.md` files with `mcpServers` frontmatter, and programmatic `--agents` JSON definition.
   - What's unclear: Whether the current `@anthropic-ai/claude-code` package (pre-Agent SDK migration) supports the `mcpServers` field on sub-agents, or if this requires the Agent SDK migration from Phase 12 to be complete.
   - Recommendation: Verify sub-agent mcpServers support in the current SDK version. If not supported, use `.claude/agents/` file-based definition which is loaded by Claude Code itself.

3. **Bitwarden CLI on Windows without interactive terminal**
   - What we know: `bw unlock --passwordenv` works without interactive input. `bw status` returns JSON.
   - What's unclear: Whether PM2-spawned processes can reliably run `bw` commands (PATH, encoding, terminal requirements).
   - Recommendation: Test `bw status` from a PM2-spawned script early in implementation.

## Sources

### Primary (HIGH confidence)
- [Bitwarden MCP Server - GitHub](https://github.com/bitwarden/mcp-server) -- tool list, auth methods, security warnings, Node 22+ requirement
- [Bitwarden CLI documentation](https://bitwarden.com/help/cli/) -- BW_SESSION lifecycle (no auto-expiry), `--passwordenv` flag, `bw status` command
- [Claude Code sub-agents documentation](https://code.claude.com/docs/en/sub-agents) -- private MCP server scoping, sub-agent context isolation, mcpServers frontmatter
- [Anthropic Secure Deployment Guide](https://platform.claude.com/docs/en/agent-sdk/secure-deployment) -- proxy pattern for credential injection, security boundaries

### Secondary (MEDIUM confidence)
- [Bitwarden MCP blog post](https://bitwarden.com/blog/bitwarden-mcp-server/) -- security architecture, local-first design, recommendation for local LLMs
- [Bitwarden CLI session expiration forum thread](https://community.bitwarden.com/t/cli-session-expiration/43611) -- confirms no auto-expiry on BW_SESSION
- [npm @bitwarden/mcp-server](https://www.npmjs.com/package/@bitwarden/mcp-server) -- version 2026.2.0 confirmed

### Tertiary (LOW confidence)
- [GitHub issue #32514 - Agent identity for MCP tool calls](https://github.com/anthropics/claude-code/issues/32514) -- sub-agent resource isolation still evolving

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- official Bitwarden package, well-documented, version verified
- Architecture: HIGH -- sub-agent MCP scoping is documented Claude Code feature, verified in official docs
- Session management: HIGH -- `bw status` + `bw unlock --passwordenv` verified in official Bitwarden CLI docs
- Credential isolation: MEDIUM -- sub-agent isolation prevents parent from seeing tool results (documented), but LLM prompt-level suppression of credentials in response text is probabilistic not guaranteed
- Pitfalls: HIGH -- common issues identified from Windows/PM2 experience in Phase 12

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, Bitwarden MCP server is production release)
