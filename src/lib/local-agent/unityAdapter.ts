import { createHash } from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { UnityAgentCapabilities } from './registry';
import {
  EFS_UNITY_EDITOR_VERSION,
  EFS_UNITY_PROJECT_CONTRACT_VERSION,
} from './registry';
import { toGitBashPath, type UnityRenderPlan } from '@/lib/render/waiaRenderPlan';

const UNITY_PRESETS = ['meditation', 'ambient', 'fire_cinema', 'edm'] as const;
const UNITY_FORMATS = [
  'flat-1080p-landscape',
  'flat-4k-landscape',
  '360-mono-4k',
  '360-mono-6k',
  '360-mono-8k',
  '360-stereo-8k',
] as const;
const UNITY_MODES = ['flat', '360mono', '360stereo'] as const;
const DEFAULT_BLACK_FRAME_MAX_YAVG = 18;

export type UnityRuntime = {
  projectPath: string;
  renderScriptPath: string;
  unityEditorPath: string;
  bashPath: string;
  ffmpegPath: string;
  ffprobePath: string;
  spatialmediaPythonPath: string | null;
  capabilities: UnityAgentCapabilities;
};

export type DetectedAgentRuntime = {
  capabilities: Record<string, unknown>;
  unity?: UnityRuntime;
  issues: string[];
};

export type UnityInvocation = {
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  outputPath: string;
  unityLogPath: string;
};

type ProbeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
};

type ProbeDocument = {
  streams?: ProbeStream[];
  format?: { duration?: string };
};

export type UnityArtifactReceipt = {
  durationSeconds: number;
  audioDurationSeconds: number;
  width: number;
  height: number;
  fps: number;
  sizeBytes: number;
  sphericalMetadata: Record<string, string> | null;
  lumaSamples: Array<{ atSeconds: number; yavg: number }>;
  frameHashes: Array<{ atSeconds: number; sha256: string }>;
  spectrumFrames: number;
  spectrumBands: number;
  spectrumEnergyRange: number;
};

type SpectrumDocument = {
  frames?: number;
  bands?: number;
  data?: unknown[];
};

function commandSucceeds(executable: string, args: string[]): boolean {
  const result = spawnSync(executable, args, {
    shell: false,
    windowsHide: true,
    stdio: 'ignore',
    timeout: 10_000,
  });
  return result.status === 0;
}

async function firstExisting(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return path.resolve(candidate);
    } catch {
      // Try the next allowlisted path.
    }
  }
  return null;
}

function projectLockId(projectPath: string): string {
  const normalized = process.platform === 'win32' ? projectPath.toLowerCase() : projectPath;
  return `efs_${createHash('sha256').update(normalized).digest('hex').slice(0, 32)}`;
}

