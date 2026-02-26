'use client';

import { type ReactNode } from 'react';

type CardVariant = 'default' | 'glass' | 'interactive';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type StatusStripe = 'critical' | 'warning' | 'success' | 'info' | null;

interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  statusStripe?: StatusStripe;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-zinc-900 border border-white/10 rounded-2xl',
  glass: 'bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl',
  interactive: 'bg-zinc-900 border border-white/10 rounded-2xl hover:bg-zinc-800 hover:border-white/20 cursor-pointer transition-colors',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const stripeClasses: Record<Exclude<StatusStripe, null>, string> = {
  critical: 'border-l-4 border-l-red-400',
  warning: 'border-l-4 border-l-amber-400',
  success: 'border-l-4 border-l-green-400',
  info: 'border-l-4 border-l-blue-400',
};

export function Card({
  variant = 'default',
  padding = 'md',
  statusStripe = null,
  header,
  footer,
  children,
  onClick,
  className = '',
}: CardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${statusStripe ? stripeClasses[statusStripe] : ''}
        ${onClick ? 'w-full text-left' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      {header && (
        <div className="mb-3 pb-3 border-b border-white/5">
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-3 pt-3 border-t border-white/5">
          {footer}
        </div>
      )}
    </Tag>
  );
}
