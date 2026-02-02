'use client';

interface PriorityIndicatorProps {
  type: 'overdue' | 'urgent' | 'deadline_near' | 'needs_attention';
  pulsing?: boolean;
  size?: 'sm' | 'md';
}

const colors: Record<PriorityIndicatorProps['type'], string> = {
  overdue: 'bg-red-500',
  urgent: 'bg-orange-500',
  deadline_near: 'bg-yellow-500',
  needs_attention: 'bg-amber-400',
};

const labels: Record<PriorityIndicatorProps['type'], string> = {
  overdue: 'Overdue',
  urgent: 'Urgent',
  deadline_near: 'Due soon',
  needs_attention: 'Needs attention',
};

export function PriorityIndicator({
  type,
  pulsing = true,
  size = 'sm',
}: PriorityIndicatorProps) {
  const sizeClasses = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';

  return (
    <span
      className={`
        inline-flex ${sizeClasses} rounded-full ${colors[type]}
        ${pulsing ? 'animate-pulse' : ''}
      `}
      title={labels[type]}
      aria-label={labels[type]}
    />
  );
}
