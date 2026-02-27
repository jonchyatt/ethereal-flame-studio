'use client';

import {
  CheckSquare,
  Zap,
  Receipt,
  Calendar,
  BookOpen,
  Target,
  Heart,
} from 'lucide-react';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';
import { TodaySnapshot } from './TodaySnapshot';
import { SubProgramCard } from './SubProgramCard';

export function PersonalDashboard() {
  const { todayStats, events, journal, goals, health, bills } = usePersonalStore();

  const todayEvents = events.filter((e) => e.isToday).length;
  const today = new Date().toISOString().split('T')[0];
  const hasJournalEntry = journal.some((j) => j.date === today);
  const hasOverdueBills = bills.some((b) => b.status === 'overdue');
  const hasIncompletHabits = todayStats.habitsDone < todayStats.habitsTotal;

  const subPrograms = [
    {
      id: 'tasks',
      name: 'Tasks',
      icon: CheckSquare,
      route: '/jarvis/app/personal/tasks',
      stat: `${todayStats.tasksDue} due today`,
      warn: todayStats.tasksDue > 0,
      critical: false,
    },
    {
      id: 'habits',
      name: 'Habits',
      icon: Zap,
      route: '/jarvis/app/personal/habits',
      stat: `${todayStats.habitsDone}/${todayStats.habitsTotal} done`,
      warn: hasIncompletHabits,
      critical: false,
    },
    {
      id: 'bills',
      name: 'Bills & Finance',
      icon: Receipt,
      route: '/jarvis/app/personal/bills',
      stat: `${todayStats.billsDue} due soon`,
      warn: false,
      critical: hasOverdueBills,
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Calendar,
      route: '/jarvis/app/personal/calendar',
      stat: `${todayEvents} today`,
      warn: false,
      critical: false,
    },
    {
      id: 'journal',
      name: 'Journal',
      icon: BookOpen,
      route: '/jarvis/app/personal/journal',
      stat: hasJournalEntry ? 'Entry started' : 'No entry yet',
      warn: false,
      critical: false,
    },
    {
      id: 'goals',
      name: 'Goals & Planning',
      icon: Target,
      route: '/jarvis/app/personal/goals',
      stat: `${goals.length} active`,
      warn: false,
      critical: false,
    },
    {
      id: 'health',
      name: 'Health & Wellness',
      icon: Heart,
      route: '/jarvis/app/personal/health',
      stat: `${health.length} logged today`,
      warn: false,
      critical: false,
    },
  ];

  return (
    <div className="space-y-4">
      <TodaySnapshot />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subPrograms.map((sp, index) => (
          <SubProgramCard
            key={sp.id}
            name={sp.name}
            icon={sp.icon}
            stat={sp.stat}
            route={sp.route}
            warn={sp.warn}
            critical={sp.critical}
            index={index}
            subProgramId={sp.id}
          />
        ))}
      </div>
    </div>
  );
}
