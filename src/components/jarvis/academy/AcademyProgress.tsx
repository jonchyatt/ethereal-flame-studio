'use client';

import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives/Card';
import { useTutorialStore, selectTotalCompleted } from '@/lib/jarvis/stores/tutorialStore';
import { getSuggestedLesson, getLessonCount } from '@/lib/jarvis/curriculum/tutorialLessons';
import {
  useAcademyStore,
  selectTotalAcademyCompleted,
  getTotalAcademyTopics,
  getNextSuggested,
} from '@/lib/jarvis/stores/academyStore';
import { getAllProjects } from '@/lib/jarvis/academy/projects';

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
        stroke={completed === total && total > 0 ? 'rgb(52 211 153)' : 'rgb(8 145 178)'}
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
  // Tutorial progress
  const tutorialProgress = useTutorialStore((s) => s.progress);
  const { total: tutorialTotal } = useMemo(() => getLessonCount(), []);
  const tutorialCompleted = useTutorialStore(selectTotalCompleted);
  const suggestedTutorial = useMemo(() => getSuggestedLesson(tutorialProgress), [tutorialProgress]);

  // Curriculum progress
  const academyProgress = useAcademyStore((s) => s.progress);
  const isLoaded = useAcademyStore((s) => s.isLoaded);
  const loadProgress = useAcademyStore((s) => s.loadProgress);
  const academyCompleted = useAcademyStore(selectTotalAcademyCompleted);
  const academyTotal = useMemo(() => getTotalAcademyTopics(), []);

  // Load curriculum progress on every mount — server-side tool calls (academy_update_progress)
  // update the DB without the client knowing, so we must refetch when returning to this page.
  useEffect(() => { loadProgress(); }, [loadProgress]);

  // Combined
  const totalCompleted = tutorialCompleted + academyCompleted;
  const totalItems = tutorialTotal + academyTotal;
  const allComplete = totalCompleted === totalItems && totalItems > 0;

  // Next suggestion logic
  const nextLabel = useMemo(() => {
    // Tutorials first
    if (tutorialCompleted < tutorialTotal && suggestedTutorial) {
      return suggestedTutorial.name;
    }

    // Curriculum topics — in-progress takes priority across all projects
    const projects = getAllProjects().filter(p => p.curriculum && p.curriculum.length > 0);
    for (const project of projects) {
      if (!project.curriculum) continue;
      const explored = project.curriculum.find(t =>
        academyProgress[`${project.id}:${t.id}`]?.status === 'explored'
      );
      if (explored) {
        const shortName = project.name.split(' \u2014 ')[0];
        return `${explored.name} in ${shortName}`;
      }
    }
    for (const project of projects) {
      if (!project.curriculum) continue;
      const next = getNextSuggested(project.id, project.curriculum, academyProgress);
      if (next) {
        const shortName = project.name.split(' \u2014 ')[0];
        return `${next.name} in ${shortName}`;
      }
    }

    return null;
  }, [tutorialCompleted, tutorialTotal, suggestedTutorial, academyProgress]);

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
              ) : nextLabel ? (
                <span className="text-xs text-white/50 block truncate">
                  Next: {nextLabel}
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
                {totalCompleted}/{totalItems}
              </span>
              <MiniProgressRing completed={totalCompleted} total={totalItems} />
            </div>

            <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
          </div>
        </Card>
      </Link>
    </>
  );
}
