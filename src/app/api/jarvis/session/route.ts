/**
 * Session Management API Route
 *
 * Endpoints:
 * - GET: Get or create active session
 * - POST: Force start new session
 * - PATCH: End current session
 *
 * Used by client to manage session lifecycle.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  MemoryService,
  getActiveSession,
  startSession,
  endSession,
  getSessionById,
  type EndTrigger,
} from '@/lib/jarvis/memory';

/**
 * GET /api/jarvis/session
 *
 * Get current active session or create one if none exists.
 * Returns session ID and start time.
 */
export async function GET() {
  try {
    const sessionId = await MemoryService.initSession('user_initiated');
    const session = await getSessionById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to get session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: session.id,
      startedAt: session.startedAt,
      active: true,
    });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jarvis/session
 *
 * Force start a new session (even if one is active).
 * Closes any existing active session first.
 *
 * Body: { source?: 'morning_briefing' | 'user_initiated' | 'return_after_gap' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = body.source || 'user_initiated';

    // Close any existing active session
    const existingSession = await getActiveSession();
    if (existingSession) {
      await MemoryService.closeSession(existingSession.id, 'explicit');
    }

    // Start new session
    const newSession = await startSession();

    // Log session start event
    await MemoryService.logSessionEvent(newSession.id, 'session_start', {
      source,
    });

    return NextResponse.json({
      id: newSession.id,
      startedAt: newSession.startedAt,
      active: true,
      previousSessionClosed: existingSession?.id ?? null,
    });
  } catch (error) {
    console.error('Session POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jarvis/session
 *
 * End the current session.
 *
 * Body: {
 *   trigger: 'timeout' | 'explicit' | 'browser_close',
 *   summary?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const trigger: EndTrigger = body.trigger || 'explicit';
    const summary = body.summary;

    const activeSession = await getActiveSession();
    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active session to end' },
        { status: 404 }
      );
    }

    await MemoryService.closeSession(activeSession.id, trigger, summary);

    return NextResponse.json({
      id: activeSession.id,
      endedAt: new Date().toISOString(),
      trigger,
      active: false,
    });
  } catch (error) {
    console.error('Session PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
