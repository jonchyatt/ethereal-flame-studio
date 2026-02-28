'use client';

import { type ReactNode } from 'react';
import { DOMAIN_COLORS } from '@/lib/jarvis/domains';

type BadgeVariant = 'status' | 'count' | 'domain';
type BadgeStatus = 'critical' | 'warning' | 'success' | 'info' | 'inactive';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  status?: BadgeStatus;
  count?: number;
  domainColor?: string;
  size?: BadgeSize;
  children?: ReactNode;
  className?: string;
}

const statusClasses: Record<BadgeStatus, string> = {
  critical: 'bg-red-500/10 text-red-400 border border-red-400/30',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-400/30',
  success: 'bg-green-500/10 text-green-400 border border-green-400/30',
  info: 'bg-blue-500/10 text-blue-400 border border-blue-400/30',
  inactive: 'bg-zinc-800 text-zinc-500 border border-zinc-700',
};

export function Badge({
  variant = 'status',
  status = 'info',
  count,
  domainColor,
  size = 'sm',
  children,
  className = '',
}: BadgeProps) {
  if (variant === 'count') {
    return (
      <span
        className={`
          bg-cyan-500/80 text-white rounded-full
          min-w-[18px] h-[18px] text-[10px] font-bold
          flex items-center justify-center px-1
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {count ?? children}
      </span>
    );
  }

  if (variant === 'domain' && domainColor) {
    const colors = DOMAIN_COLORS[domainColor];
    return (
      <span
        className={`
          ${colors ? `${colors.bgSubtle} ${colors.text}` : 'bg-white/10 text-white/50'}
          rounded-full px-2 py-0.5
          ${size === 'sm' ? 'text-xs' : 'text-sm'}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {children}
      </span>
    );
  }

  // Default: status variant
  return (
    <span
      className={`
        ${statusClasses[status]}
        rounded-full px-2 py-0.5
        ${size === 'sm' ? 'text-xs' : 'text-sm'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </span>
  );
}
