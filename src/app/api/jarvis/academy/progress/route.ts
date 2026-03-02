/**
 * Academy Progress API Route
 *
 * GET  — Returns all progress records
 * POST — Upserts progress for a project+topic pair
 */

import { getAllAcademyProgress, upsertAcademyProgress } from '@/lib/jarvis/academy/queries';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET(): Promise<Response> {
  try {
    const progress = await getAllAcademyProgress();
    return Response.json({ progress });
  } catch (error) {
    console.error('[Academy Progress] GET failed:', error);
    return Response.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const { projectId, topicId, status, teachingNotes, incrementInteraction } = body as {
      projectId?: string;
      topicId?: string;
      status?: 'explored' | 'completed';
      teachingNotes?: string;
      incrementInteraction?: boolean;
    };

    if (!projectId || !topicId) {
      return Response.json(
        { error: 'projectId and topicId are required' },
        { status: 400 }
      );
    }

    // Runtime validation — TypeScript types are erased, reject invalid status values
    if (status !== undefined && status !== 'explored' && status !== 'completed') {
      return Response.json(
        { error: 'status must be "explored" or "completed"' },
        { status: 400 }
      );
    }

    const progress = await upsertAcademyProgress(projectId, topicId, {
      status,
      teachingNotes,
      incrementInteraction,
    });

    return Response.json({ progress });
  } catch (error) {
    console.error('[Academy Progress] POST failed:', error);
    return Response.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
