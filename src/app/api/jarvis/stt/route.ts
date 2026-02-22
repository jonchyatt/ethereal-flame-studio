/**
 * Deepgram STT Proxy API Route
 *
 * Architecture: SSE + POST pattern
 * - GET: Opens SSE connection for receiving transcripts
 * - POST: Receives audio chunks and sends to Deepgram
 *
 * Why this pattern:
 * - Next.js App Router doesn't support WebSocket upgrades in route handlers
 * - SSE allows server to push transcript events to browser
 * - POST allows browser to send audio chunks to server
 * - Server maintains Deepgram WebSocket connection per session
 *
 * Session management:
 * - In-memory Map stores Deepgram connections per sessionId
 * - Works for local dev and single-instance deployment
 * - For horizontal scaling, would need Redis or similar
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import type { LiveClient } from '@deepgram/sdk';

// Session storage for Deepgram connections
interface DeepgramSession {
  deepgram: LiveClient;
  sseController: ReadableStreamDefaultController | null;
  lastActivity: number;
  isConnected: boolean;
}

const sessions = new Map<string, DeepgramSession>();

// Cleanup stale sessions after 5 minutes of inactivity
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

function cleanupStaleSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      console.log(`[STT] Cleaning up stale session: ${sessionId}`);
      try {
        session.deepgram.requestClose();
      } catch {
        // Ignore errors during cleanup
      }
      sessions.delete(sessionId);
    }
  }
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupStaleSessions, 60 * 1000);
}

/**
 * GET: Open SSE connection for receiving transcripts
 *
 * Query params:
 * - sessionId: Unique session identifier (required)
 * - model: Deepgram model (optional, default: nova-3)
 * - language: Language code (optional, default: en-US)
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const model = url.searchParams.get('model') || 'nova-3';
  const language = url.searchParams.get('language') || 'en-US';

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.error('[STT] DEEPGRAM_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'STT service not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Register pending session BEFORE creating stream to prevent POST 404 race condition.
  // The POST handler may arrive before ReadableStream.start() executes on Vercel.
  const pendingSession: DeepgramSession = {
    deepgram: null as unknown as LiveClient, // Populated inside start()
    sseController: null,
    lastActivity: Date.now(),
    isConnected: false,
  };
  sessions.set(sessionId, pendingSession);

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Wire up the SSE controller
      pendingSession.sseController = controller;

      // Send initial connection event
      const initEvent = `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initEvent));

      // Initialize Deepgram client
      const deepgram = createClient(apiKey);

      const connection = deepgram.listen.live({
        model,
        language,
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        // Raw PCM audio from browser Web Audio API
        encoding: 'linear16',
        sample_rate: 16000,
      });

      // Update pending session with real Deepgram connection
      pendingSession.deepgram = connection;
      const session = pendingSession;

      // Handle Deepgram events
      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log(`[STT] Deepgram connection opened for session: ${sessionId}`);
        session.isConnected = true;
        const openEvent = `data: ${JSON.stringify({ type: 'open' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(openEvent));
      });

      connection.on(LiveTranscriptionEvents.Metadata, (metadata) => {
        console.log(`[STT] Deepgram metadata for session ${sessionId}:`, metadata);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        session.lastActivity = Date.now();

        const alternative = data.channel?.alternatives?.[0];
        if (!alternative) return;

        const transcript = alternative.transcript;
        if (!transcript) return;

        const result = {
          type: 'transcript',
          transcript,
          isFinal: data.is_final || false,
          speechFinal: data.speech_final || false,
          confidence: alternative.confidence || 0,
          words: alternative.words?.map((w: { word: string; start: number; end: number; confidence: number }) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
          })),
        };

        const event = `data: ${JSON.stringify(result)}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(event));
        } catch {
          // Controller may be closed if client disconnected
        }
      });

      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        const event = `data: ${JSON.stringify({ type: 'utterance_end' })}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(event));
        } catch {
          // Controller may be closed if client disconnected
        }
      });

      connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error(`[STT] Deepgram error for session ${sessionId}:`, error);
        const event = `data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(event));
        } catch {
          // Controller may be closed if client disconnected
        }
      });

      connection.on(LiveTranscriptionEvents.Close, (closeEvent) => {
        // Log close details including code and reason
        const code = (closeEvent as { code?: number })?.code;
        const reason = (closeEvent as { reason?: string })?.reason;
        console.log(`[STT] Deepgram connection closed for session: ${sessionId}, code: ${code}, reason: ${reason}`);
        session.isConnected = false;
        const event = `data: ${JSON.stringify({ type: 'close' })}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(event));
          controller.close();
        } catch {
          // Controller may already be closed
        }
        sessions.delete(sessionId);
      });
    },
    cancel() {
      // Client disconnected
      const session = sessions.get(sessionId!);
      if (session) {
        try {
          session.deepgram.requestClose();
        } catch {
          // Ignore errors during cleanup
        }
        sessions.delete(sessionId!);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * POST: Receive audio chunk and send to Deepgram
 *
 * Body: Raw audio bytes (ArrayBuffer)
 * Headers:
 * - X-Session-Id: Session identifier (required)
 */
export async function POST(request: Request): Promise<Response> {
  const sessionId = request.headers.get('X-Session-Id');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'X-Session-Id header required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found. Open SSE connection first.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!session.isConnected) {
    return new Response(
      JSON.stringify({ error: 'Deepgram not yet connected. Wait for open event.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '0.1' },
      }
    );
  }

  try {
    const audioData = await request.arrayBuffer();
    session.lastActivity = Date.now();

    if (!session.isConnected) {
      return new Response(
        JSON.stringify({ error: 'Deepgram connection not ready' }),
        { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '0.1' } }
      );
    }

    // Send audio to Deepgram
    session.deepgram.send(audioData);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[STT] Error sending audio for session ${sessionId}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to send audio' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * DELETE: Close session and cleanup resources
 *
 * Query params:
 * - sessionId: Session identifier (required)
 */
export async function DELETE(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = sessions.get(sessionId);
  if (session) {
    try {
      session.deepgram.requestClose();
    } catch {
      // Ignore errors during cleanup
    }
    sessions.delete(sessionId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
