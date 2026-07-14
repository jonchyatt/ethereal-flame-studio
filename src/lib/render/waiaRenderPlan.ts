import { z } from 'zod';
import {
  canonicalSha256,
  PlaylistRenderEngineSchema,
  PlaylistRenderTargetSchema,
  type PlaylistRenderEngine,
  type PlaylistRenderTarget,
} from '@/lib/playlist-batch/schema';

export const WAIA_RENDER_CORE_VERSION = 'waia-render-core-v1' as const;
export const WAIA_RENDER_VARIANT_VERSION = 'waia-render-variant-v1' as const;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const SafeTokenSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_.-]+$/);
const UnityPresetSchema = z.enum(['meditation', 'ambient', 'fire_cinema', 'edm']);
const UnitySceneSchema = z.enum(['Example']);
const RenderFpsSchema = z.union([z.literal(30), z.literal(60)]);

export const ApprovedInputArtifactSchema = z.object({
  assetId: z.string().uuid(),
  sha256: Sha256Schema,
  sizeBytes: z.number().int().positive(),
  mixRecipeId: z.string().min(1).max(512),
  mixRecipeFingerprint: Sha256Schema,
  sourceAssetIds: z.array(z.string().min(1)).min(1),
});
export type ApprovedInputArtifact = z.infer<typeof ApprovedInputArtifactSchema>;

export const WaiaRenderCoreInputSchema = z.object({
  input: ApprovedInputArtifactSchema,
  outputFormat: z.string().min(1).max(128),
  fps: RenderFpsSchema,
  preset: UnityPresetSchema,
  scene: UnitySceneSchema,
  visualSemantic: z.record(z.string(), z.unknown()).default({}),
  target: PlaylistRenderTargetSchema,
  targetAgentId: SafeTokenSchema.nullable().default(null),
  reviewGeneration: z.number().int().nonnegative(),
  brandPackVersion: SafeTokenSchema,
  experimentId: z.string().min(1).max(256),
});
export type WaiaRenderCoreInput = z.infer<typeof WaiaRenderCoreInputSchema>;

export type WaiaRenderCore = WaiaRenderCoreInput & {
  schemaVersion: typeof WAIA_RENDER_CORE_VERSION;
};

export type WaiaRenderVariant = {
  schemaVersion: typeof WAIA_RENDER_VARIANT_VERSION;
  core: WaiaRenderCore;
  coreHash: string;
  engine: PlaylistRenderEngine;
  variantFingerprint: string;
};

export type UnityOutputSpec = {
  mode: 'flat' | '360mono' | '360stereo';
  resolution: 1920 | 3840 | 4096 | 6144 | 8192;
  width: 1920 | 3840 | 4096 | 6144 | 8192;
  height: 1080 | 2160 | 2048 | 3072 | 4096;
  requireVrMetadata: boolean;
  stereoMode: 'mono' | 'top-bottom';
};

const UNITY_OUTPUTS: Readonly<Record<string, UnityOutputSpec>> = Object.freeze({
  'flat-1080p-landscape': {
    mode: 'flat',
    resolution: 1920,
    width: 1920,
    height: 1080,
    requireVrMetadata: false,
    stereoMode: 'mono',
  },
  'flat-4k-landscape': {
    mode: 'flat',
    resolution: 3840,
    width: 3840,
    height: 2160,
    requireVrMetadata: false,
    stereoMode: 'mono',
  },
  '360-mono-4k': {
    mode: '360mono',
    resolution: 4096,
    width: 4096,
    height: 2048,
    requireVrMetadata: true,
    stereoMode: 'mono',
  },
  '360-mono-6k': {
    mode: '360mono',
    resolution: 6144,
    width: 6144,
    height: 3072,
    requireVrMetadata: true,
    stereoMode: 'mono',
  },
  '360-mono-8k': {
    mode: '360mono',
    resolution: 8192,
    width: 8192,
    height: 4096,
    requireVrMetadata: true,
    stereoMode: 'mono',
  },
  '360-stereo-8k': {
    mode: '360stereo',
    resolution: 8192,
    width: 8192,
    height: 4096,
    requireVrMetadata: true,
    stereoMode: 'top-bottom',
  },
});

