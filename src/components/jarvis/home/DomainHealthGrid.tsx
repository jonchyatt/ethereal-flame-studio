'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/jarvis/primitives';
import { useHomeStore, type HealthStatus } from '@/lib/jarvis/stores/homeStore';
import { DOMAIN_COLORS } from '@/lib/jarvis/domains';
import { useActiveDomains } from '@/lib/jarvis/stores/settingsStore';
import { DomainIcon } from './DomainIcon';

const STATUS_DOT: Record<HealthStatus, string> = {
  red: 'bg-red-400',
  amber: 'bg-amber-400',
  green: 'bg-green-400',
  gray: 'bg-zinc-600',
};

export function DomainHealthGrid() {
  const router = useRouter();
  const domainHealth = useHomeStore((s) => s.domainHealth);

  // Active domains excluding 'home' — home is the page we're on
  const activeDomains = useActiveDomains().filter((d) => d.id !== 'home');

  if (activeDomains.length === 0) {
    return (
      <Card variant="glass" padding="md">
        <p className="text-sm text-white/50">No active domains yet. Activate domains in Settings.</p>
      </Card>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .domain-enter { animation: fadeInUp 400ms ease-out both; }
      `}</style>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeDomains.map((domain, index) => {
          const health = domainHealth.find((h) => h.domainId === domain.id);
          const colors = DOMAIN_COLORS[domain.color];
          const status = health?.status ?? 'gray';

          return (
            <div key={domain.id} className="domain-enter" style={{ animationDelay: `${index * 50}ms` }}>
              <Card
                variant="glass-interactive"
            padding="md"
            onClick={() => router.push(domain.route)}
          >
            <div className="space-y-2">
              {/* Header: status dot + name + icon */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                <span className={`${colors?.text ?? 'text-white/60'}`}>
                  <DomainIcon name={domain.icon} className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium text-white/80">{domain.name}</span>
              </div>

              {/* Metric */}
              <p className="text-lg font-semibold text-white/90">
                {health?.metric ?? '--'}
              </p>

              {/* Summary */}
              <p className="text-xs text-white/50">
                {health?.summary ?? 'No data available'}
              </p>
            </div>
            </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}
