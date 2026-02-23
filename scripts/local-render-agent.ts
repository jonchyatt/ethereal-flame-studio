#!/usr/bin/env npx tsx
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

type Args = {
  serverUrl?: string;
  agentId?: string;
  token?: string;
  pollMs: number;
  label?: string;
  help: boolean;
};

type ClaimedJob = {
  jobId: string;
  leaseKey: string;
  leaseToken: string;
  leaseExpiresAt: string;
  leaseTtlMs?: number;
  dispatch: {
    jobId: string;
    audioSignedUrl: string;
    renderConfig: Record<string, unknown>;
    appUrl: string;
    targetAgentId: string | null;
  };
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { pollMs: 5000, help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--server' || arg === '-s') out.serverUrl = args[++i];
    else if (arg === '--agent-id' || arg === '-a') out.agentId = args[++i];
    else if (arg === '--token' || arg === '-t') out.token = args[++i];
    else if (arg === '--poll-ms') out.pollMs = Number(args[++i] || 5000);
    else if (arg === '--label') out.label = args[++i];
    else if (arg === '--help' || arg === '-h') out.help = true;
  }

  return out;
}

function printUsage(): void {
  console.log(`Local Render Agent

Usage:
  npx tsx scripts/local-render-agent.ts --server https://your-app --agent-id my-laptop --token <LOCAL_AGENT_SHARED_SECRET>

Options:
  -s, --server <url>     Base app URL (e.g. http://localhost:3000)
  -a, --agent-id <id>    Stable agent ID for this machine
  -t, --token <secret>   LOCAL_AGENT_SHARED_SECRET from the server
      --poll-ms <ms>     Poll interval (default 5000)
      --label <label>    Optional display label
  -h, --help             Show this help
`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authedFetch(baseUrl: string, token: string, pathname: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(new URL(pathname, baseUrl), { ...init, headers });
}

async function registerPresence(baseUrl: string, token: string, agentId: string, label?: string): Promise<void> {
  const res = await authedFetch(baseUrl, token, '/api/local-agent/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      label: label || agentId,
      capabilities: {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
      },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Agent register failed (${res.status})`);
  }
}

async function heartbeatPresence(baseUrl: string, token: string, agentId: string, label?: string): Promise<void> {
  const res = await authedFetch(baseUrl, token, '/api/local-agent/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      label: label || agentId,
      capabilities: {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
      },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Agent heartbeat failed (${res.status})`);
  }
}

async function pollForJob(baseUrl: string, token: string, agentId: string, label?: string): Promise<ClaimedJob | null> {
  const res = await authedFetch(baseUrl, token, '/api/local-agent/poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      label: label || agentId,
      capabilities: {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
      },
      acceptUnassigned: true,
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Agent poll failed (${res.status})`);
  }
  return (json.data?.job || null) as ClaimedJob | null;
}

async function downloadToFile(url: string, outPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download audio (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

async function runLocalRender(configPath: string, appUrl: string): Promise<void> {
  const child = spawn('npx', ['tsx', 'scripts/render-cli.ts', '--config', configPath, '--url', appUrl, '--no-server'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
  });

  await new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`render-cli exited with code ${code}`));
    });
    child.on('error', (err) => reject(err));
  });
}

async function postFailure(baseUrl: string, token: string, job: ClaimedJob, agentId: string, error: string): Promise<void> {
  const res = await authedFetch(baseUrl, token, `/api/local-agent/jobs/${job.jobId}/fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      leaseToken: job.leaseToken,
      error,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Fail callback failed (${res.status})`);
  }
}

async function renewJobLease(baseUrl: string, token: string, job: ClaimedJob, agentId: string): Promise<void> {
  const res = await authedFetch(baseUrl, token, `/api/local-agent/jobs/${job.jobId}/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      leaseToken: job.leaseToken,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Lease renew failed (${res.status})`);
  }
}

type SinglePutUploadReservation = {
  strategy: 'single-put';
  jobId: string;
  storageKey: string;
  uploadUrl: string;
  method: 'PUT' | string;
};

type MultipartUploadReservation = {
  strategy: 'multipart';
  jobId: string;
  storageKey: string;
  uploadId: string;
  partSizeBytes: number;
  totalParts: number;
  partUrls: Array<{ partNumber: number; url: string }>;
  completeEndpoint: string;
  abortEndpoint: string;
};

type UploadReservation = SinglePutUploadReservation | MultipartUploadReservation;

async function requestUploadReservation(
  baseUrl: string,
  token: string,
  job: ClaimedJob,
  agentId: string,
  outputPath: string,
): Promise<UploadReservation> {
  const stat = await fs.stat(outputPath);
  const res = await authedFetch(baseUrl, token, `/api/local-agent/jobs/${job.jobId}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      leaseToken: job.leaseToken,
      filename: path.basename(outputPath),
      contentType: 'video/mp4',
      sizeBytes: stat.size,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Upload URL request failed (${res.status})`);
  }
  return json.data as UploadReservation;
}

async function uploadFileToPresignedUrl(uploadUrl: string, outputPath: string): Promise<number> {
  const fileBuffer = await fs.readFile(outputPath);
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: fileBuffer,
  });
  if (!uploadRes.ok) {
    let detail = '';
    try {
      detail = await uploadRes.text();
    } catch {
      detail = '';
    }
    throw new Error(`Presigned upload failed (${uploadRes.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  return fileBuffer.length;
}

type MultipartUploadedPart = { partNumber: number; etag: string };

function normalizeEtag(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed : `"${trimmed.replace(/^\"|\"$/g, '')}"`;
}

async function completeMultipartUploadOnServer(
  baseUrl: string,
  token: string,
  job: ClaimedJob,
  agentId: string,
  reservation: MultipartUploadReservation,
  parts: MultipartUploadedPart[],
): Promise<void> {
  const res = await authedFetch(baseUrl, token, reservation.completeEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      leaseToken: job.leaseToken,
      storageKey: reservation.storageKey,
      uploadId: reservation.uploadId,
      parts,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Multipart complete failed (${res.status})`);
  }
}

async function abortMultipartUploadOnServer(
  baseUrl: string,
  token: string,
  job: ClaimedJob,
  agentId: string,
  reservation: MultipartUploadReservation,
): Promise<void> {
  const res = await authedFetch(baseUrl, token, reservation.abortEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      leaseToken: job.leaseToken,
      storageKey: reservation.storageKey,
      uploadId: reservation.uploadId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Multipart abort failed (${res.status})`);
  }
}

async function finalizeDirectCompletion(
  baseUrl: string,
  token: string,
  job: ClaimedJob,
  agentId: string,
  storageKey: string,
  fileSizeBytes: number,
): Promise<void> {
  const res = await authedFetch(baseUrl, token, `/api/local-agent/jobs/${job.jobId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      leaseToken: job.leaseToken,
      storageKey,
      fileSizeBytes,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || `Finalize completion failed (${res.status})`);
  }
}

function resolveAudioExt(audioUrl: string): string {
  try {
    const parsed = new URL(audioUrl);
    return path.extname(parsed.pathname) || '.mp3';
  } catch {
    return '.mp3';
  }
}

async function processClaimedJob(baseUrl: string, token: string, agentId: string, job: ClaimedJob, label?: string): Promise<void> {
  const tempDir = path.join(os.tmpdir(), `local-agent-${job.jobId}-${randomUUID().slice(0, 8)}`);
  await fs.mkdir(tempDir, { recursive: true });

  // AbortController prevents fetch pile-up if server is unresponsive
  const intervalAbort = new AbortController();

  const heartbeat = setInterval(() => {
    if (intervalAbort.signal.aborted) return;
    const timeoutCtrl = new AbortController();
    const timeout = setTimeout(() => timeoutCtrl.abort(), 15_000);
    heartbeatPresence(baseUrl, token, agentId, label)
      .catch((err) => {
        if (!intervalAbort.signal.aborted) {
          console.warn(`[Agent] Heartbeat failed for ${agentId}:`, err instanceof Error ? err.message : err);
        }
      })
      .finally(() => clearTimeout(timeout));
  }, 30_000);

  const leaseRenewIntervalMs = Math.max(15_000, Math.min(60_000, Math.floor((job.leaseTtlMs || 600_000) / 3)));
  const leaseRenewal = setInterval(() => {
    if (intervalAbort.signal.aborted) return;
    const timeoutCtrl = new AbortController();
    const timeout = setTimeout(() => timeoutCtrl.abort(), 15_000);
    renewJobLease(baseUrl, token, job, agentId)
      .catch((err) => {
        if (!intervalAbort.signal.aborted) {
          console.warn(`[Agent] Lease renew failed for job ${job.jobId}:`, err instanceof Error ? err.message : err);
        }
      })
      .finally(() => clearTimeout(timeout));
  }, leaseRenewIntervalMs);

  try {
    const audioPath = path.join(tempDir, `audio${resolveAudioExt(job.dispatch.audioSignedUrl)}`);
    const outputPath = path.join(tempDir, `render-${job.jobId}.mp4`);
    const configPath = path.join(tempDir, 'render-config.json');

    console.log(`[Agent] Downloading audio for job ${job.jobId}...`);
    await downloadToFile(job.dispatch.audioSignedUrl, audioPath);

    const renderConfig = structuredClone(job.dispatch.renderConfig) as {
      audio?: { path?: string };
      output?: { path?: string };
      [key: string]: unknown;
    };
    renderConfig.audio = { ...(renderConfig.audio || {}), path: audioPath };
    renderConfig.output = { ...(renderConfig.output || {}), path: outputPath };
    await fs.writeFile(configPath, JSON.stringify(renderConfig, null, 2));

    console.log(`[Agent] Rendering job ${job.jobId} using app ${job.dispatch.appUrl}`);
    await runLocalRender(configPath, job.dispatch.appUrl);

    console.log(`[Agent] Reserving upload target for job ${job.jobId}`);
    const reservation = await requestUploadReservation(baseUrl, token, job, agentId, outputPath);

    let uploadedBytes = 0;
    if (reservation.strategy === 'multipart') {
      console.log(`[Agent] Uploading completed render for job ${job.jobId} via multipart (${reservation.totalParts} parts)`);
      const fileStat = await fs.stat(outputPath);
      const fileHandle = await fs.open(outputPath, 'r');
      const uploadedParts: MultipartUploadedPart[] = [];
      let totalUploaded = 0;
      try {
        for (const part of reservation.partUrls) {
          const offset = (part.partNumber - 1) * reservation.partSizeBytes;
          const remaining = fileStat.size - offset;
          if (remaining <= 0) break;
          const length = Math.min(reservation.partSizeBytes, remaining);
          const buffer = Buffer.alloc(length);
          const { bytesRead } = await fileHandle.read(buffer, 0, length, offset);
          const body = bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead);

          const uploadRes = await fetch(part.url, {
            method: 'PUT',
            headers: { 'Content-Type': 'video/mp4' },
            body,
          });
          if (!uploadRes.ok) {
            let detail = '';
            try {
              detail = await uploadRes.text();
            } catch {
              detail = '';
            }
            throw new Error(`Multipart part ${part.partNumber} upload failed (${uploadRes.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
          }

          const etag = uploadRes.headers.get('etag') || uploadRes.headers.get('ETag');
          if (!etag) throw new Error(`Multipart part ${part.partNumber} upload missing ETag`);
          uploadedParts.push({ partNumber: part.partNumber, etag: normalizeEtag(etag) });
          totalUploaded += bytesRead;
          const pct = Math.min(100, Math.round((totalUploaded / Math.max(fileStat.size, 1)) * 100));
          console.log(`[Agent] Multipart upload ${job.jobId}: part ${part.partNumber}/${reservation.totalParts} (${pct}%)`);
        }
      } catch (uploadErr) {
        try {
          await abortMultipartUploadOnServer(baseUrl, token, job, agentId, reservation);
        } catch (abortErr) {
          console.warn(`[Agent] Multipart abort failed for ${job.jobId}:`, abortErr instanceof Error ? abortErr.message : abortErr);
        }
        throw uploadErr;
      } finally {
        await fileHandle.close().catch((closeErr) => {
          console.warn(`[Agent] Failed to close file handle for ${outputPath}:`, closeErr instanceof Error ? closeErr.message : closeErr);
        });
      }

      if (uploadedParts.length === 0) {
        throw new Error('Multipart upload completed with zero uploaded parts');
      }

      await completeMultipartUploadOnServer(baseUrl, token, job, agentId, reservation, uploadedParts);
      uploadedBytes = totalUploaded;
    } else {
      console.log(`[Agent] Uploading completed render for job ${job.jobId} directly to storage`);
      uploadedBytes = await uploadFileToPresignedUrl(reservation.uploadUrl, outputPath);
    }

    console.log(`[Agent] Finalizing completion for job ${job.jobId}`);
    await finalizeDirectCompletion(baseUrl, token, job, agentId, reservation.storageKey, uploadedBytes);

    console.log(`[Agent] Job ${job.jobId} complete`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Agent] Job ${job.jobId} failed: ${message}`);
    try {
      await postFailure(baseUrl, token, job, agentId, message);
    } catch (callbackErr) {
      console.error(`[Agent] Failed to report failure for ${job.jobId}:`, callbackErr);
    }
  } finally {
    intervalAbort.abort();
    clearInterval(heartbeat);
    clearInterval(leaseRenewal);
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) {
    printUsage();
    return;
  }

  const serverUrl = args.serverUrl || process.env.LOCAL_AGENT_SERVER_URL;
  const agentId = args.agentId || process.env.LOCAL_AGENT_ID;
  const token = args.token || process.env.LOCAL_AGENT_SHARED_SECRET;

  if (!serverUrl || !agentId || !token) {
    printUsage();
    throw new Error('Missing --server, --agent-id, or --token');
  }

  console.log(`[Agent] Starting local render agent "${agentId}" against ${serverUrl}`);
  await registerPresence(serverUrl, token, agentId, args.label);

  while (true) {
    try {
      const job = await pollForJob(serverUrl, token, agentId, args.label);
      if (!job) {
        await sleep(args.pollMs);
        continue;
      }
      await processClaimedJob(serverUrl, token, agentId, job, args.label);
    } catch (err) {
      console.error('[Agent] Loop error:', err);
      await sleep(Math.max(args.pollMs, 5000));
    }
  }
}

main().catch((err) => {
  console.error('[Agent] Fatal error:', err);
  process.exit(1);
});
