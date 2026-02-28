'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  User,
  Flame,
  Dna,
  Dice6,
  TrendingUp,
  Landmark,
  Building2,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DOMAIN_COLORS } from '@/lib/jarvis/domains';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import { useActiveDomains } from '@/lib/jarvis/stores/settingsStore';

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  User,
  Flame,
  Dna,
  Dice6,
  TrendingUp,
  Landmark,
  Building2,
};

export function DomainRail() {
  const router = useRouter();
  const pathname = usePathname();
  const setActiveDomain = useShellStore((s) => s.setActiveDomain);
  const domains = useActiveDomains();

  const handleDomainClick = (domainId: string, route: string) => {
    setActiveDomain(domainId);
    router.push(route);
  };

  // Determine active based on current path
  const getIsActive = (domainId: string, route: string) => {
    if (domainId === 'home') {
      return pathname === '/jarvis/app' || pathname === '/jarvis/app/';
    }
    return pathname?.startsWith(route);
  };

  return (
    <>
      {/* Mobile: Horizontal rail below header */}
      <nav className="fixed left-0 right-0 top-14 h-12 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 z-40 md:hidden">
        <div className="flex items-center justify-center h-full gap-1 px-4 overflow-x-auto">
          {domains.map((domain) => {
            const Icon = ICON_MAP[domain.icon];
            const isActive = getIsActive(domain.id, domain.route);
            const colors = DOMAIN_COLORS[domain.color];
            if (!Icon) return null;

            return (
              <button
                key={domain.id}
                onClick={() => handleDomainClick(domain.id, domain.route)}
                className={`
                  flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110
                  ${isActive
                    ? `${colors.bgSubtle} ${colors.text} ring-1 ring-current/20 shadow-sm`
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
                aria-label={domain.name}
                title={domain.name}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop: Vertical rail on left */}
      <nav className="fixed left-0 top-0 bottom-0 w-16 bg-zinc-950/80 backdrop-blur-xl border-r border-white/10 z-40 hidden md:flex md:flex-col md:items-center md:py-4 md:gap-2">
        {/* Domain icons */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {domains.map((domain) => {
            const Icon = ICON_MAP[domain.icon];
            const isActive = getIsActive(domain.id, domain.route);
            const colors = DOMAIN_COLORS[domain.color];
            if (!Icon) return null;

            return (
              <button
                key={domain.id}
                onClick={() => handleDomainClick(domain.id, domain.route)}
                className={`
                  relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 group
                  ${isActive
                    ? `${colors.bgSubtle} ${colors.text} ring-1 ring-current/20 shadow-sm`
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
                aria-label={domain.name}
              >
                <Icon className="w-5 h-5" />
                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-2 py-1 text-xs text-white bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {domain.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Settings at bottom */}
        <button
          onClick={() => router.push('/jarvis/app/settings')}
          className={`
            w-10 h-10 flex items-center justify-center rounded-xl transition-colors
            ${pathname?.startsWith('/jarvis/app/settings')
              ? 'bg-cyan-500/15 text-cyan-400'
              : 'text-zinc-500 hover:text-zinc-300'
            }
          `}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </nav>
    </>
  );
}
