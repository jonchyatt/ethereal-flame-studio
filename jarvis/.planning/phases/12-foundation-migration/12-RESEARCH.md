# Phase 12: Foundation & Migration - Research

**Researched:** 2026-03-17
**Domain:** Repo migration, SDK migration, flexible scheduler, research storage schema
**Confidence:** HIGH

## Summary

Phase 12 is the foundational phase for Jarvis v5.0. It has four independent workstreams with no external service dependencies: (1) migrating the Jarvis codebase from its nested location inside ethereal-flame-studio to a standalone repo at `C:\Users\jonch\Projects\jarvis`, (2) migrating from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk`, (3) replacing hardcoded node-cron scheduling with a DB-driven flexible scheduler using croner, and (4) adding research-as-library SQLite tables for structured research storage.

The repo migration is the riskiest workstream because PM2 caches absolute paths in its dump file and will not follow symlinks. All four PM2 processes (jarvis-web, jarvis-mcp, jarvis-cron, jarvis-tunnel) must be deleted and re-registered from the new path. The Cloudflare tunnel config must also be verified. The SDK migration is straightforward -- the official migration guide confirms only import path changes are needed for TypeScript (the breaking changes around system prompt and settings sources are already handled by Jarvis's explicit `customSystemPrompt` and no reliance on filesystem settings). The scheduler and research schema additions are purely additive Drizzle ORM work following established patterns.

**Primary recommendation:** Execute the four workstreams in order: repo migration first (unblocks everything else), then SDK migration (unblocks sub-agents in Phase 14), then scheduler rewrite (replaces hardcoded cron), then research schema (additive, lowest risk).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Jarvis repo migrated to C:\Users\jonch\Projects\jarvis with clean git history and working PM2 processes | git filter-repo for subdirectory extraction, PM2 delete+re-register pattern, ecosystem.config.js path updates, Cloudflare tunnel verification |
| FOUND-02 | Claude Agent SDK replaces claude-code SDK with native sub-agent support | Official migration guide confirms import-only change for TS; current package is `@anthropic-ai/claude-code@^1.0.128`, target is `@anthropic-ai/claude-agent-sdk`; three breaking changes documented (system prompt, settings sources, Python type rename -- only first two apply) |
| FOUND-03 | Flexible scheduler with DB-driven task CRUD | croner v9 replaces node-cron v4; new `scheduled_tasks` SQLite table via Drizzle; cronRunner.ts rewritten to load tasks from DB; existing hardcoded tasks become seed records with `system: true` |
| FOUND-04 | Research-as-library schema in SQLite for structured research storage with semantic recall | New `research_entries` table added to existing Drizzle schema; extends `data/schema.ts` pattern; MCP tools for save/search/list exposed via toolBridge.ts |
</phase_requirements>

## Standard Stack

### Core (Already in Project)

| Library | Current Version | Purpose | Notes |
|---------|----------------|---------|-------|
| `@anthropic-ai/claude-code` | `^1.0.128` | SDK brain for Claude queries | **MUST MIGRATE** to `@anthropic-ai/claude-agent-sdk` |
| `node-cron` | `^4.2.1` | Cron scheduling | **MUST REPLACE** with `croner` |
| `@types/node-cron` | `^3.0.11` | Type definitions | **REMOVE** (croner has built-in types) |
| `drizzle-orm` | `^0.45.1` | ORM for SQLite | Stays -- used for new schema tables |
| `@libsql/client` | `^0.17.0` | Turso/SQLite client | Stays -- database connection |
| `drizzle-kit` | `^0.31.8` | Schema migrations | Stays -- push new tables |

### New Additions

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@anthropic-ai/claude-agent-sdk` | `latest` | Replaces claude-code SDK | Official rename, old package stops receiving updates. Adds `agents` parameter for Phase 14 sub-agents |
| `croner` | `^9.0.0` | Cron scheduling with timezone | 1.5M weekly downloads, zero deps, built-in timezone, used by PM2 itself. Strictly superior to node-cron |

