import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { buildUnityRenderPlan } from '@/lib/render/waiaRenderPlan';
import {
  buildUnityInvocation,
  measureSpectrumEnergy,
  parseSphericalMetadata,
  type UnityRuntime,
} from '../unityAdapter';

describe('Unity local-agent adapter', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'waia-unity-adapter-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  function runtime(): UnityRuntime {
    return {
      projectPath: 'C:\\EFS Project\\unity',
      renderScriptPath: 'C:\\EFS Project\\unity\\render.sh',
      unityEditorPath: 'C:\\Program Files\\Unity\\Hub\\Editor\\2021.2.8f1\\Editor\\Unity.exe',
      bashPath: 'C:\\Program Files\\Git\\bin\\bash.exe',
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
      spatialmediaPythonPath: 'python3',
      capabilities: {
        renderEngines: ['puppeteer', 'unity'],
        unityEditorVersion: '2021.2.8f1',
        unityProjectContractVersion: 'efs-path-b-v1',
        unityProjectLockId: 'efs_project',
        unityExecutionMode: 'headed',
        bashAvailable: true,
        ffmpegAvailable: true,
        ffprobeAvailable: true,
        spatialmediaAvailable: true,
        spatialmediaVersion: '2.1a1',
        supportedUnityPresets: ['meditation'],
        supportedUnityFormats: ['360-mono-8k'],
        supportedUnityModes: ['360mono'],
      },
    };
  }

  test('builds an argv-only strict VR invocation with converted absolute paths', async () => {
    const plan = buildUnityRenderPlan({
      target: 'home',
      outputFormat: '360-mono-8k',
      fps: 30,
      visualConfig: { skyboxPreset: 'meditation', scene: 'Example' },
      outputName: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    const invocation = await buildUnityInvocation({
      runtime: runtime(),
      plan,
      audioPath: 'C:\\Input Files\\approved.wav',
      outputDir: tempRoot,
    });

    expect(invocation.executable).toBe('C:\\Program Files\\Git\\bin\\bash.exe');
    expect(invocation.args).toEqual(expect.arrayContaining([
      '/c/EFS Project/unity/render.sh',
      '/c/Input Files/approved.wav',
      '--mode', '360mono',
      '--res', '8192',
      '--strict-render-settings',
      '--headed',
      '--strict-vr-meta',
    ]));
    expect(invocation.outputPath).toBe(path.join(tempRoot, `${plan.outputName}_vr.mp4`));
    expect(invocation.env.UNITY_PATH).toBe('/c/Program Files/Unity/Hub/Editor/2021.2.8f1/Editor/Unity.exe');
  });

  test('flat invocation preserves manual metadata behavior by omitting strict mode', async () => {
    const plan = buildUnityRenderPlan({
      target: 'local-agent',
      targetAgentId: 'efs-agent',
      outputFormat: 'flat-1080p-landscape',
      fps: 30,
      visualConfig: { skyboxPreset: 'ambient', scene: 'Example' },
      outputName: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    const invocation = await buildUnityInvocation({
      runtime: runtime(),
      plan,
      audioPath: 'C:\\Input\\approved.wav',
      outputDir: tempRoot,
    });
    expect(invocation.args).not.toContain('--strict-vr-meta');
    expect(invocation.outputPath).toBe(path.join(tempRoot, `${plan.outputName}.mp4`));
  });

  test('parses the spatialmedia fields used for direct acceptance', () => {
    expect(parseSphericalMetadata(`
      Spherical = true
      Stitched = true
      ProjectionType = equirectangular
      StereoMode = top-bottom
    `)).toEqual({
      Spherical: 'true',
      Stitched: 'true',
      ProjectionType: 'equirectangular',
      StereoMode: 'top-bottom',
    });
  });

  test('requires a dimensionally valid, changing spectrum table', () => {
    expect(measureSpectrumEnergy({ frames: 2, bands: 2, data: [0, 0.25, 0.5, 1] })).toEqual({
      frames: 2,
      bands: 2,
      range: 1,
    });
    expect(() => measureSpectrumEnergy({ frames: 2, bands: 2, data: [1, 1, 1, 1] }))
      .toThrow('Baked spectrum energy is constant');
    expect(() => measureSpectrumEnergy({ frames: 2, bands: 2, data: [0, 1] }))
      .toThrow('Baked spectrum data does not match its dimensions');
  });

  test('orchestrated flags keep strict metadata and approved render settings opt-in', async () => {
    const script = await fs.readFile(path.join(process.cwd(), 'unity', 'render.sh'), 'utf8');
    const recorder = await fs.readFile(
      path.join(process.cwd(), 'unity', 'Assets', 'Editor', 'AutoRecorder.cs'),
      'utf8',
    );
    expect(script).toContain('STRICT_VR_META=false');
    expect(script).toContain('--strict-vr-meta) STRICT_VR_META=true');
    expect(script).toContain('--strict-render-settings) STRICT_RENDER_SETTINGS=true');
    expect(script).toContain('spatialmedia 2.1a1 is required for strict VR metadata');
    expect(recorder).toContain('preset != null && preset.recording != null && !lockRenderSettings');
    expect(recorder).toContain('Approved render settings locked');
  });
});
