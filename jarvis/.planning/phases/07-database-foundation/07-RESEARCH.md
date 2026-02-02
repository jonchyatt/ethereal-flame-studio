# Phase 7: Database Foundation - Research

**Researched:** 2026-02-02
**Domain:** SQLite persistence with Drizzle ORM + @libsql/client for Next.js serverless
**Confidence:** HIGH

## Summary

This research investigates how to set up Drizzle ORM with @libsql/client for the Jarvis memory system, enabling SQLite persistence that works both locally (development) and on Vercel serverless (production via Turso).

The key finding is that **local `file:` URLs do NOT work with Next.js Turbopack** due to the web client's limitations. For development, use `turso dev` to run a local libSQL server on `http://localhost:8080`, or use a remote Turso database directly. Production uses Turso's remote libsql:// URLs.

Drizzle ORM provides type-safe database access with zero dependencies and excellent serverless cold-start performance. The `drizzle-kit push` command enables rapid schema iteration during development.

**Primary recommendation:** Use `turso dev` for local development (HTTP URL) and Turso cloud for production. Never use `file:` URLs with Next.js.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | ^0.45.1 | Type-safe ORM | Zero dependencies, tree-shakeable, excellent TypeScript inference, serverless-ready by design |
| `@libsql/client` | ^0.17.0 | Database driver | Unified API for local libSQL server AND Turso cloud. Works in serverless without native bindings. |
| `drizzle-kit` | (dev) | Migrations CLI | Schema management, generate/push/migrate commands |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Turso CLI | Latest | Local dev server | `turso dev` for local HTTP-based SQLite |
| `dotenv` | ^16.x | Environment vars | Loading DATABASE_URL in development |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle | Prisma | Prisma has larger bundle, Rust binary, worse cold-start in serverless |
| @libsql/client | better-sqlite3 | better-sqlite3 does NOT work on Vercel serverless (native bindings) |
| Turso | Cloudflare D1 | D1 requires Cloudflare Workers, Turso works with any platform |

**Installation:**
```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/jarvis/
  memory/
    db.ts              # Database client singleton
    schema.ts          # Drizzle table definitions
    index.ts           # Exported MemoryService facade
    queries/
      memoryEntries.ts # CRUD for memory_entries
      sessions.ts      # CRUD for sessions
      dailyLogs.ts     # CRUD for daily_logs
drizzle/
  0001_initial.sql     # Generated migrations
  meta/                # Migration metadata
drizzle.config.ts      # Drizzle Kit configuration
```

### Pattern 1: Database Client Singleton

**What:** Single database client instance reused across requests
**When to use:** Always - prevents connection exhaustion in serverless
**Example:**
```typescript
// src/lib/jarvis/memory/db.ts
// Source: https://orm.drizzle.team/docs/connect-turso

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

### Pattern 2: Schema Definition with Drizzle SQLite Core

**What:** Type-safe table definitions using Drizzle's SQLite dialect
**When to use:** Defining database schema
**Example:**
```typescript
// src/lib/jarvis/memory/schema.ts
// Source: https://orm.drizzle.team/docs/get-started/sqlite-new

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const memoryEntries = sqliteTable('memory_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  contentHash: text('content_hash').unique(),
  category: text('category').notNull(), // 'preference' | 'fact' | 'pattern'
  source: text('source').notNull(), // 'user_explicit' | 'jarvis_inferred'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  lastAccessed: text('last_accessed'),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  endTrigger: text('end_trigger'), // 'timeout' | 'explicit' | 'browser_close'
  summary: text('summary'),
});

export const dailyLogs = sqliteTable('daily_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').references(() => sessions.id),
  eventType: text('event_type').notNull(),
  eventData: text('event_data'), // JSON string
  timestamp: text('timestamp').notNull().$defaultFn(() => new Date().toISOString()),
});
```

### Pattern 3: Environment-Based Configuration

**What:** Different DATABASE_URL for development vs production
**When to use:** Always
**Example:**
```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/sqlite-new

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/jarvis/memory/schema.ts',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
```

### Anti-Patterns to Avoid

- **Using `file:` URLs with Next.js:** The web client does not support file: URLs. Use `http://localhost:8080` via `turso dev` instead.
- **Importing from `drizzle-orm/libsql` directly:** Can cause Turbopack issues. Import `createClient` from `@libsql/client` separately and pass to drizzle.
- **Creating new client per request:** Connection exhaustion in serverless. Use singleton pattern.
- **Storing timestamps as Date objects:** SQLite has no native Date type. Use ISO strings in TEXT columns.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content hashing for dedup | Custom hash function | `crypto.createHash('sha256')` | Built into Node.js, consistent results |
| Schema migrations | Raw SQL files | `drizzle-kit generate/migrate` | Type-safe, tracks applied migrations |
| JSON in SQLite | Custom serialize/parse | Store as TEXT, parse in app | SQLite TEXT handles JSON fine |
| Connection pooling | Custom pool logic | libsql client handles this | HTTP-based, no pooling needed |

