'use client';

import { useRouter } from 'next/navigation';
import { Search, Bell, Settings, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/jarvis/primitives';
import { Badge } from '@/components/jarvis/primitives';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';

export function Header() {
  const router = useRouter();
  const toggleCommandPalette = useShellStore((s) => s.toggleCommandPalette);
  const isNarrationEnabled = useTutorialStore((s) => s.isNarrationEnabled);
  const toggleNarration = useTutorialStore((s) => s.toggleNarration);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 z-50 md:left-16 flex items-center justify-between px-4">
      {/* Left: Logo */}
      <button
        onClick={() => router.push('/jarvis/app')}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <span className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">
          J
        </span>
        <span className="text-cyan-400 font-semibold text-sm hidden sm:inline">Jarvis</span>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Search: icon on mobile, hint on desktop */}
        <Button variant="icon" onClick={toggleCommandPalette} aria-label="Search" data-tutorial-id="header-search">
          <Search className="w-5 h-5" />
        </Button>
        <button
          onClick={toggleCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-white/40 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-200"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="text-[10px] text-white/30 bg-white/5 px-1 rounded">⌘K</kbd>
        </button>

        {/* Narration toggle — always visible so user can mute/unmute at any time */}
        <Button
          variant="icon"
          onClick={toggleNarration}
          aria-label={isNarrationEnabled ? 'Mute voice narration' : 'Unmute voice narration'}
          title={isNarrationEnabled ? 'Mute narration' : 'Unmute narration'}
        >
          {isNarrationEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-white/30" />}
        </Button>

        {/* Notifications */}
        <Button variant="icon" aria-label="Notifications" className="relative" data-tutorial-id="header-notifications">
          <Bell className="w-5 h-5" />
          {/* Badge — hidden when count is 0 */}
          {false && (
            <span className="absolute -top-0.5 -right-0.5">
              <Badge variant="count" count={0} />
            </span>
          )}
        </Button>

        {/* Settings */}
        <Button
          variant="icon"
          onClick={() => router.push('/jarvis/app/settings')}
          aria-label="Settings"
          data-tutorial-id="header-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
