import { createHash } from 'crypto';
import { z } from 'zod';

export const WAIA_YOUTUBE_CHANNEL_ID = 'UCyq4s4Nei7Q26tu7EIQY7xw';

export const PlaylistRenderTargetSchema = z.enum(['cloud', 'home', 'local-agent']);
export type PlaylistRenderTarget = z.infer<typeof PlaylistRenderTargetSchema>;

export const PlaylistRenderEngineSchema = z.enum(['puppeteer', 'unity']);
export type PlaylistRenderEngine = z.infer<typeof PlaylistRenderEngineSchema>;

export const PlaylistRightsBasisSchema = z.enum([
  'public-domain',
  'cc0',
  'licensed',
  'permission',
  'transformative-remix',
]);
export type PlaylistRightsBasis = z.infer<typeof PlaylistRightsBasisSchema>;

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
  channelTitle: z.string().min(1).optional(),
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
  expectedPublishChannelId: z.literal(WAIA_YOUTUBE_CHANNEL_ID).default(WAIA_YOUTUBE_CHANNEL_ID),
  items: z.array(PlaylistSourceItemSchema).min(1).max(100),
});
export type PlaylistBatchMetadata = z.infer<typeof PlaylistBatchMetadataSchema>;

export const PlaylistSourceProvenanceSchema = z.object({
  provenanceId: z.string().uuid(),
  sourceType: z.enum(['youtube', 'archive', 'other']).default('youtube'),
  sourceAssetId: z.string().min(1).optional(),
  sourceUrl: z.string().url(),
  sourceId: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceChannel: z.string().min(1).optional(),
  rightsBasis: PlaylistRightsBasisSchema,
  rightsEvidence: z.string().min(1).max(2000),
  attestedBy: z.string().min(1),
  attestedAt: z.string().datetime(),
  approvalId: z.string().uuid(),
});
export type PlaylistSourceProvenance = z.infer<typeof PlaylistSourceProvenanceSchema>;

export const PlaylistRenderRecipeOutputSchema = z.object({
  intentId: z.string().uuid(),
  outputFormat: z.string().min(1),
  fps: z.union([z.literal(30), z.literal(60)]),
  engine: PlaylistRenderEngineSchema,
  target: PlaylistRenderTargetSchema,
  targetAgentId: z.string().min(1).max(128).optional(),
});
export type PlaylistRenderRecipeOutput = z.infer<typeof PlaylistRenderRecipeOutputSchema>;

export const PlaylistInputArtifactSchema = z.object({
  assetId: z.string().uuid(),
  storageKey: z.string().min(1).max(1024).regex(/^assets\/[0-9a-f-]+\/original\.[A-Za-z0-9]+$/i),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  sizeBytes: z.number().int().positive(),
});
export type PlaylistInputArtifact = z.infer<typeof PlaylistInputArtifactSchema>;

export const PlaylistRenderRecipeSchema = z.object({
  recipeId: z.string().uuid(),
  version: z.number().int().positive(),
  reviewGeneration: z.number().int().nonnegative(),
  lineageId: z.string().min(1),
  brandPackVersion: z.string().min(1).max(128),
  experimentId: z.string().min(1).max(256),
  mixRecipeId: z.string().min(1).max(512),
  mixRecipeFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  inputArtifact: PlaylistInputArtifactSchema.optional(),
  sourceAssetIds: z.array(z.string().min(1)).default([]),
  visualConfig: z.record(z.string(), z.unknown()),
  outputs: z.array(PlaylistRenderRecipeOutputSchema).min(1).max(8),
  approvalId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type PlaylistRenderRecipe = z.infer<typeof PlaylistRenderRecipeSchema>;

export const PlaylistApprovalSchema = z.object({
  approvalId: z.string().uuid(),
  reviewGeneration: z.number().int().nonnegative(),
  actor: z.string().min(1),
  approvedAt: z.string().datetime(),
  requestHash: z.string().regex(/^[a-f0-9]{64}$/i),
  idempotencyKey: z.string().min(8).max(128),
  recipeId: z.string().uuid(),
});
export type PlaylistApproval = z.infer<typeof PlaylistApprovalSchema>;

export const PlaylistRenderIntentSchema = PlaylistRenderRecipeOutputSchema.extend({
  recipeId: z.string().uuid(),
  reviewGeneration: z.number().int().nonnegative(),
  status: z.enum(['pending-dispatch', 'queued', 'processing', 'completed', 'failed', 'blocked', 'superseded']),
  renderJobId: z.string().uuid().optional(),
  outputVideoKey: z.string().optional(),
  blockedCode: z.string().optional(),
  blockedReason: z.string().optional(),
  error: z.string().optional(),
  supersededByEventId: z.string().uuid().optional(),
  cancellationStatus: z.enum(['not-needed', 'pending', 'confirmed']).default('not-needed'),
  cancellationRequestedAt: z.string().datetime().optional(),
  cancellationConfirmedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});
export type PlaylistRenderIntent = z.infer<typeof PlaylistRenderIntentSchema>;

export const PlaylistItemStatusSchema = z.enum([
  'pending',
  'ingesting',
  'ingested',
  'pending-review',
  'approved',
  'rejected',
  'requeued',
  'rendering',
  'qa-pending',
  'qa-passed',
  'qa-failed',
  'release-approved',
  'completed',
  'failed',
  'skipped',
]);
export type PlaylistItemStatus = z.infer<typeof PlaylistItemStatusSchema>;

export const PlaylistReviewEventSchema = z.object({
  eventId: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'requeue']),
  actor: z.string().min(1),
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
  priorState: PlaylistItemStatusSchema,
  nextState: PlaylistItemStatusSchema,
  reviewGeneration: z.number().int().nonnegative(),
  approvalId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(8).max(128),
  requestHash: z.string().regex(/^[a-f0-9]{64}$/i),
});
export type PlaylistReviewEvent = z.infer<typeof PlaylistReviewEventSchema>;

