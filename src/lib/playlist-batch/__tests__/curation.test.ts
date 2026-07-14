import {
  applyPlaylistReview,
  playlistRenderingInvariantViolations,
  PlaylistReviewRequestSchema,
  type PlaylistReviewRequest,
} from '../curation';
import {
  PlaylistBatchMetadataSchema,
  canonicalSha256,
  createInitialPlaylistBatchResult,
  type PlaylistBatchResult,
} from '../schema';
import { resolveMixRecipe } from '../mix-recipes';

const NOW = '2026-07-13T18:00:00.000Z';
const MIX_FINGERPRINT = '70c0a2914da7bfd1643c61b780d2230593952a7e4a317fbbc889ea27d6db2f19';
const SOURCE_RIGHTS = [
  { assetId: 'voice-as-a-man-thinketh', confirmed: true as const },
  { assetId: 'voice-science-of-getting-rich', confirmed: true as const },
  { assetId: 'bed-calm-pill-1', confirmed: true as const },
];

function pendingReviewResult(): PlaylistBatchResult {
  const metadata = PlaylistBatchMetadataSchema.parse({
    schemaVersion: 1,
    sourceType: 'youtube_playlist',
    playlistUrl: 'https://www.youtube.com/playlist?list=waia-test',
    playlistTitle: 'WAIA test',
    rightsAttested: true,
    target: 'cloud',
    outputFormat: 'flat-1080p-landscape',
    fps: 30,
    visualConfig: { mode: 'flame' },
    continueOnError: true,
    items: [{
      index: 0,
      videoId: 'source-1',
      title: 'A real mix',
      url: 'https://www.youtube.com/watch?v=source-1',
    }],
  });
  const result = createInitialPlaylistBatchResult(metadata);
  result.items[0].status = 'pending-review';
  result.items[0].assetId = '8bb81074-f213-4d8f-8298-e06ecf2a999c';
  result.status = 'awaiting-review';
  return result;
}

function approve(
  expectedGeneration = 0,
  idempotencyKey = 'approve-real-mix-001',
): Extract<PlaylistReviewRequest, { action: 'approve' }> {
  return {
    action: 'approve',
    expectedGeneration,
    idempotencyKey,
    sourceRights: SOURCE_RIGHTS,
    mixRecipeId: 'data/waia-mixer-spike/recipe.json@v1',
    mixRecipeFingerprint: MIX_FINGERPRINT,
    brandPackVersion: 'waian-circle-v1',
    experimentId: 'waia-phase3-real-mix',
    outputs: [
      { outputFormat: 'flat-1080p-landscape', fps: 30, engine: 'puppeteer', target: 'cloud' },
      { outputFormat: '360-mono-4k', fps: 30, engine: 'unity', target: 'home' },
    ],
  };
}

function context(result: PlaylistBatchResult) {
  return {
    batchId: '21e8c68c-17b0-4cc3-8bf4-24d43ff66c90',
    itemIndex: 0,
    actor: 'jon',
    now: NOW,
    visualConfig: { mode: 'flame' },
    mixRecipe: resolveMixRecipe('data/waia-mixer-spike/recipe.json@v1')!,
    result,
  };
}

test('approval commits provenance, immutable lineage, audit, and both child intents', () => {
  const initial = pendingReviewResult();
  const { result } = applyPlaylistReview(initial, approve(), context(initial));
  const item = result.items[0];

  expect(item.status).toBe('approved');
  expect(item.provenance).toHaveLength(3);
  expect(item.approvals).toHaveLength(1);
  expect(item.recipes[0].mixRecipeFingerprint).toBe(MIX_FINGERPRINT);
  expect(item.renderIntents.map((intent) => [intent.engine, intent.status])).toEqual([
    ['puppeteer', 'pending-dispatch'],
    ['unity', 'blocked'],
  ]);
  expect(item.auditTrail).toHaveLength(1);
  expect(playlistRenderingInvariantViolations(result)).toEqual([]);
});

test('client-supplied actor is stripped and cannot forge the server principal', () => {
  const initial = pendingReviewResult();
  const request = PlaylistReviewRequestSchema.parse({ ...approve(), actor: 'forged-client' });
  const { result } = applyPlaylistReview(initial, request, context(initial));
  expect(result.items[0].approvals[0].actor).toBe('jon');
  expect(result.items[0].auditTrail[0].actor).toBe('jon');
});

