/**
 * Notion Sync Service - Bidirectional sync between local SQLite and Notion
 *
 * - Local → Notion: on local write, process pending sync_log entries (debounced)
 * - Notion → Local: poll every 15 min for direct Notion edits
 * - Conflict resolution: last-write-wins with conflict log
 * - Respects Notion 3 req/s rate limit
 *
 * Phase M4: Notion Sync Bridge
 */

import { eq, and, isNull } from 'drizzle-orm';
import { getDataDb } from '../db';
import { tasks, bills, projects, goals, habits, syncLog } from '../schema';
import type { SyncLogEntry } from '../schema';
import { queryDatabase, createPage, updatePage } from '../../notion/NotionClient';
import {
  LIFE_OS_DATABASES,
  LIFE_OS_DATABASE_IDS,
  TASK_PROPS,
  BILL_PROPS,
  buildTaskProperties,
  buildTaskStatusUpdate,
  buildBillProperties,
  buildBillPaidUpdate,
} from '../../notion/schemas';

const RATE_LIMIT_DELAY_MS = 350; // ~3 req/s
const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const BATCH_SIZE = 10;

let syncTimer: NodeJS.Timeout | null = null;
let pollTimer: NodeJS.Timeout | null = null;

/**
 * Process pending sync_log entries (local → Notion)
 */
