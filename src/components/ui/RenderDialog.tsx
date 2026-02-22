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
import { X, Upload, MessageSquare, CheckCircle, AlertCircle, Loader2, Download, Terminal, Monitor } from 'lucide-react';
import { useVisualStore } from '@/lib/stores/visualStore';
import { buildVisualConfigFromState, createConfigFromState, type LocalOutputFormat } from '@/lib/render/renderConfig';

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

interface JobStatus {
  id: string;
  status: string;
  progress: number;
  currentStage: string;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Format values must match schema in src/lib/render/schema/types.ts
const OUTPUT_FORMATS: OutputFormatOption[] = [
  // Flat formats
  { value: 'flat-1080p-landscape', label: '1080p Landscape', resolution: '1920x1080', category: 'flat' },
  { value: 'flat-1080p-portrait', label: '1080p Portrait', resolution: '1080x1920', category: 'flat', description: 'YouTube Shorts, TikTok, Reels' },
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

  // Get selected category
  const selectedCategory = OUTPUT_FORMATS.find(f => f.value === selectedFormat)?.category || 'flat';

  // Local render state
  const [localRenderState, setLocalRenderState] = useState<'idle' | 'submitting' | 'active' | 'complete' | 'failed'>('idle');
  const [localJob, setLocalJob] = useState<LocalRenderJobStatus | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get visual state for export and local render
  const visualState = useVisualStore();

  // Track consecutive poll failures to detect missing render server
  const pollFailures = useRef(0);

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
      } else {
        // Legacy: convert audio file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const commaIdx = result.indexOf(',');
            if (commaIdx === -1) { reject(new Error('Invalid data')); return; }
            resolve(result.substring(commaIdx + 1));
          };
          reader.onerror = () => reject(new Error('Failed to read audio file'));
          reader.readAsDataURL(audioFile!);
        });
        requestBody = {
          audioBase64: base64,
          audioFilename: audioFile!.name,
          format: selectedFormat,
          fps: selectedFps,
          visualConfig,
        };
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
  }, [audioFile, preparedAssetId, selectedFormat, selectedFps, visualState]);

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

  // Submit render job
  const handleSubmit = useCallback(async () => {
    if (!audioFile && !audioPath && !preparedAssetId) {
      setError('No audio file selected');
      return;
    }

    setRenderState('submitting');
    setError(null);

    try {
      // Build audio input - prefer preparedAssetId > audioPath > audioFile
      let audioInput: { type: string; assetId?: string; path?: string; url?: string; data?: string; filename?: string; mimeType?: string };

      if (preparedAssetId) {
        audioInput = { type: 'asset', assetId: preparedAssetId };
        console.log('[RenderDialog] Using prepared asset:', preparedAssetId);
      } else if (audioPath) {
        // Check if it's a URL or a local path
        if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
          audioInput = { type: 'url', url: audioPath, filename: audioFile?.name };
          console.log('[RenderDialog] Using URL audio:', audioPath);
        } else {
          audioInput = { type: 'path', path: audioPath };
          console.log('[RenderDialog] Using path audio:', audioPath);
        }
      } else if (audioFile) {
        console.log('[RenderDialog] Converting audio file:', audioFile.name, 'size:', audioFile.size, 'type:', audioFile.type);
        const base64Data = await fileToBase64(audioFile);
        // mimeType is required by the API schema
        const mimeType = audioFile.type || 'audio/mpeg';
        audioInput = { type: 'base64', data: base64Data, filename: audioFile.name, mimeType };
        console.log('[RenderDialog] Audio input ready, data length:', base64Data.length);
      } else {
        throw new Error('No audio source');
      }

      // Map template names to schema values
      // UI uses 'etherealFlame'/'etherealMist', schema expects 'flame'/'mist'
      const visualMode = template === 'etherealMist' ? 'mist' : 'flame';

      // Build request body
      const body = {
        audio: audioInput,
        outputFormat: selectedFormat,
        fps: selectedFps,
        renderSettings: { visualMode },
        transcribe: enableTranscription,
        upload: enableGoogleDrive,
      };

      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setJobStatus({
          id: data.data.jobId,
          status: 'pending',
          progress: 0,
          currentStage: 'Queued',
        });
        setRenderState('queued');
      } else {
        // Show detailed validation errors if available
        let errorMsg = data.error?.message || 'Failed to submit job';
        if (data.error?.details) {
          const details = Object.entries(data.error.details)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
            .join('; ');
          errorMsg += ` (${details})`;
        }
        console.error('[RenderDialog] Submission failed:', data.error);
        setError(errorMsg);
        setRenderState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
      setRenderState('error');
    }
  }, [audioFile, audioPath, preparedAssetId, selectedFormat, selectedFps, template, enableTranscription, enableGoogleDrive]);

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
                  Cloud Render
                </button>
              </div>
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
