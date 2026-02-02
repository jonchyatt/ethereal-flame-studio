'use client';

import type { HabitSummary } from '@/lib/jarvis/executive/types';

interface HabitProgressProps {
  habits: HabitSummary[];
  loading: boolean;
  expanded: boolean;
}

export function HabitProgress({ habits, loading, expanded }: HabitProgressProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Habits</h3>
        <div className="animate-pulse h-4 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Habits</h3>
        <p className="text-white/40 text-sm">No habits tracked</p>
      </div>
    );
  }

  const displayHabits = expanded ? habits : habits.slice(0, 3);

  return (
    <div className="space-y-2">
      <h3 className="text-white/60 text-xs uppercase tracking-wide">Habits</h3>

      <ul className="space-y-1">
        {displayHabits.map((habit) => (
          <li
            key={habit.id}
            className="flex items-center justify-between text-white/80 text-sm"
          >
            <span>{habit.title}</span>
            <span className="text-white/50">
              {habit.streak} day{habit.streak !== 1 ? 's' : ''} streak
            </span>
          </li>
        ))}
      </ul>

      {!expanded && habits.length > 3 && (
        <p className="text-white/40 text-xs">+{habits.length - 3} more</p>
      )}
    </div>
  );
}
