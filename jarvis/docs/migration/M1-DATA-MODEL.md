# M1: Data Model

## Schema: `src/lib/jarvis/data/schema.ts`

### tasks
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| notion_id | TEXT UNIQUE | Notion page UUID |
| title | TEXT NOT NULL | Task name |
| status | TEXT | not_started, in_progress, completed |
| due_date | TEXT | YYYY-MM-DD |
| priority | TEXT | low, medium, high |
| frequency | TEXT | one_time, daily, weekly, monthly |
| project_id | INTEGER FK→projects | Local relation |
| notion_project_id | TEXT | For import resolution |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |
| synced_at | TEXT | Last Notion sync |

### bills
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| notion_id | TEXT UNIQUE | Notion page UUID |
| title | TEXT NOT NULL | Bill name |
| amount | REAL | Dollar amount |
| due_date | TEXT | YYYY-MM-DD |
| paid | INTEGER(boolean) | 0/1 |
| category | TEXT | Category select |
| frequency | TEXT | monthly, yearly, one_time |

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| notion_id | TEXT UNIQUE | Notion page UUID |
| title | TEXT NOT NULL | Project name |
| status | TEXT | active, on_hold, completed |
| area | TEXT | Life area |
| priority | TEXT | low, medium, high |
| timeline_start | TEXT | YYYY-MM-DD |
| timeline_end | TEXT | YYYY-MM-DD |

### goals
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| notion_id | TEXT UNIQUE | Notion page UUID |
| title | TEXT NOT NULL | Goal name |
| status | TEXT | not_started, in_progress, achieved |
| target_date | TEXT | YYYY-MM-DD |
| progress | REAL | 0-100 percentage |
| area | TEXT | Life area |

### habits
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| notion_id | TEXT UNIQUE | Notion page UUID |
| title | TEXT NOT NULL | Habit name |
| frequency | TEXT | daily, weekly, monthly |
| streak | INTEGER | Current streak count |
| last_completed | TEXT | YYYY-MM-DD |
| area | TEXT | Life area |

### sync_log
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| domain | TEXT | tasks, bills, projects, goals, habits |
| direction | TEXT | local_to_notion, notion_to_local |
| local_id | INTEGER | Local record ID |
| notion_id | TEXT | Notion page UUID |
| action | TEXT | create, update, delete |
| status | TEXT | pending, synced, failed, conflict |
| error_message | TEXT | Error details if failed |

## Service Layer: `src/lib/jarvis/data/services/`

Each service follows the pattern:
- Local writes first (SQLite)
- Queues sync log entry for async Notion sync
- Domain-specific query methods

| Service | Methods |
|---------|---------|
| TaskService | getAll, getById, create, update, complete, getTodayAndOverdue |
| BillService | getAll, getById, create, markPaid, getUpcomingTotal |
| ProjectService | getAll, getById, create, updateStatus |
| GoalService | getAll, getById, create, updateProgress |
| HabitService | getAll, getById, create, logCompletion |
