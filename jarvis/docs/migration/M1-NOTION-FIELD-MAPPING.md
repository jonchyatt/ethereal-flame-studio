# M1: Notion Field Mapping

## Tasks

| Notion Property | Notion Type | Local Column | Transform |
|-----------------|-------------|--------------|-----------|
| Name | title | title | direct |
| Status | select | status | normalize: "Not started"→not_started, "In progress"→in_progress, "Done"→completed |
| Do Dates | date | due_date | date.start → YYYY-MM-DD |
| Daily Priority | select | priority | normalize: case-insensitive match to low/medium/high |
| Frequency | select | frequency | normalize: "Daily"→daily, "Weekly"→weekly, "Monthly"→monthly, else→one_time |
| Project | relation | notion_project_id | relation[0].id (resolved to project_id post-import) |

## Bills (Subscriptions DB)

| Notion Property | Notion Type | Local Column | Transform |
|-----------------|-------------|--------------|-----------|
| Bill | title | title | direct |
| Amount | number | amount | direct |
| Due Date | date | due_date | date.start → YYYY-MM-DD |
| Paid | checkbox | paid | boolean |
| Category | select | category | direct (select name) |

## Projects

| Notion Property | Notion Type | Local Column | Transform |
|-----------------|-------------|--------------|-----------|
| Project | title | title | direct |
| Status | select | status | normalize: "Active"→active, "On Hold"→on_hold, "Completed"→completed |
| Priority | select | priority | normalize to low/medium/high |
| Timeline | date | timeline_start, timeline_end | date.start, date.end |
| Area | relation | area | relation title (single value) |

## Goals

| Notion Property | Notion Type | Local Column | Transform |
|-----------------|-------------|--------------|-----------|
| Goal | title | title | direct |
| Status | select | status | normalize: "Achieved"→achieved, "In Progress"→in_progress, else→not_started |
| Target Date | date | target_date | date.start → YYYY-MM-DD |
| Progress | number | progress | direct (0-100) |
| Area | relation | area | relation title |

## Habits

| Notion Property | Notion Type | Local Column | Transform |
|-----------------|-------------|--------------|-----------|
| Habit | title | title | direct |
| Frequency | select | frequency | normalize to daily/weekly/monthly |
| Streak | number | streak | direct (integer) |
| Last Completed | date | last_completed | date.start → YYYY-MM-DD |
| Area | relation | area | relation title |

## Unmapped Fields

These Notion properties are not imported (can be added later):
- Task: Tags, Notes (rich_text), Assignee
- Bill: Payment Method, Auto-pay
- Project: Tasks (reverse relation), Description
- Goal: Key Results, Milestones
- Habit: Time of Day, Notes
