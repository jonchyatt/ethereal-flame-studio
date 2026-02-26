'use client';

import { useMemo } from 'react';
import { Card } from '@/components/jarvis/primitives';
import { usePersonalStore, type JournalEntry } from '@/lib/jarvis/stores/personalStore';

const MOOD_EMOJI: Record<NonNullable<JournalEntry['mood']>, string> = {
  great: '😊',
  good: '🙂',
  okay: '😐',
  rough: '😔',
};

const MOOD_OPTIONS: NonNullable<JournalEntry['mood']>[] = ['great', 'good', 'okay', 'rough'];

const TODAY = '2026-02-26';

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

export function JournalView() {
  const journal = usePersonalStore((s) => s.journal);
  const setJournalMood = usePersonalStore((s) => s.setJournalMood);

  const entryCount = useMemo(() => journal.length, [journal]);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .journal-enter { animation: fadeInUp 400ms ease-out both; }
        .mood-btn {
          transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 200ms ease;
        }
        .mood-btn:active { transform: scale(0.9); }
      `}</style>

      {/* Summary Hero */}
      <Card variant="glass" padding="md" className="journal-enter mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
            {entryCount} entr{entryCount !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      </Card>

      {/* Entries */}
      <div className="space-y-3">
        {journal.map((entry, index) => {
          const isToday = entry.date === TODAY;

          return (
            <div
              key={entry.id}
              className="journal-enter"
              style={{ animationDelay: `${(index + 1) * 80}ms` }}
            >
              <Card variant={isToday ? 'glass-interactive' : 'glass'} padding="md">
                {/* Header: date + mood */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40">{formatDate(entry.date)}</p>
                  <span className="text-lg">
                    {entry.mood ? MOOD_EMOJI[entry.mood] : '—'}
                  </span>
                </div>

                {/* Content preview */}
                <p className="text-sm text-white/70 leading-relaxed">
                  {truncate(entry.content, 120)}
                </p>

                {/* Mood selector for today's entry */}
                {isToday && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-white/30 mr-1">Mood:</span>
                    {MOOD_OPTIONS.map((mood) => (
                      <button
                        key={mood}
                        onClick={() => setJournalMood(entry.id, mood)}
                        className={`mood-btn w-8 h-8 rounded-full flex items-center justify-center text-base ${
                          entry.mood === mood
                            ? 'bg-violet-400/20 scale-110'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {MOOD_EMOJI[mood]}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}
