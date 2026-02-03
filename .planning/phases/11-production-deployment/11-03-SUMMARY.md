# Phase 11 Plan 03: Production Hardening Fixes Summary

## One-liner
Memory dedup uses atomic onConflictDoUpdate, session API sanitizes errors in production, date filters support client timezone

## Objective
Fix production hardening issues: memory dedup race condition and session API information leakage

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Fix memory dedup race condition with onConflictDoUpdate | 421301b | src/lib/jarvis/memory/queries/memoryEntries.ts |
| 2 | Sanitize session API error responses in production | d4ad3db | src/app/api/jarvis/session/route.ts |
| 3 | Add X-Timezone header handling for date boundaries | 8603a13 | src/lib/jarvis/notion/schemas.ts |

## Key Changes

### Task 1: Memory Dedup Race Condition Fix
- Replaced check-then-write pattern with atomic upsert using `onConflictDoUpdate`
- When contentHash already exists, atomically updates lastAccessed instead of failing
- Prevents unique constraint errors under concurrent requests
- No behavior change from user perspective - just more robust

```typescript
// Before: Check-then-write (race condition)
const existing = await db.select()...where(eq(contentHash));
if (existing.length > 0) { await db.update()... }
else { await db.insert()... }

// After: Atomic upsert
await db.insert(memoryEntries)
  .values({ content, contentHash, category, source, lastAccessed: now })
  .onConflictDoUpdate({
    target: memoryEntries.contentHash,
    set: { lastAccessed: now },
  })
  .returning();
```

### Task 2: Session API Error Sanitization
- Removed env variable existence logging (`DATABASE_URL set: true`)
- In production: returns generic "Internal server error" message
- In development: returns full error message and stack trace for debugging
- Applied consistent error handling to GET, POST, and PATCH handlers
- Server-side logging still captures full details in production

```typescript
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
// Development: return detailed error
return NextResponse.json({
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined
}, { status: 500 });
```

### Task 3: Timezone Support for Date Filters
- Added `getTodayInTimezone(timezone?)` using `Intl.DateTimeFormat`
- Added `getDateInTimezone(daysOffset, timezone?)` for relative dates
- Updated `buildTaskFilter()` with optional timezone parameter
- Updated `buildBillFilter()` with optional timezone parameter
- Falls back to server time if timezone is invalid or not provided
- Enables accurate "today" and "tomorrow" queries regardless of user location

```typescript
export function getTodayInTimezone(timezone?: string): string {
  const now = new Date();
  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
      });
      return formatter.format(now);
    } catch {
      console.warn(`Invalid timezone: ${timezone}, using server time`);
    }
  }
  return now.toISOString().split('T')[0];
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed discover-notion-databases.ts MCP imports**
- **Found during:** Build verification
- **Issue:** Script still imported old MCP functions (ensureMCPRunning, callMCPTool, closeMCPClient) which no longer exist after 11-01 migration
- **Fix:** Rewrote script to use Direct Notion SDK (searchNotion, Client from @notionhq/client)
- **Files modified:** scripts/discover-notion-databases.ts
- **Commit:** Part of 204828c (consolidated by linter/hooks)

**2. [Rule 3 - Blocking] Fixed NotionClient type compatibility**
- **Found during:** Build verification
- **Issue:** SDK filter type was too strict for our NotionFilter interface
- **Fix:** Widened parameter type and cast internally to SDK type
- **Files modified:** src/lib/jarvis/notion/NotionClient.ts
- **Commit:** Part of 204828c (consolidated by linter/hooks)

## Verification

1. TypeScript type check passes: `npx tsc --noEmit` (no errors)
2. Memory dedup uses onConflictDoUpdate: confirmed via grep
3. No sensitive logging in production: no matches for `DATABASE_URL set|DATABASE_AUTH_TOKEN set|Full error`
4. NODE_ENV check present: 3 instances in session/route.ts (GET, POST, PATCH handlers)
5. Timezone functions exported: `getTodayInTimezone`, `getDateInTimezone`, filter options include `timezone`

## Success Criteria Met

- [x] storeMemoryEntry uses onConflictDoUpdate (grep confirms)
- [x] Session API errors return "Internal server error" in production
- [x] No env variable existence logging in production code
- [x] TypeScript type check passes
- [x] Timezone parameter added to date filter functions

## Duration

~14 minutes

## Next Steps

1. Phase 11-04: Final production deployment verification
2. Deploy to Vercel and verify all fixes work in production environment
