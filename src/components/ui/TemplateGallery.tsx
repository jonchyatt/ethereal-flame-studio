'use client';

import { useEffect } from 'react';
import { TemplateCard } from './TemplateCard';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useVisualStore } from '@/lib/stores/visualStore';
import { BUILT_IN_PRESETS } from '@/lib/templates/builtInPresets';

interface TemplateGalleryProps {
  onSaveNew?: () => void; // Callback to open save dialog
}

export function TemplateGallery({ onSaveNew }: TemplateGalleryProps) {
  const templates = useTemplateStore((state) => state.templates);
  const activeTemplateId = useTemplateStore((state) => state.activeTemplateId);
  const loadTemplate = useTemplateStore((state) => state.loadTemplate);
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);
  const applyTemplateSettings = useVisualStore((state) => state.applyTemplateSettings);

  // Initialize built-in presets on mount
  useEffect(() => {
    const { templates: current } = useTemplateStore.getState();
    // Only initialize if built-ins not present
    const hasBuiltIns = current.some(t => t.isBuiltIn);
    if (!hasBuiltIns) {
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

  const handleDelete = (templateId: string) => {
    if (confirm('Delete this template?')) {
      deleteTemplate(templateId);
    }
  };

  // Separate built-in and user templates
  const builtInTemplates = templates.filter(t => t.isBuiltIn);
  const userTemplates = templates.filter(t => !t.isBuiltIn);

  return (
    <div className="space-y-4">
      {/* Built-in Presets Section */}
      <div>
        <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
          Presets
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {builtInTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isActive={template.id === activeTemplateId}
              onSelect={() => handleSelect(template.id)}
            />
          ))}
        </div>
      </div>

      {/* User Templates Section */}
      <div>
        <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
          Your Templates
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {/* Save New Button */}
          {onSaveNew && (
            <button
              onClick={onSaveNew}
              className="
                aspect-square rounded-lg
                border-2 border-dashed border-white/30
                hover:border-white/50 hover:bg-white/5
                flex flex-col items-center justify-center gap-1
                text-white/50 hover:text-white/70
                transition-all
              "
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px]">Save Current</span>
            </button>
          )}

          {userTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isActive={template.id === activeTemplateId}
              onSelect={() => handleSelect(template.id)}
              onDelete={() => handleDelete(template.id)}
            />
          ))}

          {userTemplates.length === 0 && !onSaveNew && (
            <p className="text-white/40 text-xs col-span-full py-2">
              No saved templates yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
