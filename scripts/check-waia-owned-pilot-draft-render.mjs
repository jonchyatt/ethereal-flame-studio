#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'data', 'waia-owned-pilot-draft', 'source-provenance.json');
const packPath = path.join(repoRoot, 'docs', 'creator-packs', 'waia-owned-source-pilot-pack.json');
const errors = [];
const requireCondition = (condition, message) => { if (!condition) errors.push(message); };

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const pack = JSON.parse(await readFile(packPath, 'utf8'));
requireCondition(manifest.sourceManifest === 'docs/creator-packs/waia-owned-source-pilot-pack.json', 'provenance must reference only the owned-source pilot manifest');
requireCondition(manifest.packId === pack.packId, 'provenance packId must match the owned-source pilot manifest');
requireCondition(pack.status === 'manual-draft' && pack.publication?.blocked === true, 'pilot manifest must remain blocked/manual-draft');
requireCondition(manifest.publicationState?.blocked === true, 'render handoff must remain publication-blocked');
requireCondition(manifest.publicationState?.externalUploadId == null, 'render handoff must have no external upload ID');
requireCondition(manifest.publicationState?.providerUrl == null, 'render handoff must have no provider URL');
requireCondition(manifest.publicationState?.scheduledFor == null, 'render handoff must have no schedule');
requireCondition(manifest.rightsAndRelease?.state === 'HOLD-MEDIA', 'rights gate must remain HOLD-MEDIA');

try {
  await access(manifest.draftRender.localPath, constants.R_OK);
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type', '-of', 'json', manifest.draftRender.localPath,
  ]);
  const probe = JSON.parse(stdout);
  const streams = new Set((probe.streams || []).map((stream) => `${stream.codec_type}:${stream.codec_name}`));
  requireCondition(streams.has('video:h264'), 'draft MP4 must contain H.264 video');
  requireCondition(streams.has('audio:aac'), 'draft MP4 must contain AAC audio');
  requireCondition(Number(probe.format?.duration) > 0, 'draft MP4 duration must be nonzero');
  requireCondition(Number(probe.format?.size) > 0, 'draft MP4 byte size must be nonzero');
} catch (error) {
  errors.push(`draft MP4 is not probeable: ${error.message}`);
}

if (errors.length) {
  console.error(`FAIL: WAIA owned-source pilot draft render validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('PASS: local WAIA owned-source pilot draft is probeable, H.264/AAC, source-bound, and publication-blocked.');
}
