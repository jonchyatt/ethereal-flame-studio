import { type ReactNode } from 'react';

type MaxWidth = 'narrow' | 'default' | 'wide';

interface ContentContainerProps {
  children: ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
}

const maxWidthClasses: Record<MaxWidth, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
};

export function ContentContainer({
  children,
  maxWidth = 'default',
  className = '',
}: ContentContainerProps) {
  return (
    <div
      className={`
        w-full mx-auto px-4 md:px-6 lg:px-8
        pt-[6.5rem] pb-20 md:pt-16 md:pb-4
        md:pl-20
        ${maxWidthClasses[maxWidth]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  );
}