### Tools (Not npm packages)

| Tool | Purpose | Notes |
|------|---------|-------|
| `git-filter-repo` | Extract Jarvis subdirectory with clean history | Python tool, install via `pip install git-filter-repo`. Recommended over deprecated `git filter-branch` |
| PM2 | Process management | Already installed globally. Must delete+re-register, not just restart |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| croner | Keep node-cron v4 | node-cron works but lacks native timezone, fewer downloads (736K vs 1.5M), has 1 dependency vs 0 |
| croner | Bree | Worker thread isolation, but overkill for I/O-bound Jarvis tasks |
| git-filter-repo | git subtree split | Simpler but loses commit history rewriting capability; filter-repo is the git project's recommendation |

**Installation:**
```bash
# SDK migration
npm uninstall @anthropic-ai/claude-code
npm install @anthropic-ai/claude-agent-sdk

# Scheduler upgrade
npm uninstall node-cron @types/node-cron
npm install croner

# Repo extraction tool (one-time use)
pip install git-filter-repo
```

## Architecture Patterns

### Current Jarvis Source Layout (Inside ethereal-flame-studio)

```
C:/Users/jonch/Projects/ethereal-flame-studio/
  src/
    app/api/jarvis/        # 11 API routes (chat, briefing, health, stt, tts, telegram, etc.)
    components/jarvis/     # React UI components
    lib/jarvis/            # 140 TypeScript files — the core Jarvis logic
      intelligence/        # ccodeBrain.ts, chatProcessor.ts, providerRouter.ts
      scheduler/           # cronRunner.ts (hardcoded node-cron)
      data/                # schema.ts (tasks, bills, projects, goals, habits), db.ts
      memory/              # schema.ts (memory_entries, sessions, etc.), db.ts
      mcp/                 # MCP tool server (jarvis-tools)
      telegram/            # Grammy bot
      ...26 more directories
  jarvis/                  # Planning docs, ecosystem.config.js
  .mcp.json                # Notion + Playwright MCP servers
  drizzle.config.ts        # Points to both schema files
  package.json             # Monorepo — ALL deps including non-Jarvis
```

### Target Layout (Standalone Repo)

```
C:/Users/jonch/Projects/jarvis/
  src/
    app/api/jarvis/        # Same API routes
    components/jarvis/     # Same UI components
    lib/jarvis/            # Same 140+ TS files
      intelligence/        # ccodeBrain.ts (updated imports)
      scheduler/           # cronRunner.ts (rewritten for DB-driven tasks)
      data/                # schema.ts (adds scheduled_tasks, research_entries)
      memory/              # schema.ts (unchanged)
      research/            # NEW: researchStore.ts
      ...
  ecosystem.config.js      # Updated cwd paths
  .mcp.json                # Copied + updated
  drizzle.config.ts        # Same schema refs
  package.json             # Jarvis-only deps
  CLAUDE.md                # Updated for standalone context
```

### Pattern 1: PM2 Process Re-registration

**What:** PM2 caches the original `cwd` in its dump file (`~/.pm2/dump.pm2`). Changing the project directory requires deleting and re-registering all processes.

**When to use:** After repo migration to new path.

**Critical steps:**
```bash
# From the OLD location — stop and remove all Jarvis processes
pm2 stop jarvis-web jarvis-mcp jarvis-cron jarvis-tunnel
pm2 delete jarvis-web jarvis-mcp jarvis-cron jarvis-tunnel

# From the NEW location — re-register
cd C:/Users/jonch/Projects/jarvis
pm2 start ecosystem.config.js

# CRITICAL: Save the new process list to dump file
pm2 save

# Verify
pm2 ls  # Should show all 4 processes with NEW cwd
```

**Gotcha:** PM2 does NOT follow symlinks. Creating a symlink from old path to new path will NOT work. The processes must be deleted and re-registered.

### Pattern 2: Drizzle Schema Extension

**What:** Add new tables to existing schema files following the established pattern.

**When to use:** Adding scheduled_tasks and research_entries tables.

