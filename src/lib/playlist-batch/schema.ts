import { createHash } from 'crypto';
import { z } from 'zod';

export const PlaylistRenderTargetSchema = z.enum(['cloud', 'home', 'local-agent']);
export type PlaylistRenderTarget = z.infer<typeof PlaylistRenderTargetSchema>;

export const PlaylistRenderSettingsSchema = z.object({
  visualMode: z.enum(['flame', 'mist']).default('flame'),
  skyboxPreset: z.string().optional(),
  skyboxRotationSpeed: z.number().optional(),
  waterEnabled: z.boolean().optional(),
  waterColor: z.string().optional(),
  waterReflectivity: z.number().optional(),
  particleLayers: z.array(z.unknown()).optional(),
}).partial().default({});

export const PlaylistBatchCreateRequestSchema = z.object({
  playlistUrl: z.string().url(),
  rightsAttested: z.literal(true, { message: 'You must attest to having rights to use this audio' }),
  outputFormat: z.string().default('flat-1080p-landscape'),
  fps: z.union([z.literal(30), z.literal(60)]).default(30),
  target: PlaylistRenderTargetSchema.default('cloud'),
  targetAgentId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/, 'targetAgentId must be alphanumeric, hyphens, or underscores').optional(),
  maxItems: z.number().int().min(1).max(100).default(20),
  continueOnError: z.boolean().default(true),
  renderSettings: PlaylistRenderSettingsSchema.optional(),
});

export type PlaylistBatchCreateRequest = z.infer<typeof PlaylistBatchCreateRequestSchema>;

export const PlaylistSourceItemSchema = z.object({
  index: z.number().int().min(0),
  videoId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  durationSeconds: z.number().nonnegative().optional(),
});
export type PlaylistSourceItem = z.infer<typeof PlaylistSourceItemSchema>;

export const PlaylistBatchMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  sourceType: z.literal('youtube_playlist'),
  playlistUrl: z.string().url(),
  playlistId: z.string().optional(),
  playlistTitle: z.string().min(1),
  rightsAttested: z.literal(true),
  target: PlaylistRenderTargetSchema,
  targetAgentId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/, 'targetAgentId must be alphanumeric, hyphens, or underscores').optional(),
  outputFormat: z.string(),
  fps: z.union([z.literal(30), z.literal(60)]),
  visualConfig: z.record(z.string(), z.unknown()),
  continueOnError: z.boolean(),
  appUrl: z.string().url().optional(),
  items: z.array(PlaylistSourceItemSchema).min(1).max(100),
});
export type PlaylistBatchMetadata = z.infer<typeof PlaylistBatchMetadataSchema>;

export const PlaylistBatchItemStateSchema = z.object({
  index: z.number().int().min(0),
  videoId: z.string(),
  title: z.string(),
  url: z.string().url(),
  status: z.enum(['pending', 'ingesting', 'ingested', 'rendering', 'completed', 'failed', 'skipped']),
  ingestJobId: z.string().uuid().optional(),
  ingestStatus: z.enum(['pending', 'processing', 'complete', 'failed', 'cancelled']).optional(),
  assetId: z.string().uuid().optional(),
  renderJobId: z.string().uuid().optional(),
  renderStatus: z.enum(['pending', 'processing', 'complete', 'failed', 'cancelled']).optional(),
  outputVideoKey: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type PlaylistBatchItemState = z.infer<typeof PlaylistBatchItemStateSchema>;

export const PlaylistBatchSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type PlaylistBatchSummary = z.infer<typeof PlaylistBatchSummarySchema>;

export const PlaylistBatchResultSchema = z.object({
  schemaVersion: z.literal(1),
  playlistUrl: z.string().url(),
  playlistTitle: z.string().min(1),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  currentIndex: z.number().int().min(0).nullable(),
  summary: PlaylistBatchSummarySchema,
  items: z.array(PlaylistBatchItemStateSchema),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});
export type PlaylistBatchResult = z.infer<typeof PlaylistBatchResultSchema>;

export function createInitialPlaylistBatchResult(metadata: PlaylistBatchMetadata): PlaylistBatchResult {
  return {
    schemaVersion: 1,
    playlistUrl: metadata.playlistUrl,
    playlistTitle: metadata.playlistTitle,
    status: 'running',
    currentIndex: null,
    summary: {
      total: metadata.items.length,
      pending: metadata.items.length,
      active: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    },
    items: metadata.items.map((item) => ({
      index: item.index,
      videoId: item.videoId,
      title: item.title,
      url: item.url,
      status: 'pending',
    })),
    startedAt: new Date().toISOString(),
  };
}

export function recalcPlaylistBatchSummary(items: PlaylistBatchItemState[]): PlaylistBatchSummary {
  let pending = 0;
  let active = 0;
  let completed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.status === 'pending') pending++;
    else if (item.status === 'completed') completed++;
    else if (item.status === 'failed') failed++;
    else if (item.status === 'skipped') skipped++;
    else active++;
  }

  return {
    total: items.length,
    pending,
    active,
    completed,
    failed,
    skipped,
  };
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortJson(v)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function createPlaylistRenderFingerprint(input: {
  videoId: string;
  target: PlaylistRenderTarget;
  targetAgentId?: string;
  outputFormat: string;
  fps: 30 | 60;
  visualConfig: Record<string, unknown>;
}): string {
  const normalized = sortJson({
    videoId: input.videoId,
    target: input.target,
    targetAgentId: input.targetAgentId ?? null,
    outputFormat: input.outputFormat,
    fps: input.fps,
    visualConfig: input.visualConfig,
  });

  return createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
}
