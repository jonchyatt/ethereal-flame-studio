'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TemplateCard } from './TemplateCard';
import { AudioControlsRef } from './AudioControls';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useAudioStore } from '@/lib/stores/audioStore';
import { BUILT_IN_PRESETS } from '@/lib/templates/builtInPresets';
import { OUTPUT_FORMATS, CATEGORY_LABELS, type OutputCategory } from '@/lib/render/renderApi';
import { buildVisualConfigFromState } from '@/lib/render/renderConfig';

type ViewMode = 'landing' | 'experience' | 'designer' | 'create';
type RenderTarget = 'cloud' | 'local-agent';
type RenderState = 'idle' | 'submitting' | 'queued' | 'rendering' | 'complete' | 'error';

interface JobStatus {
  id: string;
  status: string;
  progress: number;
  currentStage: string;
  error?: string;
}

interface CreateOverlayProps {
  viewMode: ViewMode;
  onBack: () => void;
  onGoToDesigner: () => void;
  audioControlsRef: React.RefObject<AudioControlsRef | null>;
}

export function CreateOverlay({ viewMode, onBack, onGoToDesigner, audioControlsRef }: CreateOverlayProps) {
  const templates = useTemplateStore((state) => state.templates);
  const activeTemplateId = useTemplateStore((state) => state.activeTemplateId);
  const loadTemplate = useTemplateStore((state) => state.loadTemplate);
  const applyTemplateSettings = useVisualStore((state) => state.applyTemplateSettings);
  const audioFile = useAudioStore((state) => state.audioFile);
  const audioFileName = useAudioStore((state) => state.audioFileName);
  const audioUrl = useAudioStore((state) => state.audioUrl);
  const preparedAssetId = useAudioStore((state) => state.preparedAssetId);
  const currentMode = useVisualStore((state) => state.currentMode);
  const visualState = useVisualStore();

  const [selectedFormats, setSelectedFormats] = useState<string[]>(['flat-1080p-landscape']);
  const [selectedFps, setSelectedFps] = useState<30 | 60>(30);
  const [renderTarget, setRenderTarget] = useState<RenderTarget>('cloud');
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enableTranscription, setEnableTranscription] = useState(true);
  const pollFailures = useRef(0);

  // Initialize built-in presets if needed
  useEffect(() => {
    const { templates: current } = useTemplateStore.getState();
    if (!current.some(t => t.isBuiltIn)) {
      useTemplateStore.setState((state) => ({
        templates: [...BUILT_IN_PRESETS, ...state.templates.filter(t => !t.isBuiltIn)],
      }));
    }
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    const settings = loadTemplate(templateId);
    if (settings) {
      applyTemplateSettings(settings);
    }
  };

  const toggleFormat = (value: string) => {
    setSelectedFormats(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const totalEstimateMinutes = selectedFormats.reduce((sum, fmt) => {
    const found = OUTPUT_FORMATS.find(f => f.value === fmt);
    return sum + (found?.estimateMinutes || 0);
  }, 0);

  const canRender = (audioFile || preparedAssetId) && selectedFormats.length > 0;

  // Submit render
  const handleRender = useCallback(async () => {
    if (!canRender) return;

    setRenderState('submitting');
    setError(null);

    try {
      const visualConfig = buildVisualConfigFromState(visualState);

      // Build FormData for audio upload
      const formData = new FormData();
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      formData.append('outputFormat', selectedFormats[0]); // Primary format
      formData.append('fps', String(selectedFps));
      formData.append('enableTranscription', String(enableTranscription));
      formData.append('visualConfig', JSON.stringify(visualConfig));
      formData.append('template', currentMode);
      if (audioUrl) {
        formData.append('audioPath', audioUrl);
      }
      if (preparedAssetId) {
        formData.append('preparedAssetId', preparedAssetId);
      }

      const response = await fetch('/api/render', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.jobId) {
        setJobStatus({
          id: data.data.jobId,
          status: 'queued',
          progress: 0,
          currentStage: 'Queued',
        });
        setRenderState('queued');
      } else {
        throw new Error(data.error?.message || 'Failed to submit render');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit render');
      setRenderState('error');
    }
  }, [canRender, audioFile, audioUrl, preparedAssetId, selectedFormats, selectedFps, enableTranscription, visualState, currentMode]);

  // Poll job status
  useEffect(() => {
    if (!jobStatus?.id || renderState === 'complete' || renderState === 'error') return;

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
          }
        }
      } catch {
        pollFailures.current++;
        if (pollFailures.current >= 5) {
          clearInterval(pollInterval);
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobStatus?.id, renderState]);

  if (viewMode !== 'create') return null;

  // Group formats by category
  const categories = Object.keys(CATEGORY_LABELS) as OutputCategory[];

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="
              px-3 py-2
              bg-black/60 border border-white/15 rounded-full
              text-white/80 hover:text-white hover:bg-black/80
              transition-all text-sm flex items-center gap-2
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h2 className="text-white text-xl font-light">Create Video</h2>
        </div>
        <button
          onClick={onGoToDesigner}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Edit in Designer
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
        {/* Source: Template */}
        <section>
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">Template</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {templates.map((template) => (
              <div key={template.id} className="w-20 h-20 flex-shrink-0">
                <TemplateCard
                  template={template}
                  isActive={template.id === activeTemplateId}
                  onSelect={() => handleSelectTemplate(template.id)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Source: Audio */}
        <section>
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">Audio</h3>
          <div className="flex items-center gap-3">
            {audioFileName ? (
              <span className="text-white text-sm">{audioFileName}</span>
            ) : (
              <span className="text-white/30 text-sm">No audio loaded</span>
            )}
            <button
              onClick={() => audioControlsRef.current?.triggerFileUpload()}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
            >
              {audioFileName ? 'Change Audio' : 'Load Audio'}
            </button>
          </div>
        </section>

        {/* Build Manifest */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white text-lg font-medium mb-4">Build Manifest</h3>

          {/* Output formats */}
          <div className="space-y-4 mb-6">
            {categories.map((category) => {
              const formats = OUTPUT_FORMATS.filter(f => f.category === category);
              if (formats.length === 0) return null;
              return (
                <div key={category}>
                  <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">
                    {CATEGORY_LABELS[category]}
                  </h4>
                  <div className="space-y-1">
                    {formats.map((fmt) => (
                      <label
                        key={fmt.value}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                          ${selectedFormats.includes(fmt.value) ? 'bg-white/10' : 'hover:bg-white/5'}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFormats.includes(fmt.value)}
                          onChange={() => toggleFormat(fmt.value)}
                          className="accent-green-500"
                        />
                        <span className="text-white text-sm flex-1">{fmt.label}</span>
                        <span className="text-white/40 text-xs font-mono">{fmt.resolution}</span>
                        <span className="text-white/30 text-xs">~{fmt.estimateMinutes} min</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FPS */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-white/60 text-sm">Frame rate:</span>
            <button
              onClick={() => setSelectedFps(30)}
              className={`px-3 py-1 rounded text-sm transition-colors ${selectedFps === 30 ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              30 fps
            </button>
            <button
              onClick={() => setSelectedFps(60)}
              className={`px-3 py-1 rounded text-sm transition-colors ${selectedFps === 60 ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              60 fps
            </button>
          </div>

          {/* Render Target */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-white/60 text-sm">Render target:</span>
            <button
              onClick={() => setRenderTarget('cloud')}
              className={`px-3 py-1 rounded text-sm transition-colors ${renderTarget === 'cloud' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              Cloud
            </button>
            <button
              onClick={() => setRenderTarget('local-agent')}
              className={`px-3 py-1 rounded text-sm transition-colors ${renderTarget === 'local-agent' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              Local Agent
            </button>
          </div>

          {/* Transcription */}
          <label className="flex items-center gap-2 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={enableTranscription}
              onChange={(e) => setEnableTranscription(e.target.checked)}
              className="accent-green-500"
            />
            <span className="text-white/60 text-sm">Enable Whisper transcription</span>
          </label>

          {/* Summary */}
          <div className="border-t border-white/10 pt-4 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/50">Formats selected</span>
              <span className="text-white">{selectedFormats.length}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/50">Estimated total time</span>
              <span className="text-white">~{totalEstimateMinutes} min</span>
            </div>
          </div>

          {/* Render Button */}
          <button
            onClick={handleRender}
            disabled={!canRender || renderState === 'submitting' || renderState === 'queued' || renderState === 'rendering'}
            className={`
              w-full px-6 py-4 rounded-xl text-lg font-medium transition-all
              ${canRender && renderState === 'idle'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/30'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
              }
            `}
          >
            {renderState === 'submitting' ? 'Submitting...' :
             renderState === 'queued' || renderState === 'rendering' ? 'Rendering...' :
             renderState === 'complete' ? 'Complete!' :
             renderState === 'error' ? 'Retry Render' :
             'RENDER'}
          </button>

          {!canRender && renderState === 'idle' && (
            <p className="text-white/30 text-xs text-center mt-2">
              {!audioFile && !preparedAssetId ? 'Load audio to enable rendering' : 'Select at least one output format'}
            </p>
          )}

          {/* Job Progress */}
          {jobStatus && renderState !== 'idle' && (
            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Stage</span>
                <span className="text-white">{jobStatus.currentStage}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    renderState === 'complete' ? 'bg-green-500' :
                    renderState === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">{jobStatus.progress}%</span>
                <span className={`${renderState === 'complete' ? 'text-green-400' : renderState === 'error' ? 'text-red-400' : 'text-white/40'}`}>
                  {renderState === 'complete' ? 'Done' : renderState === 'error' ? error || 'Failed' : jobStatus.status}
                </span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && renderState === 'error' && !jobStatus && (
            <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
          )}
        </section>
      </div>
    </div>
  );
}
