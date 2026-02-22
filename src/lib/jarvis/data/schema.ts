/**
 * Jarvis Life OS - Local Canonical Data Model
 *
 * Drizzle ORM tables for 5 core domains + sync_log.
 * Extends the memory schema pattern from memory/schema.ts.
 *
 * Each table includes:
 * - notionId: Notion page UUID for sync mapping
 * - syncedAt: Last Notion sync timestamp
 * - createdAt/updatedAt: Local timestamps
 *
 * Phase M1: Local Canonical Data Model
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// =============================================================================
// Tasks
// =============================================================================

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notionId: text('notion_id').unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('not_started'), // not_started | in_progress | completed
  dueDate: text('due_date'), // ISO date string YYYY-MM-DD
  priority: text('priority'), // low | medium | high
  frequency: text('frequency'), // one_time | daily | weekly | monthly
  projectId: integer('project_id').references(() => projects.id),
  notionProjectId: text('notion_project_id'), // For import resolution
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  syncedAt: text('synced_at'),
});

// =============================================================================
// Bills (Subscriptions)
// =============================================================================

export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notionId: text('notion_id').unique(),
  title: text('title').notNull(),
  amount: real('amount'),
  dueDate: text('due_date'), // ISO date string
  paid: integer('paid', { mode: 'boolean' }).default(false),
  category: text('category'),
  frequency: text('frequency'), // monthly | yearly | one_time
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  syncedAt: text('synced_at'),
});

// =============================================================================
// Projects
// =============================================================================

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notionId: text('notion_id').unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('active'), // active | on_hold | completed
  area: text('area'),
  priority: text('priority'), // low | medium | high
  timelineStart: text('timeline_start'),
  timelineEnd: text('timeline_end'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  syncedAt: text('synced_at'),
});

// =============================================================================
// Goals
// =============================================================================

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notionId: text('notion_id').unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('not_started'), // not_started | in_progress | achieved
  targetDate: text('target_date'),
  progress: real('progress').default(0), // 0-100 percentage
  area: text('area'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  syncedAt: text('synced_at'),
});

// =============================================================================
// Habits
// =============================================================================

export const habits = sqliteTable('habits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notionId: text('notion_id').unique(),
  title: text('title').notNull(),
  frequency: text('frequency').notNull().default('daily'), // daily | weekly | monthly
  streak: integer('streak').default(0),
  lastCompleted: text('last_completed'),
  area: text('area'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  syncedAt: text('synced_at'),
});

// =============================================================================
// Sync Log
// =============================================================================

export const syncLog = sqliteTable('sync_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domain: text('domain').notNull(), // tasks | bills | projects | goals | habits
  direction: text('direction').notNull(), // local_to_notion | notion_to_local
  localId: integer('local_id'),
  notionId: text('notion_id'),
  action: text('action').notNull(), // create | update | delete
  status: text('status').notNull().default('pending'), // pending | synced | failed | conflict
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  syncedAt: text('synced_at'),
});

// =============================================================================
// Type Exports
// =============================================================================

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type SyncLogEntry = typeof syncLog.$inferSelect;
export type NewSyncLogEntry = typeof syncLog.$inferInsert;
