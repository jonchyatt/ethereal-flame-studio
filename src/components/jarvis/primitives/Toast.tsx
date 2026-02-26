'use client';

import { useRef, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  duration: number;
  onDismiss: () => void;
}

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; borderColor: string; iconColor: string; progressColor: string }> = {
  success: { icon: CheckCircle2, borderColor: 'border-l-green-500', iconColor: 'text-green-400', progressColor: 'bg-green-500/40' },
  error: { icon: AlertCircle, borderColor: 'border-l-red-500', iconColor: 'text-red-400', progressColor: 'bg-red-500/40' },
  info: { icon: Info, borderColor: 'border-l-cyan-500', iconColor: 'text-cyan-400', progressColor: 'bg-cyan-500/40' },
};

export function Toast({ variant, message, action, duration, onDismiss }: ToastProps) {
  const { icon: Icon, borderColor, iconColor, progressColor } = variantConfig[variant];
  const toastRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; time: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, time: Date.now() };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !toastRef.current) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    toastRef.current.style.transform = `translateX(${deltaX}px)`;
    toastRef.current.style.transition = 'none';
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !toastRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const toastWidth = toastRef.current.offsetWidth;

    if (Math.abs(deltaX) > toastWidth * 0.5) {
      toastRef.current.style.transform = `translateX(${deltaX > 0 ? '100vw' : '-100vw'})`;
      toastRef.current.style.transition = 'transform 200ms ease-in';
      setTimeout(onDismiss, 200);
    } else {
      toastRef.current.style.transform = 'translateX(0)';
      toastRef.current.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    touchStartRef.current = null;
  }, [onDismiss]);

  return (
    <div
      ref={toastRef}
      className={`
        relative flex items-start gap-3
        bg-zinc-900/95 backdrop-blur-xl border border-white/10 border-l-4 ${borderColor}
        rounded-xl px-4 py-3 shadow-2xl
        min-w-[300px] max-w-[420px]
        pointer-events-auto
      `.trim().replace(/\s+/g, ' ')}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
      <span className="text-white/90 text-sm leading-relaxed flex-1">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium ml-auto whitespace-nowrap transition-colors"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-white/30 hover:text-white/60 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
        <div
          className={progressColor}
          style={{
            width: '100%',
            animation: `jarvis-toast-shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