test('idempotency replays identical input and rejects changed input in one generation', () => {
  const initial = pendingReviewResult();
  const first = applyPlaylistReview(initial, approve(), context(initial));
  const replay = applyPlaylistReview(first.result, approve(), context(first.result));
  expect(replay.replayed).toBe(true);
  expect(replay.result.items[0].renderIntents).toHaveLength(2);

  expect(() => applyPlaylistReview(
    first.result,
    { ...approve(), experimentId: 'changed-experiment' },
    context(first.result),
  )).toThrow('different input');
});

test('requeue supersedes prior intents and permits a new-generation approval', () => {
  const initial = pendingReviewResult();
  const first = applyPlaylistReview(initial, approve(), context(initial));
  first.result.items[0].status = 'rendering';
  first.result.items[0].renderIntents[0].status = 'processing';
  first.result.items[0].renderIntents[0].renderJobId = 'a1e28c5c-ab80-48b8-971a-33f229e0dfc1';

  const requeued = applyPlaylistReview(first.result, {
    action: 'requeue',
    expectedGeneration: 0,
    idempotencyKey: 'requeue-real-mix-001',
    reason: 'Try a calmer visual assignment',
  }, context(first.result));
  expect(requeued.result.items[0].reviewGeneration).toBe(1);
  expect(requeued.result.items[0].renderIntents.every((intent) => intent.status === 'superseded')).toBe(true);
  expect(requeued.cancelJobIds).toEqual(['a1e28c5c-ab80-48b8-971a-33f229e0dfc1']);
  expect(requeued.result.items[0].renderIntents[0].cancellationStatus).toBe('pending');

  const second = applyPlaylistReview(
    requeued.result,
    { ...approve(1, 'approve-real-mix-002'), experimentId: 'new-generation-experiment' },
    context(requeued.result),
  );
  expect(second.result.items[0].recipes).toHaveLength(2);
  expect(second.result.items[0].recipes[1].version).toBe(2);
  expect(second.result.items[0].currentRecipeId).not.toBe(first.result.items[0].currentRecipeId);
});

test('invalid transitions and stale generation fail closed', () => {
  const initial = pendingReviewResult();
  initial.items[0].assetId = undefined;
  expect(() => applyPlaylistReview(initial, approve(), context(initial))).toThrow('before ingest');

  const ready = pendingReviewResult();
  expect(() => applyPlaylistReview(ready, approve(1), context(ready))).toThrow('Stale review generation');
});

test('approval rejects incomplete, duplicate, and caller-mismatched source manifests', () => {
  const initial = pendingReviewResult();
  expect(() => applyPlaylistReview(
    initial,
    { ...approve(), sourceRights: SOURCE_RIGHTS.slice(0, 2) },
    context(initial),
  )).toThrow('Every authoritative mix source');
  expect(() => applyPlaylistReview(
    initial,
    { ...approve(), sourceRights: [SOURCE_RIGHTS[0], SOURCE_RIGHTS[0], SOURCE_RIGHTS[2]] },
    context(initial),
  )).toThrow('Duplicate source rights');
  expect(() => applyPlaylistReview(
    initial,
    { ...approve(), mixRecipeFingerprint: 'a'.repeat(64) },
    context(initial),
  )).toThrow('does not match');
});

test('dispatch invariant detects a missing individual source rights row', () => {
  const initial = pendingReviewResult();
  const { result } = applyPlaylistReview(initial, approve(), context(initial));
  result.items[0].provenance.pop();
  expect(playlistRenderingInvariantViolations(result)).toContain(
    'item 0: source rights coverage does not match the mix manifest',
  );
});

test('canonical recipe fingerprint is stable across key order and JSON round-trip', () => {
  const a = { version: 1, sources: [{ gain: -3, url: 'https://example.com/a' }], output: { pan: 0, mode: 'stereo' } };
  const b = JSON.parse('{"output":{"mode":"stereo","pan":0},"sources":[{"url":"https://example.com/a","gain":-3}],"version":1}');
  expect(canonicalSha256(a)).toBe(canonicalSha256(b));
  expect(canonicalSha256(JSON.parse(JSON.stringify(a)))).toBe(canonicalSha256(a));
});
