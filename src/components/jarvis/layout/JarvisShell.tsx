'use client';

import { type ReactNode, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSettingsStore } from '@/lib/jarvis/stores/settingsStore';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import { useTutorialEngine, type TutorialEngineAPI } from '@/lib/jarvis/hooks/useTutorialEngine';
import { useJarvisFetch } from '@/lib/jarvis/hooks/useJarvisFetch';
import { Header } from './Header';
import { DomainRail } from './DomainRail';
import { BottomTabBar } from './BottomTabBar';
import { ChatOverlay } from './ChatOverlay';
import { CommandPalette } from './CommandPalette';
import { ToastContainer } from './ToastContainer';
import { SpotlightOverlay } from '@/components/jarvis/onboarding/SpotlightOverlay';

// ── Tutorial Engine Context ─────────────────────────────────────────────

export const TutorialEngineContext = createContext<TutorialEngineAPI | null>(null);
export const useTutorialEngineContext = () => useContext(TutorialEngineContext);

// ── Shell ───────────────────────────────────────────────────────────────

interface JarvisShellProps {
  children: ReactNode;
}

const ONBOARDING_PATH = '/jarvis/app/onboarding';

export function JarvisShell({ children }: JarvisShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const isOnboarding = pathname === ONBOARDING_PATH;
  const tutorialEngine = useTutorialEngine();
  useJarvisFetch(); // Central data pipeline — populates homeStore + personalStore
  const isCommandPaletteOpen = useShellStore((s) => s.isCommandPaletteOpen);
  const toggleCommandPalette = useShellStore((s) => s.toggleCommandPalette);

  useEffect(() => {
    if (!onboarded && !isOnboarding) {
      router.replace(ONBOARDING_PATH);
    }
  }, [onboarded, isOnboarding, router]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCommandPalette]);

  // Onboarding gets a clean full-screen canvas — no shell chrome
  if (isOnboarding) {
    return (
      <div className="h-dvh w-full bg-black text-white overflow-hidden">
        <main className="h-full overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <TutorialEngineContext.Provider value={tutorialEngine}>
      <div className="h-dvh w-full bg-black text-white overflow-hidden">
        <Header />
        <DomainRail />
        <main className="h-full overflow-y-auto">
          {children}
        </main>
        <BottomTabBar />
        <ChatOverlay />
        <ToastContainer />
        <SpotlightOverlay />
        {isCommandPaletteOpen && <CommandPalette />}
      </div>
    </TutorialEngineContext.Provider>
  );
}
