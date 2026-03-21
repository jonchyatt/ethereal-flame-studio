import { NextResponse } from 'next/server';

/**
 * GET /api/blender/status
 *
 * Returns Blender connection status and scene info.
 * This is a lightweight proxy — in production, it would talk to a
 * local Blender MCP bridge. For now it returns a static shape
 * so the UI can be built against it.
 */
export async function GET() {
  // The Blender MCP addon exposes a JSON-RPC endpoint when running.
  // Default: http://localhost:8400 (blender-mcp default port)
  const blenderUrl = process.env.BLENDER_MCP_URL || 'http://localhost:8400';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${blenderUrl}/api/scene-info`, {
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    if (res && res.ok) {
      const sceneInfo = await res.json().catch(() => null);
      return NextResponse.json({
        connected: true,
        blenderUrl,
        scene: sceneInfo,
      });
    }

    // Blender not reachable
    return NextResponse.json({
      connected: false,
      blenderUrl,
      scene: null,
      hint: 'Open Blender with the MCP addon running, or check BLENDER_MCP_URL',
    });
  } catch {
    return NextResponse.json({
      connected: false,
      blenderUrl,
      scene: null,
      hint: 'Could not reach Blender MCP endpoint',
    });
  }
}