**Example (follows existing data/schema.ts conventions):**
```typescript
// Source: existing data/schema.ts pattern in the codebase
export const scheduledTasks = sqliteTable('scheduled_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  cronExpression: text('cron_expression').notNull(),
  timezone: text('timezone').notNull().default('America/New_York'),
  handler: text('handler').notNull(),        // function identifier
  config: text('config'),                     // JSON string
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  lastRunAt: text('last_run_at'),
  lastResult: text('last_result'),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
```

### Pattern 3: croner Migration from node-cron

**What:** Replace `cron.schedule()` calls with `new Cron()` from croner.

**API difference:**
```typescript
// OLD: node-cron
import cron from 'node-cron';
cron.schedule('0 5 * * *', async () => { /* handler */ }, { timezone: 'America/New_York' });

// NEW: croner
import { Cron } from 'croner';
new Cron('0 5 * * *', { timezone: 'America/New_York' }, async () => { /* handler */ });
```

**Key differences:**
- `new` keyword is required in croner v9 (was optional in v8)
- Named import `{ Cron }` instead of default import
- Arguments reordered: pattern, options, callback (vs pattern, callback, options)
- Built-in `nextRun()` method for task visibility
- Zero dependencies vs node-cron's 1

### Pattern 4: SDK Import Migration

**What:** Change import path from `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk`.

**Scope in codebase:** Only `ccodeBrain.ts` imports the SDK directly.

```typescript
// OLD
import { query, type SDKMessage } from '@anthropic-ai/claude-code';

// NEW
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
```

**Breaking change handling:**
1. **System prompt:** Jarvis already passes `customSystemPrompt` explicitly -- NOT affected
2. **Settings sources:** Jarvis does not rely on filesystem settings loading -- NOT affected
3. **Python type rename:** N/A (TypeScript project)

**Additional opportunity:** The new SDK supports the `agents` parameter for sub-agent spawning. This is NOT required in Phase 12 but the import migration unblocks Phase 14 (Sub-Agents).

### Anti-Patterns to Avoid

- **Moving directory without re-registering PM2:** PM2 caches absolute paths. `pm2 restart` after a directory move will fail or use stale paths. Must `pm2 delete` + re-register.
- **Using symlinks for PM2 migration:** PM2 resolves symlinks and stores the real path. Symlinks do not work as a migration strategy.
- **Adding new schema to a separate database:** Research and scheduler tables should go in the SAME Turso/libsql database as existing tables. The codebase uses a single `DATABASE_URL` connection.
- **Keeping node-cron alongside croner:** Replace, don't layer. Having two cron libraries creates confusion about which one runs which tasks.
- **Hardcoding seed tasks in cronRunner.ts:** Migrate existing hardcoded tasks (daily reflection at 5 AM) as database records with `isSystem: true`. The cronRunner should only read from DB.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git subdirectory extraction | Custom git filter-branch script | `git-filter-repo --subdirectory-filter` | filter-branch is deprecated, slow, has portability issues. filter-repo is the git project's recommended tool |
| Cron scheduling with timezone | Manual date math with node-cron | croner `{ timezone: 'America/New_York' }` | Timezone handling has DST edge cases that are already solved |
| Schema migrations | Raw SQL ALTER TABLE | `drizzle-kit push` | Drizzle handles table creation, column additions, and type safety |
| SDK subprocess environment | Manual env var filtering | Existing `getCleanEnv()` pattern in ccodeBrain.ts | Already handles stripping CLAUDECODE and ANTHROPIC_API_KEY correctly |

## Common Pitfalls

### Pitfall 1: PM2 Dump File Caches Old Paths

**What goes wrong:** After moving the Jarvis directory, `pm2 restart` appears to work but processes use the OLD cwd from the cached dump file. Scripts fail silently because they can't find source files.

**Why it happens:** PM2 saves process metadata including `cwd` to `~/.pm2/dump.pm2`. On restart, it reads from this file, not from `ecosystem.config.js`.

