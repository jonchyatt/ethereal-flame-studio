#!/usr/bin/env node
/** Bounded acceptance check for the three draft-only WAIA owned-source packs. */
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packDir = path.join(root, 'docs', 'creator-packs');
const packFiles = [
  'waia-owned-rb-food-peace-v1.json',
  'waia-owned-rb-hunger-noticing-v1.json',
  'waia-owned-rb-evening-rest-v1.json',
];
const errors = [];
const require = (condition, message) => { if (!condition) errors.push(message); };
const readable = async (file, label) => {
  try { await access(file, constants.R_OK); } catch { errors.push(`${label} is not readable: ${file}`); }
};

const packs = await Promise.all(packFiles.map(async (file) => {
  try { return JSON.parse(await readFile(path.join(packDir, file), 'utf8')); }
  catch (error) { errors.push(`cannot parse ${file}: ${error.message}`); return null; }
}));
require(packs.filter(Boolean).length === 3, 'requires exactly three parseable packs');
require(new Set(packs.filter(Boolean).map((pack) => pack.packId)).size === 3, 'pack IDs must be unique');
require(new Set(packs.filter(Boolean).map((pack) => pack.ownedSource?.sourceSha256)).size === 3, 'source hashes must be unique');

for (const pack of packs.filter(Boolean)) {
  require(pack.schemaVersion === 2, `${pack.packId}: schemaVersion must be 2`);
  require(pack.status === 'private-draft-only', `${pack.packId}: must remain private-draft-only`);
  require(pack.publication?.blocked === true && pack.publication?.connectorMode === 'manual-draft', `${pack.packId}: publication must be blocked/manual-draft`);
  require(pack.publication?.externalUploadId == null && pack.publication?.providerUrl == null && pack.publication?.scheduledFor == null, `${pack.packId}: may not contain upload, URL, or schedule`);
  require(/^[a-f0-9]{64}$/i.test(pack.ownedSource?.sourceSha256 || ''), `${pack.packId}: requires SHA-256 source hash`);
  await readable(pack.ownedSource?.masterPath, `${pack.packId} source master`);
  await readable(pack.ownedSource?.resetBiologyAudioPath, `${pack.packId} Reset Biology audio source`);
  await readable(path.join(root, pack.efsMeditationRender?.presetPath || ''), `${pack.packId} EFS meditation preset`);
  require(pack.efsMeditationRender?.presetName === 'meditation' && pack.efsMeditationRender?.renderPath?.includes('Path A'), `${pack.packId}: requires valid non-autonomous EFS meditation configuration`);
  require(typeof pack.adaptedNarrationEditScript?.safetyPreamble === 'string' && /not medical advice/i.test(pack.adaptedNarrationEditScript.safetyPreamble), `${pack.packId}: adapted script must preserve medical-safety language`);
  require(Array.isArray(pack.adaptedNarrationEditScript?.script) && pack.adaptedNarrationEditScript.script.length >= 4, `${pack.packId}: adapted narration script incomplete`);
  require(Array.isArray(pack.edl) && pack.edl.length >= 5 && pack.edl.every((entry) => /^\d\d:\d\d$/.test(entry.in) && /^\d\d:\d\d$/.test(entry.out)), `${pack.packId}: requires complete time-coded EDL`);
  require(pack.rightsProvenance?.state === 'HOLD-MEDIA' && Array.isArray(pack.rightsProvenance?.thirdPartyMasterAudioDependencies) && pack.rightsProvenance.thirdPartyMasterAudioDependencies.length === 0, `${pack.packId}: rights manifest must prohibit third-party master audio`);
  require(pack.draftMetadata?.privateDraftOnly === true && typeof pack.draftMetadata?.title === 'string' && typeof pack.draftMetadata?.description === 'string' && typeof pack.draftMetadata?.thumbnailCopy === 'string', `${pack.packId}: private draft metadata/thumbnail copy incomplete`);
  require(Array.isArray(pack.waiaOpenDecisions) && pack.waiaOpenDecisions.length === 12, `${pack.packId}: must preserve all twelve unresolved WAIA decisions`);
}

if (errors.length) {
  console.error(`FAIL: WAIA three-pack check found ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('PASS: exactly three private draft-only WAIA packs have unique owned RB sources, safety scripts, time-coded EDLs, meditation configs, metadata, and zero third-party audio.');
}