export async function detectLocalAgentRuntime(repoRoot = process.cwd()): Promise<DetectedAgentRuntime> {
  const issues: string[] = [];
  const unityExecutionMode = process.env.EFS_UNITY_EXECUTION_MODE || 'batch';
  if (!['batch', 'headed'].includes(unityExecutionMode)) {
    issues.push('EFS_UNITY_EXECUTION_MODE must be batch or headed');
  }
  const projectPath = path.resolve(process.env.EFS_UNITY_PROJECT_PATH || path.join(repoRoot, 'unity'));
  const renderScriptPath = path.join(projectPath, 'render.sh');
  const unityEditorPath = await firstExisting([
    ...(process.env.UNITY_PATH ? [process.env.UNITY_PATH] : []),
    'C:\\Program Files\\Unity\\Hub\\Editor\\2021.2.8f1\\Editor\\Unity.exe',
  ]);
  const bashPath = await firstExisting([
    ...(process.env.EFS_UNITY_BASH_PATH ? [process.env.EFS_UNITY_BASH_PATH] : []),
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ]);
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  const spatialmediaPythonCandidate = process.env.SPATIALMEDIA_PYTHON_PATH
    || (process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'python3.exe')
      : 'python3');

  let projectVersion = '';
  try {
    projectVersion = await fs.readFile(path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt'), 'utf8');
  } catch {
    issues.push('Unity ProjectVersion.txt is missing');
  }
  try {
    await fs.access(renderScriptPath);
  } catch {
    issues.push('Unity render.sh is missing');
  }
  if (!unityEditorPath) issues.push('Pinned Unity editor is missing');
  if (!projectVersion.includes(`m_EditorVersion: ${EFS_UNITY_EDITOR_VERSION}`)) {
    issues.push(`Unity project is not pinned to ${EFS_UNITY_EDITOR_VERSION}`);
  }
  if (!bashPath || !commandSucceeds(bashPath, ['--version'])) issues.push('Git Bash is unavailable');
  const ffmpegAvailable = commandSucceeds(ffmpegPath, ['-version']);
  const ffprobeAvailable = commandSucceeds(ffprobePath, ['-version']);
  if (!ffmpegAvailable) issues.push('ffmpeg is unavailable');
  if (!ffprobeAvailable) issues.push('ffprobe is unavailable');

  const spatialmediaInfo = spawnSync(
    spatialmediaPythonCandidate,
    ['-m', 'pip', 'show', 'spatialmedia'],
    { shell: false, windowsHide: true, encoding: 'utf8', timeout: 10_000 },
  );
  const spatialmediaVersion = spatialmediaInfo.status === 0
    ? /(?:^|\r?\n)Version:\s*([^\r\n]+)/i.exec(spatialmediaInfo.stdout || '')?.[1]?.trim() || null
    : null;
  const spatialmediaAvailable = spatialmediaVersion === '2.1a1'
    && commandSucceeds(spatialmediaPythonCandidate, ['-m', 'spatialmedia', '--help']);

  const baseCapabilities: Record<string, unknown> = {
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    renderEngines: ['puppeteer'],
  };
  const unityBaseReady = issues.length === 0 && !!unityEditorPath && !!bashPath;
  if (!unityBaseReady) return { capabilities: baseCapabilities, issues };

  const capabilities: UnityAgentCapabilities = {
    ...baseCapabilities,
    renderEngines: ['puppeteer', 'unity'],
    unityEditorVersion: EFS_UNITY_EDITOR_VERSION,
    unityProjectContractVersion: EFS_UNITY_PROJECT_CONTRACT_VERSION,
    unityProjectLockId: process.env.UNITY_PROJECT_LOCK_ID || projectLockId(projectPath),
    unityExecutionMode: unityExecutionMode as 'batch' | 'headed',
    bashAvailable: true,
    ffmpegAvailable: true,
    ffprobeAvailable: true,
    spatialmediaAvailable,
    spatialmediaVersion: spatialmediaAvailable ? '2.1a1' : null,
    supportedUnityPresets: [...UNITY_PRESETS],
    supportedUnityFormats: [...UNITY_FORMATS],
    supportedUnityModes: [...UNITY_MODES],
  };
  return {
    capabilities,
    issues: spatialmediaAvailable ? issues : [...issues, 'spatialmedia 2.1a1 unavailable; VR claims remain filtered'],
    unity: {
      projectPath,
      renderScriptPath,
      unityEditorPath,
      bashPath,
      ffmpegPath,
      ffprobePath,
      spatialmediaPythonPath: spatialmediaAvailable ? spatialmediaPythonCandidate : null,
      capabilities,
    },
  };
}

export async function buildUnityInvocation(input: {
  runtime: UnityRuntime;
  plan: UnityRenderPlan;
  audioPath: string;
  outputDir: string;
}): Promise<UnityInvocation> {
  const { runtime, plan } = input;
  await fs.mkdir(input.outputDir, { recursive: true });
  const args = [
    toGitBashPath(runtime.renderScriptPath),
    '--audio', toGitBashPath(input.audioPath),
    '--name', plan.outputName,
    '--mode', plan.mode,
    '--res', String(plan.resolution),
    '--fps', String(plan.fps),
    '--preset', plan.preset,
    '--scene', plan.scene,
    '--output', toGitBashPath(input.outputDir),
    '--strict-render-settings',
    ...(runtime.capabilities.unityExecutionMode === 'headed' ? ['--headed'] : []),
    ...(plan.requireVrMetadata ? ['--strict-vr-meta'] : []),
  ];
  const suffix = plan.mode === 'flat' ? '.mp4' : '_vr.mp4';
  return {
    executable: runtime.bashPath,
    args,
    cwd: runtime.projectPath,
    env: { ...process.env, UNITY_PATH: toGitBashPath(runtime.unityEditorPath) },
    outputPath: path.join(input.outputDir, `${plan.outputName}${suffix}`),
    unityLogPath: path.join(input.outputDir, `${plan.outputName}_unity.log`),
  };
}

