'use client';

import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';
import { useHomeStore, type UrgencyLevel } from '@/lib/jarvis/stores/homeStore';
import { getDomainById, DOMAIN_COLORS } from '@/lib/jarvis/domains';
import { DomainIcon } from './DomainIcon';

const URGENCY_STRIPE: Record<UrgencyLevel, 'critical' | 'warning' | 'info' | null> = {
  critical: 'critical',
  warning: 'warning',
  routine: null,
  info: 'info',
};

export function PriorityStack() {
  const priorityItems = useHomeStore((s) => s.priorityItems);

  const sorted = [...priorityItems].sort((a, b) => b.urgencyScore - a.urgencyScore);

  if (sorted.length === 0) {
    return (
      <Card variant="glass" padding="md">
        <div className="flex items-center gap-3 text-white/50">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm">All clear — nothing urgent right now</span>
        </div>
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
        .priority-enter { animation: fadeInUp 400ms ease-out both; }
      `}</style>
      <ul role="list" className="space-y-2">
        {sorted.map((item, index) => {
          const domain = getDomainById(item.domainId);
          const colors = domain ? DOMAIN_COLORS[domain.color] : null;

          return (
            <li key={item.id} className="priority-enter" style={{ animationDelay: `${index * 50}ms` }}>
              <Card
                variant="glass-interactive"
              padding="sm"
              statusStripe={URGENCY_STRIPE[item.urgency]}
            >
              <div className="flex items-center gap-3">
                {/* Domain icon */}
                {domain && (
                  <span className={`flex-shrink-0 ${colors?.text ?? 'text-white/40'}`}>
                    <DomainIcon name={domain.icon} className="w-4 h-4" />
                  </span>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-white/50 truncate mt-0.5">{item.subtitle}</p>
                  )}
                </div>

                {/* Urgency indicator */}
                {item.urgency === 'critical' && (
                  <span className="text-xs text-red-400/70 flex-shrink-0">Urgent</span>
                )}
              </div>
            </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
