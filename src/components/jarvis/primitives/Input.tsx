'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type InputSize = 'sm' | 'md';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  icon?: ReactNode;
  suffix?: ReactNode;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', icon, suffix, className = '', ...rest },
  ref
) {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        className={`
          peer w-full bg-white/5 text-white rounded-xl border border-white/10
          placeholder:text-white/30 disabled:opacity-50
          focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none
          transition-all duration-200
          ${icon ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}
          ${sizeClasses[size]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...rest}
      />
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 peer-focus:text-cyan-400 transition-colors duration-200 pointer-events-none">
          {icon}
        </span>
      )}
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
});
