'use client';

import { useMemo } from 'react';
import { Card } from '@/components/jarvis/primitives';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';

export function GoalsList() {
  const goals = usePersonalStore((s) => s.goals);

  const avgProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
  }, [goals]);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .goal-enter { animation: fadeInUp 400ms ease-out both; }
        .goal-progress-fill {
          transition: width 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {/* Summary Hero */}
      <Card variant="glass" padding="md" className="goal-enter mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
            {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
            {avgProgress}% avg
          </span>
        </div>
      </Card>

      {/* Goal Cards */}
      <div className="space-y-3">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className="goal-enter"
            style={{ animationDelay: `${(index + 1) * 50}ms` }}
          >
            <Card variant="glass-interactive" padding="md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90">{goal.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                    {goal.category}
                  </span>
                  <span className="text-xs text-white/40">{goal.progress}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="goal-progress-fill h-full rounded-full bg-violet-500"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}
