import { z } from 'zod';
import {
  PlaylistBatchResultSchema,
  PlaylistRenderEngineSchema,
  PlaylistRenderTargetSchema,
  PlaylistRightsBasisSchema,
  canonicalSha256,
  deterministicUuid,
  recalcPlaylistBatchSummary,
  type PlaylistBatchResult,
  type PlaylistReviewEvent,
} from './schema';
import type { ResolvedMixRecipe } from './mix-recipes';

const ReviewBaseSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
  expectedGeneration: z.number().int().nonnegative(),
});

export const ApproveReviewRequestSchema = ReviewBaseSchema.extend({
  action: z.literal('approve'),
  sourceRights: z.array(z.object({
    assetId: z.string().min(1).max(256),
    confirmed: z.literal(true),
  })).min(1).max(32),
  mixRecipeId: z.string().min(1).max(512),
  mixRecipeFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  brandPackVersion: z.string().min(1).max(128).default('waian-circle-v1'),
  experimentId: z.string().min(1).max(256),
  outputs: z.array(z.object({
    outputFormat: z.string().min(1),
    fps: z.union([z.literal(30), z.literal(60)]),
    engine: PlaylistRenderEngineSchema,
    target: PlaylistRenderTargetSchema,
    targetAgentId: z.string().min(1).max(128).optional(),
  })).min(1).max(8),
});

export const RejectReviewRequestSchema = ReviewBaseSchema.extend({
  action: z.literal('reject'),
  reason: z.string().min(1).max(2000),
});

export const RequeueReviewRequestSchema = ReviewBaseSchema.extend({
  action: z.literal('requeue'),
  reason: z.string().min(1).max(2000),
});

export const PlaylistReviewRequestSchema = z.discriminatedUnion('action', [
  ApproveReviewRequestSchema,
  RejectReviewRequestSchema,
  RequeueReviewRequestSchema,
]);
export type PlaylistReviewRequest = z.infer<typeof PlaylistReviewRequestSchema>;

export class PlaylistCurationConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaylistCurationConflict';
  }
}

function idFor(context: ReviewContext, request: PlaylistReviewRequest, kind: string): string {
  return deterministicUuid([
    context.batchId,
    context.itemIndex,
    request.action,
    request.expectedGeneration,
    request.idempotencyKey,
    kind,
  ].join(':'));
}

export type ReviewContext = {
  batchId: string;
  itemIndex: number;
  actor: string;
  now: string;
  visualConfig: Record<string, unknown>;
  mixRecipe: ResolvedMixRecipe;
};

export type ReviewTransition = {
  result: PlaylistBatchResult;
  replayed: boolean;
  cancelJobIds: string[];
};

