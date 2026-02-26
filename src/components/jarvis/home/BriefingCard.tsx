'use client';

import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';
import { useHomeStore } from '@/lib/jarvis/stores/homeStore';

export function BriefingCard() {
  const briefingSummary = useHomeStore((s) => s.briefingSummary);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="glass" padding="md">
      {/* Header — tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
            Latest Briefing
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

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
