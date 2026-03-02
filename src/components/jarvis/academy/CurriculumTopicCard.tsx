'use client';

import { Check, Lock, Play, RotateCcw } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives/Card';
import { Button } from '@/components/jarvis/primitives/Button';
import type { CurriculumTopic } from '@/lib/jarvis/academy/projects';
import type { TopicProgress } from '@/lib/jarvis/stores/academyStore';

interface CurriculumTopicCardProps {
  topic: CurriculumTopic;
  progress: TopicProgress | null;
  isLocked: boolean;
  isNextSuggested: boolean;
  /** Map of topic ID → human name for resolving prerequisite display */
  topicNames: Map<string, string>;
  onLearn: (topicId: string, topicName: string) => void;
  index: number;
}

function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <span className="text-xs text-white/30 tracking-wider" aria-label={`Difficulty ${difficulty} of 5`}>
      {'\u2605'.repeat(difficulty)}
      {'\u2606'.repeat(5 - difficulty)}
    </span>
  );
}

export function CurriculumTopicCard({
  topic,
  progress,
  isLocked,
  isNextSuggested,
  topicNames,
  onLearn,
  index,
}: CurriculumTopicCardProps) {
  const status = progress?.status || 'not_started';
  const isCompleted = status === 'completed';
  const isExplored = status === 'explored';

  // Ring color based on state
  const ringClass = isExplored
    ? 'ring-1 ring-amber-500/40'
    : isNextSuggested && !isCompleted && !isLocked
      ? 'ring-1 ring-cyan-500/40'
      : '';

  // Opacity for locked/completed
  const opacityClass = isLocked ? 'opacity-50' : isCompleted ? 'opacity-60' : '';

  return (
    <Card
      variant="glass-interactive"
      padding="md"
      className={`${ringClass} ${opacityClass}`}
      onClick={isLocked ? undefined : isCompleted ? undefined : () => onLearn(topic.id, topic.name)}
    >
      <div
        style={{
          animation: 'topicFadeInUp 400ms ease both',
          animationDelay: `${index * 80}ms`,
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isLocked && <Lock className="w-3.5 h-3.5 text-white/30 shrink-0" />}
              <DifficultyStars difficulty={topic.difficulty} />
              <span className="text-sm font-medium text-white/90 truncate">
                {topic.name}
              </span>
              {isExplored && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
              )}
            </div>
            <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
              {topic.description}
            </p>
          </div>

          {isCompleted && (
            <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </span>
          )}
        </div>

        {/* Bottom row: prereqs/status + action */}
        <div className="flex items-center justify-between mt-2.5">
          {isLocked ? (
            <span className="text-xs text-white/30 italic">
              Requires: {topic.prerequisites.map(id => topicNames.get(id) || id).join(', ')}
            </span>
          ) : isCompleted ? (
            <span className="text-xs text-emerald-400 font-medium">Completed</span>
          ) : isExplored ? (
            <span className="text-xs text-amber-400/70">In progress</span>
          ) : (
            <span />
          )}

          {isLocked ? null : isCompleted ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3 h-3" />}
              onClick={(e) => {
                e.stopPropagation();
                onLearn(topic.id, topic.name);
              }}
            >
              Review
            </Button>
          ) : isExplored ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<Play className="w-3 h-3" />}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onLearn(topic.id, topic.name);
              }}
            >
              Continue
            </Button>
          ) : isNextSuggested ? (
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
                  onLearn(topic.id, topic.name);
                }}
              >
                Learn
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              icon={<Play className="w-3 h-3" />}
              onClick={(e) => {
                e.stopPropagation();
                onLearn(topic.id, topic.name);
              }}
            >
              Learn
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
