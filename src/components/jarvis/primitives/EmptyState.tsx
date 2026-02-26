'use client';

import { type ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 px-6 ${className}`}
    >
      <div className="w-12 h-12 text-white/30 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-white/90">{title}</h3>
      <p className="text-sm text-white/50 text-center max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
