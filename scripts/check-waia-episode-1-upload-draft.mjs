#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const manifestPath = path.join(root, 'data', 'content', 'waia-episode-1-upload-draft', 'manifest.json');
const thumbnailPath = path.join(root, 'data', 'content', 'waia-episode-1-upload-draft', 'thumbnail.jpg');
const errors = [];
const requireCondition = (condition, message) => { if (!condition) errors.push(message); };
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

requireCondition(manifest.schemaVersion === 1, 'schemaVersion must be 1');
requireCondition(manifest.channel?.handle === '@What_Am_I_Appreciating_Now', 'intended WAIA handle is required');
requireCondition(manifest.channel?.channelId === 'UCyq4s4Nei7Q26tu7EIQY7xw', 'intended WAIA channel ID is required');
requireCondition(manifest.publication?.status === 'manual-draft', 'publication status must be manual-draft');
requireCondition(manifest.publication?.visibility === 'private', 'visibility must be explicitly private');
requireCondition(manifest.publication?.unpublished === true, 'unpublished flag must be true');
requireCondition(manifest.publication?.scheduledFor === null, 'scheduledFor must be null');
requireCondition(manifest.publication?.uploaded === false && manifest.publication?.published === false, 'upload and publish must both be false');
requireCondition(manifest.publication?.credentialsPresent === false, 'credentialsPresent must be false');
requireCondition(manifest.publication?.videosInsertCalls === 0, 'videosInsertCalls must be zero');
requireCondition(Array.isArray(manifest.titles) && manifest.titles.length >= 3, 'title set must contain at least three choices');
requireCondition(typeof manifest.description === 'string' && manifest.description.includes('Source attribution'), 'description must include source attribution');
requireCondition(Array.isArray(manifest.chapters) && manifest.chapters.length >= 3, 'chapters must be present for the 10-minute render');
requireCondition(Array.isArray(manifest.tags) && manifest.tags.length >= 5, 'tags must be present');
requireCondition(typeof manifest.thumbnail?.brief === 'string' && manifest.thumbnail.brief.length > 0, 'thumbnail brief is required');
requireCondition(manifest.thumbnail?.dimensions?.width === 1280 && manifest.thumbnail?.dimensions?.height === 720, 'thumbnail dimensions must be 1280x720');
requireCondition(manifest.rights?.state === 'HOLD-MEDIA', 'rights state must remain HOLD-MEDIA');
requireCondition(Array.isArray(manifest.rights?.requiredBeforeRelease) && manifest.rights.requiredBeforeRelease.length >= 3, 'release gates must be explicit');

const credentialKeys = [];
function collectCredentialKeys(value, pathName = '') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const full = pathName ? `${pathName}.${key}` : key;
    if (/(access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|password)/i.test(key) && child) credentialKeys.push(full);
    collectCredentialKeys(child, full);
  }
}
collectCredentialKeys(manifest);
requireCondition(credentialKeys.length === 0, `manifest contains credential material at ${credentialKeys.join(', ')}`);
try { await access(thumbnailPath, constants.R_OK); } catch { errors.push('thumbnail asset is not readable'); }
try {
  const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,codec_name', '-of', 'json', thumbnailPath]);
  const probe = JSON.parse(stdout);
  const stream = probe.streams?.[0];
  requireCondition(stream?.codec_name === 'mjpeg', 'thumbnail must be JPEG/MJPEG');
  requireCondition(stream?.width === 1280 && stream?.height === 720, 'thumbnail file must be 1280x720');
} catch (error) { errors.push(`thumbnail is not probeable: ${error.message}`); }

const connectorSource = await readFile(path.join(root, 'src', 'lib', 'creator', 'publishConnectors.ts'), 'utf8');
const dryRunSource = await readFile(path.join(root, 'scripts', 'run-waia-manual-draft-dry-run.ts'), 'utf8');
requireCondition(connectorSource.includes("if (mode === 'manual-draft')") && connectorSource.includes('return writeDraftManifest(input);'), 'existing connector must route no-credential mode to a draft manifest');
requireCondition(connectorSource.includes('youtube.videos.insert'), 'existing YouTube insertion call must remain identifiable for the guard');
requireCondition(dryRunSource.includes('videosInsertCalls') && dryRunSource.includes('videos.insert() must not be called'), 'dry-run must install a zero-insertion sentinel');
console.log('INFO: publish dry-run guard statically verified; dynamic TSX execution is available via scripts/run-waia-manual-draft-dry-run.ts.');

if (errors.length) {
  console.error(`FAIL: WAIA episode-1 upload draft bundle validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('PASS: WAIA episode-1 bundle has metadata, owned-source attribution, 1280x720 thumbnail, explicit private/manual-draft state, WAIA channel selection, no credentials, and zero YouTube insertion.');
}
