type SkeletonVariant = 'text' | 'card' | 'list-item' | 'circle';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  card: 'h-32 w-full rounded-2xl',
  'list-item': 'h-12 w-full rounded-xl',
  circle: 'w-10 h-10 rounded-full',
};

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`bg-zinc-800 animate-pulse ${variantClasses[variant]} ${className}`}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
    />
  );
}