async function runCapture(executable: string, args: string[], timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${path.basename(executable)} timed out`));
    }, timeoutMs);
    child.stdout?.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr?.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(`${stdout}\n${stderr}`);
      else reject(new Error(`${path.basename(executable)} exited ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

function parseRate(value: string | undefined): number {
  if (!value) return 0;
  const [numerator, denominator = 1] = value.split('/').map(Number);
  return denominator ? numerator / denominator : 0;
}

async function probe(runtime: UnityRuntime, filePath: string): Promise<ProbeDocument> {
  const raw = await runCapture(runtime.ffprobePath, [
    '-v', 'error', '-show_entries', 'format=duration', '-show_streams', '-of', 'json', filePath,
  ]);
  return JSON.parse(raw) as ProbeDocument;
}

export function parseSphericalMetadata(raw: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const match of raw.matchAll(/^\s*(Spherical|Stitched|ProjectionType|StereoMode)\s*=\s*(.+)\s*$/gim)) {
    fields[match[1]] = match[2].trim().toLowerCase();
  }
  return fields;
}

async function sampleYavg(runtime: UnityRuntime, filePath: string, atSeconds: number): Promise<number> {
  const raw = await runCapture(runtime.ffmpegPath, [
    '-v', 'error', '-ss', atSeconds.toFixed(3), '-i', filePath, '-frames:v', '1',
    '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', process.platform === 'win32' ? 'NUL' : '/dev/null',
  ]);
  const value = /lavfi\.signalstats\.YAVG=([0-9.]+)/i.exec(raw)?.[1];
  if (!value) throw new Error(`Could not measure frame luma at ${atSeconds.toFixed(3)}s`);
  return Number(value);
}

async function sampleFrameHash(runtime: UnityRuntime, filePath: string, atSeconds: number): Promise<string> {
  const raw = await runCapture(runtime.ffmpegPath, [
    '-v', 'error', '-ss', atSeconds.toFixed(3), '-i', filePath, '-frames:v', '1',
    '-f', 'hash', '-hash', 'sha256', '-',
  ]);
  const value = /SHA256=([0-9a-f]{64})/i.exec(raw)?.[1];
  if (!value) throw new Error(`Could not hash frame at ${atSeconds.toFixed(3)}s`);
  return value.toLowerCase();
}

export function measureSpectrumEnergy(document: SpectrumDocument): {
  frames: number;
  bands: number;
  range: number;
} {
  const frames = Number(document.frames);
  const bands = Number(document.bands);
  if (!Number.isInteger(frames) || frames <= 0 || !Number.isInteger(bands) || bands <= 0) {
    throw new Error('Baked spectrum dimensions are invalid');
  }
  if (!Array.isArray(document.data) || document.data.length !== frames * bands) {
    throw new Error('Baked spectrum data does not match its dimensions');
  }
  const values = document.data.map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Baked spectrum contains invalid energy values');
  }
  const range = Math.max(...values) - Math.min(...values);
  if (range <= Number.EPSILON) throw new Error('Baked spectrum energy is constant');
  return { frames, bands, range };
}