**Key insight:** Turso/libsql uses HTTP for remote connections, eliminating traditional connection pooling concerns that plague PostgreSQL in serverless.

## Common Pitfalls

### Pitfall 1: Using file: URLs with Next.js Turbopack

**What goes wrong:** `LibsqlError: URL_SCHEME_NOT_SUPPORTED: The client that uses Web standard APIs supports only "libsql:", "wss:", "ws:", "https:" and "http:" URLs`

**Why it happens:** Next.js uses the web client variant of @libsql/client which cannot access the local filesystem.

**How to avoid:** Use `turso dev` to start a local HTTP server:
```bash
turso dev --db-file ./jarvis.db
# Then use DATABASE_URL=http://127.0.0.1:8080
```

**Warning signs:** Error on `next dev` startup mentioning URL scheme.

### Pitfall 2: Missing authToken in Production

**What goes wrong:** `LibsqlError: HRANA_WEBSOCKET_ERROR` or 401 Unauthorized

**Why it happens:** Turso cloud requires authentication, but authToken only needed for production.

**How to avoid:** Environment-specific config:
```env
# .env.local (development)
DATABASE_URL=http://127.0.0.1:8080
# No authToken needed for local

# Vercel (production)
DATABASE_URL=libsql://jarvis-[account].turso.io
DATABASE_AUTH_TOKEN=eyJ...
```

**Warning signs:** Works locally, fails on Vercel deploy.

### Pitfall 3: Turbopack LICENSE Parsing Error (Fixed)

**What goes wrong:** `Parsing ecmascript source code failed... Expected ';', '}' or <eof>` on LICENSE file

**Why it happens:** Old versions of libsql had dynamic requires that confused Turbopack.