export function applyPlaylistReview(
  inputResult: PlaylistBatchResult,
  request: PlaylistReviewRequest,
  context: ReviewContext,
): ReviewTransition {
  const result = PlaylistBatchResultSchema.parse(structuredClone(inputResult));
  const item = result.items.find((candidate) => candidate.index === context.itemIndex);
  if (!item) throw new PlaylistCurationConflict(`Item ${context.itemIndex} not found`);

  const requestHash = canonicalSha256(request);
  const replay = item.auditTrail.find((event) =>
    event.action === request.action
    && event.reviewGeneration === request.expectedGeneration
    && event.idempotencyKey === request.idempotencyKey,
  );
  if (replay) {
    if (replay.requestHash !== requestHash) {
      throw new PlaylistCurationConflict('Idempotency key was already used with different input');
    }
    return { result, replayed: true, cancelJobIds: [] };
  }

  if (item.reviewGeneration !== request.expectedGeneration) {
    throw new PlaylistCurationConflict(
      `Stale review generation ${request.expectedGeneration}; current generation is ${item.reviewGeneration}`,
    );
  }

  const priorState = item.status;
  const eventId = idFor(context, request, 'event');
  const commonEvent = {
    eventId,
    action: request.action,
    actor: context.actor,
    timestamp: context.now,
    priorState,
    reviewGeneration: request.expectedGeneration,
    idempotencyKey: request.idempotencyKey,
    requestHash,
  };
  const cancelJobIds: string[] = [];
  let event: PlaylistReviewEvent;

  if (request.action === 'approve') {
    if (item.status !== 'pending-review') {
      throw new PlaylistCurationConflict(`Cannot approve item in ${item.status}`);
    }
    if (!item.assetId) throw new PlaylistCurationConflict('Cannot approve before ingest produces an asset');
    if (!item.inputArtifact || item.inputArtifact.assetId !== item.assetId) {
      throw new PlaylistCurationConflict('Cannot approve before ingest records the exact input artifact identity');
    }
    if (request.mixRecipeId !== context.mixRecipe.recipeId) {
      throw new PlaylistCurationConflict('Mix recipe is not the authoritative stored artifact');
    }
    if (request.mixRecipeFingerprint.toLowerCase() !== context.mixRecipe.fingerprint) {
      throw new PlaylistCurationConflict('Mix recipe fingerprint does not match the stored artifact');
    }
    const confirmedIds = request.sourceRights.map((row) => row.assetId);
    const expectedIds = context.mixRecipe.sources.map((source) => source.assetId);
    if (new Set(confirmedIds).size !== confirmedIds.length) {
      throw new PlaylistCurationConflict('Duplicate source rights confirmations are not allowed');
    }
    if (
      confirmedIds.length !== expectedIds.length
      || [...confirmedIds].sort().join('\n') !== [...expectedIds].sort().join('\n')
    ) {
      throw new PlaylistCurationConflict('Every authoritative mix source must have an exact rights confirmation');
    }

    const approvalId = idFor(context, request, 'approval');
    const recipeId = idFor(context, request, 'recipe');
    const recipeVersion = item.recipes.length + 1;
    const outputs = request.outputs.map((output, outputIndex) => ({
      ...output,
      intentId: idFor(context, request, `intent:${outputIndex}:${canonicalSha256(output)}`),
    }));

    item.provenance.push(...context.mixRecipe.sources.map((source) => ({
      provenanceId: idFor(context, request, `provenance:${source.assetId}`),
      sourceType: source.sourceUrl.includes('youtube.com') ? 'youtube' as const
        : source.sourceUrl.includes('archive.org') ? 'archive' as const
          : 'other' as const,
      sourceAssetId: source.assetId,
      sourceUrl: source.sourceUrl,
      sourceId: source.assetId,
      sourceTitle: source.attribution || source.assetId,
      rightsBasis: source.rightsBasis,
      rightsEvidence: source.rightsEvidence,
      attestedBy: context.actor,
      attestedAt: context.now,
      approvalId,
    })));
    item.approvals.push({
      approvalId,
      reviewGeneration: item.reviewGeneration,
      actor: context.actor,
      approvedAt: context.now,
      requestHash,
      idempotencyKey: request.idempotencyKey,
      recipeId,
    });
    item.recipes.push({
      recipeId,
      version: recipeVersion,
      reviewGeneration: item.reviewGeneration,
      lineageId: `playlist:${context.batchId}:item:${item.index}`,
      brandPackVersion: request.brandPackVersion,
      experimentId: request.experimentId,
      mixRecipeId: request.mixRecipeId,
      mixRecipeFingerprint: request.mixRecipeFingerprint.toLowerCase(),
      inputArtifact: item.inputArtifact,
      sourceAssetIds: expectedIds,
      visualConfig: context.visualConfig,
      outputs,
      approvalId,
      createdAt: context.now,
    });
    item.renderIntents.push(...outputs.map((output) => ({
      ...output,
      recipeId,
      reviewGeneration: item.reviewGeneration,
      status: output.engine === 'unity' ? 'blocked' as const : 'pending-dispatch' as const,
      blockedCode: output.engine === 'unity' ? 'phase-4-unity-adapter-not-wired' : undefined,
      blockedReason: output.engine === 'unity'
        ? 'Unity is a first-class intent, but its adapter opens in Phase 4.'
        : undefined,
      cancellationStatus: 'not-needed' as const,
      updatedAt: context.now,
    })));
    item.currentApprovalId = approvalId;
    item.currentRecipeId = recipeId;
    item.status = 'approved';
    item.error = undefined;
    event = {
      ...commonEvent,
      nextState: 'approved',
      approvalId,
      recipeId,
    };
  } else if (request.action === 'reject') {
    if (item.status !== 'pending-review') {
      throw new PlaylistCurationConflict(`Cannot reject item in ${item.status}`);
    }
    item.status = 'rejected';
    event = { ...commonEvent, nextState: 'rejected', reason: request.reason };
  } else {
    if (!['rejected', 'approved', 'rendering', 'failed', 'qa-failed'].includes(item.status)) {
      throw new PlaylistCurationConflict(`Cannot requeue item in ${item.status}`);
    }
    for (const intent of item.renderIntents) {
      if (intent.recipeId !== item.currentRecipeId || intent.status === 'superseded') continue;
      if (intent.renderJobId && ['queued', 'processing', 'pending-dispatch'].includes(intent.status)) {
        cancelJobIds.push(intent.renderJobId);
        intent.cancellationStatus = 'pending';
        intent.cancellationRequestedAt = context.now;
      }
      intent.status = 'superseded';
      intent.supersededByEventId = eventId;
      intent.updatedAt = context.now;
    }
    item.reviewGeneration += 1;
    item.status = 'pending-review';
    item.currentApprovalId = undefined;
    item.currentRecipeId = undefined;
    item.error = undefined;
    event = { ...commonEvent, nextState: 'pending-review', reason: request.reason };
  }

  item.auditTrail.push(event);
  result.projectionVersion += 1;
  result.status = 'awaiting-review';
  result.summary = recalcPlaylistBatchSummary(result.items);
  return { result, replayed: false, cancelJobIds };
}

