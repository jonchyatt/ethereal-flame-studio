'use client';

import { useMemo } from 'react';
import { Dumbbell, UtensilsCrossed, Moon } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';
import { usePersonalStore, getToday, type HealthItem } from '@/lib/jarvis/stores/personalStore';

const TYPE_CONFIG: Record<
  HealthItem['type'],
  { icon: typeof Dumbbell; label: string; colorClass: string }
> = {
  workout: { icon: Dumbbell, label: 'Workouts', colorClass: 'text-emerald-400' },
  meal: { icon: UtensilsCrossed, label: 'Meals', colorClass: 'text-amber-400' },
  sleep: { icon: Moon, label: 'Sleep', colorClass: 'text-indigo-400' },
};

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HealthView() {
  const health = usePersonalStore((s) => s.health);

  const grouped = useMemo(() => {
    const result: { type: HealthItem['type']; items: HealthItem[] }[] = [];
    const types: HealthItem['type'][] = ['workout', 'meal', 'sleep'];
    for (const type of types) {
      const items = health.filter((h) => h.type === type);
      if (items.length > 0) result.push({ type, items });
    }
    return result;
  }, [health]);

  const todayCount = useMemo(
    () => health.filter((h) => h.date === getToday()).length,
    [health],
  );

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .health-enter { animation: fadeInUp 400ms ease-out both; }
      `}</style>

      {/* Summary Hero */}
      <Card variant="glass" padding="md" className="health-enter mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
            {todayCount} activit{todayCount !== 1 ? 'ies' : 'y'} today
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
            {health.length} total
          </span>
        </div>
      </Card>

      {/* Type Groups */}
      <div className="space-y-3">
        {grouped.map((group, groupIndex) => {
          const config = TYPE_CONFIG[group.type];
          const Icon = config.icon;

          return (
            <div
              key={group.type}
              className="health-enter"
              style={{ animationDelay: `${(groupIndex + 1) * 80}ms` }}
            >
              <Card variant="glass" padding="sm">
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Icon size={16} className={config.colorClass} />
                  <p className={`text-xs uppercase tracking-wider ${config.colorClass} opacity-70`}>
                    {config.label}
                  </p>
                </div>

                {/* Item Rows */}
                {group.items.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 py-2.5 px-1 ${
                      i < group.items.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90">{item.title}</p>
                      <p className="text-xs text-white/40">{item.summary}</p>
                    </div>
                    <span className="text-xs text-white/30 flex-shrink-0">
                      {formatDate(item.date)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}
