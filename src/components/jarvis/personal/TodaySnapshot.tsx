'use client';

import { CheckSquare, Zap, Receipt, Flame } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';

export function TodaySnapshot() {
  const todayStats = usePersonalStore((s) => s.todayStats);

  const stats = [
    {
      icon: CheckSquare,
      value: todayStats.tasksDue,
      label: 'tasks due',
      warn: todayStats.tasksDue > 0,
    },
    {
      icon: Zap,
      value: `${todayStats.habitsDone}/${todayStats.habitsTotal}`,
      label: 'habits',
      warn: false,
    },
    {
      icon: Receipt,
      value: todayStats.billsDue,
      label: 'bills due',
      warn: todayStats.billsDue > 0,
    },
    {
      icon: Flame,
      value: todayStats.streak,
      label: 'day streak',
      warn: false,
    },
  ];

  return (
    <Card variant="glass" padding="md">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <stat.icon
              size={16}
              className={stat.warn ? 'text-amber-400' : 'text-violet-400'}
            />
            <div>
              <p className={`text-lg font-semibold ${stat.warn ? 'text-amber-400' : 'text-white'}`}>
                {stat.value}
              </p>
              <p className="text-xs text-white/50">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
