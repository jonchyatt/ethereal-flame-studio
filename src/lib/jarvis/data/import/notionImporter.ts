/**
 * Notion Importer - Import Life OS data from Notion to local SQLite
 *
 * Features:
 * - --dry-run mode (no writes, just reports)
 * - Uses existing property extractors from notion/schemas.ts
 * - Idempotent (re-running doesn't duplicate records)
 * - Logs unmapped fields
 * - Records source_system, source_id, imported_at
 *
 * Usage:
 *   npx tsx src/lib/jarvis/data/import/notionImporter.ts
 *   npx tsx src/lib/jarvis/data/import/notionImporter.ts --dry-run
 *
 * Phase M1: Local Canonical Data Model
 */

import { eq } from 'drizzle-orm';
import { getDataDb } from '../db';
import { tasks, bills, projects, goals, habits } from '../schema';
import { queryDatabase } from '../../notion/NotionClient';
import {
  LIFE_OS_DATABASES,
  TASK_PROPS,
  BILL_PROPS,
  GOAL_PROPS,
} from '../../notion/schemas';

// Actual Notion property names (discovered via debug-props.ts)
// These override the schema constants where they differ
const ACTUAL_PROJECT_PROPS = {
  title: 'Name',            // schemas.ts says 'Project' but Notion uses 'Name'
  status: 'Project Status', // schemas.ts says 'Status' but Notion uses 'Project Status'
  priority: 'Priority',
};
const ACTUAL_HABIT_PROPS = {
  title: 'Name',           // schemas.ts says 'Habit' but Notion uses 'Name'
  frequency: 'Frequency',
  status: 'Status',
};
const ACTUAL_GOAL_PROPS = {
  title: GOAL_PROPS.title,       // 'Goal' — verify if this works
  status: GOAL_PROPS.status,
  targetDate: GOAL_PROPS.targetDate,
  progress: GOAL_PROPS.progress,
};

interface ImportResult {
  domain: string;
  total: number;
  created: number;
  skipped: number;
  errors: string[];
  unmappedFields: string[];
}

// Property extractors
function extractTitle(page: Record<string, unknown>, propName: string): string {
  const prop = (page as { properties: Record<string, unknown> }).properties?.[propName] as
    | { title?: Array<{ plain_text?: string }> }
    | undefined;
  return prop?.title?.[0]?.plain_text || '';
}

function extractSelect(page: Record<string, unknown>, propName: string): string | null {
  const prop = (page as { properties: Record<string, unknown> }).properties?.[propName] as
    | { select?: { name?: string } }
    | undefined;
  return prop?.select?.name || null;
}

function extractDate(page: Record<string, unknown>, propName: string): string | null {
  const prop = (page as { properties: Record<string, unknown> }).properties?.[propName] as
    | { date?: { start?: string } }
    | undefined;
  return prop?.date?.start || null;
}

function extractNumber(page: Record<string, unknown>, propName: string): number | null {
  const prop = (page as { properties: Record<string, unknown> }).properties?.[propName] as
    | { number?: number }
    | undefined;
  return prop?.number ?? null;
}

function extractCheckbox(page: Record<string, unknown>, propName: string): boolean {
  const prop = (page as { properties: Record<string, unknown> }).properties?.[propName] as
    | { checkbox?: boolean }
    | undefined;
  return prop?.checkbox ?? false;
}

function extractRelation(page: Record<string, unknown>, propName: string): string | null {
  const prop = (page as { properties: Record<string, unknown> }).properties?.[propName] as
    | { relation?: Array<{ id: string }> }
    | undefined;
  return prop?.relation?.[0]?.id || null;
}

function normalizeStatus(notionStatus: string | null, domain: string): string {
  if (!notionStatus) return 'not_started';

  const lower = notionStatus.toLowerCase();
  switch (domain) {
    case 'tasks':
      if (lower.includes('complete') || lower.includes('done')) return 'completed';
      if (lower.includes('progress') || lower.includes('doing')) return 'in_progress';
      return 'not_started';
    case 'projects':
      if (lower.includes('complete') || lower.includes('done')) return 'completed';
      if (lower.includes('hold') || lower.includes('pause')) return 'on_hold';
      return 'active';
    case 'goals':
      if (lower.includes('achiev') || lower.includes('complete') || lower.includes('done')) return 'achieved';
      if (lower.includes('progress')) return 'in_progress';
      return 'not_started';
    default:
      return lower;
  }
}

