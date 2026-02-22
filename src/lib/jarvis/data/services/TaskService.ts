/**
 * Task Service - Local-first CRUD for tasks
 *
 * Writes to local SQLite first, queues Notion sync async.
 * Phase M1: Local Canonical Data Model
 */

import { eq, and, lte, gte, isNotNull, or } from 'drizzle-orm';
import { getDataDb } from '../db';
import { tasks, syncLog, type Task, type NewTask } from '../schema';

function now() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export class TaskService {
  private get db() {
    return getDataDb();
  }

  async getAll(filter?: {
    status?: 'not_started' | 'in_progress' | 'completed' | 'all';
    dueFilter?: 'today' | 'this_week' | 'overdue' | 'all';
  }): Promise<Task[]> {
    const conditions = [];

    if (filter?.status && filter.status !== 'all') {
      conditions.push(eq(tasks.status, filter.status));
    }

    const todayStr = today();
    if (filter?.dueFilter === 'today') {
      conditions.push(eq(tasks.dueDate, todayStr));
    } else if (filter?.dueFilter === 'overdue') {
      conditions.push(lte(tasks.dueDate, todayStr));
      conditions.push(or(eq(tasks.status, 'not_started'), eq(tasks.status, 'in_progress'))!);
    } else if (filter?.dueFilter === 'this_week') {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      conditions.push(lte(tasks.dueDate, weekEnd.toISOString().split('T')[0]));
    }

    if (conditions.length === 0) {
      return this.db.select().from(tasks).all();
    }

    return this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .all();
  }

  async getById(id: number): Promise<Task | undefined> {
    const results = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return results[0];
  }

  async getByNotionId(notionId: string): Promise<Task | undefined> {
    const results = await this.db.select().from(tasks).where(eq(tasks.notionId, notionId)).limit(1);
    return results[0];
  }

  async create(data: Omit<NewTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const results = await this.db
      .insert(tasks)
      .values({ ...data, updatedAt: now() })
      .returning();

    const task = results[0];

    // Queue Notion sync
    await this.db.insert(syncLog).values({
      domain: 'tasks',
      direction: 'local_to_notion',
      localId: task.id,
      notionId: task.notionId,
      action: 'create',
    });

    return task;
  }

  async update(id: number, data: Partial<Pick<Task, 'title' | 'status' | 'dueDate' | 'priority' | 'frequency'>>): Promise<Task | undefined> {
    const results = await this.db
      .update(tasks)
      .set({ ...data, updatedAt: now() })
      .where(eq(tasks.id, id))
      .returning();

    const task = results[0];
    if (!task) return undefined;

    // Queue Notion sync
    await this.db.insert(syncLog).values({
      domain: 'tasks',
      direction: 'local_to_notion',
      localId: task.id,
      notionId: task.notionId,
      action: 'update',
    });

    return task;
  }

  async complete(id: number): Promise<Task | undefined> {
    return this.update(id, { status: 'completed' });
  }

  async getTodayAndOverdue(): Promise<{ today: Task[]; overdue: Task[] }> {
    const todayStr = today();
    const allPending = await this.db
      .select()
      .from(tasks)
      .where(
        and(
          or(eq(tasks.status, 'not_started'), eq(tasks.status, 'in_progress')),
          isNotNull(tasks.dueDate)
        )
      )
      .all();

    const todayTasks = allPending.filter((t) => t.dueDate === todayStr);
    const overdue = allPending.filter((t) => t.dueDate! < todayStr);

    return { today: todayTasks, overdue };
  }
}

export const taskService = new TaskService();
