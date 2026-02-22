/**
 * Goal Service - Local-first CRUD for goals
 *
 * Phase M1: Local Canonical Data Model
 */

import { eq } from 'drizzle-orm';
import { getDataDb } from '../db';
import { goals, syncLog, type Goal, type NewGoal } from '../schema';

function now() {
  return new Date().toISOString();
}

export class GoalService {
  private get db() {
    return getDataDb();
  }

  async getAll(filter?: {
    status?: 'not_started' | 'in_progress' | 'achieved' | 'all';
  }): Promise<Goal[]> {
    if (filter?.status && filter.status !== 'all') {
      return this.db
        .select()
        .from(goals)
        .where(eq(goals.status, filter.status))
        .all();
    }
    return this.db.select().from(goals).all();
  }

  async getById(id: number): Promise<Goal | undefined> {
    const results = await this.db.select().from(goals).where(eq(goals.id, id)).limit(1);
    return results[0];
  }

  async create(data: Omit<NewGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const results = await this.db
      .insert(goals)
      .values({ ...data, updatedAt: now() })
      .returning();

    const goal = results[0];

    await this.db.insert(syncLog).values({
      domain: 'goals',
      direction: 'local_to_notion',
      localId: goal.id,
      notionId: goal.notionId,
      action: 'create',
    });

    return goal;
  }

  async updateProgress(id: number, progress: number): Promise<Goal | undefined> {
    const updates: Partial<Goal> = { progress, updatedAt: now() };
    if (progress >= 100) {
      updates.status = 'achieved';
    }

    const results = await this.db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, id))
      .returning();

    const goal = results[0];
    if (!goal) return undefined;

    await this.db.insert(syncLog).values({
      domain: 'goals',
      direction: 'local_to_notion',
      localId: goal.id,
      notionId: goal.notionId,
      action: 'update',
    });

    return goal;
  }
}

export const goalService = new GoalService();
