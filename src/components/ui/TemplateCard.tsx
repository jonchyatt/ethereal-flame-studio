'use client';

import { VisualTemplate } from '@/lib/templates/types';

interface TemplateCardProps {
  template: VisualTemplate;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void; // undefined for built-in (no delete allowed)
}

export function TemplateCard({
  template,
  isActive,
  onSelect,
  onDelete,
}: TemplateCardProps) {
  return (
    <div
      className={`
        group relative aspect-square rounded-lg overflow-hidden
        border-2 transition-all cursor-pointer
        ${isActive
          ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
          : 'border-white/20 hover:border-white/40 hover:scale-102'
        }
      `}
      onClick={onSelect}
    >
      {/* Thumbnail or Gradient Fallback */}
      {template.thumbnail ? (
        <img
          src={template.thumbnail}
          alt={template.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`
          w-full h-full
          ${template.isBuiltIn
            ? 'bg-gradient-to-br from-indigo-900/60 to-purple-900/60'
            : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60'
          }
        `} />
      )}

      {/* Built-in Badge */}
      {template.isBuiltIn && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-indigo-500/80 text-white text-[10px] font-medium">
          PRESET
        </div>
      )}

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
      )}

      {/* Delete Button (user templates only) */}
      {onDelete && !template.isBuiltIn && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            absolute top-1 right-1 p-1 rounded
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

      {/* Name Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
        <p className="text-white text-xs font-medium truncate">
          {template.name}
        </p>
        {template.description && (
          <p className="text-white/50 text-[10px] truncate mt-0.5">
            {template.description}
          </p>
        )}
      </div>
    </div>
  );
}
