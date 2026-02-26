'use client';

import { useEffect, useRef, useState, useCallback, useId, type ReactNode } from 'react';

type SheetSize = 'sm' | 'md' | 'lg' | 'full';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  size?: SheetSize;
  title?: string;
  children: ReactNode;
}

const mobileHeights: Record<SheetSize, string> = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[80vh]',
  full: 'h-[90vh]',
};

const desktopWidths: Record<SheetSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-2xl',
};

const spring = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function Sheet({ open, onClose, size = 'md', title, children }: SheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animState, setAnimState] = useState<'entering' | 'open' | 'exiting' | 'closed'>('closed');
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const titleId = useId();

  // Open/close lifecycle
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimState('entering'));
      });
      const timer = setTimeout(() => setAnimState('open'), 300);
      return () => clearTimeout(timer);
    } else if (isVisible) {
      setAnimState('exiting');
      const timer = setTimeout(() => {
        setIsVisible(false);
        setAnimState('closed');
        previousFocusRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus first focusable on open
  useEffect(() => {
    if (animState === 'open' && sheetRef.current) {
      const focusable = sheetRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [animState]);

  // Touch drag-to-dismiss (mobile)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !sheetRef.current) return;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = 'none';
      if (scrimRef.current) {
        const height = sheetRef.current.offsetHeight;
        scrimRef.current.style.opacity = String(Math.max(0, 1 - deltaY / height));
      }
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !sheetRef.current) return;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    const velocity = deltaY / elapsed;
    const height = sheetRef.current.offsetHeight;

    if (deltaY > height * 0.3 || velocity > 0.5) {
      onClose();
    } else {
      sheetRef.current.style.transform = 'translateY(0)';
      sheetRef.current.style.transition = `transform 300ms ${spring}`;
      if (scrimRef.current) {
        scrimRef.current.style.opacity = '1';
        scrimRef.current.style.transition = 'opacity 300ms ease';
      }
    }
    touchStartRef.current = null;
  }, [onClose]);

  if (!isVisible) return null;

  const isEntering = animState === 'entering' || animState === 'open';
  const scrimOpacity = isEntering ? 'opacity-100' : 'opacity-0';

  return (
    <>
      {/* Scrim */}
      <div
        ref={scrimRef}
        className={`fixed inset-0 bg-black/50 z-[65] transition-opacity duration-200 ${scrimOpacity}`}
        onClick={onClose}
      />

      {/* Mobile bottom sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`
          fixed z-[70]
          md:hidden
          inset-x-0 bottom-0
          bg-zinc-900 border-t border-white/10 rounded-t-2xl overflow-hidden
          flex flex-col
          ${mobileHeights[size]}
        `.trim().replace(/\s+/g, ' ')}
        style={{
          transform: isEntering ? 'translateY(0)' : 'translateY(100%)',
          transition: animState === 'entering'
            ? `transform 300ms ${spring}`
            : animState === 'exiting'
              ? 'transform 250ms ease-in'
              : 'none',
        }}
      >
        {/* Drag handle */}
        <div
          className="w-full pt-3 pb-2 cursor-grab"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
        </div>
        {title && (
          <div id={titleId} className="px-4 pb-3 text-white/90 font-medium text-sm border-b border-white/10">
            {title}
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>

      {/* Desktop centered modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`
          fixed inset-0 z-[70] hidden md:flex items-center justify-center pointer-events-none
        `}
      >
        <div
          ref={animState === 'open' || animState === 'entering' ? undefined : undefined}
          className={`
            pointer-events-auto
            bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden
            flex flex-col max-h-[80vh]
            ${desktopWidths[size]}
            w-full
          `.trim().replace(/\s+/g, ' ')}
          style={{
            transform: isEntering ? 'scale(1)' : 'scale(0.95)',
            opacity: isEntering ? 1 : 0,
            transition: isEntering
              ? 'transform 200ms ease-out, opacity 200ms ease-out'
              : 'transform 150ms ease-in, opacity 150ms ease-in',
          }}
        >
          {title && (
            <div id={`${titleId}-desktop`} className="px-4 py-3 text-white/90 font-medium text-sm border-b border-white/10">
              {title}
            </div>
          )}
          <div className="overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}