**How to avoid:** Always `pm2 delete` all Jarvis processes before migration, then `pm2 start ecosystem.config.js` from the new location, then `pm2 save` to update the dump file. Verify with `pm2 describe jarvis-web | grep cwd`.

**Warning signs:** Processes show "online" in `pm2 ls` but logs show "file not found" errors. The `cwd` in `pm2 describe` points to the old directory.

### Pitfall 2: ecosystem.config.js Relative Paths Break After Migration

**What goes wrong:** The current `ecosystem.config.js` uses relative paths like `'jarvis/scripts/start-web.js'` and `'./'` for cwd. These work from the ethereal-flame-studio root but will break in the standalone repo where the directory structure is different.

**Why it happens:** The nested structure `ethereal-flame-studio/jarvis/` means ecosystem.config.js references files relative to the monorepo root. In the standalone repo, these paths must be updated.

**How to avoid:** Update all paths in ecosystem.config.js during migration. The `script` paths for jarvis-web need to point to the correct location. The `cwd` should be `'./'` (repo root) or use `__dirname`.

**Warning signs:** PM2 starts but processes crash immediately with "Cannot find module" errors.

### Pitfall 3: Cloudflare Tunnel Config Points to Old Origin

**What goes wrong:** After migration, `cloudflared tunnel run jarvis` still works but may reference the old configuration. If the tunnel config contains path references, they become stale.

**Why it happens:** Cloudflare tunnel config is stored in `~/.cloudflared/` (user profile), not in the project directory. The tunnel name `jarvis` maps to a UUID and config file.

**How to avoid:** After migration, verify `cloudflared tunnel info jarvis` shows correct settings. The tunnel routes to `localhost:3001` which is port-based, not path-based, so it should be unaffected. But verify anyway.

**Warning signs:** `jarvis.whatamiappreciatingnow.com` returns 502 or connection refused after migration.

### Pitfall 4: Drizzle Config Lost During Repo Extraction

**What goes wrong:** `drizzle.config.ts` in ethereal-flame-studio points to schema files at `./src/lib/jarvis/memory/schema.ts` and `./src/lib/jarvis/data/schema.ts`. If the extraction doesn't include it or the paths change, `drizzle-kit push` fails.

**Why it happens:** git-filter-repo extracts based on subdirectory paths. If `drizzle.config.ts` is at the monorepo root (which it is), it won't be included in a subdirectory extraction of `src/lib/jarvis/`.

**How to avoid:** The drizzle config must be manually created in the new repo root. Copy and verify the schema paths match the new directory structure. Also copy `.env.local` with `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.

**Warning signs:** `drizzle-kit push` fails with "schema file not found" or "DATABASE_URL not set".

### Pitfall 5: SDK Version Mismatch After Migration

**What goes wrong:** The current package.json has `@anthropic-ai/claude-code@^1.0.128`. The migration guide example shows `^0.0.42` to `^0.2.0`. These version numbers don't align, suggesting the packages may have diverged in versioning.

**Why it happens:** The claude-code package continued to receive updates independently. The claude-agent-sdk started with its own version scheme. The exact feature parity at specific versions is unclear.

**How to avoid:** Install the latest `@anthropic-ai/claude-agent-sdk` (not a specific version). Verify that `query()` still works with the same options (prompt, options.cwd, options.customSystemPrompt, options.allowedTools, options.permissionMode, options.env, options.resume). Run a quick smoke test after installation.

**Warning signs:** TypeScript compilation errors on `query()` call. Runtime errors about unknown options. Different event types in the async iterator.

## Code Examples

### Existing cronRunner.ts (What Gets Replaced)

```typescript
// Source: src/lib/jarvis/scheduler/cronRunner.ts (current)
import cron from 'node-cron';
import { runReflection } from '../intelligence/reflectionLoop';
import { runMetaEvaluation } from '../intelligence/metaEvaluator';

const TIMEZONE = 'America/New_York';

