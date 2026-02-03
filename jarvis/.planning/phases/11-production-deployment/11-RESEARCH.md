# Phase 11: Production Deployment - Research

**Researched:** 2026-02-02
**Domain:** Notion SDK migration, Vercel serverless, API authentication
**Confidence:** HIGH

## Summary

This phase addresses 6 specific issues blocking production deployment, with the critical issue being the MCP-to-Direct-SDK migration for Notion integration. The research confirms:

1. **Notion SDK is straightforward** - Direct 1:1 mapping from MCP tools to SDK methods
2. **Race condition fix is clean** - Drizzle `onConflictDoUpdate` handles unique constraint violations
3. **API auth is minimal** - Single-header secret validation in middleware
4. **Timezone handling** - Pass client timezone in request headers

**Primary recommendation:** Execute fixes in order: #1 (MCP blocking build) -> #3 (auth) -> #5 (race condition) -> #4 (env leak) -> #6 (timezone) -> #2 (verify in prod)

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @notionhq/client | latest | Notion API access | Official Notion SDK, TypeScript-native |
| drizzle-orm | ^0.45.1 | Database operations | Already in use, has `onConflictDoUpdate` |
| next/server | ^15.1.4 | Middleware auth | Built-in, no external dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns-tz | optional | Timezone calculations | Only if complex timezone math needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @notionhq/client | MCP server | MCP requires persistent process - incompatible with serverless |
| Middleware auth | NextAuth.js | Overkill for single-user, adds complexity |

**Installation:**
```bash
npm install @notionhq/client
```

## Architecture Patterns

### Recommended NotionClient Rewrite Structure
```typescript
// src/lib/jarvis/notion/NotionClient.ts

import { Client } from '@notionhq/client';

// Singleton client
let notionClient: Client | null = null;

function getNotionClient(): Client {
  if (!notionClient) {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      throw new Error('NOTION_TOKEN environment variable is required');
    }
    notionClient = new Client({ auth: token });
  }
  return notionClient;
}

// Query database (replaces API-query-data-source)
export async function queryDatabase(
  databaseId: string,
  filter?: object
): Promise<unknown> {
  const notion = getNotionClient();
  return notion.databases.query({
    database_id: databaseId,
    filter,
  });
}

// Create page (replaces API-post-page)
export async function createPage(
  parentDatabaseId: string,
  properties: object
): Promise<unknown> {
  const notion = getNotionClient();
  return notion.pages.create({
    parent: { database_id: parentDatabaseId },
    properties,
  });
}

// Update page (replaces API-patch-page)
export async function updatePage(
  pageId: string,
  properties: object
): Promise<unknown> {
  const notion = getNotionClient();
  return notion.pages.update({
    page_id: pageId,
    properties,
  });
}
```

### Pattern 1: MCP-to-SDK Method Mapping
**What:** Direct substitution of MCP tool calls with SDK method calls
**When to use:** Always - the mapping is 1:1
**Example:**
```typescript
// Before (MCP)
const result = await callMCPTool('API-query-data-source', {
  data_source_id: databaseId,
  filter: filter,
});

// After (Direct SDK)
const result = await queryDatabase(databaseId, filter);
```

