/**
 * Academy Progress Queries
 *
 * CRUD operations for academy_progress table.
 * Uses the same Turso DB instance as the memory system.
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '../memory/db';
import { academyProgress } from '../memory/schema';
import type { AcademyProgressRow, NewAcademyProgressRow } from '../memory/schema';

/** Max teaching notes length — prevents unbounded system prompt growth */
const MAX_TEACHING_NOTES_LENGTH = 2000;

/** All progress records — for populating the store */
export async function getAllAcademyProgress(): Promise<AcademyProgressRow[]> {
  const db = getDb();
  return db.select().from(academyProgress);
}

/** Progress filtered by project — for system prompt injection */
export async function getProgressByProject(projectId: string): Promise<AcademyProgressRow[]> {
  const db = getDb();
  return db.select().from(academyProgress).where(eq(academyProgress.projectId, projectId));
}

/** Insert or update progress for a project+topic pair */
export async function upsertAcademyProgress(
  projectId: string,
  topicId: string,
  data: {
    status?: 'explored' | 'completed';
    teachingNotes?: string;
    incrementInteraction?: boolean;
  }
): Promise<AcademyProgressRow> {
  const db = getDb();
  const now = new Date().toISOString();

  // Check for existing row
  const existing = await db
    .select()
    .from(academyProgress)
    .where(and(eq(academyProgress.projectId, projectId), eq(academyProgress.topicId, topicId)))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    const updates: Partial<NewAcademyProgressRow> = { updatedAt: now };

    if (data.status) {
      // Never demote: completed is a terminal state
      const isDowngrade = row.status === 'completed' && data.status === 'explored';
      const isRecompletion = row.status === 'completed' && data.status === 'completed';
      if (!isDowngrade && !isRecompletion) {
        updates.status = data.status;
        // Set startedAt on first progression (explored OR completed)
        if ((data.status === 'explored' || data.status === 'completed') && !row.startedAt) {
          updates.startedAt = now;
        }
        if (data.status === 'completed') {
          updates.completedAt = now;
        }
      }
    }

    if (data.incrementInteraction) {
      updates.interactionCount = row.interactionCount + 1;
    }

    if (data.teachingNotes) {
      const merged = row.teachingNotes
        ? `${row.teachingNotes} | ${data.teachingNotes}`
        : data.teachingNotes;
      // Cap length: keep oldest notes (foundational context) + latest session
      if (merged.length > MAX_TEACHING_NOTES_LENGTH) {
        const separator = ' [...] ';
        const half = Math.floor((MAX_TEACHING_NOTES_LENGTH - separator.length) / 2);
        const oldest = merged.slice(0, half);
        const newest = merged.slice(-half);
        updates.teachingNotes = `${oldest}${separator}${newest}`;
      } else {
        updates.teachingNotes = merged;
      }
    }

    await db
      .update(academyProgress)
      .set(updates)
      .where(eq(academyProgress.id, row.id));

    // Return updated row
    const updated = await db
      .select()
      .from(academyProgress)
      .where(eq(academyProgress.id, row.id))
      .limit(1);
    return updated[0];
  }

  // Insert new row
  const insertData: NewAcademyProgressRow = {
    projectId,
    topicId,
    status: data.status || 'not_started',
    startedAt: data.status === 'explored' || data.status === 'completed' ? now : null,
    completedAt: data.status === 'completed' ? now : null,
    interactionCount: data.incrementInteraction ? 1 : 0,
    teachingNotes: data.teachingNotes || null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.insert(academyProgress).values(insertData).returning();
  return result[0];
}
