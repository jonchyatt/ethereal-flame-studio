'use client';

/**
 * RenderDialog - Server-side render submission UI
 *
 * Features:
 * - Output format selector (flat, 360 mono, 360 stereo)
 * - Resolution and FPS options
 * - Server render submission to queue
 * - Job progress tracking
 * - Google Drive sync option
 * - Whisper transcription option
 *
 * Phase 4/5 Integration
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Upload, MessageSquare, CheckCircle, AlertCircle, Loader2, Terminal, Monitor, Cloud, Cpu } from 'lucide-react';
import { useVisualStore } from '@/lib/stores/visualStore';
import { buildVisualConfigFromState, createConfigFromState, type LocalOutputFormat } from '@/lib/render/renderConfig';
import { ORB_AUDIO_RESPONSE_PRESET_VALUES, type OrbAudioResponsePresetId } from '@/lib/creator/orbAudioResponsePresets';

// Local render job shape (mirrors server LocalRenderJob)
interface LocalRenderJobStatus {
  id: string;
  status: string;
  progress: number;
  stage: string;
  message: string;
  outputPath: string | null;
  error: string | null;
}

// =============================================================================
// TYPES
// =============================================================================

type OutputCategory = 'flat' | '360-mono' | '360-stereo';

interface OutputFormatOption {
  value: string;
  label: string;
  resolution: string;
  category: OutputCategory;
  description?: string;
}

type RenderState = 'idle' | 'submitting' | 'queued' | 'rendering' | 'complete' | 'error';
type RemoteRenderTarget = 'cloud' | 'local-agent';

interface JobStatus {
  id: string;
  status: string;
  progress: number;
  currentStage: string;
  error?: string;
}

interface AvailableLocalAgent {
  agentId: string;
  label: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
  disabled: boolean;
  capabilities?: Record<string, unknown>;
}

interface CreatorCatalogStyleVariant {
  id: string;
  label: string;
  visualMode?: 'flame' | 'mist';
  orbAudioPreset?: OrbAudioResponsePresetId;
  description?: string;
}

interface CreatorCatalogExportPackVariant {
  outputFormat: string;
  fps: 30 | 60;
  platformTargets: string[];
  durationCapSec: number | null;
  safeZonePresetId: 'safe-16x9' | 'safe-9x16' | 'safe-1x1';
}

interface CreatorCatalogExportPack {
  id: string;
  label: string;
  description: string;
  variants: CreatorCatalogExportPackVariant[];
}

interface CreatorCatalogBundle {
  id: string;
  label: string;
  description: string;
  defaultExportPackIds: string[];
  styleVariants: CreatorCatalogStyleVariant[];
  channelPresetIds: string[];
}

interface CreatorCatalogData {
  bundles: CreatorCatalogBundle[];
  exportPacks: CreatorCatalogExportPack[];
}

type CreatorQueueState = 'idle' | 'loading-catalog' | 'submitting' | 'complete' | 'error';

interface CreatorQueueSummary {
  totalVariants: number;
  queuedVariants: number;
  currentLabel: string | null;
  packId: string | null;
  contentLibraryItemId: string | null;
  jobIds: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Format values must match schema in src/lib/render/schema/types.ts
const OUTPUT_FORMATS: OutputFormatOption[] = [
  // Flat formats
  { value: 'flat-1080p-landscape', label: '1080p Landscape', resolution: '1920x1080', category: 'flat' },
  { value: 'flat-1080p-portrait', label: '1080p Portrait', resolution: '1080x1920', category: 'flat', description: 'YouTube Shorts, TikTok, Reels' },
  { value: 'flat-1080p-square', label: '1080p Square', resolution: '1080x1080', category: 'flat', description: 'Instagram Feed, cross-post crops' },
  { value: 'flat-4k-landscape', label: '4K Landscape', resolution: '3840x2160', category: 'flat' },
  { value: 'flat-4k-portrait', label: '4K Portrait', resolution: '2160x3840', category: 'flat' },

  // 360 Mono formats
  { value: '360-mono-4k', label: '360 Mono 4K', resolution: '4096x2048', category: '360-mono', description: 'YouTube VR' },
  { value: '360-mono-6k', label: '360 Mono 6K', resolution: '6144x3072', category: '360-mono' },
  { value: '360-mono-8k', label: '360 Mono 8K', resolution: '8192x4096', category: '360-mono', description: 'Best quality VR' },

  // 360 Stereo formats (only 8K available)
  { value: '360-stereo-8k', label: '360 Stereo 8K', resolution: '8192x8192', category: '360-stereo', description: 'YouTube VR 3D' },
];

const CATEGORY_LABELS: Record<OutputCategory, string> = {
  'flat': 'Standard',
  '360-mono': '360 VR',
  '360-stereo': '360 VR 3D',
};

function parseTagList(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
}

function toggleStringSelection(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
}

// =============================================================================
// COMPONENT
// =============================================================================

interface RenderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  audioFile: File | null;
  audioPath?: string; // Server-side path if available
  preparedAssetId?: string; // Asset ID from audio-prep editor
  template?: string;
}

export function RenderDialog({ isOpen, onClose, audioFile, audioPath, preparedAssetId, template = 'flame' }: RenderDialogProps) {
  // State
  const [selectedFormat, setSelectedFormat] = useState<string>('flat-1080p-landscape');
  const [selectedFps, setSelectedFps] = useState<30 | 60>(30);
  const [enableTranscription, setEnableTranscription] = useState(true);
  const [enableGoogleDrive] = useState(false);
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remoteRenderTarget, setRemoteRenderTarget] = useState<RemoteRenderTarget>('cloud');
  const [remoteTargetAgentId, setRemoteTargetAgentId] = useState<string>('');
  const [localAgentPickerToken, setLocalAgentPickerToken] = useState<string>('');
  const [availableLocalAgents, setAvailableLocalAgents] = useState<AvailableLocalAgent[]>([]);
  const [localAgentsLoading, setLocalAgentsLoading] = useState(false);
  const [localAgentsError, setLocalAgentsError] = useState<string | null>(null);
  const [creatorAutomationEnabled, setCreatorAutomationEnabled] = useState(false);
  const [creatorCatalog, setCreatorCatalog] = useState<CreatorCatalogData | null>(null);
  const [creatorCatalogLoading, setCreatorCatalogLoading] = useState(false);
  const [creatorCatalogError, setCreatorCatalogError] = useState<string | null>(null);
  const [creatorBundleId, setCreatorBundleId] = useState<string>('brand-a');
  const [selectedCreatorExportPackIds, setSelectedCreatorExportPackIds] = useState<string[]>([]);
  const [selectedCreatorStyleVariantIds, setSelectedCreatorStyleVariantIds] = useState<string[]>([]);
  const [creatorMoodsInput, setCreatorMoodsInput] = useState('');
  const [creatorTopicsInput, setCreatorTopicsInput] = useState('');
  const [creatorKeywordsInput, setCreatorKeywordsInput] = useState('');
  const [creatorBpmInput, setCreatorBpmInput] = useState('');
  const [creatorQueueState, setCreatorQueueState] = useState<CreatorQueueState>('idle');
  const [creatorQueueError, setCreatorQueueError] = useState<string | null>(null);
  const [creatorQueueSummary, setCreatorQueueSummary] = useState<CreatorQueueSummary | null>(null);

  // Get selected category
  const selectedCategory = OUTPUT_FORMATS.find(f => f.value === selectedFormat)?.category || 'flat';

  // Local render state
  const [localRenderState, setLocalRenderState] = useState<'idle' | 'submitting' | 'active' | 'complete' | 'failed'>('idle');
  const [localJob, setLocalJob] = useState<LocalRenderJobStatus | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get visual state for export and local render
  const visualState = useVisualStore();

  const selectedBundle = creatorCatalog?.bundles.find((bundle) => bundle.id === creatorBundleId) || null;
  const selectedCreatorExportPacks = (creatorCatalog?.exportPacks || []).filter((pack) => selectedCreatorExportPackIds.includes(pack.id));

  // Track consecutive poll failures to detect missing render server
  const pollFailures = useRef(0);

  const fetchAvailableLocalAgents = useCallback(async () => {
    const token = localAgentPickerToken.trim();
    if (!token) {
      setAvailableLocalAgents([]);
      setLocalAgentsError('Enter Local Agent admin token to load agent picker');
      return;
    }

    setLocalAgentsLoading(true);
    setLocalAgentsError(null);
    try {
      const response = await fetch('/api/local-agent/agents', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to load local agents (${response.status})`);
      }
      const all = (data.data?.agents || []) as AvailableLocalAgent[];
      const online = all.filter((agent) => {
        if (agent.disabled) return false;
        if (!agent.expiresAt) return false;
        return new Date(agent.expiresAt).getTime() > Date.now();
      });
      setAvailableLocalAgents(online);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('localAgentAdminToken', token);
      }
    } catch (err) {
      setAvailableLocalAgents([]);
      setLocalAgentsError(err instanceof Error ? err.message : 'Failed to load local agents');
    } finally {
      setLocalAgentsLoading(false);
    }
  }, [localAgentPickerToken]);

  const fetchCreatorCatalog = useCallback(async () => {
    setCreatorCatalogLoading(true);
    setCreatorCatalogError(null);
    try {
      const response = await fetch('/api/creator/catalog');
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to load creator catalog (${response.status})`);
      }
      const catalog = (data.data || null) as CreatorCatalogData | null;
      setCreatorCatalog(catalog);
      if (catalog?.bundles?.length) {
        const preferredBundle = catalog.bundles.find((bundle) => bundle.id === creatorBundleId) || catalog.bundles[0];
        setCreatorBundleId(preferredBundle.id);
      }
    } catch (err) {
      setCreatorCatalogError(err instanceof Error ? err.message : 'Failed to load creator presets');
    } finally {
      setCreatorCatalogLoading(false);
    }
  }, [creatorBundleId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem('localAgentAdminToken') || '';
    if (saved) {
      setLocalAgentPickerToken(saved);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || remoteRenderTarget !== 'local-agent') return;
    if (!localAgentPickerToken.trim()) return;
    fetchAvailableLocalAgents().catch(() => {});
  }, [isOpen, remoteRenderTarget, localAgentPickerToken, fetchAvailableLocalAgents]);

  useEffect(() => {
    if (!isOpen || !creatorAutomationEnabled) return;
    if (creatorCatalog || creatorCatalogLoading) return;
    setCreatorQueueState('loading-catalog');
    fetchCreatorCatalog()
      .then(() => setCreatorQueueState('idle'))
      .catch(() => setCreatorQueueState('error'));
  }, [isOpen, creatorAutomationEnabled, creatorCatalog, creatorCatalogLoading, fetchCreatorCatalog]);

  useEffect(() => {
    if (!creatorCatalog?.bundles?.length) return;
    const bundle = creatorCatalog.bundles.find((item) => item.id === creatorBundleId) || creatorCatalog.bundles[0];
    if (!bundle) return;
    setSelectedCreatorExportPackIds((prev) => {
      if (prev.length > 0) {
        const valid = prev.filter((id) => creatorCatalog.exportPacks.some((pack) => pack.id === id));
        if (valid.length > 0) return valid;
      }
      return bundle.defaultExportPackIds;
    });
    setSelectedCreatorStyleVariantIds((prev) => {
      if (prev.length > 0) {
        const valid = prev.filter((id) => bundle.styleVariants.some((variant) => variant.id === id));
        if (valid.length > 0) return valid;
      }
      return bundle.styleVariants.map((variant) => variant.id);
    });
  }, [creatorCatalog, creatorBundleId]);

  // Poll job status when rendering
  useEffect(() => {
    if (!jobStatus?.id || renderState === 'complete' || renderState === 'error') {
      return;
    }

    pollFailures.current = 0;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render/${jobStatus.id}`);
        const data = await response.json();

        if (data.success) {
          pollFailures.current = 0;
          const job = data.data.job;
          setJobStatus({
            id: job.id,
            status: job.status,
            progress: job.progress,
            currentStage: job.currentStage,
            error: job.error?.message,
          });

          if (job.status === 'completed') {
            setRenderState('complete');
          } else if (job.status === 'failed' || job.status === 'cancelled') {
            setRenderState('error');
            setError(job.error?.message || 'Render failed');
          } else if (['analyzing', 'rendering', 'encoding', 'transcribing', 'uploading'].includes(job.status)) {
            setRenderState('rendering');
          }
        } else {
          pollFailures.current++;
          if (pollFailures.current >= 5) {
            clearInterval(pollInterval);
            setJobStatus(prev => prev ? {
              ...prev,
              currentStage: 'No render worker connected. Use "Export Config" for local rendering.',
              status: 'pending',
            } : prev);
          }
        }
      } catch {
        pollFailures.current++;
        if (pollFailures.current >= 5) {
          clearInterval(pollInterval);
          setJobStatus(prev => prev ? {
            ...prev,
            currentStage: 'No render worker connected. Use "Export Config" for local rendering.',
            status: 'pending',
          } : prev);
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobStatus?.id, renderState]);

  // Poll local render job status
  useEffect(() => {
    if (!localJob?.id || localRenderState === 'complete' || localRenderState === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render/local/${localJob.id}`);
        const data = await response.json();

        if (data.success) {
          const job = data.data.job;
          setLocalJob(job);

          if (job.status === 'complete') {
            setLocalRenderState('complete');
          } else if (job.status === 'failed' || job.status === 'cancelled') {
            setLocalRenderState('failed');
            setLocalError(job.error || 'Render failed');
          }
        }
      } catch {
        // Ignore poll failures for local render
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [localJob?.id, localRenderState]);

  // Start local render
  const handleLocalRender = useCallback(async () => {
    if (!audioFile && !preparedAssetId) {
      setLocalError('No audio file or prepared asset loaded');
      return;
    }

    setLocalRenderState('submitting');
    setLocalError(null);

    try {
      // Build visual config from current state
      const vs = visualState;
      const visualConfig = buildVisualConfigFromState(vs);

      let requestBody: Record<string, unknown>;

      if (preparedAssetId) {
        // Use prepared asset directly (no base64 encoding needed)
        requestBody = {
          assetId: preparedAssetId,
          audioFilename: audioFile?.name || `asset-${preparedAssetId}.wav`,
          format: selectedFormat,
          fps: selectedFps,
          visualConfig,
        };
      } else if (audioPath && (!audioFile || audioFile.size === 0)) {
        // Audio loaded from URL (mock file with no bytes) — pass URL to server to download
        requestBody = {
          audioUrl: audioPath,
          audioFilename: audioFile?.name || 'audio.mp3',
          format: selectedFormat,
          fps: selectedFps,
          visualConfig,
        };
      } else if (audioFile && audioFile.size > 0) {
        // Real file — base64 encode
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const commaIdx = result.indexOf(',');
            if (commaIdx === -1) { reject(new Error('Invalid data')); return; }
            resolve(result.substring(commaIdx + 1));
          };
          reader.onerror = () => reject(new Error('Failed to read audio file'));
          reader.readAsDataURL(audioFile);
        });
        requestBody = {
          audioBase64: base64,
          audioFilename: audioFile.name,
          format: selectedFormat,
          fps: selectedFps,
          visualConfig,
        };
      } else {
        setLocalError('No renderable audio available');
        setLocalRenderState('failed');
        return;
      }

      const response = await fetch('/api/render/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setLocalJob({
          id: data.data.jobId,
          status: 'preparing',
          progress: 0,
          stage: 'Preparing...',
          message: 'Starting local render...',
          outputPath: null,
          error: null,
        });
        setLocalRenderState('active');
      } else {
        setLocalError(data.error || 'Failed to start local render');
        setLocalRenderState('failed');
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to start local render');
      setLocalRenderState('failed');
    }
  }, [audioFile, audioPath, preparedAssetId, selectedFormat, selectedFps, visualState]);

  // Cancel local render
  const handleCancelLocal = useCallback(async () => {
    if (localJob?.id) {
      try {
        await fetch(`/api/render/local/${localJob.id}`, { method: 'DELETE' });
      } catch { /* ignore */ }
    }
    setLocalRenderState('idle');
    setLocalJob(null);
    setLocalError(null);
  }, [localJob?.id]);

  // Reset local render state
  const handleResetLocal = useCallback(() => {
    setLocalRenderState('idle');
    setLocalJob(null);
    setLocalError(null);
  }, []);

  // Convert File to base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file || file.size === 0) {
        reject(new Error('Invalid or empty file'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (!result || typeof result !== 'string') {
          reject(new Error('Failed to read file'));
          return;
        }
        // Remove data URL prefix (e.g., "data:audio/mpeg;base64,")
        const commaIndex = result.indexOf(',');
        if (commaIndex === -1) {
          reject(new Error('Invalid file data format'));
          return;
        }
        const base64 = result.substring(commaIndex + 1);
        if (!base64 || base64.length < 10) {
          reject(new Error('File appears to be empty or corrupted'));
          return;
        }
        console.log('[RenderDialog] Base64 conversion successful, length:', base64.length);
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('FileReader error: ' + reader.error?.message));
      reader.readAsDataURL(file);
    });
  }, []);

  const buildRemoteAudioInput = useCallback(async () => {
    let audioInput: { type: string; assetId?: string; path?: string; url?: string; data?: string; filename?: string; mimeType?: string };

    if (preparedAssetId) {
      audioInput = { type: 'asset', assetId: preparedAssetId };
    } else if (audioPath) {
      if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
        audioInput = { type: 'url', url: audioPath, filename: audioFile?.name };
      } else {
        audioInput = { type: 'path', path: audioPath };
      }
    } else if (audioFile) {
      const base64Data = await fileToBase64(audioFile);
      const mimeType = audioFile.type || 'audio/mpeg';
      audioInput = { type: 'base64', data: base64Data, filename: audioFile.name, mimeType };
    } else {
      throw new Error('No audio source');
    }

    return audioInput;
  }, [preparedAssetId, audioPath, audioFile, fileToBase64]);

  const buildVariantVisualConfig = useCallback((
    baseVisualConfig: Record<string, unknown>,
    styleVariant?: CreatorCatalogStyleVariant,
  ) => {
    const nextConfig: Record<string, unknown> = { ...baseVisualConfig };
    if (styleVariant?.visualMode) {
      nextConfig.mode = styleVariant.visualMode;
    }
    if (styleVariant?.orbAudioPreset) {
      Object.assign(nextConfig, ORB_AUDIO_RESPONSE_PRESET_VALUES[styleVariant.orbAudioPreset]);
    }
    return nextConfig;
  }, []);

  const submitRemoteRenderJob = useCallback(async (params: {
    audioInput: { type: string; assetId?: string; path?: string; url?: string; data?: string; filename?: string; mimeType?: string };
    outputFormat: string;
    fps: 30 | 60;
    visualConfig: Record<string, unknown>;
    visualMode: 'flame' | 'mist';
  }) => {
    const body = {
      audio: params.audioInput,
      outputFormat: params.outputFormat,
      fps: params.fps,
      renderSettings: { visualMode: params.visualMode },
      transcribe: enableTranscription,
      upload: enableGoogleDrive,
      metadata: {
        renderTarget: remoteRenderTarget === 'local-agent' ? 'local-agent' : 'cloud',
        targetAgentId: remoteRenderTarget === 'local-agent' && remoteTargetAgentId.trim() ? remoteTargetAgentId.trim() : undefined,
        visualConfig: params.visualConfig,
      },
    };

    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      let errorMsg = data.error?.message || `Failed to submit render (${response.status})`;
      if (data.error?.details) {
        const details = Object.entries(data.error.details)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join('; ');
        errorMsg += ` (${details})`;
      }
      throw new Error(errorMsg);
    }
    return data.data as {
      jobId: string;
      status: string;
      estimatedDuration?: number;
    };
  }, [
    enableGoogleDrive,
    enableTranscription,
    remoteRenderTarget,
    remoteTargetAgentId,
  ]);

  // Submit render job
  const handleSubmit = useCallback(async () => {
    if (!audioFile && !audioPath && !preparedAssetId) {
      setError('No audio file selected');
      return;
    }

    setRenderState('submitting');
    setError(null);

    try {
      const audioInput = await buildRemoteAudioInput();
      const visualMode = template === 'etherealMist' ? 'mist' : 'flame';
      const visualConfig = buildVisualConfigFromState(visualState) as Record<string, unknown>;
      const result = await submitRemoteRenderJob({
        audioInput,
        outputFormat: selectedFormat,
        fps: selectedFps,
        visualConfig,
        visualMode,
      });

      setJobStatus({
        id: result.jobId,
        status: 'pending',
        progress: 0,
        currentStage: 'Queued',
      });
      setRenderState('queued');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
      setRenderState('error');
    }
  }, [
    audioFile,
    audioPath,
    preparedAssetId,
    selectedFormat,
    selectedFps,
    template,
    visualState,
    buildRemoteAudioInput,
    submitRemoteRenderJob,
  ]);

  const handleRenderAndQueuePublish = useCallback(async () => {
    if (!audioFile && !audioPath && !preparedAssetId) {
      setCreatorQueueError('No audio file or prepared asset selected');
      setCreatorQueueState('error');
      return;
    }
    if (!creatorCatalog) {
      setCreatorQueueError('Creator catalog not loaded yet');
      setCreatorQueueState('error');
      return;
    }
    const bundle = creatorCatalog.bundles.find((b) => b.id === creatorBundleId) || null;
    if (!bundle) {
      setCreatorQueueError('Select a creator bundle');
      setCreatorQueueState('error');
      return;
    }
    const selectedStyleVariants = bundle.styleVariants.filter((variant) => selectedCreatorStyleVariantIds.includes(variant.id));
    if (selectedStyleVariants.length === 0) {
      setCreatorQueueError('Select at least one style variant');
      setCreatorQueueState('error');
      return;
    }
    const selectedPacks = creatorCatalog.exportPacks.filter((pack) => selectedCreatorExportPackIds.includes(pack.id));
    if (selectedPacks.length === 0) {
      setCreatorQueueError('Select at least one export pack');
      setCreatorQueueState('error');
      return;
    }

    setCreatorQueueState('submitting');
    setCreatorQueueError(null);
    setCreatorQueueSummary({
      totalVariants: 0,
      queuedVariants: 0,
      currentLabel: 'Preparing creator batch...',
      packId: null,
      contentLibraryItemId: null,
      jobIds: [],
    });

    try {
      const audioInput = await buildRemoteAudioInput();
      const baseVisualConfig = buildVisualConfigFromState(visualState) as Record<string, unknown>;
      const defaultVisualMode = (baseVisualConfig.mode === 'mist' || template === 'etherealMist') ? 'mist' : 'flame';
      const audioName = audioFile?.name || audioPath?.split(/[/\\]/).pop() || (preparedAssetId ? `asset-${preparedAssetId}.wav` : 'audio.mp3');

      type PlannedVariant = CreatorCatalogExportPackVariant & {
        styleVariant: CreatorCatalogStyleVariant;
        variantId: string;
      };

      const plannedMap = new Map<string, PlannedVariant>();
      for (const styleVariant of selectedStyleVariants) {
        for (const pack of selectedPacks) {
          for (const variant of pack.variants) {
            const key = [
              styleVariant.id,
              variant.outputFormat,
              variant.fps,
              variant.durationCapSec ?? 'null',
              variant.safeZonePresetId,
            ].join('|');
            const existing = plannedMap.get(key);
            if (existing) {
              existing.platformTargets = Array.from(new Set([...existing.platformTargets, ...variant.platformTargets]));
              continue;
            }
            plannedMap.set(key, {
              ...variant,
              styleVariant,
              variantId: `${styleVariant.id}__${variant.outputFormat}__${variant.fps}`,
            });
          }
        }
      }

      const plannedVariants = Array.from(plannedMap.values());
      if (plannedVariants.length === 0) {
        throw new Error('No creator variants resolved from the selected export packs');
      }

      setCreatorQueueSummary({
        totalVariants: plannedVariants.length,
        queuedVariants: 0,
        currentLabel: 'Submitting render jobs...',
        packId: null,
        contentLibraryItemId: null,
        jobIds: [],
      });

      const queuedVariants: Array<{
        variantId: string;
        outputFormat: string;
        fps: 30 | 60;
        styleVariant: CreatorCatalogStyleVariant;
        platformTargets: string[];
        durationCapSec: number | null;
        safeZonePresetId: 'safe-16x9' | 'safe-9x16' | 'safe-1x1';
        renderJobId: string;
      }> = [];

      for (let i = 0; i < plannedVariants.length; i++) {
        const planned = plannedVariants[i];
        setCreatorQueueSummary((prev) => prev ? {
          ...prev,
          totalVariants: plannedVariants.length,
          currentLabel: `Queueing ${i + 1}/${plannedVariants.length}: ${planned.styleVariant.label} • ${planned.outputFormat}`,
        } : prev);

        const visualConfig = buildVariantVisualConfig(baseVisualConfig, planned.styleVariant);
        const visualMode = (planned.styleVariant.visualMode || (visualConfig.mode as 'flame' | 'mist' | undefined) || defaultVisualMode);

        const renderResult = await submitRemoteRenderJob({
          audioInput,
          outputFormat: planned.outputFormat,
          fps: planned.fps,
          visualConfig,
          visualMode,
        });

        queuedVariants.push({
          variantId: planned.variantId,
          outputFormat: planned.outputFormat,
          fps: planned.fps,
          styleVariant: planned.styleVariant,
          platformTargets: planned.platformTargets,
          durationCapSec: planned.durationCapSec ?? null,
          safeZonePresetId: planned.safeZonePresetId,
          renderJobId: renderResult.jobId,
        });

        setCreatorQueueSummary((prev) => prev ? {
          ...prev,
          totalVariants: plannedVariants.length,
          queuedVariants: i + 1,
          currentLabel: `Queued ${i + 1}/${plannedVariants.length}`,
          jobIds: [...prev.jobIds, renderResult.jobId],
        } : prev);
      }

      const creatorResponse = await fetch('/api/creator/render-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: {
            audioName,
            assetId: preparedAssetId || null,
            audioPath: audioPath && !/^https?:\/\//i.test(audioPath) ? audioPath : null,
            sourceUrl: audioPath && /^https?:\/\//i.test(audioPath) ? audioPath : null,
          },
          bundleId: bundle.id,
          exportPackIds: selectedPacks.map((pack) => pack.id),
          variants: queuedVariants.map((variant) => ({
            variantId: variant.variantId,
            outputFormat: variant.outputFormat,
            fps: variant.fps,
            styleVariant: variant.styleVariant,
            platformTargets: variant.platformTargets,
            durationCapSec: variant.durationCapSec,
            safeZonePresetId: variant.safeZonePresetId,
            renderJobId: variant.renderJobId,
            renderTarget: remoteRenderTarget === 'local-agent' ? 'local-agent' : 'cloud',
            targetAgentId: remoteRenderTarget === 'local-agent' && remoteTargetAgentId.trim() ? remoteTargetAgentId.trim() : null,
          })),
          target: remoteRenderTarget === 'local-agent' ? 'local-agent' : 'cloud',
          targetAgentId: remoteRenderTarget === 'local-agent' && remoteTargetAgentId.trim() ? remoteTargetAgentId.trim() : null,
          channelPresetIds: bundle.channelPresetIds,
          tags: {
            moods: parseTagList(creatorMoodsInput),
            topics: parseTagList(creatorTopicsInput),
            keywords: parseTagList(creatorKeywordsInput),
            bpm: creatorBpmInput.trim() ? Number(creatorBpmInput) : null,
          },
          metadata: {
            createdFrom: 'RenderDialog',
            selectedCategory,
            selectedBaseFormat: selectedFormat,
            selectedFps,
            creatorAutomationEnabled: true,
          },
        }),
      });
      const creatorData = await creatorResponse.json();
      if (!creatorResponse.ok || creatorData.success === false) {
        throw new Error(creatorData.error?.message || `Failed to save creator pack (${creatorResponse.status})`);
      }

      setCreatorQueueSummary((prev) => prev ? {
        ...prev,
        currentLabel: 'Creator pack queued',
        packId: creatorData.data?.pack?.packId || null,
        contentLibraryItemId: creatorData.data?.contentItem?.itemId || null,
      } : prev);
      setCreatorQueueState('complete');
    } catch (err) {
      setCreatorQueueError(err instanceof Error ? err.message : 'Failed to queue creator batch');
      setCreatorQueueState('error');
    }
  }, [
    audioFile,
    audioPath,
    preparedAssetId,
    creatorCatalog,
    creatorBundleId,
    selectedCreatorStyleVariantIds,
    selectedCreatorExportPackIds,
    buildRemoteAudioInput,
    visualState,
    template,
    buildVariantVisualConfig,
    submitRemoteRenderJob,
    remoteRenderTarget,
    remoteTargetAgentId,
    creatorMoodsInput,
    creatorTopicsInput,
    creatorKeywordsInput,
    creatorBpmInput,
    selectedCategory,
    selectedFormat,
    selectedFps,
  ]);

  // Reset state
  const handleReset = useCallback(() => {
    setRenderState('idle');
    setJobStatus(null);
    setError(null);
  }, []);

  // State for exported config info
  const [exportedConfig, setExportedConfig] = useState<{ filename: string; command: string } | null>(null);

  // Export config for local CLI rendering
  const handleExportConfig = useCallback(() => {
    const audioFileName = audioFile?.name || 'audio.mp3';
    const baseName = audioFileName.replace(/\.[^.]+$/, '');
    const outputFileName = `${baseName}_${selectedFormat}.mp4`;
    const configFilename = `${baseName}_render.json`;
    const batFilename = `${baseName}_render.bat`;

    const config = createConfigFromState(
      `./${audioFileName}`,
      `./output/${outputFileName}`,
      selectedFormat as LocalOutputFormat,
      selectedFps,
      {
        ...visualState,
        currentMode: visualState.currentMode,
      }
    );

    // Download config JSON
    const configBlob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const configUrl = URL.createObjectURL(configBlob);
    const configLink = document.createElement('a');
    configLink.href = configUrl;
    configLink.download = configFilename;
    configLink.click();
    URL.revokeObjectURL(configUrl);

    // Create and download .bat file
    const batContent = `@echo off
echo ========================================
echo   Ethereal Flame Local Render
echo ========================================
echo.
echo Config: ${configFilename}
echo Audio:  ${audioFileName}
echo Output: output/${outputFileName}
echo.

REM Change to the ethereal-flame-studio directory
cd /d "%~dp0"
cd ..

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please place this file in the ethereal-flame-studio folder
    echo        or a subfolder like "renders"
    pause
    exit /b 1
)

REM Create output directory
if not exist "output" mkdir output

REM Run the render
echo Starting render...
echo.
call npm run render:local -- --config "%~dp0${configFilename}"

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo Render complete! Check output folder.
) else (
    echo Render failed. Check errors above.
)
echo ========================================
pause
`;

    const batBlob = new Blob([batContent], { type: 'application/x-bat' });
    const batUrl = URL.createObjectURL(batBlob);
    const batLink = document.createElement('a');
    batLink.href = batUrl;
    batLink.download = batFilename;

    // Small delay to ensure config downloads first
    setTimeout(() => {
      batLink.click();
      URL.revokeObjectURL(batUrl);
    }, 100);

    // Show success message
    setError(null);
    setExportedConfig({
      filename: configFilename,
      command: batFilename,
    });
  }, [audioFile, selectedFormat, selectedFps, template, visualState]);

  // Copy command to clipboard
  const handleCopyCommand = useCallback(() => {
    if (exportedConfig) {
      navigator.clipboard.writeText(exportedConfig.command);
    }
  }, [exportedConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-lg mx-4 bg-gray-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Render Video</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Audio File Info */}
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/80">
                {audioFile?.name || audioPath?.split(/[/\\]/).pop() || 'No audio selected'}
              </span>
            </div>
          </div>

          {/* Format Category Tabs */}
          <div className="flex gap-2">
            {(Object.keys(CATEGORY_LABELS) as OutputCategory[]).map((category) => (
              <button
                key={category}
                onClick={() => {
                  const firstFormat = OUTPUT_FORMATS.find(f => f.category === category);
                  if (firstFormat) setSelectedFormat(firstFormat.value);
                }}
                disabled={renderState !== 'idle'}
                className={`
                  flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${selectedCategory === category
                    ? 'bg-blue-500/30 border-blue-400/50 text-blue-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                  }
                  border
                  ${renderState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-2">
            {OUTPUT_FORMATS.filter(f => f.category === selectedCategory).map((format) => (
              <button
                key={format.value}
                onClick={() => setSelectedFormat(format.value)}
                disabled={renderState !== 'idle'}
                className={`
                  p-3 rounded-lg text-left transition-all
                  ${selectedFormat === format.value
                    ? 'bg-blue-500/30 border-blue-400/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                  border
                  ${renderState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="text-sm font-medium text-white">{format.label}</div>
                <div className="text-xs text-white/50">{format.resolution}</div>
                {format.description && (
                  <div className="text-xs text-blue-300/70 mt-1">{format.description}</div>
                )}
              </button>
            ))}
          </div>

          {/* FPS Selection */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Frame Rate</label>
            <div className="grid grid-cols-2 gap-2">
              {([30, 60] as const).map((fps) => (
                <button
                  key={fps}
                  onClick={() => setSelectedFps(fps)}
                  disabled={renderState !== 'idle'}
                  className={`
                    p-2 rounded-lg text-sm font-medium transition-all
                    ${selectedFps === fps
                      ? 'bg-blue-500/30 border-blue-400/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }
                    border
                    ${renderState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableTranscription}
                onChange={(e) => setEnableTranscription(e.target.checked)}
                disabled={renderState !== 'idle'}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
              />
              <MessageSquare className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/80">Generate description (Whisper)</span>
            </label>

            {/* Google Drive upload hidden - requires rclone on local render machine */}
          </div>

          {/* Remote Render Target */}
          <div className="space-y-3">
            <label className="block text-sm text-white/60">Remote Render Target</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRemoteRenderTarget('cloud')}
                disabled={renderState !== 'idle'}
                className={`
                  p-3 rounded-lg text-left border transition-all
                  ${remoteRenderTarget === 'cloud'
                    ? 'bg-blue-500/25 border-blue-400/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
                  ${renderState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Cloud className="w-4 h-4" />
                  Cloud
                </div>
                <div className="text-xs text-white/50 mt-1">Modal / server-side provider</div>
              </button>
              <button
                onClick={() => setRemoteRenderTarget('local-agent')}
                disabled={renderState !== 'idle'}
                className={`
                  p-3 rounded-lg text-left border transition-all
                  ${remoteRenderTarget === 'local-agent'
                    ? 'bg-teal-500/25 border-teal-400/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
                  ${renderState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Cpu className="w-4 h-4" />
                  Local Agent
                </div>
                <div className="text-xs text-white/50 mt-1">Viewer/home GPU agent pulls the job</div>
              </button>
            </div>

            {remoteRenderTarget === 'local-agent' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Agent Picker Token</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={localAgentPickerToken}
                      onChange={(e) => setLocalAgentPickerToken(e.target.value)}
                      disabled={renderState !== 'idle'}
                      placeholder="LOCAL_AGENT_ADMIN_SECRET (saved in Local Agents page)"
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm bg-white/5 text-white placeholder:text-white/30 ${
                        renderState !== 'idle'
                          ? 'border-white/10 opacity-50 cursor-not-allowed'
                          : 'border-white/15 focus:outline-none focus:border-teal-400/60'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => fetchAvailableLocalAgents()}
                      disabled={renderState !== 'idle' || localAgentsLoading}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                        renderState !== 'idle' || localAgentsLoading
                          ? 'border-white/10 text-white/30 cursor-not-allowed'
                          : 'border-white/15 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {localAgentsLoading ? 'Loading…' : 'Load'}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/35 mt-1">
                    Uses `/api/local-agent/agents` to populate the dropdown. Token is stored locally in this browser.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Target Agent</label>
                  {availableLocalAgents.length > 0 ? (
                    <select
                      value={remoteTargetAgentId}
                      onChange={(e) => setRemoteTargetAgentId(e.target.value)}
                      disabled={renderState !== 'idle'}
                      className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/5 text-white ${
                        renderState !== 'idle'
                          ? 'border-white/10 opacity-50 cursor-not-allowed'
                          : 'border-white/15 focus:outline-none focus:border-teal-400/60'
                      }`}
                    >
                      <option value="">Any available agent</option>
                      {availableLocalAgents.map((agent) => {
                        const label = agent.label?.trim() || agent.agentId;
                        const hostname =
                          agent.capabilities && typeof agent.capabilities.hostname === 'string'
                            ? ` (${agent.capabilities.hostname})`
                            : '';
                        return (
                          <option key={agent.agentId} value={agent.agentId}>
                            {label}{hostname}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={remoteTargetAgentId}
                      onChange={(e) => setRemoteTargetAgentId(e.target.value)}
                      disabled={renderState !== 'idle'}
                      placeholder="Manual Target Agent ID (optional)"
                      className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/5 text-white placeholder:text-white/30 ${
                        renderState !== 'idle'
                          ? 'border-white/10 opacity-50 cursor-not-allowed'
                          : 'border-white/15 focus:outline-none focus:border-teal-400/60'
                      }`}
                    />
                  )}

                  {localAgentsError ? (
                    <p className="text-[10px] text-amber-200/80 mt-1">{localAgentsError}</p>
                  ) : (
                    <p className="text-[10px] text-white/35 mt-1">
                      {availableLocalAgents.length > 0
                        ? `${availableLocalAgents.length} online local agent${availableLocalAgents.length === 1 ? '' : 's'} available`
                        : 'Leave blank to allow any available agent to claim the job.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Creator Automation / Queue Publish */}
          <div className="space-y-3 p-3 rounded-lg border border-white/10 bg-white/5">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <div className="text-sm text-white/80">Creator Automation (Render + Queue Publish)</div>
                <div className="text-xs text-white/40">
                  Queue multiple format/style variants, then save metadata + recut + thumbnail plans.
                </div>
              </div>
              <input
                type="checkbox"
                checked={creatorAutomationEnabled}
                onChange={(e) => {
                  setCreatorAutomationEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setCreatorQueueState('idle');
                    setCreatorQueueError(null);
                    setCreatorQueueSummary(null);
                  }
                }}
                disabled={renderState !== 'idle' || localRenderState !== 'idle'}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
              />
            </label>

            {creatorAutomationEnabled && (
              <div className="space-y-3">
                {!creatorCatalog && (
                  <button
                    type="button"
                    onClick={() => fetchCreatorCatalog()}
                    disabled={creatorCatalogLoading}
                    className={`w-full py-2 rounded-lg text-sm border ${
                      creatorCatalogLoading
                        ? 'border-white/10 text-white/30 cursor-not-allowed'
                        : 'border-white/15 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {creatorCatalogLoading ? 'Loading Creator Catalog...' : 'Load Creator Presets'}
                  </button>
                )}

                {creatorCatalog && (
                  <>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Preset Bundle</label>
                      <select
                        value={creatorBundleId}
                        onChange={(e) => setCreatorBundleId(e.target.value)}
                        disabled={renderState !== 'idle' || localRenderState !== 'idle'}
                        className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/5 text-white ${
                          renderState !== 'idle' || localRenderState !== 'idle'
                            ? 'border-white/10 opacity-50 cursor-not-allowed'
                            : 'border-white/15 focus:outline-none focus:border-blue-400/60'
                        }`}
                      >
                        {creatorCatalog.bundles.map((bundle) => (
                          <option key={bundle.id} value={bundle.id}>
                            {bundle.label}
                          </option>
                        ))}
                      </select>
                      {selectedBundle?.description && (
                        <p className="text-[10px] text-white/40 mt-1">{selectedBundle.description}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs text-white/50">Export Packs (formats/platforms)</label>
                        <button
                          type="button"
                          onClick={() => setSelectedCreatorExportPackIds(creatorCatalog.exportPacks.map((pack) => pack.id))}
                          className="text-[10px] text-white/40 hover:text-white/70"
                        >
                          Select all
                        </button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-auto pr-1">
                        {creatorCatalog.exportPacks.map((pack) => {
                          const selected = selectedCreatorExportPackIds.includes(pack.id);
                          return (
                            <label
                              key={pack.id}
                              className={`block rounded-lg border p-2 cursor-pointer transition-colors ${
                                selected
                                  ? 'border-blue-400/40 bg-blue-500/10'
                                  : 'border-white/10 bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => setSelectedCreatorExportPackIds((prev) => toggleStringSelection(prev, pack.id))}
                                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs text-white/90">{pack.label}</div>
                                  <div className="text-[10px] text-white/40">{pack.description}</div>
                                  <div className="text-[10px] text-blue-200/70 mt-0.5">
                                    {pack.variants.length} variant{pack.variants.length === 1 ? '' : 's'}: {pack.variants.map((v) => v.outputFormat).join(', ')}
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs text-white/50">Style Variants</label>
                        <button
                          type="button"
                          onClick={() => setSelectedCreatorStyleVariantIds(selectedBundle?.styleVariants.map((variant) => variant.id) || [])}
                          className="text-[10px] text-white/40 hover:text-white/70"
                        >
                          Select all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(selectedBundle?.styleVariants || []).map((variant) => {
                          const selected = selectedCreatorStyleVariantIds.includes(variant.id);
                          return (
                            <label
                              key={variant.id}
                              className={`block rounded-lg border p-2 cursor-pointer transition-colors ${
                                selected
                                  ? 'border-teal-400/40 bg-teal-500/10'
                                  : 'border-white/10 bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => setSelectedCreatorStyleVariantIds((prev) => toggleStringSelection(prev, variant.id))}
                                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs text-white/90">{variant.label}</div>
                                  <div className="text-[10px] text-white/45">
                                    {(variant.visualMode ? `mode:${variant.visualMode}` : 'mode:current') +
                                      (variant.orbAudioPreset ? ` • orb:${variant.orbAudioPreset}` : ' • orb:current')}
                                  </div>
                                  {variant.description && <div className="text-[10px] text-white/35">{variant.description}</div>}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-white/45 mb-1">Moods (comma-separated)</label>
                        <input
                          type="text"
                          value={creatorMoodsInput}
                          onChange={(e) => setCreatorMoodsInput(e.target.value)}
                          placeholder="calm, ethereal, dark"
                          className="w-full px-2 py-2 rounded-lg border border-white/15 bg-white/5 text-white text-xs placeholder:text-white/25"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/45 mb-1">Topics (comma-separated)</label>
                        <input
                          type="text"
                          value={creatorTopicsInput}
                          onChange={(e) => setCreatorTopicsInput(e.target.value)}
                          placeholder="focus, meditation"
                          className="w-full px-2 py-2 rounded-lg border border-white/15 bg-white/5 text-white text-xs placeholder:text-white/25"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/45 mb-1">Keywords (comma-separated)</label>
                        <input
                          type="text"
                          value={creatorKeywordsInput}
                          onChange={(e) => setCreatorKeywordsInput(e.target.value)}
                          placeholder="phonk, visualizer"
                          className="w-full px-2 py-2 rounded-lg border border-white/15 bg-white/5 text-white text-xs placeholder:text-white/25"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/45 mb-1">BPM (optional)</label>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          step={1}
                          value={creatorBpmInput}
                          onChange={(e) => setCreatorBpmInput(e.target.value)}
                          placeholder="140"
                          className="w-full px-2 py-2 rounded-lg border border-white/15 bg-white/5 text-white text-xs placeholder:text-white/25"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-white/35">
                      <span>
                        Estimated queue count: {(selectedBundle?.styleVariants.filter((v) => selectedCreatorStyleVariantIds.includes(v.id)).length || 0) *
                          selectedCreatorExportPacks.reduce((sum, pack) => sum + pack.variants.length, 0)}
                      </span>
                      <div className="flex items-center gap-3">
                        <a href="/creator/library" target="_blank" rel="noreferrer" className="hover:text-white/70">
                          Creator Library
                        </a>
                        <a href="/creator/thumbnail-planner" target="_blank" rel="noreferrer" className="hover:text-white/70">
                          Thumbnail Planner
                        </a>
                      </div>
                    </div>
                  </>
                )}

                {creatorCatalogError && (
                  <p className="text-xs text-amber-200/80">{creatorCatalogError}</p>
                )}

                {creatorQueueSummary && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2 space-y-1">
                    <div className="text-xs text-white/80">
                      {creatorQueueState === 'submitting' ? 'Queueing creator batch...' :
                        creatorQueueState === 'complete' ? 'Creator batch queued' :
                        creatorQueueState === 'error' ? 'Creator batch error' : 'Creator batch'}
                    </div>
                    <div className="text-[10px] text-white/45">
                      {creatorQueueSummary.queuedVariants}/{creatorQueueSummary.totalVariants} variants queued
                      {creatorQueueSummary.currentLabel ? ` • ${creatorQueueSummary.currentLabel}` : ''}
                    </div>
                    {creatorQueueSummary.packId && (
                      <div className="text-[10px] text-green-200/80">
                        Pack: {creatorQueueSummary.packId}
                        {creatorQueueSummary.contentLibraryItemId ? ` • Library Item: ${creatorQueueSummary.contentLibraryItemId}` : ''}
                      </div>
                    )}
                  </div>
                )}

                {creatorQueueError && (
                  <p className="text-xs text-red-300">{creatorQueueError}</p>
                )}
              </div>
            )}
          </div>

          {/* Progress/Status */}
          {renderState !== 'idle' && renderState !== 'error' && (
            <div className="p-4 bg-white/5 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                {renderState === 'complete' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                <span className="text-sm text-white/80">
                  {renderState === 'submitting' && 'Submitting job...'}
                  {renderState === 'queued' && (jobStatus?.currentStage !== 'Queued' ? jobStatus?.currentStage : 'Waiting in queue...')}
                  {renderState === 'rendering' && (jobStatus?.currentStage || 'Rendering...')}
                  {renderState === 'complete' && 'Render complete!'}
                </span>
              </div>

              {jobStatus && renderState === 'rendering' && (
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>{jobStatus.currentStage}</span>
                    <span>{jobStatus.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${jobStatus.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {/* Export Success */}
          {exportedConfig && (
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-green-300 font-medium">Config exported!</span>
              </div>
              <div className="text-xs text-white/60 space-y-1 ml-7">
                <p>1. Place both downloaded files in a folder with your audio</p>
                <p>2. Double-click <span className="text-green-300 font-mono">{exportedConfig.command}</span> to render</p>
              </div>
              <button
                onClick={() => setExportedConfig(null)}
                className="mt-2 ml-7 text-xs text-white/40 hover:text-white/60"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Local Render Progress */}
          {localRenderState !== 'idle' && localRenderState !== 'failed' && localJob && (
            <div className="p-4 bg-white/5 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                {localRenderState === 'complete' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                )}
                <span className="text-sm text-white/80">
                  {localRenderState === 'submitting' && 'Starting local render...'}
                  {localRenderState === 'active' && (localJob.stage || 'Rendering...')}
                  {localRenderState === 'complete' && 'Local render complete!'}
                </span>
              </div>

              {localRenderState === 'active' && (
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>{localJob.message}</span>
                    <span>{localJob.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${localJob.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {localRenderState === 'complete' && localJob.outputPath && (
                <div className="text-xs text-white/50">
                  Output: <span className="text-green-300 font-mono">{localJob.outputPath}</span>
                </div>
              )}
            </div>
          )}

          {/* Local Render Error */}
          {localError && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm text-red-300">{localError}</span>
                <button
                  onClick={handleResetLocal}
                  className="block mt-1 text-xs text-red-400/60 hover:text-red-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex flex-col gap-3">
          {/* Idle / Error state — show action buttons */}
          {(renderState === 'idle' || renderState === 'error') && localRenderState === 'idle' ? (
            <>
              {/* Render Locally — primary action */}
              <button
                onClick={handleLocalRender}
                disabled={!audioFile && !preparedAssetId}
                className={`
                  w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                  ${audioFile || preparedAssetId
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }
                `}
              >
                <Monitor className="w-5 h-5" />
                Render Locally
              </button>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!audioFile && !audioPath && !preparedAssetId}
                  className={`
                    flex-1 py-2 rounded-lg font-medium transition-colors
                    ${audioFile || audioPath || preparedAssetId
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }
                  `}
                >
                  {remoteRenderTarget === 'local-agent' ? 'Queue to Local Agent' : 'Cloud Render'}
                </button>
              </div>
              {creatorAutomationEnabled && (
                <button
                  onClick={handleRenderAndQueuePublish}
                  disabled={
                    !audioFile && !audioPath && !preparedAssetId ||
                    creatorQueueState === 'submitting' ||
                    creatorCatalogLoading
                  }
                  className={`
                    w-full py-2 rounded-lg font-medium transition-colors
                    ${(!audioFile && !audioPath && !preparedAssetId) || creatorQueueState === 'submitting' || creatorCatalogLoading
                      ? 'bg-white/10 text-white/35 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-500 text-white'}
                  `}
                >
                  {creatorQueueState === 'submitting'
                    ? 'Queueing Creator Batch...'
                    : remoteRenderTarget === 'local-agent'
                      ? 'Render + Queue Publish (Local Agent)'
                      : 'Render + Queue Publish'}
                </button>
              )}
              {/* Export Config for Local CLI */}
              <button
                onClick={handleExportConfig}
                disabled={!audioFile && !audioPath && !preparedAssetId}
                className={`
                  w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                  ${audioFile || audioPath || preparedAssetId
                    ? 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                    : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
                  }
                  text-xs
                `}
              >
                <Terminal className="w-3 h-3" />
                Export Config (CLI)
              </button>
            </>
          ) : localRenderState === 'active' || localRenderState === 'submitting' ? (
            <button
              onClick={handleCancelLocal}
              className="w-full py-2 rounded-lg font-medium bg-red-500/30 border border-red-500/40 text-red-300 hover:bg-red-500/40 transition-colors"
            >
              Cancel Local Render
            </button>
          ) : localRenderState === 'complete' ? (
            <div className="flex gap-3">
              <button
                onClick={handleResetLocal}
                className="flex-1 py-2 rounded-lg font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
              >
                Render Another
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
                Done
              </button>
            </div>
          ) : localRenderState === 'failed' ? (
            <div className="flex gap-3">
              <button
                onClick={handleResetLocal}
                className="flex-1 py-2 rounded-lg font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          ) : renderState === 'complete' ? (
            <>
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-lg font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
              >
                Render Another
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
                Done
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
            >
              Close (continues in background)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
