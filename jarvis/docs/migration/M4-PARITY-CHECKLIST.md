# M4: Notion Sync Parity Checklist

## Domain Sync Status

| Domain | Local→Notion | Notion→Local | Create | Update | Delete | Status |
|--------|:---:|:---:|:---:|:---:|:---:|--------|
| Tasks | Yes | Yes | Yes | Yes | No | Active |
| Bills | Yes | Yes | Yes | Yes (paid) | No | Active |
| Projects | No | No | No | No | No | Read-only |
| Goals | No | No | No | No | No | Read-only |
| Habits | No | No | No | No | No | Read-only |
| Recipes | - | - | - | - | - | Phase M4 extension |
| Meal Plan | - | - | - | - | - | Phase M4 extension |
| Subscriptions | - | - | - | - | - | Aliased to Bills |
| Ingredients | - | - | - | - | - | Phase M4 extension |

## Sync Behavior

### Local → Notion (on write)
- Triggered by service layer operations
- Queued in `sync_log` table with status `pending`
- Processed every 30 seconds in batches of 10
- Rate limited to ~3 req/s (350ms between calls)
- Failed syncs logged with error message, can be retried

### Notion → Local (polling)
- Polls every 15 minutes
- Checks `last_edited_time` against local `synced_at`
- Last-write-wins conflict resolution
- Conflicts logged in `sync_log` for audit

## Conflict Resolution

**Strategy: Last-write-wins**
- If Notion was edited after our last sync → Notion data wins
- If local was edited after last sync → local data wins (queued for Notion push)
- No merge — entire record is overwritten by winner
- All conflicts are logged in `sync_log` for manual review

## Offline Behavior
- All operations work against local SQLite when Notion is down
- Pending syncs accumulate in `sync_log`
- On reconnection, pending syncs are processed in order
- No data loss — local is always the canonical source

## Next Steps (Phase M4 extensions)
- [ ] Enable write sync for Projects (needs NOTION_PROJECTS_DATABASE_ID)
- [ ] Enable write sync for Goals
- [ ] Enable write sync for Habits
- [ ] Add databases 6-9 (Recipes, Meal Plan, Subscriptions, Ingredients)
- [ ] Add sync conflict notification to Telegram
- [ ] Add manual sync trigger via CLI/Telegram command
