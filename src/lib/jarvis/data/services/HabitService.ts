/**
 * Habit Service - Local-first CRUD for habits
 *
 * Phase M1: Local Canonical Data Model
 */

import { eq } from 'drizzle-orm';
import { getDataDb } from '../db';
import { habits, syncLog, type Habit, type NewHabit } from '../schema';

function now() {
  return new Date().toISOString();
}

export class HabitService {
  private get db() {
    return getDataDb();
  }

  async getAll(filter?: {
    frequency?: 'daily' | 'weekly' | 'monthly' | 'all';
  }): Promise<Habit[]> {
    if (filter?.frequency && filter.frequency !== 'all') {
      return this.db
        .select()
        .from(habits)
        .where(eq(habits.frequency, filter.frequency))
        .all();
    }
    return this.db.select().from(habits).all();
  }

  async getById(id: number): Promise<Habit | undefined> {
    const results = await this.db.select().from(habits).where(eq(habits.id, id)).limit(1);
    return results[0];
  }

  async create(data: Omit<NewHabit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> {
    const results = await this.db
      .insert(habits)
      .values({ ...data, updatedAt: now() })
      .returning();

    const habit = results[0];

    await this.db.insert(syncLog).values({
      domain: 'habits',
      direction: 'local_to_notion',
      localId: habit.id,
      notionId: habit.notionId,
      action: 'create',
    });

    return habit;
  }

  async logCompletion(id: number): Promise<Habit | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    const todayStr = new Date().toISOString().split('T')[0];
    const newStreak = existing.lastCompleted === todayStr
      ? existing.streak ?? 0 // Already completed today
      : (existing.streak ?? 0) + 1;

    const results = await this.db
      .update(habits)
      .set({
        streak: newStreak,
        lastCompleted: todayStr,
        updatedAt: now(),
      })
      .where(eq(habits.id, id))
      .returning();

    const habit = results[0];
    if (!habit) return undefined;

    await this.db.insert(syncLog).values({
      domain: 'habits',
      direction: 'local_to_notion',
      localId: habit.id,
      notionId: habit.notionId,
      action: 'update',
    });

    return habit;
  }
}

export const habitService = new HabitService();
