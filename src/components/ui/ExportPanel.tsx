'use client';

/**
 * ExportPanel - UI component for browser-based video exports
 *
 * Features:
 * - Preset selector (1080p/4K, landscape/portrait)
 * - FPS selector (30/60)
 * - Export button with progress bar
 * - Cancel and download buttons
 * - Matches ControlPanel styling (bg-black/70 backdrop-blur-md)
 *
 * Phase 3, Plan 03-03
 */

import { useState, useRef, useCallback } from 'react';

/**
 * Export preset options
 */
export type ExportPreset = '1080p-landscape' | '1080p-portrait' | '4k-landscape' | '4k-portrait';

/**
 * Export state
 */
export type ExportState = 'idle' | 'analyzing' | 'rendering' | 'encoding' | 'complete' | 'error';

/**
 * Preset display information
 */
const PRESET_INFO: Record<ExportPreset, { label: string; resolution: string }> = {
  '1080p-landscape': { label: '1080p 16:9', resolution: '1920x1080' },
  '1080p-portrait': { label: '1080p 9:16', resolution: '1080x1920' },
  '4k-landscape': { label: '4K 16:9', resolution: '3840x2160' },
  '4k-portrait': { label: '4K 9:16', resolution: '2160x3840' },
};

interface ExportPanelProps {
  /**
   * Audio file to use for export (required)
   */
  audioFile?: File | null;

  /**
   * Callback when export starts
   * Returns cleanup function
   */
  onExportStart?: (config: {
    preset: ExportPreset;
    fps: 30 | 60;
    onProgress: (percent: number, stage: string) => void;
    signal: AbortSignal;
  }) => Promise<{ success: boolean; downloadUrl?: string; error?: string }>;
}

export function ExportPanel({ audioFile, onExportStart }: ExportPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>('1080p-landscape');
  const [selectedFPS, setSelectedFPS] = useState<30 | 60>(30);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleExport = useCallback(async () => {
    if (!audioFile) {
      setErrorMessage('Please upload an audio file first');
      setExportState('error');
      return;
    }

    if (!onExportStart) {
      setErrorMessage('Export handler not configured');
      setExportState('error');
      return;
    }

    // Reset state
    setExportState('analyzing');
    setProgress(0);
    setCurrentStage('Initializing...');
    setErrorMessage(null);
    setDownloadUrl(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await onExportStart({
        preset: selectedPreset,
        fps: selectedFPS,
        onProgress: (percent, stage) => {
          setProgress(percent);
          setCurrentStage(stage);

          // Update state based on stage
          if (stage.includes('Analyzing')) {
            setExportState('analyzing');
          } else if (stage.includes('Rendering')) {
            setExportState('rendering');
          } else if (stage.includes('Encoding')) {
            setExportState('encoding');
          }
        },
        signal: abortControllerRef.current.signal,
      });

      if (result.success) {
        setExportState('complete');
        if (result.downloadUrl) {
          setDownloadUrl(result.downloadUrl);
        }
      } else {
        setExportState('error');
        setErrorMessage(result.error || 'Export failed');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setExportState('idle');
        setCurrentStage('Cancelled');
      } else {
        setExportState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Export failed');
      }
    }
  }, [audioFile, onExportStart, selectedPreset, selectedFPS]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setExportState('idle');
    setProgress(0);
    setCurrentStage('');
  }, []);

  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `export_${selectedPreset}_${selectedFPS}fps.mp4`;
      link.click();
    }
  }, [downloadUrl, selectedPreset, selectedFPS]);

  const isExporting = ['analyzing', 'rendering', 'encoding'].includes(exportState);

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-12 h-12 rounded-full
          bg-black/70 backdrop-blur-md
          border border-white/20
          flex items-center justify-center
          text-white/80 hover:text-white
          transition-all
          shadow-lg
        "
        title="Export Video"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      </button>

      {/* Export Panel */}
      {isExpanded && (
        <div className="
          absolute bottom-14 right-0
          w-80
          bg-black/80 backdrop-blur-md
          border border-white/20
          rounded-lg
          p-4
          shadow-xl
        ">
          <h3 className="text-white font-medium mb-4">Export Video</h3>

          {/* Audio File Status */}
          <div className="mb-4 p-2 bg-white/5 rounded text-sm">
            {audioFile ? (
              <span className="text-green-400">Audio: {audioFile.name}</span>
            ) : (
              <span className="text-yellow-400">Upload audio in controls first</span>
            )}
          </div>

          {/* Preset Selector */}
          <div className="mb-4">
            <label className="block text-white/80 text-sm mb-2">Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRESET_INFO) as ExportPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSelectedPreset(preset)}
                  disabled={isExporting}
                  className={`
                    p-2 rounded text-sm transition-all
                    ${selectedPreset === preset
                      ? 'bg-blue-500/50 border-blue-400/50 text-white'
                      : 'bg-white/10 border-white/10 text-white/70 hover:text-white'
                    }
                    border
                    ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="font-medium">{PRESET_INFO[preset].label}</div>
                  <div className="text-xs text-white/50">{PRESET_INFO[preset].resolution}</div>
                </button>
              ))}
            </div>
          </div>

          {/* FPS Selector */}
          <div className="mb-4">
            <label className="block text-white/80 text-sm mb-2">Frame Rate</label>
            <div className="grid grid-cols-2 gap-2">
              {([30, 60] as const).map((fps) => (
                <button
                  key={fps}
                  onClick={() => setSelectedFPS(fps)}
                  disabled={isExporting}
                  className={`
                    p-2 rounded text-sm transition-all
                    ${selectedFPS === fps
                      ? 'bg-blue-500/50 border-blue-400/50 text-white'
                      : 'bg-white/10 border-white/10 text-white/70 hover:text-white'
                    }
                    border
                    ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{currentStage}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {exportState === 'error' && errorMessage && (
            <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {exportState === 'complete' && (
            <div className="mb-4 p-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm">
              Export complete!
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {exportState === 'idle' || exportState === 'error' ? (
              <button
                onClick={handleExport}
                disabled={!audioFile}
                className={`
                  flex-1 py-2 rounded font-medium transition-all min-h-[44px]
                  ${audioFile
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }
                `}
              >
                Export
              </button>
            ) : isExporting ? (
              <button
                onClick={handleCancel}
                className="
                  flex-1 py-2 rounded font-medium
                  bg-red-500/50 hover:bg-red-500/70
                  text-white transition-all min-h-[44px]
                "
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={handleDownload}
                disabled={!downloadUrl}
                className="
                  flex-1 py-2 rounded font-medium
                  bg-green-500 hover:bg-green-600
                  text-white transition-all min-h-[44px]
                "
              >
                Download
              </button>
            )}

            {exportState === 'complete' && (
              <button
                onClick={() => {
                  setExportState('idle');
                  setDownloadUrl(null);
                }}
                className="
                  px-4 py-2 rounded font-medium
                  bg-white/10 hover:bg-white/20
                  text-white/80 transition-all min-h-[44px]
                "
              >
                New
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
