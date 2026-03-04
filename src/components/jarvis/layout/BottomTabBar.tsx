'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, GraduationCap, Settings } from 'lucide-react';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';

interface TabItem {
  id: string;
  label: string;
  icon: typeof Home;
  action: 'navigate' | 'toggle-chat' | 'quick-add';
  route?: string;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: Home, action: 'navigate', route: '/jarvis/app' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, action: 'toggle-chat' },
  { id: 'add', label: '', icon: Plus, action: 'quick-add' },
  { id: 'learn', label: 'Learn', icon: GraduationCap, action: 'navigate', route: '/jarvis/app/academy' },
  { id: 'settings', label: 'Settings', icon: Settings, action: 'navigate', route: '/jarvis/app/settings' },
];

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const toggleChat = useShellStore((s) => s.toggleChat);
  const isChatOpen = useShellStore((s) => s.isChatOpen);

  const handleTabPress = (tab: TabItem) => {
    if (tab.action === 'navigate' && tab.route) {
      router.push(tab.route);
    } else if (tab.action === 'toggle-chat') {
      toggleChat();
    } else if (tab.action === 'quick-add') {
      toggleChat();
    }
  };

  const getIsActive = (tab: TabItem) => {
    if (tab.id === 'chat') return isChatOpen;
    if (tab.id === 'home') return pathname === '/jarvis/app' || pathname === '/jarvis/app/';
    if (tab.route) return pathname?.startsWith(tab.route);
    return false;
  };

  return (
    <>
      <style>{`
        @keyframes fabGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(8, 145, 178, 0.3); }
          50% { box-shadow: 0 0 16px rgba(8, 145, 178, 0.5); }
        }
        .fab-glow { animation: fabGlow 3s ease-in-out infinite; }
      `}</style>
      <nav data-tutorial-id="bottom-tabs" className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab);
            const isCenter = tab.id === 'add';

            return (
              <button
                key={tab.id}
                data-tutorial-id={`bottom-tab-${tab.id}`}
                onClick={() => handleTabPress(tab)}
                className={`
                  relative flex flex-col items-center justify-center gap-1 flex-1 h-full
                  transition-colors
                  ${isCenter
                    ? 'text-cyan-400'
                    : isActive
                      ? 'text-cyan-400'
                      : 'text-zinc-500'
                  }
                `}
                aria-label={tab.label || 'Quick add'}
              >
                {isActive && !isCenter && (
                  <span className="absolute top-2 w-1 h-1 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                )}
                <span className={isCenter ? '-mt-3 w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center shadow-lg fab-glow' : ''}>
                  <Icon className={isCenter ? 'w-5 h-5 text-white' : 'w-5 h-5'} />
                </span>
                {tab.label && (
                  <span className="text-[10px]">{tab.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>

  );
}
