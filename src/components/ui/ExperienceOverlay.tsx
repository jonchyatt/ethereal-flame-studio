'use client';

import { useEffect } from 'react';
import { TemplateCard } from './TemplateCard';
import { AudioControlsRef } from './AudioControls';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useVisualStore } from '@/lib/stores/visualStore';
import { useAudioStore } from '@/lib/stores/audioStore';
import { BUILT_IN_PRESETS } from '@/lib/templates/builtInPresets';

type ViewMode = 'landing' | 'experience' | 'designer' | 'create';

interface ExperienceOverlayProps {
  viewMode: ViewMode;
  onBack: () => void;
  audioControlsRef: React.RefObject<AudioControlsRef | null>;
}

export function ExperienceOverlay({ viewMode, onBack, audioControlsRef }: ExperienceOverlayProps) {
  const templates = useTemplateStore((state) => state.templates);
  const activeTemplateId = useTemplateStore((state) => state.activeTemplateId);
  const loadTemplate = useTemplateStore((state) => state.loadTemplate);
  const applyTemplateSettings = useVisualStore((state) => state.applyTemplateSettings);
  const audioFileName = useAudioStore((state) => state.audioFileName);
  const isPlaying = useAudioStore((state) => state.isPlaying);

  // Initialize built-in presets if needed
  useEffect(() => {
    const { templates: current } = useTemplateStore.getState();
    if (!current.some(t => t.isBuiltIn)) {
      useTemplateStore.setState((state) => ({
        templates: [...BUILT_IN_PRESETS, ...state.templates.filter(t => !t.isBuiltIn)],
      }));
    }
  }, []);

  const handleSelect = (templateId: string) => {
    const settings = loadTemplate(templateId);
    if (settings) {
      applyTemplateSettings(settings);
    }
  };

  if (viewMode !== 'experience') return null;

  return (
    <>
      {/* Back button */}
      <button
        onClick={onBack}
        className="
          fixed top-3 left-3 z-[60]
          px-3 py-2
          bg-black/60 backdrop-blur-sm
          border border-white/15 rounded-full
          text-white/80 hover:text-white hover:bg-black/80
          transition-all text-sm
          flex items-center gap-2
        "
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Bottom bar with template strip + audio */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-md border-t border-white/10">
        {/* Audio row */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
          {audioFileName ? (
            <span className="text-white/60 text-xs truncate max-w-[200px]">{audioFileName}</span>
          ) : (
            <span className="text-white/30 text-xs">No audio loaded</span>
          )}
          {audioFileName && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          )}
          <button
            onClick={() => audioControlsRef.current?.triggerFileUpload()}
            className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-white/70 hover:text-white transition-colors ml-auto"
          >
            Load Audio
          </button>
        </div>

        {/* Template strip */}
        <div className="px-4 py-3 overflow-x-auto">
          <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
            {templates.map((template) => (
              <div key={template.id} className="w-20 h-20 flex-shrink-0">
                <TemplateCard
                  template={template}
                  isActive={template.id === activeTemplateId}
                  onSelect={() => handleSelect(template.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
