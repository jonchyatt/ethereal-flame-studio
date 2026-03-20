'use client';

import { useEffect, useRef } from 'react';
import { TemplateCard } from './TemplateCard';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useVisualStore } from '@/lib/stores/visualStore';
import { ALL_BUILT_IN_PRESETS } from '@/lib/templates/builtInPresets';

interface TemplateGalleryProps {
  onSaveNew?: () => void; // Callback to open save dialog
}

export function TemplateGallery({ onSaveNew }: TemplateGalleryProps) {
  const templates = useTemplateStore((state) => state.templates);
  const activeTemplateId = useTemplateStore((state) => state.activeTemplateId);
  const loadTemplate = useTemplateStore((state) => state.loadTemplate);
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);
  const saveTemplate = useTemplateStore((state) => state.saveTemplate);
  const applyTemplateSettings = useVisualStore((state) => state.applyTemplateSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize built-in presets on mount
  useEffect(() => {
    const { templates: current } = useTemplateStore.getState();
    // Only initialize if built-ins not present
    const hasBuiltIns = current.some(t => t.isBuiltIn);
    if (!hasBuiltIns) {
      useTemplateStore.setState((state) => ({
        templates: [...ALL_BUILT_IN_PRESETS, ...state.templates.filter(t => !t.isBuiltIn)],
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

  const handleExportTemplates = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: userTemplates,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ethereal-templates.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.templates;
      if (!Array.isArray(list)) {
        throw new Error('Invalid template file format');
      }

      list.forEach((item: any) => {
        if (!item) return;
        if (item.settings) {
          const name = item.name || 'Imported Template';
          saveTemplate(name, item.settings, {
            description: item.description,
            thumbnail: item.thumbnail,
          });
        } else if (item.layers) {
          const name = item.name || 'Imported Template';
          saveTemplate(name, item);
        }
      });
    } catch {
      alert('Failed to import templates. Please check the file format.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Separate templates by category
  const webglPresets = templates.filter(t => t.isBuiltIn && t.renderEngine !== 'blender');
  const cinemaPresets = templates.filter(t => t.isBuiltIn && t.renderEngine === 'blender');
  const userTemplates = templates.filter(t => !t.isBuiltIn);

  return (
    <div className="space-y-5">
      {/* WebGL Presets */}
      <div>
        <h3 className="text-white/50 text-[11px] font-semibold uppercase tracking-widest mb-2.5">
          WebGL Presets
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {webglPresets.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isActive={template.id === activeTemplateId}
              onSelect={() => handleSelect(template.id)}
            />
          ))}
        </div>
      </div>

      {/* Cinema Templates (Blender) */}
      {cinemaPresets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <h3 className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">
              Cinema Templates
            </h3>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold uppercase">
              Blender
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {cinemaPresets.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isActive={template.id === activeTemplateId}
                onSelect={() => handleSelect(template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* User Templates */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">
            Your Templates
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportTemplates}
              className="px-2.5 py-1 rounded text-[11px] bg-white/8 text-white/60 border border-white/15 hover:bg-white/15 hover:text-white/80 transition-colors"
            >
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded text-[11px] bg-white/8 text-white/60 border border-white/15 hover:bg-white/15 hover:text-white/80 transition-colors"
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportTemplates}
              className="hidden"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {onSaveNew && (
            <button
              onClick={onSaveNew}
              className="
                aspect-[4/3] rounded-xl
                border-2 border-dashed border-white/20
                hover:border-white/40 hover:bg-white/5
                flex flex-col items-center justify-center gap-1.5
                text-white/40 hover:text-white/60
                transition-all
              "
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs">Save Current</span>
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
            <p className="text-white/30 text-xs col-span-full py-3 text-center">
              No saved templates yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
