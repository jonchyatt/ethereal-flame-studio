import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import type { AudioPrepJob } from '@/lib/jobs';
import { listYouTubePlaylistEntries } from '@/lib/audio-prep/ytdlpPlaylist';
import {
  PlaylistBatchCreateRequestSchema,
  PlaylistBatchMetadataSchema,
  PlaylistBatchResultSchema,
} from '@/lib/playlist-batch/schema';

export const dynamic = 'force-dynamic';

function buildVisualConfig(renderSettings?: {
  visualMode?: 'flame' | 'mist';
  skyboxPreset?: string;
  skyboxRotationSpeed?: number;
  waterEnabled?: boolean;
  waterColor?: string;
  waterReflectivity?: number;
  particleLayers?: unknown[];
}): Record<string, unknown> {
  return {
    mode: renderSettings?.visualMode || 'flame',
    skyboxPreset: renderSettings?.skyboxPreset || 'nebula',
    skyboxRotationSpeed: renderSettings?.skyboxRotationSpeed || 0,
    waterEnabled: renderSettings?.waterEnabled || false,
    waterColor: renderSettings?.waterColor || '#1a3a5c',
    waterReflectivity: renderSettings?.waterReflectivity || 0.5,
    layers: renderSettings?.particleLayers || [],
  };
}

function deriveAppUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}`;
}

function summarizePlaylistJob(job: AudioPrepJob) {
  const metadata = PlaylistBatchMetadataSchema.safeParse(job.metadata);
  const result = PlaylistBatchResultSchema.safeParse(job.result);

  return {
    id: job.jobId,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    playlistTitle: metadata.success ? metadata.data.playlistTitle : 'Playlist batch',
    playlistUrl: metadata.success ? metadata.data.playlistUrl : null,
    itemCount: metadata.success ? metadata.data.items.length : 0,
    target: metadata.success ? metadata.data.target : null,
    targetAgentId: metadata.success ? (metadata.data.targetAgentId || null) : null,
    outputFormat: metadata.success ? metadata.data.outputFormat : null,
    summary: result.success ? result.data.summary : null,
    currentIndex: result.success ? result.data.currentIndex : null,
    error: job.error || (result.success ? result.data.error : undefined) || null,
  };
}

export async function GET() {
  try {
    const store = getJobStore();
    const jobs = await store.list({ type: 'playlist', limit: 20 });
    return NextResponse.json({
      success: true,
      data: {
        batches: jobs.map(summarizePlaylistJob),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PlaylistBatchCreateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.message,
          },
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const playlist = await listYouTubePlaylistEntries(input.playlistUrl, {
      maxItems: input.maxItems,
    });

    const store = getJobStore();
    const appUrl = deriveAppUrl(request);
    const metadata = {
      schemaVersion: 1 as const,
      sourceType: 'youtube_playlist' as const,
      playlistUrl: input.playlistUrl,
      playlistId: playlist.playlistId,
      playlistTitle: playlist.playlistTitle,
      rightsAttested: true as const,
      target: input.target,
      targetAgentId: input.targetAgentId,
      outputFormat: input.outputFormat,
      fps: input.fps,
      visualConfig: buildVisualConfig(input.renderSettings),
      continueOnError: input.continueOnError,
      appUrl,
      items: playlist.entries.map((entry, index) => ({
        index,
        videoId: entry.videoId,
        title: entry.title,
        url: entry.url,
        durationSeconds: entry.durationSeconds,
      })),
    };

    const batchJob = await store.create('playlist', metadata);
    const position = await store.getQueuePosition(batchJob.jobId);

    return NextResponse.json({
      success: true,
      data: {
        batchId: batchJob.jobId,
        status: batchJob.status,
        position,
        playlistTitle: playlist.playlistTitle,
        itemCount: metadata.items.length,
        target: metadata.target,
        targetAgentId: metadata.targetAgentId || null,
        outputFormat: metadata.outputFormat,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    );
  }
}
