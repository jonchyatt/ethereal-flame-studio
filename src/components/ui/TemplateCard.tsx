'use client';

import { VisualTemplate } from '@/lib/templates/types';

function getPresetGradient(template: VisualTemplate): string {
  if (template.renderEngine === 'blender') {
    switch (template.id) {
      case 'cinema-fire':
        return 'bg-gradient-to-br from-orange-800/80 via-red-900/70 to-amber-900/60';
      case 'cinema-water':
        return 'bg-gradient-to-br from-cyan-900/80 via-blue-900/70 to-teal-900/60';
      case 'cinema-edm':
        return 'bg-gradient-to-br from-violet-900/80 via-fuchsia-900/70 to-pink-900/60';
      case 'cinema-luminous':
        return 'bg-gradient-to-br from-sky-900/80 via-indigo-900/70 to-cyan-900/60';
      case 'cinema-combo':
        return 'bg-gradient-to-br from-orange-900/70 via-blue-950/60 to-cyan-900/50';
      default:
        return 'bg-gradient-to-br from-amber-900/60 to-orange-950/60';
    }
  }
  if (!template.isBuiltIn) {
    return 'bg-gradient-to-br from-slate-800/60 to-slate-900/60';
  }
  switch (template.id) {
    case 'builtin-ethereal-flame':
      return 'bg-gradient-to-br from-orange-900/70 via-red-900/60 to-yellow-900/50';
    case 'builtin-ethereal-mist':
      return 'bg-gradient-to-br from-purple-900/60 via-pink-900/50 to-blue-900/40';
    case 'builtin-cosmic-void':
      return 'bg-gradient-to-br from-slate-950/80 via-indigo-950/70 to-blue-950/60';
    case 'builtin-solar-flare':
      return 'bg-gradient-to-br from-yellow-800/70 via-orange-700/60 to-red-800/70';
    case 'builtin-aurora':
      return 'bg-gradient-to-br from-emerald-900/60 via-teal-800/50 to-blue-900/60';
    case 'builtin-neon-pulse':
      return 'bg-gradient-to-br from-fuchsia-900/70 via-cyan-800/50 to-violet-900/60';
    default:
      return 'bg-gradient-to-br from-indigo-900/60 to-purple-900/60';
  }
}

function getEngineIcon(template: VisualTemplate) {
  if (template.renderEngine === 'blender') {
    // Film camera icon for cinema
    return (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  return null;
}

interface TemplateCardProps {
  template: VisualTemplate;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

export function TemplateCard({
  template,
  isActive,
  onSelect,
  onDelete,
}: TemplateCardProps) {
  const isBlender = template.renderEngine === 'blender';

  return (
    <div
      className={`
        group relative aspect-[4/3] rounded-xl overflow-hidden
        border-2 transition-all cursor-pointer
        ${isActive
          ? 'border-blue-500 ring-2 ring-blue-500/40 scale-[1.03]'
          : 'border-white/15 hover:border-white/30 hover:scale-[1.02]'
        }
      `}
      onClick={onSelect}
      title={template.description || template.name}
    >
      {/* Thumbnail or Gradient */}
      {template.thumbnail ? (
        <img
          src={template.thumbnail}
          alt={template.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full ${getPresetGradient(template)}`} />
      )}

      {/* Engine Badge */}
      {isBlender ? (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/80 text-white text-[10px] font-semibold">
          {getEngineIcon(template)}
          CINEMA
        </div>
      ) : template.isBuiltIn ? (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-indigo-500/70 text-white text-[10px] font-medium">
          PRESET
        </div>
      ) : null}

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
      )}

      {/* Delete Button */}
      {onDelete && !template.isBuiltIn && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            absolute top-1.5 right-1.5 p-1 rounded-md
            bg-black/50 hover:bg-red-600/80
            text-white/60 hover:text-white
            opacity-0 group-hover:opacity-100
            transition-all
          "
          title="Delete template"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Name + Description Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-8">
        <p className="text-white text-sm font-medium leading-tight">
          {template.name}
        </p>
        {template.description && (
          <p className="text-white/45 text-[11px] leading-snug mt-0.5 line-clamp-2">
            {template.description}
          </p>
        )}
      </div>
    </div>
  );
}
