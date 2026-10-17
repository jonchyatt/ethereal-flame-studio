#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'docs', 'creator-packs', 'waia-owned-source-pilot-pack.json');
const errors = [];

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

function resolveAsset(assetPath) {
  return path.isAbsolute(assetPath) ? assetPath : path.resolve(repoRoot, assetPath);
}

async function requireReadableAsset(asset, index) {
  requireCondition(typeof asset?.role === 'string' && asset.role.length > 0, `localAssets[${index}] requires role`);
  requireCondition(typeof asset?.path === 'string' && asset.path.length > 0, `localAssets[${index}] requires path`);
  if (typeof asset?.path !== 'string' || asset.path.length === 0) return;
  try {
    await access(resolveAsset(asset.path), constants.R_OK);
  } catch {
    errors.push(`localAssets[${index}] does not resolve to a readable local asset: ${asset.path}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  console.error(`FAIL: cannot read pilot manifest ${manifestPath}: ${error.message}`);
  process.exitCode = 1;
  process.exit();
}

requireCondition(manifest.schemaVersion === 1, 'schemaVersion must be 1');
requireCondition(manifest.status === 'manual-draft', 'status must remain manual-draft');
requireCondition(manifest.publication?.blocked === true, 'publication must remain blocked');
requireCondition(manifest.publication?.connectorMode === 'manual-draft', 'connectorMode must remain manual-draft');
requireCondition(manifest.publication?.provider === 'youtube', 'provider must be youtube');
requireCondition(manifest.publication?.credentialSlot === 'waia', 'credentialSlot must be waia');
requireCondition(manifest.publication?.externalUploadId == null, 'externalUploadId must be absent/null');
requireCondition(manifest.publication?.providerUrl == null, 'providerUrl must be absent/null');
requireCondition(manifest.publication?.scheduledFor == null, 'scheduledFor must be absent/null');

const provenance = manifest.ownedSource?.provenance;
requireCondition(manifest.ownedSource?.type === 'owned-reset-biology-hypnosis-master', 'ownedSource type must identify an owned Reset Biology hypnosis master');
requireCondition(typeof provenance?.masterPath === 'string' && provenance.masterPath.length > 0, 'owned source masterPath is required');
requireCondition(typeof provenance?.structuredSourcePath === 'string' && provenance.structuredSourcePath.length > 0, 'owned source structuredSourcePath is required');
requireCondition(typeof provenance?.sourceSha256 === 'string' && /^[a-f0-9]{64}$/i.test(provenance.sourceSha256), 'owned source SHA-256 is required');
requireCondition(typeof provenance?.candidateInventoryReceipt === 'string' && provenance.candidateInventoryReceipt.length > 0, 'owned source candidate inventory citation is required');
requireCondition(manifest.ownedSource?.rightsAndContent?.state === 'HOLD-MEDIA', 'unreviewed source must remain HOLD-MEDIA');
requireCondition(Array.isArray(manifest.ownedSource?.rightsAndContent?.requiredBeforeRelease) && manifest.ownedSource.rightsAndContent.requiredBeforeRelease.length >= 3, 'release gates must be explicitly listed');

const assets = manifest.localAssets;
requireCondition(Array.isArray(assets) && assets.length >= 3, 'localAssets must list owned-source, source-index, and EFS preset assets');
if (Array.isArray(assets)) {
  await Promise.all(assets.map(requireReadableAsset));
}
const preset = assets?.find((asset) => asset.role === 'existing-efs-visual-preset');
requireCondition(preset?.path === manifest.visual?.presetPath, 'visual preset must be a listed local asset');
requireCondition(typeof manifest.visual?.presetName === 'string' && manifest.visual.presetName.length > 0, 'existing EFS visual preset name is required');
requireCondition(typeof manifest.visual?.renderParameters?.engine === 'string' && manifest.visual.renderParameters.engine.includes('EFS'), 'EFS render parameters are required');
requireCondition(manifest.visual?.renderParameters?.renderPath?.includes('Path A'), 'draft pilot must not claim autonomous Path B readiness');

const recipe = manifest.audioPrep?.recipe;
requireCondition(manifest.audioPrep?.state === 'recipe-proposal-only-no-derived-audio', 'audio prep must remain a draft recipe proposal');
requireCondition(typeof manifest.audioPrep?.machinery === 'string' && manifest.audioPrep.machinery.includes('audio-prep'), 'existing audio-prep machinery must be cited');
requireCondition(recipe?.version === 1, 'audio prep recipe version must be 1');
requireCondition(recipe?.assetId === manifest.audioPrep?.sourceAssetId, 'audio recipe assetId must match sourceAssetId');
requireCondition(Array.isArray(recipe?.clips) && recipe.clips.length > 0, 'audio recipe requires at least one clip');
for (const [index, clip] of (recipe?.clips || []).entries()) {
  requireCondition(clip.sourceAssetId === manifest.audioPrep?.sourceAssetId, `audio recipe clip ${index} must bind to sourceAssetId`);
  requireCondition(Number.isFinite(clip.startTime) && Number.isFinite(clip.endTime) && clip.startTime >= 0 && clip.endTime > clip.startTime, `audio recipe clip ${index} has invalid bounds`);
}

const metadata = manifest.draftMetadata;
requireCondition(typeof metadata?.title === 'string' && metadata.title.length > 0, 'draft title is required');
requireCondition(typeof metadata?.description === 'string' && metadata.description.length > 0, 'draft description is required');
requireCondition(Array.isArray(metadata?.keywords) && metadata.keywords.length >= 3, 'at least three draft keywords are required');
requireCondition(Array.isArray(metadata?.hashtags) && metadata.hashtags.length >= 2, 'at least two draft hashtags are required');
requireCondition(Array.isArray(metadata?.chapters) && metadata.chapters.length >= 3, 'at least three draft chapters are required');
requireCondition(typeof metadata?.thumbnailBrief === 'string' && metadata.thumbnailBrief.length > 0, 'thumbnail brief is required');

if (errors.length) {
  console.error(`FAIL: WAIA pilot pack validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('PASS: WAIA owned-source pilot pack is a complete local manual draft; publication remains blocked.');
}
