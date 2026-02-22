/**
 * Local Render API - POST to start a render, GET for job list
 */
import { NextRequest, NextResponse } from 'next/server';
import { startLocalRender, getAllLocalRenderJobs } from '@/lib/render/localRenderManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioBase64, audioFilename, assetId, audioUrl, format, fps, visualConfig } = body;

    if (!audioBase64 && !assetId && !audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Audio file or asset ID required' },
        { status: 400 }
      );
    }

    // Detect the app URL from the incoming request so the renderer connects
    // to the same server, regardless of which port it's running on
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const appUrl = `${protocol}://${host}`;

    let jobId: string;
    if (assetId) {
      const { AudioAssetService } = await import('@/lib/audio-prep/AudioAssetService');
      const assetService = new AudioAssetService();
      const audioPath = await assetService.resolveAssetPath(assetId);
      jobId = await startLocalRender({
        audioPath,
        audioFilename: audioFilename || `asset-${assetId}.wav`,
        format: format || 'flat-1080p-landscape',
        fps: fps || 30,
        visualConfig: visualConfig || {},
        appUrl,
      });
    } else if (audioUrl) {
      // Audio loaded from a URL (e.g. direct URL or YouTube processed file) — download to temp
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs/promises');
      const { randomUUID } = await import('crypto');
      const ext = path.extname(new URL(audioUrl).pathname) || '.mp3';
      const tmpPath = path.join(os.tmpdir(), `render-audio-${randomUUID()}${ext}`);
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch audio URL: ${audioRes.status}` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await audioRes.arrayBuffer());
      await fs.writeFile(tmpPath, buffer);
      jobId = await startLocalRender({
        audioPath: tmpPath,
        audioFilename: audioFilename || path.basename(tmpPath),
        format: format || 'flat-1080p-landscape',
        fps: fps || 30,
        visualConfig: visualConfig || {},
        appUrl,
      });
    } else {
      if (!audioFilename) {
        return NextResponse.json(
          { success: false, error: 'audioFilename is required for base64 uploads' },
          { status: 400 }
        );
      }
      jobId = await startLocalRender({
        audioBase64,
        audioFilename,
        format: format || 'flat-1080p-landscape',
        fps: fps || 30,
        visualConfig: visualConfig || {},
        appUrl,
      });
    }

    return NextResponse.json({ success: true, data: { jobId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  const jobs = getAllLocalRenderJobs();
  return NextResponse.json({ success: true, data: { jobs } });
}
