'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { ContentContainer } from '@/components/jarvis/layout';
import { LessonCard } from './LessonCard';
import {
  getAllLessons,
  getSuggestedLesson,
  getLessonCount,
  TUTORIAL_TIERS,
} from '@/lib/jarvis/curriculum/tutorialLessons';
import { useTutorialStore, selectTotalCompleted } from '@/lib/jarvis/stores/tutorialStore';
import { useTutorialEngineContext } from '@/components/jarvis/layout/JarvisShell';

// ── Progress Ring ─────────────────────────────────────────────────────────

function ProgressRing({
  completed,
  total,
  size = 40,
  stroke = 3,
}: {
  completed: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(39 39 42)"
        strokeWidth={stroke}
      />
      {/* Fill */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(8 145 178)"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ── Academy Hub ───────────────────────────────────────────────────────────

export function AcademyHub() {
  const router = useRouter();
  const progress = useTutorialStore((s) => s.progress);
  const currentLesson = useTutorialStore((s) => s.currentLesson);
  const tutorialEngine = useTutorialEngineContext();

  const allLessons = useMemo(() => getAllLessons(), []);
  const { total } = useMemo(() => getLessonCount(), []);
  const suggestedLesson = useMemo(() => getSuggestedLesson(progress), [progress]);
  const totalCompleted = useTutorialStore(selectTotalCompleted);

  // Group lessons by tier
  const lessonsByTier = useMemo(() => {
    const grouped: Record<number, typeof allLessons> = {};
    for (const lesson of allLessons) {
      if (!grouped[lesson.tier]) grouped[lesson.tier] = [];
      grouped[lesson.tier].push(lesson);
    }
    return grouped;
  }, [allLessons]);

  const handleStartLesson = useCallback(
    (lessonId: string) => {
      if (!tutorialEngine) return;

      const isResume = currentLesson === lessonId;

      // Exit current lesson if engine is active
      if (tutorialEngine.isActive) {
        tutorialEngine.exitTutorial();
      }

      // Start the lesson
      tutorialEngine.startLesson(lessonId);

      // Navigate to home (lessons start from home context) — unless resuming
      if (!isResume) {
        router.push('/jarvis/app');
      }
    },
    [tutorialEngine, currentLesson, router],
  );

  return (
    <ContentContainer>
      <style>{`
        @keyframes hubFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="space-y-6 pb-8">
        {/* Header */}
        <div
          style={{ animation: 'hubFadeIn 400ms ease both' }}
          className="flex items-start gap-4"
        >
          <button
            onClick={() => router.push('/jarvis/app')}
            className="mt-1 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-cyan-400 shrink-0" />
              <h1 className="text-xl font-semibold text-white/90">Jarvis Academy</h1>
            </div>
            <p className="text-sm text-white/50 mt-1">
              {totalCompleted} of {total} lessons complete
            </p>
          </div>

          <ProgressRing completed={totalCompleted} total={total} />
        </div>

        {/* Tier sections */}
        {Object.entries(lessonsByTier).map(([tierKey, lessons]) => {
          const tier = Number(tierKey);
          const tierMeta = TUTORIAL_TIERS[tier];
          if (!tierMeta) return null;

          return (
            <section
              key={tier}
              style={{
                animation: 'hubFadeIn 400ms ease both',
                animationDelay: `${tier * 100}ms`,
              }}
            >
              <h2 className="text-xs uppercase tracking-wide text-white/40 mb-1">
                {tierMeta.name}
              </h2>
              <p className="text-xs text-white/30 mb-3">{tierMeta.description}</p>

              <div className="space-y-3">
                {lessons.map((lesson, idx) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    completionRecord={progress[lesson.id] ?? null}
                    isInProgress={currentLesson === lesson.id}
                    isSuggested={suggestedLesson?.id === lesson.id}
                    onStart={handleStartLesson}
                    index={idx}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* All complete celebration */}
        {totalCompleted === total && (
          <div
            className="text-center py-6"
            style={{
              animation: 'hubFadeIn 400ms ease both',
              animationDelay: '400ms',
            }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
              <GraduationCap className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-400">
              All lessons complete!
            </p>
            <p className="text-xs text-white/40 mt-1">
              You&apos;ve mastered the fundamentals. More lessons coming soon.
            </p>
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