**How to avoid:** Use @libsql/client v0.17.0+ (fixed upstream in libsql PR #200). This issue is resolved in current versions.

**Warning signs:** Error mentioning `@libsql/hrana-client/LICENSE`.

### Pitfall 4: Schema Push to Wrong Database

**What goes wrong:** Development changes applied to production database

**Why it happens:** drizzle.config.ts reads DATABASE_URL which might point to production.

**How to avoid:**
- Always verify DATABASE_URL before running `drizzle-kit push`
- Use `drizzle-kit generate` + `drizzle-kit migrate` for production (explicit migrations)
- Consider separate config files: `drizzle.config.dev.ts`, `drizzle.config.prod.ts`

**Warning signs:** Unexpected data in production after local development.

### Pitfall 5: Timestamps Stored Inconsistently

**What goes wrong:** Date comparisons fail, sorting broken

**Why it happens:** Mixing Date.now() (number), Date objects, and ISO strings

**How to avoid:** Always use ISO 8601 strings:
```typescript
createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
```

**Warning signs:** Queries returning unexpected order.

## Code Examples

Verified patterns from official sources:

### Database Client Setup
```typescript
// src/lib/jarvis/memory/db.ts
// Source: https://orm.drizzle.team/docs/connect-turso

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Singleton client
const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN, // undefined for local dev
});

export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
```

### Insert with Hash Deduplication
```typescript
// Source: CONTEXT.md locked decision - hash-based dedup

import { db, memoryEntries } from './db';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';

export async function storeMemoryEntry(content: string, category: string, source: string) {
  // Normalize and hash for deduplication
  const normalized = content.trim().toLowerCase();
  const contentHash = createHash('sha256').update(normalized).digest('hex');

  // Check for existing entry
  const existing = await db.select()
    .from(memoryEntries)
    .where(eq(memoryEntries.contentHash, contentHash))
    .get();

  if (existing) {
    // Update last_accessed timestamp (silent dedup per CONTEXT.md)
    await db.update(memoryEntries)
      .set({ lastAccessed: new Date().toISOString() })
      .where(eq(memoryEntries.id, existing.id));
    return existing;
  }

  // Insert new entry
  return await db.insert(memoryEntries).values({
    content,
    contentHash,
    category,
    source,
  }).returning().get();
}
```

### Session Management
```typescript
// Source: CONTEXT.md session boundary decisions

import { db, sessions, dailyLogs } from './db';
import { eq, and, isNull } from 'drizzle-orm';

export async function startSession(): Promise<number> {
  const result = await db.insert(sessions).values({
    startedAt: new Date().toISOString(),
  }).returning({ id: sessions.id }).get();

  return result.id;
}

export async function endSession(sessionId: number, trigger: string, summary?: string) {
  await db.update(sessions)
    .set({
      endedAt: new Date().toISOString(),
      endTrigger: trigger,
      summary,
    })
    .where(eq(sessions.id, sessionId));
}

export async function logSessionEvent(
  sessionId: number,
  eventType: string,
  eventData?: Record<string, unknown>
) {
  await db.insert(dailyLogs).values({
    sessionId,
    eventType,
    eventData: eventData ? JSON.stringify(eventData) : null,
  });
}
```

### Drizzle Kit Configuration
```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/sqlite-new

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/jarvis/memory/schema.ts',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
```

### Package.json Scripts
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "turso:dev": "turso dev --db-file ./jarvis.db"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| better-sqlite3 for all | @libsql/client | 2024 | Enables serverless deployment |
| Prisma for SQLite | Drizzle ORM | 2024-2025 | Better serverless cold start |
| file: URLs locally | turso dev HTTP server | 2025 | Fixes Next.js Turbopack compatibility |
| Manual SQL migrations | drizzle-kit push | Stable | Rapid development iteration |

**Deprecated/outdated:**
- `better-sqlite3` for production: Does not work on Vercel serverless (native bindings)
- `file:` URLs with Next.js: Web client variant doesn't support filesystem access
- Prisma with SQLite in serverless: Larger bundle, slower cold starts than Drizzle

## Open Questions

Things that couldn't be fully resolved:

1. **Embedded Replicas for Local Development**
   - What we know: Turso supports embedded replicas with `syncUrl` for local-remote sync
   - What's unclear: Whether this pattern is worth the complexity for single-user Jarvis
   - Recommendation: Use simple remote URL for now; embedded replicas if latency becomes issue

2. **Migration Strategy for Production**
   - What we know: `drizzle-kit push` is recommended for development, `generate/migrate` for production
   - What's unclear: Best practice for running migrations on Vercel serverless deploy
   - Recommendation: Run migrations programmatically on first request or via custom API route

3. **Turso Free Tier Limits**
   - What we know: 9GB storage, 1B row reads/month, 500 databases
   - What's unclear: How quickly Jarvis would approach these limits
   - Recommendation: Monitor usage; free tier should be sufficient for personal assistant

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM SQLite Setup](https://orm.drizzle.team/docs/get-started/sqlite-new) - Installation, schema, config
- [Drizzle + Turso Guide](https://orm.drizzle.team/docs/connect-turso) - Client setup, environment config
- [Turso Local Development](https://docs.turso.tech/local-development) - turso dev command
- [Turso Embedded Replicas](https://docs.turso.tech/features/embedded-replicas/introduction) - Sync patterns
- [GitHub Issue #82881](https://github.com/vercel/next.js/issues/82881) - Turbopack LICENSE fix (Closed/Fixed)

### Secondary (MEDIUM confidence)
- [Drizzle Kit Migrations](https://orm.drizzle.team/docs/migrations) - generate/push/migrate commands
- [Turso + Vercel Marketplace](https://vercel.com/marketplace/tursocloud) - Integration pattern
- [libsql-client-ts GitHub](https://github.com/tursodatabase/libsql-client-ts) - Client options

### Tertiary (LOW confidence)
- WebSearch results for "drizzle libsql Next.js file URL" - Issue identification
- Community discussions on AnswerOverflow - Workaround patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation, verified versions
- Architecture: HIGH - Official Drizzle/Turso patterns
- Pitfalls: HIGH - Confirmed via GitHub issues and official docs
- Migration strategy: MEDIUM - Best practices still evolving for serverless

**Research date:** 2026-02-02
**Valid until:** 60 days (stable ecosystem, well-documented)

---

## Environment Configuration Summary

### Development (.env.local)
```env
# Local libSQL server via turso dev
DATABASE_URL=http://127.0.0.1:8080
# No auth token needed locally
```

### Production (Vercel Environment Variables)
```env
# Turso cloud database
DATABASE_URL=libsql://jarvis-[account].turso.io
DATABASE_AUTH_TOKEN=eyJ...
```

### Turso Setup Commands
```bash
# Install Turso CLI (one-time)
# Windows: Download from https://turso.tech/download
# macOS: brew install tursodatabase/tap/turso

# Create production database
turso db create jarvis
turso db show jarvis --url          # Get DATABASE_URL
turso db tokens create jarvis       # Get DATABASE_AUTH_TOKEN

# Local development
turso dev --db-file ./jarvis.db     # Starts server on http://127.0.0.1:8080
```
