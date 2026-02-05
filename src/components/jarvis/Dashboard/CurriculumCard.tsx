'use client';

import { useState } from 'react';
import {
  CURRICULUM_CLUSTERS,
  NOTION_URLS,
} from '@/lib/jarvis/notion/notionUrls';
import { useNotionPanelStore } from '@/lib/jarvis/stores/notionPanelStore';
import { getLessonsForCluster } from '@/lib/jarvis/curriculum/lessonRegistry';
import { useCurriculumProgressStore } from '@/lib/jarvis/stores/curriculumProgressStore';
import type { GapInfo } from '@/lib/jarvis/stores/curriculumProgressStore';
import type { LessonMeta } from '@/lib/jarvis/curriculum/lessonRegistry';

interface CurriculumCardProps {
  gaps?: GapInfo[];
}

export function CurriculumCard({ gaps }: CurriculumCardProps) {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const openPanel = useNotionPanelStore((s) => s.openPanel);
  const completedLessons = useCurriculumProgressStore((s) => s.completedLessons);

  const toggleCluster = (id: string) => {
    setExpandedCluster((prev) => (prev === id ? null : id));
  };

  const handleLessonTap = (lesson: LessonMeta) => {
    const entry = NOTION_URLS[lesson.databaseKey];
    if (!entry) return;
    openPanel(entry.notionUrl, entry.label, 'view', entry.cluster);
  };

  const handleGapLearn = (gap: GapInfo) => {
    // Find the lesson's database key to open the right panel
    const lessons = CURRICULUM_CLUSTERS.flatMap((c) => getLessonsForCluster(c.id));
    const lesson = lessons.find((l) => l.id === gap.suggestedLessonId);
    if (lesson) {
      handleLessonTap(lesson);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-white/60 text-xs uppercase tracking-wide">
        Learn Your Life OS
      </h3>

      <div className="space-y-1">
        {CURRICULUM_CLUSTERS.map((cluster) => {
          const isExpanded = expandedCluster === cluster.id;
          const lessons = getLessonsForCluster(cluster.id);
          const completedCount = lessons.filter((l) =>
            completedLessons.includes(l.id)
          ).length;
          const totalCount = lessons.length;
          const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          return (
            <div key={cluster.id}>
              {/* Cluster header with progress */}
              <button
                onClick={() => toggleCluster(cluster.id)}
                className="w-full flex items-center gap-2 px-2 py-2 -mx-2 rounded-lg
                  hover:bg-white/5 active:bg-white/10 transition-colors text-left"
              >
                <span className="text-base">{cluster.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/80 text-sm">{cluster.label}</span>
                    <span className="text-white/40 text-xs tabular-nums">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-white/40 transition-transform flex-shrink-0 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded lesson list */}
              {isExpanded && (
                <div className="ml-7 mb-1 space-y-0.5">
                  {lessons.map((lesson) => {
                    const isCompleted = completedLessons.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonTap(lesson)}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm
                          hover:bg-white/5 active:bg-white/10
                          transition-colors flex items-start gap-2"
                      >
                        {/* Completion indicator */}
                        {isCompleted ? (
                          <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="12" r="9" strokeWidth={2} />
                          </svg>
                        )}
                        <div className="min-w-0">
                          <div className={`${isCompleted ? 'text-white/50' : 'text-white/80'}`}>
                            {lesson.title}
                          </div>
                          <div className="text-white/30 text-xs truncate">
                            {lesson.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gap recommendations */}
      {gaps && gaps.length > 0 && (
        <>
          <hr className="border-white/10" />
          <div className="space-y-2">
            <h4 className="text-cyan-400/70 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Recommended
            </h4>
            {gaps.map((gap) => (
              <div
                key={gap.suggestedLessonId}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-white/[0.03]"
              >
                <span className="text-white/60 text-sm truncate">{gap.message}</span>
                <button
                  onClick={() => handleGapLearn(gap)}
                  className="text-cyan-400 text-xs font-medium whitespace-nowrap
                    hover:text-cyan-300 transition-colors"
                >
                  Start Learning →
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