export function playlistRenderingInvariantViolations(result: PlaylistBatchResult): string[] {
  const violations: string[] = [];
  for (const item of result.items) {
    if (item.status !== 'approved' && item.status !== 'rendering') continue;
    const approval = item.approvals.find((candidate) => candidate.approvalId === item.currentApprovalId);
    const recipe = item.recipes.find((candidate) => candidate.recipeId === item.currentRecipeId);
    const rights = item.provenance.filter((row) => row.approvalId === item.currentApprovalId);
    if (!approval) violations.push(`item ${item.index}: missing current approval`);
    if (!recipe) violations.push(`item ${item.index}: missing current recipe`);
    if (!recipe?.mixRecipeFingerprint) violations.push(`item ${item.index}: missing mix recipe fingerprint`);
    if (!recipe?.inputArtifact) violations.push(`item ${item.index}: missing approved input artifact identity`);
    if (recipe?.inputArtifact && recipe.inputArtifact.assetId !== item.assetId) {
      violations.push(`item ${item.index}: approved input artifact does not bind the current asset`);
    }
    if (rights.length === 0) violations.push(`item ${item.index}: missing per-source rights provenance`);
    const expectedSourceIds = recipe?.sourceAssetIds || [];
    const actualSourceIds = rights.map((row) => row.sourceAssetId || row.sourceId);
    if (expectedSourceIds.length === 0) violations.push(`item ${item.index}: missing authoritative source manifest`);
    if (new Set(expectedSourceIds).size !== expectedSourceIds.length) {
      violations.push(`item ${item.index}: duplicate authoritative source IDs`);
    }
    if (new Set(actualSourceIds).size !== actualSourceIds.length) {
      violations.push(`item ${item.index}: duplicate source rights rows`);
    }
    if (
      [...expectedSourceIds].sort().join('\n') !== [...actualSourceIds].sort().join('\n')
    ) {
      violations.push(`item ${item.index}: source rights coverage does not match the mix manifest`);
    }
  }
  return violations;
}