// Hardcoded: daily reflection at 5:00 AM ET
cron.schedule('0 5 * * *', async () => {
  const reflectionResult = await runReflection();
  const metaResult = await runMetaEvaluation();
}, { timezone: TIMEZONE });
```

### Target cronRunner.ts (DB-Driven with croner)

```typescript
// Target: Dynamic task loading from SQLite
import { Cron } from 'croner';
import { getDataDb } from '../data/db';
import { scheduledTasks } from '../data/schema';
import { eq } from 'drizzle-orm';
import { runReflection } from '../intelligence/reflectionLoop';
import { runMetaEvaluation } from '../intelligence/metaEvaluator';

// Registry of handler functions
const HANDLERS: Record<string, () => Promise<void>> = {
  'daily-reflection': async () => {
    await runReflection();
    await runMetaEvaluation();
  },
  // Future handlers registered here
};

// Active cron instances (for hot-reload)
const activeCrons = new Map<number, Cron>();

async function loadAndScheduleTasks() {
  const db = getDataDb();
  const tasks = await db.select().from(scheduledTasks).where(eq(scheduledTasks.enabled, true));

  // Stop existing crons
  for (const cron of activeCrons.values()) cron.stop();
  activeCrons.clear();

  for (const task of tasks) {
    const handler = HANDLERS[task.handler];
    if (!handler) {
      console.warn(`[Cron] Unknown handler: ${task.handler}`);
      continue;
    }

    const job = new Cron(task.cronExpression, { timezone: task.timezone }, async () => {
      console.log(`[Cron] Running: ${task.name}`);
      try {
        await handler();
        await db.update(scheduledTasks)
          .set({ lastRunAt: new Date().toISOString(), lastError: null })
          .where(eq(scheduledTasks.id, task.id));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Cron] ${task.name} failed:`, msg);
        await db.update(scheduledTasks)
          .set({ lastRunAt: new Date().toISOString(), lastError: msg })
          .where(eq(scheduledTasks.id, task.id));
      }
    });

    activeCrons.set(task.id, job);
    console.log(`[Cron] Scheduled: ${task.name} (${task.cronExpression}) next: ${job.nextRun()}`);
  }
}

// Initial load
loadAndScheduleTasks();

// Hot-reload: poll for DB changes every 60 seconds
setInterval(loadAndScheduleTasks, 60_000);
```

### Research Schema Addition

```typescript
// Source: follows existing data/schema.ts pattern
export const researchEntries = sqliteTable('research_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domain: text('domain').notNull(),           // 'grant' | 'credit' | 'bill' | 'business' | 'general'
  topic: text('topic').notNull(),             // 'Verizon Digital Ready Grant'
  fieldName: text('field_name'),              // 'eligibility_criteria', 'deadline', 'amount'
  fieldValue: text('field_value'),            // structured value
  source: text('source'),                     // URL or document reference
  confidence: text('confidence').default('medium'), // 'high' | 'medium' | 'low'
  notes: text('notes'),
  tags: text('tags'),                         // JSON array string
  expiresAt: text('expires_at'),             // ISO date -- some findings are time-sensitive
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type ResearchEntry = typeof researchEntries.$inferSelect;
export type NewResearchEntry = typeof researchEntries.$inferInsert;
```

### SDK Import Change (ccodeBrain.ts)

```typescript
// BEFORE (line 11 of current ccodeBrain.ts)
import { query, type SDKMessage } from '@anthropic-ai/claude-code';

// AFTER
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
```

No other code changes required. The `query()` function signature, options object, and event types are identical.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` | 2026 Q1 | Old package stops receiving updates. Must migrate. |
| `git filter-branch` | `git-filter-repo` | 2020+ | filter-branch is officially deprecated by git project |
| `node-cron` (hardcoded) | croner + DB-driven tasks | Available now | Dynamic task management, native timezone, zero deps |
| System prompt auto-loaded by SDK | Explicit `systemPrompt` parameter | Agent SDK v0.1.0 | Jarvis already passes explicit prompt -- no impact |
| Settings auto-loaded from filesystem | Explicit `settingSources` parameter | Agent SDK v0.1.0 | Jarvis does not use filesystem settings -- no impact |

**Deprecated/outdated:**
- `@anthropic-ai/claude-code`: Renamed package, will stop receiving updates. Migrate immediately.
- `git filter-branch`: Git project recommends git-filter-repo instead.
- `@types/node-cron`: Remove when replacing node-cron with croner (croner has built-in TypeScript types).

## Open Questions

1. **Repo extraction scope: what goes into standalone jarvis repo?**
   - What we know: Jarvis source is at `src/lib/jarvis/` (140 files), `src/app/api/jarvis/` (11 routes), `src/components/jarvis/` (UI), plus `jarvis/ecosystem.config.js` and root-level configs.
   - What's unclear: The Next.js app framework files (next.config.js, tailwind.config, etc.) and shared dependencies. Jarvis is deeply embedded in the ethereal-flame-studio Next.js app -- it's not a simple subdirectory extraction.
   - Recommendation: Rather than `git filter-repo --subdirectory-filter`, use a manual approach: create fresh repo, copy relevant directories, bring over relevant package.json deps, and create initial commit. This avoids the complexity of untangling a monorepo with shared infrastructure. Link to ethereal-flame-studio commit for provenance.

2. **Database continuity after migration**
   - What we know: Database is Turso-hosted (cloud), accessed via DATABASE_URL. Not local files.
   - What's unclear: Whether `.env.local` needs manual copying or if environment variables are set elsewhere.
   - Recommendation: Copy `.env.local` to new repo. Database is cloud-hosted so no data migration needed -- the same Turso database is accessed from the new location.

3. **Exact croner v9 API surface**
   - What we know: `new Cron(pattern, options, callback)` syntax. Named import `{ Cron }`.
   - What's unclear: Whether croner v9 supports `stop()` + `start()` for hot-reload, and how it handles failed jobs.
   - Recommendation: Verify at implementation time. The croner docs at croner.56k.guru have full API reference. LOW risk -- if croner has issues, falling back to node-cron with manual timezone handling is trivial.

## Sources

### Primary (HIGH confidence)
- [Claude Agent SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) -- verified breaking changes, import path changes, system prompt and settings sources defaults
- Existing Jarvis source code: `ccodeBrain.ts` (line 11: `import { query } from '@anthropic-ai/claude-code'`), `cronRunner.ts`, `data/schema.ts`, `memory/schema.ts`, `data/db.ts`, `ecosystem.config.js`, `.mcp.json`, `drizzle.config.ts`, `package.json`
- [git-filter-repo](https://github.com/newren/git-filter-repo) -- recommended by git project for subdirectory extraction

### Secondary (MEDIUM confidence)
- [croner npm](https://www.npmjs.com/package/croner) -- v9 API, migration from node-cron
- [croner migration guide](https://croner.56k.guru/migration/) -- v8 to v9 breaking changes (new keyword required, named import)
- [PM2 symlink issues](https://github.com/Unitech/pm2/issues/5939) -- PM2 does not follow symlinks, caches real paths
- [Splitting Sub-folders Into New Git Repository](https://making.close.com/posts/splitting-sub-folders-out-into-new-git-repository/) -- practical guide for monorepo extraction

### Tertiary (LOW confidence)
- Exact version number for `@anthropic-ai/claude-agent-sdk` latest -- npm page returned 403, could not verify. Install with `latest` tag and verify at build time.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- verified current package.json, confirmed SDK migration guide, croner docs checked
- Architecture: HIGH -- verified actual file locations and directory structure in codebase, confirmed PM2 behavior from prior research
- Pitfalls: HIGH -- PM2 path caching and symlink issues confirmed via GitHub issues, Cloudflare tunnel behavior verified from existing docs
- Repo extraction: MEDIUM -- the monorepo structure makes simple git-filter-repo insufficient; manual extraction recommended

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain -- SDK migration guide unlikely to change, PM2 behavior is well-established)
