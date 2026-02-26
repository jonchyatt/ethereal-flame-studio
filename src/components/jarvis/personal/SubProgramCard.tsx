'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';

interface SubProgramCardProps {
  name: string;
  icon: LucideIcon;
  stat: string;
  route: string;
  warn?: boolean;
  critical?: boolean;
  index?: number;
}

export function SubProgramCard({
  name,
  icon: Icon,
  stat,
  route,
  warn = false,
  critical = false,
  index = 0,
}: SubProgramCardProps) {
  const stripe = critical ? 'critical' : warn ? 'warning' : undefined;

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .subprogram-enter { animation: fadeInUp 400ms ease-out both; }
      `}</style>
      <Link href={route} className="subprogram-enter" style={{ animationDelay: `${index * 50}ms` }}>
        <Card variant="glass-interactive" padding="md" statusStripe={stripe}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon size={24} className="text-violet-400" />
              <div>
                <p className="text-sm font-medium text-white/90">{name}</p>
                <p className="text-xs text-white/50">{stat}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>
        </Card>
      </Link>
    </>
  );
}
