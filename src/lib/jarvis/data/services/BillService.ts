/**
 * Bill Service - Local-first CRUD for bills/subscriptions
 *
 * Phase M1: Local Canonical Data Model
 */

import { eq, and, lte, gte } from 'drizzle-orm';
import { getDataDb } from '../db';
import { bills, syncLog, type Bill, type NewBill } from '../schema';

function now() {
  return new Date().toISOString();
}

export class BillService {
  private get db() {
    return getDataDb();
  }

  async getAll(filter?: {
    timeframe?: 'this_week' | 'this_month' | 'all';
    unpaidOnly?: boolean;
  }): Promise<Bill[]> {
    const conditions = [];

    if (filter?.unpaidOnly) {
      conditions.push(eq(bills.paid, false));
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (filter?.timeframe === 'this_week') {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      conditions.push(gte(bills.dueDate, todayStr));
      conditions.push(lte(bills.dueDate, weekEnd.toISOString().split('T')[0]));
    } else if (filter?.timeframe === 'this_month') {
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
      conditions.push(gte(bills.dueDate, todayStr));
      conditions.push(lte(bills.dueDate, monthEnd.toISOString().split('T')[0]));
    }

    if (conditions.length === 0) {
      return this.db.select().from(bills).all();
    }

    return this.db
      .select()
      .from(bills)
      .where(and(...conditions))
      .all();
  }

  async getById(id: number): Promise<Bill | undefined> {
    const results = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    return results[0];
  }

  async create(data: Omit<NewBill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bill> {
    const results = await this.db
      .insert(bills)
      .values({ ...data, updatedAt: now() })
      .returning();

    const bill = results[0];

    await this.db.insert(syncLog).values({
      domain: 'bills',
      direction: 'local_to_notion',
      localId: bill.id,
      notionId: bill.notionId,
      action: 'create',
    });

    return bill;
  }

  async markPaid(id: number): Promise<Bill | undefined> {
    const results = await this.db
      .update(bills)
      .set({ paid: true, updatedAt: now() })
      .where(eq(bills.id, id))
      .returning();

    const bill = results[0];
    if (!bill) return undefined;

    await this.db.insert(syncLog).values({
      domain: 'bills',
      direction: 'local_to_notion',
      localId: bill.id,
      notionId: bill.notionId,
      action: 'update',
    });

    return bill;
  }

  async getUpcomingTotal(days = 30): Promise<number> {
    const todayStr = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const endStr = endDate.toISOString().split('T')[0];

    const upcoming = await this.db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.paid, false),
          gte(bills.dueDate, todayStr),
          lte(bills.dueDate, endStr)
        )
      )
      .all();

    return upcoming.reduce((sum, b) => sum + (b.amount || 0), 0);
  }
}

export const billService = new BillService();
