'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives/Card';
import { useTutorialStore, selectTotalCompleted } from '@/lib/jarvis/stores/tutorialStore';
import { getSuggestedLesson, getLessonCount } from '@/lib/jarvis/curriculum/tutorialLessons';

function MiniProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const size = 24;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(39 39 42)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={completed === total ? 'rgb(52 211 153)' : 'rgb(8 145 178)'}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export function AcademyProgress() {
  const progress = useTutorialStore((s) => s.progress);
  const { total } = useMemo(() => getLessonCount(), []);
  const completed = useTutorialStore(selectTotalCompleted);
  const suggested = useMemo(() => getSuggestedLesson(progress), [progress]);
  const allComplete = completed === total;

  return (
    <>
      <style>{`
        @keyframes academyProgressFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Link href="/jarvis/app/academy" className="block">
        <Card
          variant="glass-interactive"
          padding="md"
          className={allComplete ? 'ring-1 ring-emerald-500/30' : ''}
        >
          <div
            className="flex items-center gap-3"
            style={{ animation: 'academyProgressFadeIn 400ms ease both' }}
          >
            {/* Icon */}
            <span className="shrink-0 w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5 text-cyan-400" />
            </span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white/90 block">
                Jarvis Academy
              </span>
              {allComplete ? (
                <span className="text-xs text-emerald-400 block">
                  All lessons complete!
                </span>
              ) : suggested ? (
                <span className="text-xs text-white/50 block truncate">
                  Next: {suggested.name}
                </span>
              ) : (
                <span className="text-xs text-white/50 block">
                  Start your first lesson
                </span>
              )}
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 font-medium tabular-nums">
                {completed}/{total}
              </span>
              <MiniProgressRing completed={completed} total={total} />
            </div>

            <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
          </div>
        </Card>
      </Link>
    </>
  );
}
