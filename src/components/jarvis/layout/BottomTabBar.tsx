'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Bell, Settings } from 'lucide-react';
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
  { id: 'alerts', label: 'Alerts', icon: Bell, action: 'navigate', route: '/jarvis/app' }, // placeholder route
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
      // Placeholder — ActionSheet in a future plan
      console.log('[BottomTabBar] Quick add pressed');
    }
  };

  const getIsActive = (tab: TabItem) => {
    if (tab.id === 'chat') return isChatOpen;
    if (tab.id === 'home') return pathname === '/jarvis/app' || pathname === '/jarvis/app/';
    if (tab.route) return pathname?.startsWith(tab.route);
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-white/10 z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-full">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = getIsActive(tab);
          const isCenter = tab.id === 'add';

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 h-full
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
              <span className={isCenter ? '-mt-3 w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center shadow-lg' : ''}>
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
  );
}