export async function validateUnityArtifact(input: {
  runtime: UnityRuntime;
  plan: UnityRenderPlan;
  artifactPath: string;
  audioPath: string;
  unityLogPath: string;
  blackFrameMaxYavg?: number;
}): Promise<UnityArtifactReceipt> {
  const artifactStat = await fs.stat(input.artifactPath);
  if (artifactStat.size <= 0) throw new Error('Unity artifact is empty');
  const spectrumPath = path.join(path.dirname(input.unityLogPath), `${input.plan.outputName}_spectrum.json`);
  const [artifactProbe, audioProbe, unityLog, spectrumDocument] = await Promise.all([
    probe(input.runtime, input.artifactPath),
    probe(input.runtime, input.audioPath),
    fs.readFile(input.unityLogPath, 'utf8'),
    fs.readFile(spectrumPath, 'utf8').then((raw) => JSON.parse(raw) as SpectrumDocument),
  ]);
  const video = artifactProbe.streams?.find((stream) => stream.codec_type === 'video');
  const audio = artifactProbe.streams?.find((stream) => stream.codec_type === 'audio');
  const durationSeconds = Number(artifactProbe.format?.duration);
  const audioDurationSeconds = Number(audioProbe.format?.duration);
  if (!video || !audio) throw new Error('Unity artifact must contain video and audio streams');
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('Unity artifact duration is invalid');
  if (!Number.isFinite(audioDurationSeconds) || audioDurationSeconds <= 0) throw new Error('Source audio duration is invalid');
  if (Math.abs(durationSeconds - audioDurationSeconds) > 0.5) {
    throw new Error('Unity artifact duration differs from source audio by more than 0.5 seconds');
  }
  if (video.width !== input.plan.width || video.height !== input.plan.height) {
    throw new Error(`Unity artifact dimensions ${video.width}x${video.height} do not match ${input.plan.width}x${input.plan.height}`);
  }
  const fps = parseRate(video.avg_frame_rate || video.r_frame_rate);
  if (Math.abs(fps - input.plan.fps) > 0.001) {
    throw new Error(`Unity artifact frame rate ${fps} does not match ${input.plan.fps}`);
  }
  const spectrum = /\[BakedSpectrum\]\s+Loaded\s+(\d+)\s+frames\s+x\s+(\d+)\s+bands/i.exec(unityLog);
  if (!spectrum) throw new Error('Unity log does not confirm the baked spectrum table loaded');
  const spectrumEvidence = measureSpectrumEnergy(spectrumDocument);
  if (
    spectrumEvidence.frames !== Number(spectrum[1])
    || spectrumEvidence.bands !== Number(spectrum[2])
  ) throw new Error('Baked spectrum dimensions do not match the Unity load receipt');

  let sphericalMetadata: Record<string, string> | null = null;
  if (input.plan.requireVrMetadata) {
    if (!input.runtime.spatialmediaPythonPath) throw new Error('spatialmedia 2.1a1 is unavailable');
    sphericalMetadata = parseSphericalMetadata(await runCapture(
      input.runtime.spatialmediaPythonPath,
      ['-m', 'spatialmedia', input.artifactPath],
    ));
    if (
      sphericalMetadata.Spherical !== 'true'
      || sphericalMetadata.Stitched !== 'true'
      || sphericalMetadata.ProjectionType !== 'equirectangular'
    ) throw new Error('Unity artifact is missing required spherical metadata');
    const stereoMode = sphericalMetadata.StereoMode;
    if (input.plan.stereoMode === 'top-bottom' && stereoMode !== 'top-bottom') {
      throw new Error('Unity stereo artifact is missing top-bottom metadata');
    }
    if (input.plan.stereoMode === 'mono' && stereoMode && !['none', 'mono'].includes(stereoMode)) {
      throw new Error(`Unity mono artifact declares contradictory stereo metadata: ${stereoMode}`);
    }
  }

  const sampleTimes = [durationSeconds * 0.25, durationSeconds * 0.75];
  const [lumaSamples, frameHashes] = await Promise.all([
    Promise.all(sampleTimes.map(async (atSeconds) => ({
      atSeconds,
      yavg: await sampleYavg(input.runtime, input.artifactPath, atSeconds),
    }))),
    Promise.all(sampleTimes.map(async (atSeconds) => ({
      atSeconds,
      sha256: await sampleFrameHash(input.runtime, input.artifactPath, atSeconds),
    }))),
  ]);
  const threshold = input.blackFrameMaxYavg ?? DEFAULT_BLACK_FRAME_MAX_YAVG;
  if (lumaSamples.some((sample) => sample.yavg <= threshold)) {
    throw new Error(`Unity artifact contains an all-black acceptance sample at or below YAVG ${threshold}`);
  }
  if (new Set(frameHashes.map((sample) => sample.sha256)).size !== frameHashes.length) {
    throw new Error('Unity artifact acceptance frames are identical');
  }

  return {
    durationSeconds,
    audioDurationSeconds,
    width: video.width!,
    height: video.height!,
    fps,
    sizeBytes: artifactStat.size,
    sphericalMetadata,
    lumaSamples,
    frameHashes,
    spectrumFrames: Number(spectrum[1]),
    spectrumBands: Number(spectrum[2]),
    spectrumEnergyRange: spectrumEvidence.range,
  };
}
