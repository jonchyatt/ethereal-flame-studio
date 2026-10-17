import {
  PlaylistBatchResultSchema,
  PlaylistRightsBasisSchema,
  WAIA_YOUTUBE_CHANNEL_ID,
  type PlaylistBatchItemState,
} from '@/lib/playlist-batch/schema';

/** Item states reachable only after a curation approval; anything else has not passed the gate. */
const APPROVED_STATES: ReadonlySet<string> = new Set([
  'approved',
  'rendering',
  'qa-pending',
  'qa-passed',
  'release-approved',
  'completed',
]);

export type CurationEvidence = {
  batchJobId: string;
  itemIndex: number;
  approvalId: string;
  recipeId: string;
  rightsBases: string[];
  mixRecipeFingerprint: string;
};

export type GateDecision =
  | { ok: true; evidence: CurationEvidence }
  | { ok: false; reason: string };

export type CurationRef = { batchJobId: string; itemIndex: number };

/**
 * HB-3: an item may be published only with an approved state, a rights basis
 * and a mix recipe fingerprint. Fails closed on any missing piece.
 */
export function evaluateCurationGate(
  item: PlaylistBatchItemState | undefined,
  ref: CurationRef,
): GateDecision {
  if (!item) return { ok: false, reason: `curation item ${ref.itemIndex} not found in batch ${ref.batchJobId}` };
  if (!APPROVED_STATES.has(item.status)) {
    return { ok: false, reason: `item is in state "${item.status}", not approved by the curation gate` };
  }
  const approval = item.approvals.find((a) => a.approvalId === item.currentApprovalId);
  if (!approval) return { ok: false, reason: 'no current curation approval on the item' };
  const recipe = item.recipes.find((r) => r.recipeId === item.currentRecipeId);
  if (!recipe) return { ok: false, reason: 'no current mix recipe on the item' };
  if (!recipe.mixRecipeFingerprint) return { ok: false, reason: 'mix recipe fingerprint is missing' };
  const rights = item.provenance.filter((p) => p.approvalId === approval.approvalId);
  if (rights.length === 0) return { ok: false, reason: 'rights basis is missing (no provenance rows for the approval)' };
  if (rights.some((p) => !PlaylistRightsBasisSchema.safeParse(p.rightsBasis).success)) {
    return { ok: false, reason: 'a provenance row has no valid rights basis' };
  }
  return {
    ok: true,
    evidence: {
      batchJobId: ref.batchJobId,
      itemIndex: ref.itemIndex,
      approvalId: approval.approvalId,
      recipeId: recipe.recipeId,
      rightsBases: Array.from(new Set(rights.map((p) => p.rightsBasis))),
      mixRecipeFingerprint: recipe.mixRecipeFingerprint,
    },
  };
}

/** Resolve the curated item from a stored playlist-batch job result, then evaluate the gate. */
export function evaluateCurationGateForBatchResult(batchResult: unknown, ref: CurationRef): GateDecision {
  const parsed = PlaylistBatchResultSchema.safeParse(batchResult);
  if (!parsed.success) return { ok: false, reason: 'curation batch result is missing or unreadable' };
  return evaluateCurationGate(parsed.data.items.find((i) => i.index === ref.itemIndex), ref);
}

export class PublishChannelMismatchError extends Error {
  constructor(public readonly actualChannelId: string | null) {
    super(
      `Authenticated YouTube channel ${actualChannelId ?? '(none)'} does not equal the WAIA channel ${WAIA_YOUTUBE_CHANNEL_ID}; aborting before any upload`,
    );
    this.name = 'PublishChannelMismatchError';
  }
}

/** HB-10 for the API path: ask YouTube which channel the credentials act as. */
export async function assertAuthenticatedChannel(youtube: {
  channels: { list: (params: { part: string[]; mine: boolean }) => Promise<{ data: { items?: Array<{ id?: string | null }> | null } }> };
}): Promise<void> {
  const response = await youtube.channels.list({ part: ['id'], mine: true });
  const ids = (response.data.items || []).map((c) => c.id ?? null);
  // Every channel the credentials can act as must be the WAIA channel; any other one is ambiguous.
  if (ids.length !== 1 || ids[0] !== WAIA_YOUTUBE_CHANNEL_ID) {
    throw new PublishChannelMismatchError(ids.length === 1 ? ids[0] : ids.join(',') || null);
  }
}

/** Both checks against a written manual-draft manifest (no-credentials path). */
export function verifyDraftManifest(manifest: {
  provider?: string;
  channel?: { channelId?: string | null } | null;
  curation?: Partial<CurationEvidence> | null;
}): { ok: true } | { ok: false; reason: string } {
  const c = manifest.curation;
  if (!c?.approvalId) return { ok: false, reason: 'manifest has no curation approval' };
  if (!c.rightsBases || c.rightsBases.length === 0) return { ok: false, reason: 'manifest has no rights basis' };
  if (!c.mixRecipeFingerprint) return { ok: false, reason: 'manifest has no mix recipe fingerprint' };
  if (manifest.provider === 'youtube' && manifest.channel?.channelId !== WAIA_YOUTUBE_CHANNEL_ID) {
    return { ok: false, reason: `manifest channel id is not ${WAIA_YOUTUBE_CHANNEL_ID}` };
  }
  return { ok: true };
}

/** Load the curated batch item behind a publish job and run the gate. No ref means no approval: refuse. */
export async function checkPublishGate(
  store: { get: (jobId: string) => Promise<{ result?: Record<string, unknown> } | undefined> },
  curation: CurationRef | null | undefined,
): Promise<GateDecision> {
  if (!curation) return { ok: false, reason: 'publish job carries no curation reference' };
  const batchJob = await store.get(curation.batchJobId);
  if (!batchJob) return { ok: false, reason: `curation batch ${curation.batchJobId} not found` };
  return evaluateCurationGateForBatchResult(batchJob.result, curation);
}