export const PlaylistBatchItemStateSchema = z.object({
  index: z.number().int().min(0),
  videoId: z.string(),
  title: z.string(),
  url: z.string().url(),
  status: PlaylistItemStatusSchema,
  reviewGeneration: z.number().int().nonnegative().default(0),
  ingestJobId: z.string().uuid().optional(),
  ingestStatus: z.enum(['pending', 'processing', 'complete', 'failed', 'cancelled']).optional(),
  assetId: z.string().uuid().optional(),
  inputArtifact: PlaylistInputArtifactSchema.optional(),
  provenance: z.array(PlaylistSourceProvenanceSchema).default([]),
  approvals: z.array(PlaylistApprovalSchema).default([]),
  recipes: z.array(PlaylistRenderRecipeSchema).default([]),
  renderIntents: z.array(PlaylistRenderIntentSchema).default([]),
  auditTrail: z.array(PlaylistReviewEventSchema).default([]),
  currentApprovalId: z.string().uuid().optional(),
  currentRecipeId: z.string().uuid().optional(),
  // Legacy single-render projection remains readable during the additive migration.
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
  pendingReview: z.number().int().nonnegative().default(0),
  approved: z.number().int().nonnegative().default(0),
  active: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative().default(0),
  rejected: z.number().int().nonnegative().default(0),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type PlaylistBatchSummary = z.infer<typeof PlaylistBatchSummarySchema>;

export const PlaylistBatchResultSchema = z.object({
  schemaVersion: z.literal(1),
  projectionVersion: z.number().int().nonnegative().default(0),
  playlistUrl: z.string().url(),
  playlistTitle: z.string().min(1),
  status: z.enum(['running', 'awaiting-review', 'rendering', 'completed', 'failed', 'cancelled']),
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
    projectionVersion: 0,
    playlistUrl: metadata.playlistUrl,
    playlistTitle: metadata.playlistTitle,
    status: 'running',
    currentIndex: null,
    summary: {
      total: metadata.items.length,
      pending: metadata.items.length,
      pendingReview: 0,
      approved: 0,
      active: 0,
      blocked: 0,
      rejected: 0,
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
      reviewGeneration: 0,
      provenance: [],
      approvals: [],
      recipes: [],
      renderIntents: [],
      auditTrail: [],
    })),
    startedAt: new Date().toISOString(),
  };
}

export function recalcPlaylistBatchSummary(items: PlaylistBatchItemState[]): PlaylistBatchSummary {
  const summary: PlaylistBatchSummary = {
    total: items.length,
    pending: 0,
    pendingReview: 0,
    approved: 0,
    active: 0,
    blocked: 0,
    rejected: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const item of items) {
    if (item.status === 'pending') summary.pending++;
    else if (item.status === 'pending-review' || item.status === 'requeued') summary.pendingReview++;
    else if (item.status === 'approved') summary.approved++;
    else if (item.status === 'rejected') summary.rejected++;
    else if (item.status === 'completed') summary.completed++;
    else if (item.status === 'failed' || item.status === 'qa-failed') summary.failed++;
    else if (item.status === 'skipped') summary.skipped++;
    else summary.active++;

    if (item.renderIntents.some((intent) => intent.status === 'blocked' && intent.recipeId === item.currentRecipeId)) {
      summary.blocked++;
    }
  }
  return summary;
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Canonical JSON does not support non-finite numbers');
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, normalizeJson(child)]),
    );
  }
  return value;
}

/** Deterministic JSON for recipe lineage and request idempotency. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

export function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function deterministicUuid(value: string): string {
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 32).split('');
  hash[12] = '5';
  hash[16] = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  const hex = hash.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createPlaylistRenderFingerprint(input: {
  videoId: string;
  target: PlaylistRenderTarget;
  targetAgentId?: string;
  outputFormat: string;
  fps: 30 | 60;
  visualConfig: Record<string, unknown>;
  engine?: PlaylistRenderEngine;
  mixRecipeFingerprint?: string;
}): string {
  return canonicalSha256({
    videoId: input.videoId,
    target: input.target,
    targetAgentId: input.targetAgentId ?? null,
    outputFormat: input.outputFormat,
    fps: input.fps,
    visualConfig: input.visualConfig,
    engine: input.engine ?? 'puppeteer',
    mixRecipeFingerprint: input.mixRecipeFingerprint ?? null,
  });
}
