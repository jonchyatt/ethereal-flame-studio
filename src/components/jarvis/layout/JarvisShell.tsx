'use client';

import { type ReactNode } from 'react';
import { Header } from './Header';
import { DomainRail } from './DomainRail';
import { BottomTabBar } from './BottomTabBar';

interface JarvisShellProps {
  children: ReactNode;
}

export function JarvisShell({ children }: JarvisShellProps) {
  return (
    <div className="h-dvh w-full bg-black text-white overflow-hidden">
      <Header />
      <DomainRail />
      <main className="h-full overflow-y-auto">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