export const UnityRenderPlanSchema = z.object({
  engine: z.literal('unity'),
  transport: z.literal('local-agent'),
  target: z.enum(['home', 'local-agent']),
  targetAgentId: SafeTokenSchema.nullable(),
  outputFormat: z.enum([
    'flat-1080p-landscape', 'flat-4k-landscape', '360-mono-4k',
    '360-mono-6k', '360-mono-8k', '360-stereo-8k',
  ]),
  fps: RenderFpsSchema,
  preset: UnityPresetSchema,
  scene: UnitySceneSchema,
  outputName: SafeTokenSchema,
  mode: z.enum(['flat', '360mono', '360stereo']),
  resolution: z.union([z.literal(1920), z.literal(3840), z.literal(4096), z.literal(6144), z.literal(8192)]),
  width: z.union([z.literal(1920), z.literal(3840), z.literal(4096), z.literal(6144), z.literal(8192)]),
  height: z.union([z.literal(1080), z.literal(2160), z.literal(2048), z.literal(3072), z.literal(4096)]),
  requireVrMetadata: z.boolean(),
  stereoMode: z.enum(['mono', 'top-bottom']),
}).superRefine((plan, context) => {
  const expected = UNITY_OUTPUTS[plan.outputFormat];
  for (const field of ['mode', 'resolution', 'width', 'height', 'requireVrMetadata', 'stereoMode'] as const) {
    if (plan[field] !== expected[field]) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} contradicts outputFormat` });
    }
  }
});
export type UnityRenderPlan = z.infer<typeof UnityRenderPlanSchema>;

export function createWaiaRenderCore(input: WaiaRenderCoreInput): WaiaRenderCore {
  const parsed = WaiaRenderCoreInputSchema.parse(input);
  if (parsed.target === 'cloud' && parsed.targetAgentId) {
    throw new Error('targetAgentId is invalid for cloud renders');
  }
  if (parsed.target === 'home' && parsed.targetAgentId) {
    throw new Error('targetAgentId is invalid for the untargeted home lane');
  }
  return { schemaVersion: WAIA_RENDER_CORE_VERSION, ...parsed };
}

export function hashWaiaRenderCore(core: WaiaRenderCore): string {
  if (core.schemaVersion !== WAIA_RENDER_CORE_VERSION) {
    throw new Error(`Unsupported WAIA render core version: ${String(core.schemaVersion)}`);
  }
  return canonicalSha256(core);
}

export function createWaiaRenderVariant(
  core: WaiaRenderCore,
  engine: PlaylistRenderEngine,
): WaiaRenderVariant {
  const parsedEngine = PlaylistRenderEngineSchema.parse(engine);
  const coreHash = hashWaiaRenderCore(core);
  return {
    schemaVersion: WAIA_RENDER_VARIANT_VERSION,
    core,
    coreHash,
    engine: parsedEngine,
    variantFingerprint: canonicalSha256({
      schemaVersion: WAIA_RENDER_VARIANT_VERSION,
      coreHash,
      engine: parsedEngine,
    }),
  };
}

export function assertVariantApprovalBinding(
  variant: WaiaRenderVariant,
  approval: { variantFingerprint: string; reviewGeneration: number },
): void {
  if (approval.variantFingerprint !== variant.variantFingerprint) {
    throw new Error('Approval fingerprint does not bind this render variant');
  }
  if (approval.reviewGeneration !== variant.core.reviewGeneration) {
    throw new Error('Approval generation does not bind this render variant');
  }
}

export function resolveRenderTransport(
  engine: PlaylistRenderEngine,
  target: PlaylistRenderTarget,
): 'cloud' | 'local-agent' {
  const parsedEngine = PlaylistRenderEngineSchema.parse(engine);
  const parsedTarget = PlaylistRenderTargetSchema.parse(target);
  if (parsedEngine === 'unity' && parsedTarget === 'cloud') {
    throw new Error('Unity renders require home or local-agent execution');
  }
  return parsedTarget === 'cloud' ? 'cloud' : 'local-agent';
}

export function getUnityOutputSpec(outputFormat: string): UnityOutputSpec {
  const spec = UNITY_OUTPUTS[outputFormat];
  if (!spec) {
    throw new Error(`Unity output format is unsupported: ${outputFormat}`);
  }
  return { ...spec };
}

export function assertSafeRenderToken(value: string, label: string): string {
  const parsed = SafeTokenSchema.safeParse(value);
  if (!parsed.success) throw new Error(`${label} must be a safe token`);
  return parsed.data;
}

export function toGitBashPath(value: string): string {
  if (!value || /[\0\r\n]/.test(value)) throw new Error('Path contains unsafe control characters');
  if (/^\\\\/.test(value) || /^\/\//.test(value)) throw new Error('UNC paths are not supported');
  const windows = value.match(/^([A-Za-z]):[\\/](.*)$/);
  if (windows) {
    const rest = windows[2].replace(/\\/g, '/');
    return `/${windows[1].toLowerCase()}/${rest}`;
  }
  if (value.startsWith('/')) return value;
  throw new Error('Render paths must be absolute');
}

export function buildUnityRenderPlan(input: {
  target: PlaylistRenderTarget;
  targetAgentId?: string | null;
  outputFormat: string;
  fps: 30 | 60;
  visualConfig: Record<string, unknown>;
  outputName: string;
}): UnityRenderPlan {
  const target = PlaylistRenderTargetSchema.parse(input.target);
  const transport = resolveRenderTransport('unity', target);
  if (transport !== 'local-agent' || target === 'cloud') {
    throw new Error('Unity renders require the local-agent transport');
  }
  const targetAgentId = input.targetAgentId ?? null;
  if (target === 'home' && targetAgentId) {
    throw new Error('targetAgentId is invalid for the untargeted home lane');
  }
  if (targetAgentId) assertSafeRenderToken(targetAgentId, 'targetAgentId');
  if ('puppeteer' in input.visualConfig) {
    throw new Error('Puppeteer-specific visual config is invalid for Unity');
  }
  const preset = UnityPresetSchema.safeParse(input.visualConfig.skyboxPreset);
  if (!preset.success) throw new Error('Unity render requires an approved skyboxPreset');
  const scene = UnitySceneSchema.safeParse(input.visualConfig.scene);
  if (!scene.success) throw new Error('Unity render requires an approved scene');
  const fps = RenderFpsSchema.parse(input.fps);
  const outputName = assertSafeRenderToken(input.outputName, 'outputName');
  return UnityRenderPlanSchema.parse({
    engine: 'unity',
    transport: 'local-agent',
    target,
    targetAgentId,
    outputFormat: input.outputFormat,
    fps,
    preset: preset.data,
    scene: scene.data,
    outputName,
    ...getUnityOutputSpec(input.outputFormat),
  });
}
