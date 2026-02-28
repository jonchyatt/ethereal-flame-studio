'use client';

import { useState, useCallback } from 'react';
import { FileText, ChevronDown, RefreshCw } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';
import { useHomeStore } from '@/lib/jarvis/stores/homeStore';
import { getFreshness, type FreshnessTier } from '@/lib/jarvis/data/freshness';
import { refetchJarvisData } from '@/lib/jarvis/hooks/useJarvisFetch';

const FRESHNESS_DOT: Record<FreshnessTier, { color: string; label: string } | null> = {
  live: { color: 'bg-green-400', label: 'Live' },
  recent: { color: 'bg-green-400/60', label: 'Recent' },
  stale: { color: 'bg-amber-400', label: 'Stale' },
  old: { color: 'bg-amber-400/60', label: 'Old' },
  unknown: null,
};

export function BriefingCard() {
  const briefingSummary = useHomeStore((s) => s.briefingSummary);
  const lastFetched = useHomeStore((s) => s.lastFetched);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const freshness = getFreshness(lastFetched);
  const dot = FRESHNESS_DOT[freshness];

  const handleRefresh = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetchJarvisData();
    } catch {
      // Silent — user sees stale data indicator via freshness dot
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  return (
    <Card variant="glass" padding="md">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
            Latest Briefing
          </span>
          {dot && (
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dot.color}`} />
              <span className="text-[10px] text-white/30">{dot.label}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh briefing"
            aria-label="Refresh briefing"
          >
            <RefreshCw className={`w-3 h-3 text-white/30 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse briefing' : 'Expand briefing'}
          >
            <ChevronDown
              className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="mt-3 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '200px' : '1.5em' }}
      >
        <p className={`text-sm text-white/70 leading-relaxed ${!expanded ? 'text-ellipsis overflow-hidden whitespace-nowrap' : ''}`}>
          {briefingSummary ?? 'No briefing yet today'}
        </p>
      </div>
    </Card>
  );
}
