'use client';

import { Flame } from 'lucide-react';
import { Card, Toggle } from '@/components/jarvis/primitives';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';

export function HabitsList() {
  const habits = usePersonalStore((s) => s.habits);
  const toggleHabit = usePersonalStore((s) => s.toggleHabit);

  const habitsDone = habits.filter((h) => h.completedToday).length;
  const habitsTotal = habits.length;
  const allDone = habitsDone === habitsTotal && habitsTotal > 0;

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .habit-enter { animation: fadeInUp 400ms ease-out both; }
        .habit-progress-fill {
          transition: width 500ms cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 300ms ease;
        }
      `}</style>

      {/* Progress Hero */}
      <Card variant="glass" padding="md" className="habit-enter mb-4" data-tutorial-id="habits-progress">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-2xl font-bold">
            <span className={allDone ? 'text-green-400' : 'text-white'}>{habitsDone}</span>
            <span className="text-white/50"> of {habitsTotal}</span>
          </p>
          <p className={`text-xs ${allDone ? 'text-green-400' : 'text-white/40'}`}>
            {allDone ? 'All done today' : "today's habits"}
          </p>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className={`habit-progress-fill h-full rounded-full ${allDone ? 'bg-green-400' : 'bg-violet-500'}`}
            style={{ width: `${habitsTotal > 0 ? (habitsDone / habitsTotal) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {/* Habit Rows */}
      <div className="habit-enter" style={{ animationDelay: '80ms' }}>
      <Card variant="glass" padding="sm">
        {(() => { let firstToggleTagged = false; return habits.map((habit, index) => {
          let toggleTutorialId: string | undefined;
          if (!habit.completedToday && !firstToggleTagged) {
            toggleTutorialId = 'habits-first-toggle';
            firstToggleTagged = true;
          }
          return (
          <div
            key={habit.id}
            className={`habit-enter flex items-center gap-3 py-3 px-1 ${
              index < habits.length - 1 ? 'border-b border-white/5' : ''
            }`}
            style={{ animationDelay: `${(index + 2) * 50}ms` }}
          >
            <Toggle
              checked={habit.completedToday}
              onChange={() => toggleHabit(habit.id)}
              size="sm"
              data-tutorial-id={toggleTutorialId}
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90">{habit.name}</p>
              <p className="text-xs text-white/30 capitalize">{habit.frequency}</p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {habit.currentStreak > 0 ? (
                <>
                  <span className="text-sm font-semibold text-amber-400">
                    {habit.currentStreak}
                  </span>
                  <Flame size={14} className="text-amber-400" />
                </>
              ) : (
                <span className="text-white/20">&mdash;</span>
              )}
            </div>
          </div>
        ); }); })()}
      </Card>
      </div>
    </>
  );
}