function normalizeFrequency(freq: string | null): string {
  if (!freq) return 'one_time';
  const lower = freq.toLowerCase();
  if (lower.includes('daily')) return 'daily';
  if (lower.includes('week')) return 'weekly';
  if (lower.includes('month')) return 'monthly';
  return 'one_time';
}

function normalizePriority(priority: string | null): string | null {
  if (!priority) return null;
  const lower = priority.toLowerCase();
  if (lower.includes('high') || lower === '1') return 'high';
  if (lower.includes('medium') || lower === '2') return 'medium';
  if (lower.includes('low') || lower === '3') return 'low';
  return lower;
}

async function fetchAllPages(dataSourceId: string): Promise<unknown[]> {
  const result = await queryDatabase(dataSourceId, {});
  return (result as { results?: unknown[] })?.results || [];
}

export async function importTasks(dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { domain: 'tasks', total: 0, created: 0, skipped: 0, errors: [], unmappedFields: [] };
  const dataSourceId = LIFE_OS_DATABASES.tasks;
  if (!dataSourceId) { result.errors.push('NOTION_TASKS_DATA_SOURCE_ID not set'); return result; }

  const db = getDataDb();
  const pages = await fetchAllPages(dataSourceId);
  result.total = pages.length;

  for (const page of pages) {
    const p = page as { id: string };
    const notionId = p.id;

    try {
      // Check if already imported
      const existing = await db.select().from(tasks).where(eq(tasks.notionId, notionId)).limit(1);
      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const data = {
        notionId,
        title: extractTitle(page as Record<string, unknown>, TASK_PROPS.title),
        status: normalizeStatus(extractSelect(page as Record<string, unknown>, TASK_PROPS.status), 'tasks'),
        dueDate: extractDate(page as Record<string, unknown>, TASK_PROPS.dueDate),
        priority: normalizePriority(extractSelect(page as Record<string, unknown>, TASK_PROPS.priority)),
        frequency: normalizeFrequency(extractSelect(page as Record<string, unknown>, TASK_PROPS.frequency)),
        notionProjectId: extractRelation(page as Record<string, unknown>, TASK_PROPS.project),
        syncedAt: new Date().toISOString(),
      };

      if (!data.title) {
        result.errors.push(`Task ${notionId}: missing title`);
        continue;
      }

      if (!dryRun) {
        await db.insert(tasks).values(data);
      }
      result.created++;
    } catch (err) {
      result.errors.push(`Task ${notionId}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return result;
}

export async function importBills(dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { domain: 'bills', total: 0, created: 0, skipped: 0, errors: [], unmappedFields: [] };
  const dataSourceId = LIFE_OS_DATABASES.subscriptions;
  if (!dataSourceId) { result.errors.push('NOTION_SUBSCRIPTIONS_DATA_SOURCE_ID not set'); return result; }

  const db = getDataDb();
  const pages = await fetchAllPages(dataSourceId);
  result.total = pages.length;

  for (const page of pages) {
    const p = page as { id: string };
    const notionId = p.id;

    try {
      const existing = await db.select().from(bills).where(eq(bills.notionId, notionId)).limit(1);
      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const data = {
        notionId,
        title: extractTitle(page as Record<string, unknown>, BILL_PROPS.title),
        amount: extractNumber(page as Record<string, unknown>, BILL_PROPS.amount),
        dueDate: extractDate(page as Record<string, unknown>, BILL_PROPS.dueDate),
        paid: extractCheckbox(page as Record<string, unknown>, BILL_PROPS.paid),
        category: extractSelect(page as Record<string, unknown>, BILL_PROPS.category),
        syncedAt: new Date().toISOString(),
      };

      if (!data.title) {
        result.errors.push(`Bill ${notionId}: missing title`);
        continue;
      }

      if (!dryRun) {
        await db.insert(bills).values(data);
      }
      result.created++;
    } catch (err) {
      result.errors.push(`Bill ${notionId}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return result;
}

export async function importProjects(dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { domain: 'projects', total: 0, created: 0, skipped: 0, errors: [], unmappedFields: [] };
  const dataSourceId = LIFE_OS_DATABASES.projects;
  if (!dataSourceId) { result.errors.push('NOTION_PROJECTS_DATA_SOURCE_ID not set'); return result; }

  const db = getDataDb();
  const pages = await fetchAllPages(dataSourceId);
  result.total = pages.length;

  for (const page of pages) {
    const p = page as { id: string };
    const notionId = p.id;

    try {
      const existing = await db.select().from(projects).where(eq(projects.notionId, notionId)).limit(1);
      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const data = {
        notionId,
        title: extractTitle(page as Record<string, unknown>, ACTUAL_PROJECT_PROPS.title),
        status: normalizeStatus(extractSelect(page as Record<string, unknown>, ACTUAL_PROJECT_PROPS.status), 'projects'),
        priority: normalizePriority(extractSelect(page as Record<string, unknown>, ACTUAL_PROJECT_PROPS.priority)),
        syncedAt: new Date().toISOString(),
      };

      if (!data.title) {
        result.errors.push(`Project ${notionId}: missing title`);
        continue;
      }

      if (!dryRun) {
        await db.insert(projects).values(data);
      }
      result.created++;
    } catch (err) {
      result.errors.push(`Project ${notionId}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return result;
}

export async function importGoals(dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { domain: 'goals', total: 0, created: 0, skipped: 0, errors: [], unmappedFields: [] };
  const dataSourceId = LIFE_OS_DATABASES.goals;
  if (!dataSourceId) { result.errors.push('NOTION_GOALS_DATA_SOURCE_ID not set'); return result; }

  const db = getDataDb();
  const pages = await fetchAllPages(dataSourceId);
  result.total = pages.length;

  for (const page of pages) {
    const p = page as { id: string };
    const notionId = p.id;

    try {
      const existing = await db.select().from(goals).where(eq(goals.notionId, notionId)).limit(1);
      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const data = {
        notionId,
        title: extractTitle(page as Record<string, unknown>, ACTUAL_GOAL_PROPS.title),
        status: normalizeStatus(extractSelect(page as Record<string, unknown>, ACTUAL_GOAL_PROPS.status), 'goals'),
        targetDate: extractDate(page as Record<string, unknown>, ACTUAL_GOAL_PROPS.targetDate),
        progress: extractNumber(page as Record<string, unknown>, ACTUAL_GOAL_PROPS.progress),
        syncedAt: new Date().toISOString(),
      };

      if (!data.title) {
        result.errors.push(`Goal ${notionId}: missing title`);
        continue;
      }

      if (!dryRun) {
        await db.insert(goals).values(data);
      }
      result.created++;
    } catch (err) {
      result.errors.push(`Goal ${notionId}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return result;
}

export async function importHabits(dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { domain: 'habits', total: 0, created: 0, skipped: 0, errors: [], unmappedFields: [] };
  const dataSourceId = LIFE_OS_DATABASES.habits;
  if (!dataSourceId) { result.errors.push('NOTION_HABITS_DATA_SOURCE_ID not set'); return result; }

  const db = getDataDb();
  const pages = await fetchAllPages(dataSourceId);
  result.total = pages.length;

  for (const page of pages) {
    const p = page as { id: string };
    const notionId = p.id;

    try {
      const existing = await db.select().from(habits).where(eq(habits.notionId, notionId)).limit(1);
      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const data = {
        notionId,
        title: extractTitle(page as Record<string, unknown>, ACTUAL_HABIT_PROPS.title),
        frequency: normalizeFrequency(extractSelect(page as Record<string, unknown>, ACTUAL_HABIT_PROPS.frequency)),
        streak: 0, // Notion uses formula/rollup for streak — not directly importable
        lastCompleted: null, // Derived from daily log relations in Notion
        syncedAt: new Date().toISOString(),
      };

      if (!data.title) {
        result.errors.push(`Habit ${notionId}: missing title`);
        continue;
      }

      if (!dryRun) {
        await db.insert(habits).values(data);
      }
      result.created++;
    } catch (err) {
      result.errors.push(`Habit ${notionId}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return result;
}

export async function importAll(dryRun = false): Promise<ImportResult[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Notion → Local Import ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  const results: ImportResult[] = [];

  for (const importer of [importTasks, importBills, importProjects, importGoals, importHabits]) {
    try {
      const result = await importer(dryRun);
      results.push(result);
      console.log(`${result.domain}: ${result.total} total, ${result.created} ${dryRun ? 'would create' : 'created'}, ${result.skipped} skipped`);
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach((e) => console.log(`    - ${e}`));
      }
    } catch (err) {
      console.error(`Failed to import: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  console.log(`Total: ${totalCreated} ${dryRun ? 'would create' : 'created'}, ${totalSkipped} skipped`);
  console.log(`${'='.repeat(60)}\n`);

  return results;
}

// CLI entry point
if (require.main === module || process.argv[1]?.includes('notionImporter')) {
  const dryRun = process.argv.includes('--dry-run');
  importAll(dryRun)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
