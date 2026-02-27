'use client';

import { useRouter } from 'next/navigation';
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
import { useChatStore } from '@/lib/jarvis/stores/chatStore';

interface QuickAction {
  label: string;
  icon: React.ComponentType<LucideProps>;
  action: { type: 'navigate'; route: string } | { type: 'chat'; message: string };
}

function getTimeActions(): QuickAction[] {
  const hour = new Date().getHours();

  if (hour < 12) {
    return [
      { label: 'Start briefing', icon: Sun, action: { type: 'chat', message: 'Give me my morning briefing' } },
      { label: 'Log dose', icon: Pill, action: { type: 'chat', message: 'I just took my dose' } },
      { label: 'Check tasks', icon: CheckSquare, action: { type: 'navigate', route: '/jarvis/app/personal/tasks' } },
    ];
  }

  if (hour < 17) {
    return [
      { label: 'Quick add task', icon: Plus, action: { type: 'chat', message: 'Help me add a quick task' } },
      { label: 'Check tasks', icon: CheckSquare, action: { type: 'navigate', route: '/jarvis/app/personal/tasks' } },
      { label: 'Log meal', icon: UtensilsCrossed, action: { type: 'chat', message: 'Log a meal for me' } },
    ];
  }

  return [
    { label: 'Evening review', icon: Moon, action: { type: 'chat', message: 'Guide me through an evening review' } },
    { label: 'Journal', icon: BookOpen, action: { type: 'navigate', route: '/jarvis/app/personal/journal' } },
    { label: "Tomorrow's plan", icon: Calendar, action: { type: 'chat', message: "What's on my schedule for tomorrow?" } },
  ];
}

export function QuickActionsBar() {
  const router = useRouter();
  const openWithMessage = useChatStore((s) => s.openWithMessage);
  const actions = getTimeActions();

  const handleAction = (action: QuickAction['action']) => {
    if (action.type === 'navigate') {
      router.push(action.route);
    } else {
      openWithMessage(action.message);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action.action)}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200 flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
