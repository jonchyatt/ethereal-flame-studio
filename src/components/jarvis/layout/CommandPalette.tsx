'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  MessageCircle,
  Settings,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { DomainIcon } from '@/components/jarvis/home/DomainIcon';
import { DOMAIN_COLORS } from '@/lib/jarvis/domains';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import {
  useCommandPalette,
  type PaletteItem,
  type ScoredItem,
} from '@/lib/jarvis/hooks/useCommandPalette';

// ── Icon Resolver ──────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  BookOpen,
  MessageCircle,
  Settings,
  GraduationCap,
  FileText,
};

function ItemIcon({ item, className }: { item: PaletteItem; className?: string }) {
  const colorClasses = item.domainColor
    ? DOMAIN_COLORS[item.domainColor]?.text ?? 'text-white/50'
    : 'text-white/50';

  if (item.type === 'domain') {
    return <DomainIcon name={item.icon ?? 'Home'} className={`${className} ${colorClasses}`} />;
  }

  const Icon = item.icon ? ACTION_ICONS[item.icon] : FileText;
  if (!Icon) return <FileText className={`${className} ${colorClasses}`} />;
  return <Icon className={`${className} ${colorClasses}`} />;
}

// ── Match Highlighting ─────────────────────────────────────────────────────

function HighlightedLabel({ label, indices }: { label: string; indices: number[] }) {
  const indexSet = new Set(indices);
  return (
    <span>
      {label.split('').map((char, i) =>
        indexSet.has(i) ? (
          <span key={i} className="text-cyan-400 font-medium">
            {char}
          </span>
        ) : (
          <span key={i} className="text-white/90">
            {char}
          </span>
        ),
      )}
    </span>
  );
}

// ── CommandPalette ─────────────────────────────────────────────────────────

export function CommandPalette() {
  const closeCommandPalette = useShellStore((s) => s.closeCommandPalette);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    sections,
    activeIndex,
    onKeyDown,
    selectItem,
    recents,
    flatItems,
    registry,
    getDefaultFlatItems,
  } = useCommandPalette();

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Close animation ──────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setClosing(true);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (closing) {
      closeCommandPalette();
    }
  }, [closing, closeCommandPalette]);

  // Escape key in the input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      onKeyDown(e);
    },
    [onKeyDown, handleClose],
  );

  // ── Build display sections ───────────────────────────────────────────

  const hasQuery = query.trim().length > 0;

  // Default sections (when no query)
  const defaultSections = !hasQuery
    ? (() => {
        const result: { type: string; label: string; items: PaletteItem[] }[] = [];
        if (recents.length > 0) {
          result.push({ type: 'recent', label: 'Recent', items: recents });
        }
        const actions = registry.filter((i) => i.type === 'action');
        if (actions.length > 0) {
          result.push({ type: 'action', label: 'Quick Actions', items: actions });
        }
        const domains = registry.filter((i) => i.type === 'domain');
        if (domains.length > 0) {
          result.push({ type: 'domain', label: 'Domains', items: domains });
        }
        return result;
      })()
    : [];

  // Compute global flat index for keyboard nav across default sections
  const defaultFlatItems = !hasQuery ? getDefaultFlatItems() : [];
  const navItems = hasQuery ? flatItems : defaultFlatItems;

  // ── Scroll active into view ──────────────────────────────────────────

  useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-palette-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // ── Render helpers ───────────────────────────────────────────────────

  let globalIndex = 0;

  function renderRow(item: PaletteItem | ScoredItem, idx: number) {
    const isActive = activeIndex === idx;
    const scored = 'matchIndices' in item ? (item as ScoredItem) : null;

    return (
      <button
        key={item.id}
        data-palette-index={idx}
        onClick={() => selectItem(item)}
        className={`w-full px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors rounded-lg mx-2 text-left ${
          isActive ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
        style={{ width: 'calc(100% - 16px)' }}
      >
        <ItemIcon item={item} className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-sm truncate">
          {scored && scored.matchIndices.length > 0 ? (
            <HighlightedLabel label={item.label} indices={scored.matchIndices} />
          ) : (
            <span className="text-white/90">{item.label}</span>
          )}
        </span>
        {item.shortcut && (
          <span className="text-[10px] text-white/20 font-mono flex-shrink-0">
            {item.shortcut}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      {/* CSS Keyframes */}
      <style>{`
        @keyframes palette-scrim-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes palette-scrim-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes palette-panel-in { from { opacity: 0; transform: scale(0.98) translateY(-8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes palette-panel-out { from { opacity: 1; transform: scale(1) translateY(0) } to { opacity: 0; transform: scale(0.98) translateY(-8px) } }
      `}</style>

      {/* Scrim */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        style={{
          animation: closing
            ? 'palette-scrim-out 150ms ease forwards'
            : 'palette-scrim-in 150ms ease',
        }}
        onClick={handleClose}
        onAnimationEnd={handleAnimationEnd}
      />

      {/* Panel wrapper — responsive positioning */}
      <div className="fixed inset-0 z-[60] pointer-events-none flex md:pt-[20vh] md:justify-center md:items-start items-start pt-8 px-4">
        <div
          className="pointer-events-auto w-full max-w-lg bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:mx-auto"
          style={{
            animation: closing
              ? 'palette-panel-out 150ms ease forwards'
              : 'palette-panel-in 200ms cubic-bezier(0.34,1.56,0.64,1)',
            maxHeight: 'min(70vh, 500px)',
          }}
        >
          {/* Search Input */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search Jarvis..."
              className="bg-transparent outline-none text-white flex-1 text-sm placeholder:text-white/30"
            />
            <kbd className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="flex-1 overflow-y-auto py-2">
            {hasQuery ? (
              // Searched results
              sections.length > 0 ? (
                sections.map((section) => {
                  const startIdx = globalIndex;
                  return (
                    <div key={section.type}>
                      <div className="text-[11px] uppercase tracking-wider text-white/30 px-4 py-2 font-medium">
                        {section.label}
                      </div>
                      {section.items.map((item, i) => {
                        const idx = startIdx + i;
                        globalIndex = idx + 1;
                        return renderRow(item, idx);
                      })}
                    </div>
                  );
                })
              ) : (
                <div className="text-white/30 text-sm py-8 text-center">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )
            ) : (
              // Default sections (no query)
              defaultSections.map((section) => {
                const startIdx = globalIndex;
                return (
                  <div key={section.type}>
                    <div className="text-[11px] uppercase tracking-wider text-white/30 px-4 py-2 font-medium">
                      {section.label}
                    </div>
                    {section.items.map((item, i) => {
                      const idx = startIdx + i;
                      globalIndex = idx + 1;
                      return renderRow(item, idx);
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — Keyboard Hints */}
          <div className="border-t border-white/5 px-4 py-2 flex items-center gap-4 flex-shrink-0">
            <span className="text-[11px] text-white/20 flex items-center gap-1.5">
              <kbd className="bg-white/5 px-1 py-0.5 rounded text-[10px] font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="text-[11px] text-white/20 flex items-center gap-1.5">
              <kbd className="bg-white/5 px-1 py-0.5 rounded text-[10px] font-mono">↵</kbd>
              select
            </span>
            <span className="text-[11px] text-white/20 flex items-center gap-1.5">
              <kbd className="bg-white/5 px-1 py-0.5 rounded text-[10px] font-mono">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