export async function processPendingSyncs(): Promise<{ processed: number; errors: number }> {
  const db = getDataDb();
  let processed = 0;
  let errors = 0;

  const pending = await db
    .select()
    .from(syncLog)
    .where(
      and(
        eq(syncLog.status, 'pending'),
        eq(syncLog.direction, 'local_to_notion')
      )
    )
    .limit(BATCH_SIZE);

  for (const entry of pending) {
    try {
      await syncToNotion(entry);
      await db
        .update(syncLog)
        .set({ status: 'synced', syncedAt: new Date().toISOString() })
        .where(eq(syncLog.id, entry.id));
      processed++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NotionSync] Failed to sync entry ${entry.id}:`, errorMsg);
      await db
        .update(syncLog)
        .set({ status: 'failed', errorMessage: errorMsg })
        .where(eq(syncLog.id, entry.id));
      errors++;
    }

    // Rate limit
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  if (processed > 0 || errors > 0) {
    console.log(`[NotionSync] Processed ${processed} syncs, ${errors} errors`);
  }

  return { processed, errors };
}

/**
 * Sync a single entry to Notion based on domain and action
 */
async function syncToNotion(entry: SyncLogEntry): Promise<void> {
  const db = getDataDb();

  switch (entry.domain) {
    case 'tasks': {
      if (entry.action === 'create' && entry.localId) {
        const rows = await db.select().from(tasks).where(eq(tasks.id, entry.localId)).limit(1);
        const task = rows[0];
        if (!task) return;

        const databaseId = LIFE_OS_DATABASE_IDS.tasks;
        if (!databaseId) return;

        const properties = buildTaskProperties({
          title: task.title,
          due_date: task.dueDate || undefined,
          priority: task.priority || undefined,
        });

        const result = await createPage(databaseId, properties);
        const notionId = (result as { id?: string })?.id;
        if (notionId) {
          await db.update(tasks).set({ notionId, syncedAt: new Date().toISOString() }).where(eq(tasks.id, task.id));
        }
      } else if (entry.action === 'update' && entry.notionId) {
        const rows = await db.select().from(tasks).where(eq(tasks.notionId, entry.notionId)).limit(1);
        const task = rows[0];
        if (!task) return;

        const properties = buildTaskStatusUpdate(task.status);
        await updatePage(entry.notionId, properties);
        await db.update(tasks).set({ syncedAt: new Date().toISOString() }).where(eq(tasks.id, task.id));
      }
      break;
    }
    case 'bills': {
      if (entry.action === 'create' && entry.localId) {
        const rows = await db.select().from(bills).where(eq(bills.id, entry.localId)).limit(1);
        const bill = rows[0];
        if (!bill) return;

        const databaseId = LIFE_OS_DATABASE_IDS.subscriptions;
        if (!databaseId) return;

        const properties = buildBillProperties({
          title: bill.title,
          amount: bill.amount || undefined,
          due_date: bill.dueDate || undefined,
          category: bill.category || undefined,
        });

        const result = await createPage(databaseId, properties);
        const notionId = (result as { id?: string })?.id;
        if (notionId) {
          await db.update(bills).set({ notionId, syncedAt: new Date().toISOString() }).where(eq(bills.id, bill.id));
        }
      } else if (entry.action === 'update' && entry.notionId) {
        const rows = await db.select().from(bills).where(eq(bills.notionId, entry.notionId)).limit(1);
        const bill = rows[0];
        if (!bill) return;

        if (bill.paid) {
          const properties = buildBillPaidUpdate();
          await updatePage(entry.notionId, properties);
        }
        await db.update(bills).set({ syncedAt: new Date().toISOString() }).where(eq(bills.id, bill.id));
      }
      break;
    }
    // Projects, goals, habits — read-only from Notion for now
    // Write sync will be added when those Notion databases support creates
    default:
      console.log(`[NotionSync] Skipping ${entry.domain} sync (read-only domain)`);
  }
}

/**
 * Poll Notion for changes (Notion → Local)
 *
 * Checks each domain's last_edited_time against our syncedAt.
 * Uses last-write-wins conflict resolution.
 */
export async function pollNotionChanges(): Promise<{ updated: number }> {
  let updated = 0;

  try {
    updated += await pollTaskChanges();
    updated += await pollBillChanges();
  } catch (error) {
    console.error('[NotionSync] Poll failed:', error instanceof Error ? error.message : error);
  }

  if (updated > 0) {
    console.log(`[NotionSync] Pulled ${updated} changes from Notion`);
  }

  return { updated };
}

async function pollTaskChanges(): Promise<number> {
  const dataSourceId = LIFE_OS_DATABASES.tasks;
  if (!dataSourceId) return 0;

  const db = getDataDb();
  let updated = 0;

  try {
    const result = await queryDatabase(dataSourceId, {});
    const pages = ((result as { results?: unknown[] })?.results || []) as Array<{
      id: string;
      last_edited_time?: string;
      properties: Record<string, unknown>;
    }>;

    for (const page of pages) {
      const existing = await db.select().from(tasks).where(eq(tasks.notionId, page.id)).limit(1);
      if (existing.length === 0) continue; // Not tracked locally yet

      const local = existing[0];
      const notionEditTime = page.last_edited_time || '';

      // Last-write-wins: if Notion was edited after our last sync, pull changes
      if (local.syncedAt && notionEditTime > local.syncedAt) {
        const title = extractNotionTitle(page.properties, TASK_PROPS.title);
        const status = extractNotionSelect(page.properties, TASK_PROPS.status);

        await db.update(tasks).set({
          title: title || local.title,
          status: normalizeTaskStatus(status),
          syncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(tasks.id, local.id));

        // Log the sync
        await db.insert(syncLog).values({
          domain: 'tasks',
          direction: 'notion_to_local',
          localId: local.id,
          notionId: page.id,
          action: 'update',
          status: 'synced',
          syncedAt: new Date().toISOString(),
        });

        updated++;
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    }
  } catch (error) {
    console.error('[NotionSync] Task poll error:', error);
  }

  return updated;
}

async function pollBillChanges(): Promise<number> {
  const dataSourceId = LIFE_OS_DATABASES.subscriptions;
  if (!dataSourceId) return 0;

  const db = getDataDb();
  let updated = 0;

  try {
    const result = await queryDatabase(dataSourceId, {});
    const pages = ((result as { results?: unknown[] })?.results || []) as Array<{
      id: string;
      last_edited_time?: string;
      properties: Record<string, unknown>;
    }>;

    for (const page of pages) {
      const existing = await db.select().from(bills).where(eq(bills.notionId, page.id)).limit(1);
      if (existing.length === 0) continue;

      const local = existing[0];
      const notionEditTime = page.last_edited_time || '';

      if (local.syncedAt && notionEditTime > local.syncedAt) {
        const title = extractNotionTitle(page.properties, BILL_PROPS.title);
        const paid = extractNotionCheckbox(page.properties, BILL_PROPS.paid);

        await db.update(bills).set({
          title: title || local.title,
          paid: paid,
          syncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(bills.id, local.id));

        await db.insert(syncLog).values({
          domain: 'bills',
          direction: 'notion_to_local',
          localId: local.id,
          notionId: page.id,
          action: 'update',
          status: 'synced',
          syncedAt: new Date().toISOString(),
        });

        updated++;
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    }
  } catch (error) {
    console.error('[NotionSync] Bill poll error:', error);
  }

  return updated;
}

// Notion property extractors (simplified for sync)
function extractNotionTitle(props: Record<string, unknown>, name: string): string | null {
  const p = props[name] as { title?: Array<{ plain_text?: string }> } | undefined;
  return p?.title?.[0]?.plain_text || null;
}

function extractNotionSelect(props: Record<string, unknown>, name: string): string | null {
  const p = props[name] as { select?: { name?: string } } | undefined;
  return p?.select?.name || null;
}

function extractNotionCheckbox(props: Record<string, unknown>, name: string): boolean {
  const p = props[name] as { checkbox?: boolean } | undefined;
  return p?.checkbox ?? false;
}

function normalizeTaskStatus(status: string | null): string {
  if (!status) return 'not_started';
  const lower = status.toLowerCase();
  if (lower.includes('complete') || lower.includes('done')) return 'completed';
  if (lower.includes('progress') || lower.includes('doing')) return 'in_progress';
  return 'not_started';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start the sync service: processes pending syncs every 30s
 * and polls Notion every 15 min.
 */
export function startSyncService(): void {
  if (syncTimer) return; // Already running

  console.log('[NotionSync] Starting sync service');

  // Process pending local→Notion syncs every 30 seconds
  syncTimer = setInterval(async () => {
    try {
      await processPendingSyncs();
    } catch (error) {
      console.error('[NotionSync] Sync processing error:', error);
    }
  }, 30_000);

  // Poll Notion→Local every 15 minutes
  pollTimer = setInterval(async () => {
    try {
      await pollNotionChanges();
    } catch (error) {
      console.error('[NotionSync] Poll error:', error);
    }
  }, POLL_INTERVAL_MS);

  // Initial sync on start
  processPendingSyncs().catch(() => {});
}

/**
 * Stop the sync service
 */
export function stopSyncService(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log('[NotionSync] Sync service stopped');
}
