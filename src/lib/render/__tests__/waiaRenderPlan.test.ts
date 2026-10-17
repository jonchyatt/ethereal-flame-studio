import {
  assertSafeRenderToken,
  assertVariantApprovalBinding,
  buildUnityRenderPlan,
  createWaiaRenderCore,
  createWaiaRenderVariant,
  getUnityOutputSpec,
  hashWaiaRenderCore,
  resolveRenderTransport,
  toGitBashPath,
  type WaiaRenderCoreInput,
} from '../waiaRenderPlan';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function coreInput(overrides: Partial<WaiaRenderCoreInput> = {}): WaiaRenderCoreInput {
  return {
    input: {
      assetId: '11111111-1111-4111-8111-111111111111',
      sha256: HASH_A,
      sizeBytes: 12345,
      mixRecipeId: 'waia-phase2-mix-v1',
      mixRecipeFingerprint: HASH_B,
      sourceAssetIds: ['source-a', 'source-b', 'source-c'],
    },
    outputFormat: 'flat-1080p-landscape',
    fps: 30,
    preset: 'meditation',
    scene: 'Example',
    visualSemantic: { palette: 'night-gold', motion: { speed: 1 } },
    target: 'home',
    targetAgentId: null,
    reviewGeneration: 2,
    brandPackVersion: 'waia-brand-v1',
    experimentId: 'phase4-m3-flat-pair',
    ...overrides,
  };
}

describe('WAIA Phase 4 pure render plan', () => {
  test('core hash is deterministic across object-key order', () => {
    const first = createWaiaRenderCore(coreInput());
    const second = createWaiaRenderCore(coreInput({
      visualSemantic: { motion: { speed: 1 }, palette: 'night-gold' },
    }));
    expect(hashWaiaRenderCore(first)).toBe(hashWaiaRenderCore(second));
  });

  test('ordered source lineage participates in the core hash', () => {
    const first = createWaiaRenderCore(coreInput());
    const reordered = createWaiaRenderCore(coreInput({
      input: { ...coreInput().input, sourceAssetIds: ['source-b', 'source-a', 'source-c'] },
    }));
    expect(hashWaiaRenderCore(first)).not.toBe(hashWaiaRenderCore(reordered));
  });

  test('engine siblings share a core but never an intent fingerprint', () => {
    const core = createWaiaRenderCore(coreInput());
    const puppeteer = createWaiaRenderVariant(core, 'puppeteer');
    const unity = createWaiaRenderVariant(core, 'unity');
    expect(puppeteer.coreHash).toBe(unity.coreHash);
    expect(puppeteer.variantFingerprint).not.toBe(unity.variantFingerprint);
  });

  test('approval cannot cross sibling fingerprint or review generation', () => {
    const core = createWaiaRenderCore(coreInput());
    const puppeteer = createWaiaRenderVariant(core, 'puppeteer');
    const unity = createWaiaRenderVariant(core, 'unity');
    expect(() => assertVariantApprovalBinding(unity, {
      variantFingerprint: puppeteer.variantFingerprint,
      reviewGeneration: unity.core.reviewGeneration,
    })).toThrow('Approval fingerprint');
    expect(() => assertVariantApprovalBinding(unity, {
      variantFingerprint: unity.variantFingerprint,
      reviewGeneration: unity.core.reviewGeneration - 1,
    })).toThrow('Approval generation');
  });

  test.each([
    ['puppeteer', 'cloud', 'cloud'],
    ['puppeteer', 'home', 'local-agent'],
    ['puppeteer', 'local-agent', 'local-agent'],
    ['unity', 'home', 'local-agent'],
    ['unity', 'local-agent', 'local-agent'],
  ] as const)('%s x %s resolves to %s', (engine, target, expected) => {
    expect(resolveRenderTransport(engine, target)).toBe(expected);
  });

  test('Unity x cloud fails closed', () => {
    expect(() => resolveRenderTransport('unity', 'cloud')).toThrow('require home or local-agent');
  });

  test.each([
    ['flat-1080p-landscape', 'flat', 1920, 1920, 1080, false, 'mono'],
    ['flat-4k-landscape', 'flat', 3840, 3840, 2160, false, 'mono'],
    ['360-mono-4k', '360mono', 4096, 4096, 2048, true, 'mono'],
    ['360-mono-6k', '360mono', 6144, 6144, 3072, true, 'mono'],
    ['360-mono-8k', '360mono', 8192, 8192, 4096, true, 'mono'],
    ['360-stereo-8k', '360stereo', 8192, 8192, 4096, true, 'top-bottom'],
  ] as const)('maps %s exactly', (format, mode, resolution, width, height, requireVrMetadata, stereoMode) => {
    expect(getUnityOutputSpec(format)).toEqual({ mode, resolution, width, height, requireVrMetadata, stereoMode });
  });

  test.each(['flat-1080p-portrait', '360-stereo-4k', 'flat;rm -rf /'])('rejects unsupported Unity output %s', (format) => {
    expect(() => getUnityOutputSpec(format)).toThrow('unsupported');
  });

  test('builds a validated Unity plan without interpreting shell text', () => {
    expect(buildUnityRenderPlan({
      target: 'local-agent',
      targetAgentId: 'nepalt-unity',
      outputFormat: '360-mono-8k',
      fps: 30,
      visualConfig: { skyboxPreset: 'meditation', scene: 'Example' },
      outputName: '11111111-1111-4111-8111-111111111111',
    })).toMatchObject({
      engine: 'unity',
      transport: 'local-agent',
      mode: '360mono',
      width: 8192,
      height: 4096,
      preset: 'meditation',
      scene: 'Example',
    });
  });

  test.each([
    [{ skyboxPreset: 'meditation;calc', scene: 'Example' }, 'skyboxPreset'],
    [{ skyboxPreset: 'meditation', scene: '../Other' }, 'scene'],
    [{ skyboxPreset: 'meditation', scene: 'Example', puppeteer: {} }, 'Puppeteer-specific'],
  ])('rejects adversarial visual config %#', (visualConfig, message) => {
    expect(() => buildUnityRenderPlan({
      target: 'home',
      outputFormat: 'flat-1080p-landscape',
      fps: 30,
      visualConfig,
      outputName: 'safe-name',
    })).toThrow(message);
  });

  test.each(['bad name', 'x;calc', '../escape', 'line\nbreak'])('rejects unsafe output token %s', (value) => {
    expect(() => assertSafeRenderToken(value, 'outputName')).toThrow('safe token');
  });

  test('converts absolute Windows paths for Git Bash', () => {
    expect(toGitBashPath('C:\\Users\\jonch\\Projects\\ethereal-flame-studio\\unity\\render.sh'))
      .toBe('/c/Users/jonch/Projects/ethereal-flame-studio/unity/render.sh');
    expect(toGitBashPath('/tmp/render/audio.wav')).toBe('/tmp/render/audio.wav');
  });

  test.each(['relative/file.wav', '\\\\server\\share\\audio.wav', 'C:\\safe\\bad\nname.wav'])('rejects unsafe render path %s', (value) => {
    expect(() => toGitBashPath(value)).toThrow();
  });
});
