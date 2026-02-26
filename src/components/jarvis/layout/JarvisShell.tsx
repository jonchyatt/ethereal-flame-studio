'use client';

import { type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSettingsStore } from '@/lib/jarvis/stores/settingsStore';
import { Header } from './Header';
import { DomainRail } from './DomainRail';
import { BottomTabBar } from './BottomTabBar';
import { ChatOverlay } from './ChatOverlay';
import { ToastContainer } from './ToastContainer';
import { SpotlightOverlay } from '@/components/jarvis/onboarding/SpotlightOverlay';

interface JarvisShellProps {
  children: ReactNode;
}

const ONBOARDING_PATH = '/jarvis/app/onboarding';

export function JarvisShell({ children }: JarvisShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const onboarded = useSettingsStore((s) => s.onboarded);
  const isOnboarding = pathname === ONBOARDING_PATH;

  useEffect(() => {
    if (!onboarded && !isOnboarding) {
      router.replace(ONBOARDING_PATH);
    }
  }, [onboarded, isOnboarding, router]);

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
    </div>
  );
}