Source: [Notion SDK GitHub](https://github.com/makenotion/notion-sdk-js)

### Pattern 2: API Auth Middleware
**What:** Single-user secret header validation
**When to use:** All `/api/jarvis/*` routes
**Example:**
```typescript
// src/middleware.ts (updated)
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const isJarvisSubdomain = hostname.startsWith('jarvis.');

  // API authentication for Jarvis routes
  if (pathname.startsWith('/api/jarvis/')) {
    const secret = request.headers.get('X-Jarvis-Secret');
    const expectedSecret = process.env.JARVIS_API_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // ... rest of middleware
}
```

### Pattern 3: Race Condition Fix with onConflictDoUpdate
**What:** Atomic upsert instead of check-then-insert
**When to use:** `storeMemoryEntry` function
**Example:**
```typescript
// Before (race condition)
const existing = await db.select()...
if (existing.length > 0) {
  await db.update()...
} else {
  await db.insert()...
}

// After (atomic upsert)
const result = await db
  .insert(memoryEntries)
  .values({
    content,
    contentHash,
    category,
    source,
    lastAccessed: now,
  })
  .onConflictDoUpdate({
    target: memoryEntries.contentHash,
    set: { lastAccessed: now },
  })
  .returning();
```

Source: [Drizzle ORM Upsert Guide](https://orm.drizzle.team/docs/guides/upsert)

### Pattern 4: Environment-Gated Logging
**What:** Suppress sensitive info in production
**When to use:** Session API error responses
**Example:**
```typescript
// Before
return NextResponse.json({
  error: error.message,
  stack: error.stack  // NEVER in production
});

// After
return NextResponse.json({
  error: process.env.NODE_ENV === 'development'
    ? error.message
    : 'Internal server error',
  ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
});
```

### Anti-Patterns to Avoid
- **child_process in serverless:** Cannot spawn processes on Vercel - use HTTP/REST APIs
- **Check-then-write for uniqueness:** Use database constraints + conflict handling
- **Leaking env vars in responses:** Never include stack traces or env details in production

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notion API access | Custom HTTP client | @notionhq/client | Auth, pagination, types, rate limiting |
| Upsert logic | Check-then-insert | onConflictDoUpdate | Race conditions, atomic operation |
| Timezone conversions | Manual UTC math | Intl.DateTimeFormat or date-fns-tz | Edge cases, DST transitions |
| Unique constraint handling | Try/catch around insert | Drizzle conflict handling | Cleaner, explicit intent |

**Key insight:** The Notion SDK handles pagination, rate limiting, and type coercion that would be tedious to implement manually.

## Common Pitfalls

### Pitfall 1: SQLite Unique Index vs Unique Constraint
**What goes wrong:** `onConflictDoUpdate` fails with "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint"
**Why it happens:** Drizzle-kit creates unique indexes instead of constraints by default
**How to avoid:** The `.unique()` on `contentHash` should work, but if not, verify with `PRAGMA index_list(memory_entries)`
**Warning signs:** SQLite error mentioning "no such index" or "ON CONFLICT mismatch"

### Pitfall 2: Notion API data_source_id vs database_id
**What goes wrong:** Queries fail with 404 or wrong database accessed
**Why it happens:** MCP used `data_source_id`, SDK uses `database_id` - they may differ
**How to avoid:** Use the existing `LIFE_OS_DATABASES` and `LIFE_OS_DATABASE_IDS` constants
**Warning signs:** 404 errors from Notion API

### Pitfall 3: Next.js Middleware Auth Bypass (CVE-2025-29927)
**What goes wrong:** Attackers can bypass middleware authentication using `x-middleware-subrequest` header
**Why it happens:** Vulnerability in Next.js 14.x < 14.2.25, 15.x < 15.2.3
**How to avoid:** Update to Next.js 14.2.25+ or block `x-middleware-subrequest` header
**Warning signs:** Authentication bypassed on self-hosted deployments

Source: [Vercel Postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

### Pitfall 4: Timezone Date Boundaries
**What goes wrong:** Tasks due "today" don't appear because server is UTC
**Why it happens:** `new Date().toISOString().split('T')[0]` uses server timezone
**How to avoid:** Accept `X-Timezone` header from client, calculate dates in that timezone
**Warning signs:** Tasks appearing on wrong day, off-by-one date errors

### Pitfall 5: Missing JARVIS_API_SECRET Env Var
**What goes wrong:** 401 Unauthorized on all API calls
**Why it happens:** Env var not added to Vercel
**How to avoid:** Add `JARVIS_API_SECRET` to Vercel dashboard before deploy
**Warning signs:** All API requests fail after deployment

## Code Examples

Verified patterns from official sources:

### Notion Database Query
```typescript
// Source: https://developers.notion.com/reference/post-database-query
const response = await notion.databases.query({
  database_id: 'database-uuid',
  filter: {
    and: [
      {
        property: 'Status',
        status: { does_not_equal: 'Completed' },
      },
      {
        property: 'Due Date',
        date: { on_or_before: '2026-02-02' },
      },
    ],
  },
});
```

### Notion Page Create
```typescript
// Source: https://developers.notion.com/reference/post-page
const page = await notion.pages.create({
  parent: { database_id: 'database-uuid' },
  properties: {
    Name: {
      title: [{ text: { content: 'Task Title' } }],
    },
    Status: {
      status: { name: 'Not started' },
    },
    'Due Date': {
      date: { start: '2026-02-05' },
    },
  },
});
```

### Notion Page Update
```typescript
// Source: https://developers.notion.com/reference/patch-page
const updated = await notion.pages.update({
  page_id: 'page-uuid',
  properties: {
    Status: {
      status: { name: 'Completed' },
    },
  },
});
```

### Client-Side Secret Header
```typescript
// Frontend code to include auth header
async function fetchJarvisAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`/api/jarvis/${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'X-Jarvis-Secret': process.env.NEXT_PUBLIC_JARVIS_SECRET || '',
      'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  return response;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MCP stdio transport | Direct HTTP SDK | 2026-02 | Serverless compatible |
| Check-then-insert | onConflictDoUpdate | drizzle-orm 0.29+ | Race-condition-free |
| Server-timezone dates | Client-timezone header | Best practice | User-expected behavior |

**Deprecated/outdated:**
- **MCP in serverless:** MCP requires persistent process - incompatible with Vercel/Netlify/AWS Lambda
- **next-auth@4:** Superseded by Auth.js (formerly next-auth@5), but overkill for single-user

## Open Questions

Things that couldn't be fully resolved:

1. **Notion data_source_id vs database_id distinction**
   - What we know: MCP used `data_source_id` for queries, SDK uses `database_id`
   - What's unclear: Are they always the same value?
   - Recommendation: Check if `NOTION_TASKS_DATA_SOURCE_ID` == `NOTION_TASKS_DATABASE_ID`, update env vars if needed

2. **SQLite unique index behavior with Drizzle-kit**
   - What we know: Recent drizzle-kit versions create indexes not constraints
   - What's unclear: Whether existing schema migration will work
   - Recommendation: Test `onConflictDoUpdate` locally first, adjust if SQLite complains

3. **Client-side secret exposure**
   - What we know: `NEXT_PUBLIC_*` vars are bundled into client JS
   - What's unclear: Is header-based auth sufficient for single-user scenario?
   - Recommendation: Accept risk for v2.0, revisit if multi-user ever needed

## Sources

### Primary (HIGH confidence)
- [Notion SDK GitHub](https://github.com/makenotion/notion-sdk-js) - Client usage, TypeScript types
- [Notion API Reference](https://developers.notion.com/reference) - Endpoints, request/response formats
- [Drizzle ORM Upsert Guide](https://orm.drizzle.team/docs/guides/upsert) - onConflictDoUpdate syntax

### Secondary (MEDIUM confidence)
- [Vercel Middleware Bypass Postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) - CVE-2025-29927 details
- [Drizzle GitHub Issues](https://github.com/drizzle-team/drizzle-orm/issues/2998) - SQLite unique constraint quirks

### Tertiary (LOW confidence)
- WebSearch results on Next.js middleware auth patterns - verify against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Notion SDK is well-documented
- Architecture: HIGH - Patterns verified against official docs
- Pitfalls: MEDIUM - Some based on GitHub issues, not official docs

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable libraries, low churn)
