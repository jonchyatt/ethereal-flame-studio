'use client';

import {
  Sun,
  Pill,
  CheckSquare,
  Plus,
  TrendingUp,
  UtensilsCrossed,
  Moon,
  BookOpen,
  Calendar,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: React.ComponentType<LucideProps>;
}

function getTimeActions(): QuickAction[] {
  const hour = new Date().getHours();

  if (hour < 12) {
    return [
      { label: 'Start briefing', icon: Sun },
      { label: 'Log dose', icon: Pill },
      { label: 'Check tasks', icon: CheckSquare },
    ];
  }

  if (hour < 17) {
    return [
      { label: 'Quick add task', icon: Plus },
      { label: 'Check Visopscreen', icon: TrendingUp },
      { label: 'Log meal', icon: UtensilsCrossed },
    ];
  }

  return [
    { label: 'Evening review', icon: Moon },
    { label: 'Journal', icon: BookOpen },
    { label: "Tomorrow's plan", icon: Calendar },
  ];
}

export function QuickActionsBar() {
  const actions = getTimeActions();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
      {actions.map((action) => (
        <button
          key={action.label}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200 flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
