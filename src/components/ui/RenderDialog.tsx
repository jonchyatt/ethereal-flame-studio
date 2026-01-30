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

import { useState, useCallback, useEffect } from 'react';
import { X, Upload, Cloud, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
  template?: string;
}

export function RenderDialog({ isOpen, onClose, audioFile, audioPath, template = 'flame' }: RenderDialogProps) {
  // State
  const [selectedFormat, setSelectedFormat] = useState<string>('flat-1080p-landscape');
  const [selectedFps, setSelectedFps] = useState<30 | 60>(30);
  const [enableTranscription, setEnableTranscription] = useState(true);
  const [enableGoogleDrive, setEnableGoogleDrive] = useState(true);
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get selected category
  const selectedCategory = OUTPUT_FORMATS.find(f => f.value === selectedFormat)?.category || 'flat';

  // Poll job status when rendering
  useEffect(() => {
    if (!jobStatus?.id || renderState === 'complete' || renderState === 'error') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render/${jobStatus.id}`);
        const data = await response.json();

        if (data.success) {
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
        }
      } catch {
        // Ignore poll errors
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobStatus?.id, renderState]);

  // Convert File to base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/mpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Submit render job
  const handleSubmit = useCallback(async () => {
    if (!audioFile && !audioPath) {
      setError('No audio file selected');
      return;
    }

    setRenderState('submitting');
    setError(null);

    try {
      // Build audio input - convert file to base64 if needed
      let audioInput: { type: string; path?: string; data?: string; filename?: string };

      if (audioPath) {
        audioInput = { type: 'path', path: audioPath };
      } else if (audioFile) {
        const base64Data = await fileToBase64(audioFile);
        // mimeType is required by the API schema
        const mimeType = audioFile.type || 'audio/mpeg';
        audioInput = { type: 'base64', data: base64Data, filename: audioFile.name, mimeType };
      } else {
        throw new Error('No audio source');
      }

      // Build request body
      const body = {
        audio: audioInput,
        outputFormat: selectedFormat,
        fps: selectedFps,
        renderSettings: { template },
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
        setError(data.error?.message || 'Failed to submit job');
        setRenderState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
      setRenderState('error');
    }
  }, [audioFile, audioPath, selectedFormat, selectedFps, template, enableTranscription, enableGoogleDrive]);

  // Reset state
  const handleReset = useCallback(() => {
    setRenderState('idle');
    setJobStatus(null);
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
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

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableGoogleDrive}
                onChange={(e) => setEnableGoogleDrive(e.target.checked)}
                disabled={renderState !== 'idle'}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
              />
              <Cloud className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/80">Upload to Google Drive</span>
            </label>
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
                  {renderState === 'queued' && 'Waiting in queue...'}
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          {renderState === 'idle' || renderState === 'error' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!audioFile && !audioPath}
                className={`
                  flex-1 py-2 rounded-lg font-medium transition-colors
                  ${audioFile || audioPath
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }
                `}
              >
                Start Render
              </button>
            </>
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
