'use client';

import { Check, Clock, Play, RotateCcw } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives/Card';
import { Button } from '@/components/jarvis/primitives/Button';
import type { TutorialLesson } from '@/lib/jarvis/curriculum/tutorialLessons';
import type { CompletionRecord } from '@/lib/jarvis/stores/tutorialStore';

interface LessonCardProps {
  lesson: TutorialLesson;
  completionRecord: CompletionRecord | null;
  isSuggested: boolean;
  isInProgress: boolean;
  onStart: (lessonId: string) => void;
  index: number;
}

export function LessonCard({
  lesson,
  completionRecord,
  isSuggested,
  isInProgress,
  onStart,
  index,
}: LessonCardProps) {
  const isCompleted = !!completionRecord;

  // Ring color based on state
  const ringClass = isInProgress
    ? 'ring-1 ring-amber-500/40'
    : isSuggested && !isCompleted
      ? 'ring-1 ring-cyan-500/40'
      : '';

  return (
    <>
      <style>{`
        @keyframes lessonFadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Card
        variant="glass-interactive"
        padding="md"
        className={`${ringClass} ${isCompleted ? 'opacity-60' : ''}`}
        onClick={isCompleted ? undefined : () => onStart(lesson.id)}
      >
        <div
          style={{
            animation: 'lessonFadeInUp 400ms ease both',
            animationDelay: `${index * 80}ms`,
          }}
        >
          {/* Header row: title + badge/status */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white/90 truncate">
                  {lesson.name}
                </span>
                {isInProgress && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                {lesson.description}
              </p>
            </div>

            {isCompleted && (
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            )}
          </div>

          {/* Bottom row: time + action */}
          <div className="flex items-center justify-between mt-3">
            <span className="flex items-center gap-1 text-xs text-white/40">
              <Clock className="w-3 h-3" />
              ~{lesson.estimatedMinutes} min
            </span>

            {isCompleted ? (
              <span className="text-xs text-emerald-400 font-medium">Completed</span>
            ) : isInProgress ? (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="w-3 h-3" />}
                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(lesson.id);
                }}
              >
                Resume
              </Button>
            ) : isSuggested ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wide">
                  Recommended
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play className="w-3 h-3" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStart(lesson.id);
                  }}
                >
                  Start
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon={<Play className="w-3 h-3" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(lesson.id);
                }}
              >
                Start
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
